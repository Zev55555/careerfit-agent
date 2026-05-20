"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { WandSparkles } from "lucide-react";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { AnalysisProgress } from "@/components/AnalysisProgress";
import { ChangeLogPanel } from "@/components/ChangeLogPanel";
import { CustomRoleInput } from "@/components/CustomRoleInput";
import { EmptyResumePreview } from "@/components/EmptyResumePreview";
import { JDAnalysisResultPanel } from "@/components/JDAnalysisResultPanel";
import { JDInput } from "@/components/JDInput";
import { LiquidButton } from "@/components/LiquidButton";
import { MasterResumeActions } from "@/components/MasterResumeActions";
import { NextStepButton } from "@/components/NextStepButton";
import { ResumeEditor } from "@/components/ResumeEditor";
import { ResumePreview } from "@/components/ResumePreview";
import { ResumeUploader } from "@/components/ResumeUploader";
import { RoleSelector } from "@/components/RoleSelector";
import { TailorProgress } from "@/components/TailorProgress";
import { WorkflowPanelHeader } from "@/components/WorkflowPanelHeader";
import {
  WorkflowStatusCard,
  type WorkflowStatusItem,
} from "@/components/WorkflowStatusCard";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import { WorkspaceSidePanel } from "@/components/WorkspaceSidePanel";
import {
  WorkspaceTabs,
  type WorkspacePanel,
} from "@/components/WorkspaceTabs";
import {
  emptyCustomRoleInput,
  getCustomRoleLabel,
  hasCustomRoleIntent,
  normalizeCustomRoleInput,
  type CustomRoleInput as CustomRoleInputValue,
} from "@/lib/custom-role";
import type { PageFitStatus } from "@/lib/fit-one-page";
import { DEFAULT_FAST_MODEL, getModelTierLabel } from "@/lib/model-config";
import { normalizeResumeProfileLinks } from "@/lib/profile-links";
import type { JDAnalysisResult } from "@/lib/role-classifier";
import type { ResumeParseDiagnostics } from "@/lib/resume-parse-diagnostics";
import {
  apiRoleLabels,
  apiRoleToDirection,
  directionToApiRole,
} from "@/lib/role-classifier";
import { roleLabels } from "@/lib/role-strategy";
import type {
  ResumeData,
  RoleDirection,
  TailorChangeLog,
} from "@/lib/resume-schema";
import { validateResumeData } from "@/lib/validation";

const masterStorageKey = "zev-ai-resume-agent.masterResume";
const fallbackModelStatusLabel = `${getModelTierLabel("fast")} / ${DEFAULT_FAST_MODEL}`;

type ResumeWorkspaceProps = {
  projectCount: number;
};

type UploadResumeResponse =
  | {
      resume: ResumeData;
      rawText: string;
      warnings: string[];
      parser: "ai" | "rule";
      parseDiagnostics?: ResumeParseDiagnostics;
    }
  | { error?: string };

type AiStatus = {
  configured: boolean;
  model: string;
  tier?: "fast" | "deep";
  tierLabel?: string;
  modelStatusLabel?: string;
};

type TailorResumeResponse =
  | {
      tailoredResume: ResumeData;
      changeLog: TailorChangeLog;
      tailor?: "ai" | "mock";
      fallbackReason?: string;
    }
  | { error?: string };

type MasterSource = "default" | "pdf" | "local" | "json";

