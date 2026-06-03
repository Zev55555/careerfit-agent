import path from "node:path";
import { pathToFileURL } from "node:url";

export async function extractPdfText(buffer: Buffer): Promise<string> {
  if (buffer.byteLength === 0) {
    throw new Error("PDF 文件为空。");
  }

  await ensurePdfJsNodeGlobals();

  const { PDFParse } = await import("pdf-parse");
  const workerPath = path.join(
    process.cwd(),
    "node_modules",
    "pdfjs-dist",
    "legacy",
    "build",
    "pdf.worker.mjs",
  );
  PDFParse.setWorker(pathToFileURL(workerPath).href);
  const parser = new PDFParse({
    data: new Uint8Array(buffer),
  });

  try {
    const result = await parser.getText();
    const text = normalizePdfText(result.text);

    if (!text) {
      throw new Error("没有从 PDF 中提取到可用文本。");
    }

    return text;
  } finally {
    await parser.destroy();
  }
}

async function ensurePdfJsNodeGlobals() {
  const globals = globalThis as Record<string, unknown>;

  if (globals.DOMMatrix && globals.Path2D && globals.ImageData) {
    return;
  }

  const canvas = await import("@napi-rs/canvas");

  globals.DOMMatrix ??= canvas.DOMMatrix;
  globals.Path2D ??= canvas.Path2D;
  globals.ImageData ??= canvas.ImageData;
}

function normalizePdfText(text: string) {
  return text
    .replace(/\r/g, "\n")
    .replace(/\u0000/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}
