import { NextResponse } from "next/server";
import type { ResumeData } from "@/lib/resume-schema";
import { exportResumePdf } from "@/lib/pdf";

type ExportPdfRequest = {
  resume?: unknown;
  fileName?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExportPdfRequest;
    const resume = body.resume as ResumeData | undefined;
    const fileName = typeof body.fileName === "string" ? body.fileName : undefined;

    if (!resume?.projects?.length) {
      return NextResponse.json(
        { error: "缺少可导出的 resume JSON。" },
        { status: 400 },
      );
    }

    const result = await exportResumePdf({ resume, fileName });
    const pdfBody = new Uint8Array(result.buffer);

    return new NextResponse(pdfBody, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDisposition(result.fileName),
        "Content-Length": String(result.buffer.byteLength),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "PDF 导出失败，请稍后重试。";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function contentDisposition(fileName: string) {
  const encoded = encodeURIComponent(fileName);
  return `attachment; filename="resume.pdf"; filename*=UTF-8''${encoded}`;
}