export function ResumeWorkspace({ projectCount }: ResumeWorkspaceProps) {
  const [uploadedResume, setUploadedResume] = useState<ResumeData | null>(null);
  const [editableResume, setEditableResume] = useState<ResumeData | null>(null);
  const [lockedMasterResume, setLockedMasterResume] =
    useState<ResumeData | null>(null);
  const [currentPreviewResume, setCurrentPreviewResume] =
    useState<ResumeData | null>(null);
  const [tailoredResume, setTailoredResume] = useState<ResumeData | null>(null);

  const [resumeFileName, setResumeFileName] = useState("");
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadWarnings, setUploadWarnings] = useState<string[]>([]);
  const [rawTextPreview, setRawTextPreview] = useState("");
  const [uploadParser, setUploadParser] = useState<"ai" | "rule" | null>(null);
  const [parseDiagnostics, setParseDiagnostics] =
    useState<ResumeParseDiagnostics | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [hasStoredMaster, setHasStoredMaster] = useState(false);
  const [masterSource, setMasterSource] = useState<MasterSource>("default");

  const [jdText, setJdText] = useState("");
  const [selectedRole, setSelectedRole] =
    useState<RoleDirection>("ai_product_manager");
  const [customRoleInput, setCustomRoleInput] =
    useState<CustomRoleInputValue>(emptyCustomRoleInput);
  const [customRoleError, setCustomRoleError] = useState("");
  const [jdAnalysis, setJdAnalysis] = useState<JDAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgressStatus, setAnalysisProgressStatus] = useState<
    "idle" | "running" | "success" | "error"
  >("idle");

  const [changeLog, setChangeLog] = useState<TailorChangeLog | null>(null);
  const [tailorError, setTailorError] = useState("");
  const [isTailoring, setIsTailoring] = useState(false);
  const [tailorSource, setTailorSource] = useState<"ai" | "mock" | null>(null);
  const [tailorFallbackReason, setTailorFallbackReason] = useState("");
  const [tailorProgressStatus, setTailorProgressStatus] = useState<
    "idle" | "running" | "success" | "error"
  >("idle");

  const [pageFitStatus, setPageFitStatus] = useState<PageFitStatus | null>(null);
  const [exportError, setExportError] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [activePanel, setActivePanel] = useState<WorkspacePanel>("master");
  const pdfImportInputRef = useRef<HTMLInputElement | null>(null);
  const jsonImportInputRef = useRef<HTMLInputElement | null>(null);

  const validation = useMemo(
    () =>
      currentPreviewResume
        ? validateResumeData(currentPreviewResume)
        : { ok: false, issues: ["尚未导入 Master 简历。"] },
    [currentPreviewResume],
  );
  const suggestedCompressionProjects = useMemo(
    () =>
      changeLog?.weakenedProjects.map((project) => project.projectName) ?? [],
    [changeLog],
  );

  const isMasterLocked = Boolean(lockedMasterResume);
  const masterDownloadSource =
    lockedMasterResume ?? editableResume ?? currentPreviewResume;
  const masterStatus = isMasterLocked
    ? "已锁定 Master"
    : uploadedResume
      ? "已解析待锁定"
      : hasStoredMaster
        ? "已从本地恢复"
        : "未上传";
  const currentDirection =
    selectedRole === "custom_role"
      ? getCustomRoleLabel(customRoleInput)
      : roleLabels[selectedRole];
  const modelLabel = aiStatus
    ? aiStatus.configured
      ? (aiStatus.modelStatusLabel ?? aiStatus.model)
      : `${aiStatus.modelStatusLabel ?? fallbackModelStatusLabel} · 规则解析`
    : "检测中";
  const previewStatus = !currentPreviewResume
    ? "等待导入"
    : tailoredResume
      ? "定制预览"
      : isMasterLocked
        ? "Master 预览"
        : "解析预览";

  useEffect(() => {
    let isMounted = true;

    fetch("/api/ai-status")
      .then((response) => response.json())
      .then((payload: AiStatus) => {
        if (isMounted) {
          setAiStatus(payload);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAiStatus({
            configured: false,
            model: DEFAULT_FAST_MODEL,
            tier: "fast",
            tierLabel: getModelTierLabel("fast"),
            modelStatusLabel: fallbackModelStatusLabel,
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    queueMicrotask(() => {
      if (isCancelled) {
        return;
      }

      try {
        const stored = window.localStorage.getItem(masterStorageKey);

        if (!stored) {
          return;
        }

        const parsed = JSON.parse(stored) as ResumeData;
        const validationResult = validateResumeData(parsed);

        if (!validationResult.ok) {
          window.localStorage.removeItem(masterStorageKey);
          setHasStoredMaster(false);
          return;
        }

        const restoredMaster = markAsLockedMaster(parsed);

        setUploadedResume(restoredMaster);
        setEditableResume(restoredMaster);
        setLockedMasterResume(restoredMaster);
        setCurrentPreviewResume(restoredMaster);
        setHasStoredMaster(true);
        setMasterSource("local");
        setActivePanel("jd");
        setUploadMessage("已从本地缓存恢复 Master 简历。");
      } catch {
        window.localStorage.removeItem(masterStorageKey);
        setHasStoredMaster(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  async function handleResumeFileSelected(file: File | null) {
    if (!file) {
      return;
    }

    setResumeFileName(file.name);
    setIsUploadingResume(true);
    setUploadMessage("");
    setUploadError("");
    setUploadWarnings([]);
    setRawTextPreview("");
    setUploadParser(null);
    setParseDiagnostics(null);
    setUploadedResume(null);
    setEditableResume(null);
    setTailoredResume(null);
    setChangeLog(null);
    setTailorSource(null);
    setTailorFallbackReason("");
    setJdAnalysis(null);
    setAnalysisError("");
    setTailorError("");
    setExportError("");
    setActivePanel("master");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload-resume", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as UploadResumeResponse;

      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "PDF 解析失败，请换一个文件重试。",
        );
      }

      if ("resume" in payload) {
        const normalizedResume = normalizeResumeProfileLinks(payload.resume);

        setUploadedResume(normalizedResume);
        setEditableResume(normalizedResume);
        setLockedMasterResume(null);
        setCurrentPreviewResume(normalizedResume);
        setMasterSource("pdf");
        setTailoredResume(null);
        setChangeLog(null);
        setTailorSource(null);
        setTailorFallbackReason("");
        setJdAnalysis(null);
        setAnalysisError("");
        setTailorError("");
        setExportError("");
        setUploadWarnings(payload.warnings);
        setRawTextPreview(payload.rawText.slice(0, 1200));
        setUploadParser(payload.parser);
        setParseDiagnostics(payload.parseDiagnostics ?? null);
        setUploadMessage(
          payload.parser === "ai"
            ? "已通过 AI 解析生成临时 resume-master，可先整理解析结果，再粘贴 JD 生成定制版本。"
            : "已通过规则解析生成临时 resume-master，可先重点检查项目字段，再粘贴 JD 生成定制版本。",
        );
      }
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "PDF 解析失败，请换一个文件重试。",
      );
    } finally {
      setIsUploadingResume(false);
    }
  }

  function handleSaveEditedResume() {
    if (!editableResume) {
      return;
    }

    const normalizedResume = normalizeResumeProfileLinks(editableResume);

    setEditableResume(normalizedResume);
    setCurrentPreviewResume(normalizedResume);
    setTailoredResume(null);
    setChangeLog(null);
    setTailorSource(null);
    setTailorFallbackReason("");
    setExportError("");
    setUploadMessage("整理结果已保存，右侧预览已更新。");
  }

  function handleResetEditedResume() {
    if (!uploadedResume) {
      return;
    }

    setEditableResume(uploadedResume);
    setCurrentPreviewResume(uploadedResume);
    setTailoredResume(null);
    setChangeLog(null);
    setTailorSource(null);
    setTailorFallbackReason("");
    setLockedMasterResume(null);
    setUploadMessage("已重置为 PDF 原始解析结果。");
  }

  function handlePreviewResumeChange(nextResume: ResumeData) {
    const normalizedResume = normalizeResumeProfileLinks(nextResume);

    setCurrentPreviewResume(normalizedResume);
    setExportError("");

    if (tailoredResume) {
      setTailoredResume(normalizedResume);
      return;
    }

    setEditableResume(normalizedResume);

    if (lockedMasterResume) {
      const nextMaster = markAsLockedMaster(normalizedResume);

      setLockedMasterResume(nextMaster);
      setCurrentPreviewResume(nextMaster);
      saveMasterToLocalStorage(nextMaster);
      setHasStoredMaster(true);
    }
  }

  function handleLockMaster() {
    const sourceResume = editableResume ?? currentPreviewResume;

    if (!sourceResume) {
      setUploadError("请先上传 PDF 或导入 Master JSON。");
      return;
    }

    const nextMaster = markAsLockedMaster(sourceResume);

    setLockedMasterResume(nextMaster);
    setEditableResume(nextMaster);
    setCurrentPreviewResume(nextMaster);
    setTailoredResume(null);
    setChangeLog(null);
    setTailorSource(null);
    setTailorFallbackReason("");
    saveMasterToLocalStorage(nextMaster);
    setHasStoredMaster(true);
    setActivePanel("jd");
    setUploadMessage("当前整理结果已作为本次会话的 Master 简历。");
  }

  function handleImportMaster(resume: ResumeData) {
    const importedMaster = markAsLockedMaster(resume);

    setUploadedResume(importedMaster);
    setEditableResume(importedMaster);
    setLockedMasterResume(importedMaster);
    setCurrentPreviewResume(importedMaster);
    setTailoredResume(null);
    setChangeLog(null);
    setTailorSource(null);
    setTailorFallbackReason("");
    setJdAnalysis(null);
    setAnalysisError("");
    setTailorError("");
    setExportError("");
    setUploadError("");
    setUploadWarnings([]);
    setRawTextPreview("");
    setResumeFileName("");
    saveMasterToLocalStorage(importedMaster);
    setHasStoredMaster(true);
    setMasterSource("json");
    setActivePanel("jd");
    setUploadMessage("已导入 Master 简历。");
  }

  async function handleImportMasterJsonFile(file: File | null) {
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as ResumeData;
      const validationResult = validateResumeData(parsed);

      if (!validationResult.ok) {
        throw new Error(`ResumeData 校验失败：${validationResult.issues.join("；")}`);
      }

      handleImportMaster(parsed);
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "导入失败，请确认文件是有效的 resume-master.json。",
      );
    }
  }

  function handleClearLocalMaster() {
    window.localStorage.removeItem(masterStorageKey);
    setUploadedResume(null);
    setEditableResume(null);
    setLockedMasterResume(null);
    setCurrentPreviewResume(null);
    setTailoredResume(null);
    setChangeLog(null);
    setTailorSource(null);
    setTailorFallbackReason("");
    setJdAnalysis(null);
    setAnalysisError("");
    setTailorError("");
    setExportError("");
    setPageFitStatus(null);
    setUploadWarnings([]);
    setRawTextPreview("");
    setUploadParser(null);
    setParseDiagnostics(null);
    setResumeFileName("");
    setHasStoredMaster(false);
    setMasterSource("default");
    setActivePanel("master");
    setUploadMessage("已清除本地 Master，当前等待导入简历。");
  }

  async function handleAnalyzeJd() {
    const normalizedCustomRoleInput = normalizeCustomRoleInput(customRoleInput);

    if (
      selectedRole === "custom_role" &&
      !hasCustomRoleIntent(normalizedCustomRoleInput)
    ) {
      setCustomRoleError("请填写自定义岗位名称或修改偏好。");
      return;
    }

    setCustomRoleInput(normalizedCustomRoleInput);
    setCustomRoleError("");
    setIsAnalyzing(true);
    setAnalysisProgressStatus("running");
    setAnalysisError("");
    const startedAt = Date.now();

    try {
      const response = await fetch("/api/analyze-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jdText,
          selectedRole: directionToApiRole[selectedRole],
          customRoleInput: normalizedCustomRoleInput,
          currentResume: currentPreviewResume,
        }),
      });
      const payload = (await response.json()) as
        | JDAnalysisResult
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "JD 分析失败，请检查输入。",
        );
      }

      const result = payload as JDAnalysisResult;
      await waitForMinimumProgressTime(startedAt, 700);
      setJdAnalysis(result);
      if (
        selectedRole === "custom_role" ||
        selectedRole === "auto_detect_role"
      ) {
        setSelectedRole(selectedRole);
      } else if (result.primaryRole !== "OTHER") {
        setSelectedRole(apiRoleToDirection[result.primaryRole]);
      }
      setTailorError("");
      setExportError("");
      setAnalysisProgressStatus("success");
      setActivePanel("tailor");
      window.setTimeout(() => {
        setAnalysisProgressStatus((status) =>
          status === "success" ? "idle" : status,
        );
      }, 1200);
    } catch (error) {
      setJdAnalysis(null);
      setAnalysisError(
        error instanceof Error ? error.message : "JD 分析失败，请检查输入。",
      );
      setAnalysisProgressStatus("error");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleTailorResume() {
    if (!jdAnalysis) {
      setTailorError("请先分析 JD，再生成定制简历。");
      return;
    }

    if (
      jdAnalysis.roleMismatch?.severity === "high" &&
      !window.confirm(
        "当前 JD 与所选方向明显不一致。继续按当前方向定制可能导致简历偏题。是否继续？",
      )
    ) {
      return;
    }

    const normalizedCustomRoleInput = normalizeCustomRoleInput(customRoleInput);

    if (
      selectedRole === "custom_role" &&
      !hasCustomRoleIntent(normalizedCustomRoleInput)
    ) {
      setCustomRoleError("请填写自定义岗位名称或修改偏好。");
      return;
    }

    setCustomRoleInput(normalizedCustomRoleInput);
    setCustomRoleError("");
    setIsTailoring(true);
    setTailorProgressStatus("running");
    setTailorError("");
    setTailorSource(null);
    setTailorFallbackReason("");
    const startedAt = Date.now();
    const sourceResume = getTailorSourceResume({
      lockedMasterResume,
      editableResume,
    });

    if (!sourceResume) {
      setTailorError("请先上传 PDF 或导入 Master JSON，再生成定制简历。");
      setIsTailoring(false);
      setTailorProgressStatus("error");
      return;
    }

    try {
      const response = await fetch("/api/tailor-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jdText,
          selectedRole: directionToApiRole[selectedRole],
          customRoleInput: normalizedCustomRoleInput,
          analysisResult: jdAnalysis,
          resume: sourceResume,
        }),
      });
      const payload = (await response.json()) as TailorResumeResponse;

      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "简历定制生成失败，请检查输入。",
        );
      }

      if ("tailoredResume" in payload) {
        await waitForMinimumProgressTime(startedAt, 700);
        const normalizedTailoredResume = normalizeResumeProfileLinks(
          payload.tailoredResume,
        );

        setTailoredResume(normalizedTailoredResume);
        setCurrentPreviewResume(normalizedTailoredResume);
        setChangeLog(payload.changeLog);
        setTailorSource(payload.tailor ?? null);
        setTailorFallbackReason(payload.fallbackReason ?? "");
        setExportError("");
        setTailorProgressStatus("success");
        setActivePanel("export");
        window.setTimeout(() => {
          setTailorProgressStatus((status) =>
            status === "success" ? "idle" : status,
          );
        }, 1200);
      }
    } catch (error) {
      setTailorSource(null);
      setTailorFallbackReason("");
      setTailorError(
        error instanceof Error
          ? error.message
          : "简历定制生成失败，请检查输入。",
      );
      setTailorProgressStatus("error");
    } finally {
      setIsTailoring(false);
    }
  }

  async function handleExportPdf() {
    if (!currentPreviewResume) {
      setExportError("请先上传 PDF 或导入 Master JSON，再导出 PDF。");
      return;
    }

    if (
      pageFitStatus &&
      !pageFitStatus.fitsOnePage &&
      !window.confirm("当前内容可能超出一页，是否仍然导出？")
    ) {
      return;
    }

    setIsExporting(true);
    setExportError("");

    try {
      const response = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: currentPreviewResume,
          fileName: buildPdfFileName(currentPreviewResume, selectedRole),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "PDF 导出失败，请稍后重试。");
      }

      const blob = await response.blob();
      downloadBlob(
        blob,
        getDownloadFileName(response, selectedRole, currentPreviewResume),
      );
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : "PDF 导出失败，请稍后重试。",
      );
    } finally {
      setIsExporting(false);
    }
  }

  const masterStatusItems = buildMasterStatusItems({
    hasMaster: Boolean(lockedMasterResume ?? editableResume),
    masterSource,
    isMasterLocked,
    parser: uploadParser,
  });
  const jdStatusItems = buildJdStatusItems({
    hasJdText: jdText.trim().length > 0,
    currentDirection,
    jdAnalysis,
  });
  const tailorStatusItems = buildTailorStatusItems({
    tailoredResume,
    tailorSource,
    changeLog,
  });
  const exportStatusItems = buildExportStatusItems({
    pageFitStatus,
    isExporting,
    hasTailoredResume: Boolean(tailoredResume),
  });

  return (
    <main className="liquid-workspace h-screen overflow-hidden text-zinc-950">
      <input
        ref={pdfImportInputRef}
        className="sr-only"
        type="file"
        accept="application/pdf"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          void handleResumeFileSelected(file);
          event.target.value = "";
        }}
      />
      <input
        ref={jsonImportInputRef}
        className="sr-only"
        type="file"
        accept="application/json,.json"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          void handleImportMasterJsonFile(file);
          event.target.value = "";
        }}
      />
      <WorkspaceHeader
        masterStatus={masterStatus}
        currentDirection={currentDirection}
        modelLabel={modelLabel}
        previewStatus={previewStatus}
      />

      <div className="mx-auto grid h-[calc(100vh-4rem)] min-h-0 max-w-[1600px] gap-4 overflow-y-auto p-4 lg:grid-cols-[320px_minmax(760px,1fr)] lg:overflow-hidden 2xl:grid-cols-[300px_minmax(780px,1fr)_440px]">
        <aside className="liquid-panel order-3 flex min-h-[520px] flex-col overflow-hidden rounded-[28px] lg:col-span-2 lg:min-h-0 2xl:order-3 2xl:col-span-1">
          <div className="sticky top-0 z-20 border-b border-white/60 bg-white/45 p-3 backdrop-blur-xl">
            <WorkspaceTabs
              activePanel={activePanel}
              onChange={setActivePanel}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {activePanel === "master" ? (
              <div className="grid gap-4">
                <WorkflowPanelHeader
                  eyebrow="Step 1"
                  title="准备 Master 简历"
                  description={`上传原始简历，整理为本次会话的 Master 数据。后续所有 JD 定制都会基于它生成。当前素材库包含 ${projectCount} 个项目。`}
                />
                <WorkflowStatusCard title="当前状态" items={masterStatusItems} />
                <ResumeUploader
                  fileName={resumeFileName}
                  isUploading={isUploadingResume}
                  uploadMessage={uploadMessage}
                  uploadError={uploadError}
                  warnings={uploadWarnings}
                  parseDiagnostics={parseDiagnostics}
                  rawTextPreview={rawTextPreview}
                  aiStatus={aiStatus}
                  parser={uploadParser}
                  canLock={Boolean(editableResume)}
                  isLocked={isMasterLocked}
                  onFileSelected={handleResumeFileSelected}
                  onLockMaster={handleLockMaster}
                />
                <MasterResumeActions
                  resumeToDownload={masterDownloadSource}
                  hasLocalMaster={hasStoredMaster}
                  onImport={handleImportMaster}
                  onClear={handleClearLocalMaster}
                  onError={setUploadError}
                />
                {editableResume ? (
                  <details className="liquid-section rounded-[20px]">
                    <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-950">
                      展开编辑 Master 简历
                    </summary>
                    <div className="border-t border-zinc-200 p-4">
                      <ResumeEditor
                        resume={editableResume}
                        canReset={Boolean(uploadedResume)}
                        isLocked={isMasterLocked}
                        onChange={(nextResume) => {
                          setEditableResume(nextResume);
                          setLockedMasterResume(null);
                        }}
                        onSave={handleSaveEditedResume}
                        onReset={handleResetEditedResume}
                        onLock={handleLockMaster}
                      />
                    </div>
                  </details>
                ) : (
                  <EmptyState text="还没有可编辑的 Master。你可以先上传 PDF，或导入已有 resume-master.json。" />
                )}
                <NextStepButton
                  disabled={!lockedMasterResume && !editableResume}
                  helperText={
                    lockedMasterResume
                      ? "Master 已锁定，可以进入 JD 分析。"
                      : "建议先保存并锁定 Master，再进入下一步。"
                  }
                  onClick={() => setActivePanel("jd")}
                >
                  去分析 JD
                </NextStepButton>
              </div>
            ) : null}

            {activePanel === "jd" ? (
              <div className="grid gap-4">
                <WorkflowPanelHeader
                  eyebrow="Step 2"
                  title="分析目标岗位"
                  description="粘贴 JD，系统会判断岗位类型、筛选画像、匹配项目和风险点。"
                />
                <WorkflowStatusCard title="当前状态" items={jdStatusItems} />
                {!lockedMasterResume && !editableResume ? (
                  <EmptyState text="建议先准备 Master 简历，再进行 JD 分析。" />
                ) : null}
                <RoleSelector
                  value={selectedRole}
                  customRoleLabel={getCustomRoleLabel(customRoleInput)}
                  onChange={(nextRole) => {
                    setSelectedRole(nextRole);
                    setCustomRoleError("");
                  }}
                />
                {selectedRole === "custom_role" ? (
                  <CustomRoleInput
                    value={customRoleInput}
                    error={customRoleError}
                    onChange={(nextInput) => {
                      setCustomRoleInput(nextInput);
                      if (hasCustomRoleIntent(nextInput)) {
                        setCustomRoleError("");
                      }
                    }}
                  />
                ) : null}
                <JDInput
                  value={jdText}
                  isAnalyzing={isAnalyzing}
                  onAnalyze={handleAnalyzeJd}
                  onChange={setJdText}
                />
                <AnalysisProgress status={analysisProgressStatus} />
                <JDAnalysisResultPanel
                  result={jdAnalysis}
                  error={analysisError}
                />
                <AnalysisPanel
                  selectedRole={selectedRole}
                  jdText={jdText}
                  validation={validation}
                />
                <NextStepButton
                  disabled={!jdAnalysis}
                  helperText={
                    jdAnalysis
                      ? "分析已完成，可以进入定制生成。"
                      : "完成 JD 分析后，这里会引导你进入定制摘要。"
                  }
                  onClick={() => setActivePanel("tailor")}
                >
                  去生成定制简历
                </NextStepButton>
              </div>
            ) : null}

            {activePanel === "tailor" ? (
              <div className="grid gap-4">
                <WorkflowPanelHeader
                  eyebrow="Step 3"
                  title="生成定制版本"
                  description="根据 JD 策略改写技能区和项目 bullet，并保留真实性检查与一页预算。"
                />
                <WorkflowStatusCard
                  title="当前状态"
                  items={tailorStatusItems}
                />
                {!jdAnalysis ? (
                  <EmptyState text="请先完成 JD 分析，系统会根据岗位策略生成定制版本。" />
                ) : null}
                <LiquidButton
                  type="button"
                  size="lg"
                  fullWidth
                  disabled={!jdAnalysis || isTailoring}
                  loading={isTailoring}
                  onClick={handleTailorResume}
                >
                  <WandSparkles className="h-4 w-4" aria-hidden="true" />
                  {isTailoring ? "生成中..." : "生成定制简历"}
                </LiquidButton>
                <TailorProgress status={tailorProgressStatus} />
                <ChangeLogPanel
                  changeLog={changeLog}
                  error={tailorError}
                  tailorSource={tailorSource}
                  fallbackReason={tailorFallbackReason}
                />
                <NextStepButton
                  disabled={!tailoredResume}
                  helperText={
                    tailoredResume
                      ? "定制版本已生成，可以检查一页适配并导出。"
                      : "生成定制简历后，这里会引导你进入导出检查。"
                  }
                  onClick={() => setActivePanel("export")}
                >
                  去检查并导出
                </NextStepButton>
              </div>
            ) : null}

            {activePanel === "export" ? (
              <div className="grid gap-4">
                <WorkflowPanelHeader
                  eyebrow="Step 4"
                  title="检查并导出 PDF"
                  description="确认一页适配、版面安全和最终 PDF 导出。右侧状态栏会持续显示导出入口和一页检查。"
                />
                <WorkflowStatusCard title="当前状态" items={exportStatusItems} />
                {!tailoredResume ? (
                  <EmptyState text="你可以先导出当前 Master，或在生成定制简历后导出岗位版本。" />
                ) : null}
                <div className="liquid-section rounded-[20px] p-4 text-sm leading-6 text-slate-600">
                  PageFitStatus 和导出 PDF 已移动到右侧状态栏，避免中间预览顶部出现过长工具条。
                </div>
              </div>
            ) : null}
          </div>
        </aside>

        <section className="liquid-panel order-2 flex min-h-[620px] min-w-0 flex-col overflow-hidden rounded-[28px] lg:min-h-0">
          <div className="shrink-0 border-b border-white/60 bg-white/42 px-4 py-3 backdrop-blur-xl">
            <h2 className="text-sm font-semibold text-zinc-950">
              A4 简历预览
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              固定模板渲染当前 ResumeData，导出和一页状态在右侧栏查看。
            </p>
          </div>

          <div className="min-h-0 flex-1 p-2">
            {currentPreviewResume ? (
              <ResumePreview
                editable
                resume={currentPreviewResume}
                fitStatus={pageFitStatus}
                suggestedCompressionProjects={suggestedCompressionProjects}
                onResumeChange={handlePreviewResumeChange}
                onFitStatusChange={setPageFitStatus}
                showChrome={false}
              />
            ) : (
              <EmptyResumePreview
                onImportResume={() => {
                  setActivePanel("master");
                  pdfImportInputRef.current?.click();
                }}
                onImportJson={() => {
                  setActivePanel("master");
                  jsonImportInputRef.current?.click();
                }}
              />
            )}
          </div>
        </section>

        <WorkspaceSidePanel
          className="order-1 lg:col-span-2 2xl:col-span-1"
          activePanel={activePanel}
          currentDirection={currentDirection}
          jdAnalysis={jdAnalysis}
          masterStatus={masterStatus}
          modelLabel={modelLabel}
          previewStatus={previewStatus}
          pageFitStatus={pageFitStatus}
          suggestedCompressionProjects={suggestedCompressionProjects}
          isExporting={isExporting}
          exportError={exportError}
          onExport={handleExportPdf}
          onPanelChange={setActivePanel}
        />
      </div>
    </main>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[20px] border border-dashed border-white/70 bg-white/45 px-4 py-3 text-sm leading-6 text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
      {text}
    </div>
  );
}

