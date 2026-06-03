import { NextResponse } from "next/server";
import { parseResumeWithAI } from "@/lib/ai-resume-parser";
import { filterDeprecatedProjects } from "@/lib/deprecated-projects";
import { preserveEducationDetailsFromSources } from "@/lib/education-preservation";
import { isOpenAiConfigured } from "@/lib/openai-config";
import { extractPdfText } from "@/lib/pdf-parser";
import { parseResumeTextToResumeData } from "@/lib/resume-from-text";
import { runResumeParseDiagnostics } from "@/lib/resume-parse-diagnostics";

const maxPdfSizeBytes = 10 * 1024 * 1024;

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "请上传一个 PDF 文件。" },
        { status: 400 },
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "PDF 文件为空。" }, { status: 400 });
    }

    if (file.size > maxPdfSizeBytes) {
      return NextResponse.json(
        { error: "PDF 文件过大，请上传 10MB 以内的简历。" },
        { status: 400 },
      );
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return NextResponse.json(
        { error: "文件类型不正确，请上传 PDF。" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = await extractPdfText(buffer);
    const parsed = await parseResume(rawText);
    const educationProtected = preserveEducationDetailsFromSources(parsed.resume);
    const filtered = filterDeprecatedProjects(educationProtected);
    const diagnostics = runResumeParseDiagnostics({
      rawText,
      parsedResume: filtered.resumeData,
      removedDeprecatedProjects: filtered.removedProjects,
    });

    return NextResponse.json({
      resume: filtered.resumeData,
      rawText,
      warnings: parsed.warnings,
      parser: parsed.parser,
      parseDiagnostics: diagnostics,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "PDF 解析失败，请换一个文件重试。";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function parseResume(rawText: string): Promise<{
  resume: ReturnType<typeof parseResumeTextToResumeData>["resume"];
  warnings: string[];
  parser: "ai" | "rule";
}> {
  if (isOpenAiConfigured()) {
    try {
      const parsed = await parseResumeWithAI(rawText);

      return {
        ...parsed,
        parser: "ai",
      };
    } catch (error) {
      const fallback = parseResumeTextToResumeData(rawText);
      const message =
        error instanceof Error ? error.message : "AI 解析失败，已回退规则解析。";

      return {
        resume: fallback.resume,
        warnings: [
          "AI 解析失败，已自动回退到规则解析。",
          "当前为规则解析，项目字段可能需要更多人工整理。",
          message,
          ...fallback.warnings,
        ],
        parser: "rule",
      };
    }
  }

  const fallback = parseResumeTextToResumeData(rawText);

  return {
    resume: fallback.resume,
    warnings: [
      "当前为规则解析，项目字段可能需要更多人工整理。",
      ...fallback.warnings,
    ],
    parser: "rule",
  };
}