function buildMasterStatusItems({
  hasMaster,
  masterSource,
  isMasterLocked,
  parser,
}: {
  hasMaster: boolean;
  masterSource: MasterSource;
  isMasterLocked: boolean;
  parser: "ai" | "rule" | null;
}): WorkflowStatusItem[] {
  const sourceLabel: Record<MasterSource, string> = {
    default: "未上传",
    pdf: parser === "ai" ? "PDF · AI 解析" : "PDF · 规则解析",
    local: "本地缓存恢复",
    json: "导入 JSON",
  };

  return [
    {
      label: "Master 数据",
      value: hasMaster ? "已准备" : "未准备",
      tone: hasMaster ? "success" : "warning",
    },
    { label: "来源", value: sourceLabel[masterSource] },
    {
      label: "锁定状态",
      value: isMasterLocked ? "已锁定" : "未锁定",
      tone: isMasterLocked ? "success" : "warning",
    },
  ];
}

function buildJdStatusItems({
  hasJdText,
  currentDirection,
  jdAnalysis,
}: {
  hasJdText: boolean;
  currentDirection: string;
  jdAnalysis: JDAnalysisResult | null;
}): WorkflowStatusItem[] {
  const mismatch = jdAnalysis?.roleMismatch;
  const hasHighRisk =
    mismatch?.severity === "high" ||
    (jdAnalysis?.coverageCheck.overPackagingRisks.length ?? 0) > 0;

  return [
    {
      label: "JD 输入",
      value: hasJdText ? "已输入" : "未输入",
      tone: hasJdText ? "success" : "warning",
    },
    { label: "当前方向", value: currentDirection },
    {
      label: "分析状态",
      value: jdAnalysis ? "已完成" : "未分析",
      tone: jdAnalysis ? "success" : "warning",
    },
    {
      label: "风险 / 冲突",
      value: hasHighRisk ? "需要注意" : "未发现明显高风险",
      tone: hasHighRisk ? "danger" : "success",
    },
  ];
}

function buildTailorStatusItems({
  tailoredResume,
  tailorSource,
  changeLog,
}: {
  tailoredResume: ResumeData | null;
  tailorSource: "ai" | "mock" | null;
  changeLog: TailorChangeLog | null;
}): WorkflowStatusItem[] {
  const truthPassed = changeLog?.truthCheck.passed;
  const hasBudgetAction = Boolean(
    changeLog &&
      [
        ...changeLog.summaryChanges,
        ...changeLog.riskWarnings,
        ...changeLog.weakenedProjects.flatMap((project) => project.changes),
      ].some((item) => /一页|预算|压缩|移除|删除/.test(item)),
  );

  return [
    {
      label: "定制版本",
      value: tailoredResume ? "已生成" : "未生成",
      tone: tailoredResume ? "success" : "warning",
    },
    {
      label: "生成来源",
      value: tailorSource ? (tailorSource === "ai" ? "AI 定制" : "Mock 定制") : "暂无",
    },
    {
      label: "真实性检查",
      value:
        truthPassed === undefined ? "暂无" : truthPassed ? "通过" : "存在风险",
      tone:
        truthPassed === undefined ? "neutral" : truthPassed ? "success" : "danger",
    },
    {
      label: "一页预算",
      value: hasBudgetAction ? "已执行" : tailoredResume ? "已检查" : "暂无",
      tone: tailoredResume ? "success" : "neutral",
    },
  ];
}

function buildExportStatusItems({
  pageFitStatus,
  isExporting,
  hasTailoredResume,
}: {
  pageFitStatus: PageFitStatus | null;
  isExporting: boolean;
  hasTailoredResume: boolean;
}): WorkflowStatusItem[] {
  const fitsOnePage = pageFitStatus?.fitsOnePage;

  return [
    {
      label: "导出内容",
      value: hasTailoredResume ? "定制版本" : "当前 Master / 预览",
    },
    {
      label: "一页适配",
      value:
        fitsOnePage === undefined ? "检查中" : fitsOnePage ? "适合一页" : "可能溢出",
      tone:
        fitsOnePage === undefined ? "neutral" : fitsOnePage ? "success" : "warning",
    },
    {
      label: "底部安全",
      value:
        pageFitStatus && !pageFitStatus.fitsOnePage
          ? `超出约 ${pageFitStatus.overflowPx}px`
          : "暂无明显风险",
      tone: pageFitStatus && !pageFitStatus.fitsOnePage ? "warning" : "success",
    },
    {
      label: "导出状态",
      value: isExporting ? "导出中" : "可以导出",
      tone: isExporting ? "warning" : "success",
    },
  ];
}

function getTailorSourceResume({
  lockedMasterResume,
  editableResume,
}: {
  lockedMasterResume: ResumeData | null;
  editableResume: ResumeData | null;
}) {
  return lockedMasterResume ?? editableResume;
}

function waitForMinimumProgressTime(startedAt: number, minimumMs: number) {
  const elapsed = Date.now() - startedAt;
  const remaining = Math.max(0, minimumMs - elapsed);

  return new Promise((resolve) => window.setTimeout(resolve, remaining));
}

function markAsLockedMaster(resume: ResumeData): ResumeData {
  const normalizedResume = normalizeResumeProfileLinks(resume);

  return {
    ...normalizedResume,
    meta: {
      ...normalizedResume.meta,
      templateLocked: true,
      lastUpdated: new Date().toISOString().slice(0, 10),
    },
  };
}

function saveMasterToLocalStorage(resume: ResumeData) {
  window.localStorage.setItem(masterStorageKey, JSON.stringify(resume));
}

function buildPdfFileName(resume: ResumeData, selectedRole: RoleDirection) {
  const candidateName = resume.profile.name.trim() || "Zev";
  const roleLabel = apiRoleLabels[directionToApiRole[selectedRole]]
    .replace(/\s*\/\s*/g, "_")
    .replace(/\s+/g, "");

  return `${candidateName}_${roleLabel}_定制简历.pdf`;
}

function getDownloadFileName(
  response: Response,
  selectedRole: RoleDirection,
  resume: ResumeData,
) {
  const disposition = response.headers.get("Content-Disposition");
  const utf8Match = disposition?.match(/filename\*=UTF-8''([^;]+)/);

  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  return buildPdfFileName(resume, selectedRole);
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
