"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Bot,
  Download,
  FileText,
  Gauge,
  Home,
  KeyRound,
  PenLine,
  Save,
  Search,
  Send,
  Sparkles,
  Trash2,
  Upload,
  UsersRound,
  WandSparkles
} from "lucide-react";

import { InkosAgentFeed } from "@/components/inkos-agent-feed";
import { InkosAnalyticsPanel } from "@/components/inkos-analytics-panel";
import { chapterCount, formatZhNumber, InkosBookList, InkosBookListCompact, totalWords } from "@/components/inkos-book-list";
import { InkosChapterReader } from "@/components/inkos-chapter-reader";
import { InkosDaemonPanel } from "@/components/inkos-daemon-panel";
import { InkosMarkdown } from "@/components/inkos-markdown";
import { InkosModelSelector } from "@/components/inkos-model-selector";
import { InkosRadarPanel } from "@/components/inkos-radar-panel";
import { InkosSessionSidebar } from "@/components/inkos-session-sidebar";
import {
  approveChapter,
  auditChapter,
  deleteBook,
  exportBook,
  exportWorkspace,
  getBook,
  getBookAnalytics,
  getChapter,
  getNovelStatus,
  getRadarHistory,
  getTruthFile,
  importWorkspace,
  listBooks,
  listTruthFiles,
  rejectChapter,
  reviseChapter,
  runRadarScan,
  saveChapter,
  saveTruthFile,
  writeNextChapter,
  type BookAnalytics,
  type InkosRadarRecord
} from "@/lib/inkos-client";
import { ApiError } from "@/lib/api";
import { ensureInkosWorkspace } from "@/lib/inkos-indexeddb";
import type { BookSummary, ChapterDetail, ChapterSummary, TruthFileSummary } from "@/lib/inkos-types";
import { useInkosDaemon } from "@/lib/use-inkos-daemon";
import { usePortalNovelModels } from "@/lib/use-portal-novel-models";
import { shouldRefreshBooks, useInkosAgent } from "@/lib/use-inkos-agent";

type ViewMode = "list" | "workspace";
type SidebarTab = "chapters" | "truth" | "radar" | "analytics" | "daemon" | "system";
type ChapterFilter = "all" | "review" | "approved" | "failed";

function normalizeStatus(status: string | undefined | null) {
  return status?.trim() || "unknown";
}

function statusDot(status: string | undefined | null) {
  const value = normalizeStatus(status);
  if (value.includes("failed")) return "bg-rose-400";
  if (value.includes("review") || value === "approved") return "bg-emerald-400";
  if (value === "draft" || value === "outlining") return "bg-slate-400";
  return "bg-cyan-400";
}

function storyTitle(name: string, label?: string) {
  if (label) return label;
  const map: Record<string, string> = {
    "brief.md": "世界观设定",
    "story_bible.md": "叙事规则",
    "current_state.md": "状态卡",
    "pending_hooks.md": "伏笔池",
    "chapter_summaries.md": "章节摘要",
    "character_matrix.md": "角色矩阵",
    "style_guide.md": "文风指南"
  };
  return map[name] ?? name.replace(".md", "");
}

function extractCharacters(content: string) {
  const names = Array.from(content.matchAll(/[《#\n\r\s-]*([\u4e00-\u9fa5]{2,4})[：:]/g)).map((match) => match[1]);
  return Array.from(new Set(names)).slice(0, 6);
}

function downloadText(fileName: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function matchesChapterFilter(chapter: ChapterSummary, filter: ChapterFilter) {
  const status = normalizeStatus(chapter.status);
  if (filter === "all") return true;
  if (filter === "approved") return status === "approved";
  if (filter === "failed") return status.includes("failed");
  return status.includes("review") || status === "ready-for-review" || status === "needsRevision";
}

export function InkosWorkbench({ compact = false }: { compact?: boolean }) {
  const [view, setView] = useState<ViewMode>("list");
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [chapters, setChapters] = useState<ChapterSummary[]>([]);
  const [selectedChapterNumber, setSelectedChapterNumber] = useState<number | null>(null);
  const [chapterDetail, setChapterDetail] = useState<ChapterDetail | null>(null);
  const [truthFiles, setTruthFiles] = useState<TruthFileSummary[]>([]);
  const [selectedTruthFile, setSelectedTruthFile] = useState("");
  const [storyDraft, setStoryDraft] = useState("");
  const [characterMatrix, setCharacterMatrix] = useState("");
  const [command, setCommand] = useState("");
  const [bootError, setBootError] = useState("");
  const portalModels = usePortalNovelModels();
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("chapters");
  const [chapterFilter, setChapterFilter] = useState<ChapterFilter>("all");
  const [radarScans, setRadarScans] = useState<InkosRadarRecord[]>([]);
  const [analytics, setAnalytics] = useState<BookAnalytics | null>(null);
  const [truthPreview, setTruthPreview] = useState(false);

  function showActionError(error: unknown) {
    const message =
      error instanceof ApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "操作失败";
    setActionNotice("");
    setActionError(message);
  }

  const agent = useInkosAgent(activeBookId);
  const daemon = useInkosDaemon(portalModels.selected);
  const activeBook = useMemo(() => books.find((book) => book.id === activeBookId), [activeBookId, books]);
  const characters = extractCharacters(
    selectedTruthFile === "character_matrix.md" ? storyDraft : characterMatrix
  );
  const filteredChapters = useMemo(
    () => chapters.filter((chapter) => matchesChapterFilter(chapter, chapterFilter)),
    [chapterFilter, chapters]
  );

  const refreshBooks = useCallback(async () => {
    const next = await listBooks();
    setBooks(next);
    return next;
  }, []);

  const refreshRadar = useCallback(async () => {
    const scans = await getRadarHistory();
    setRadarScans(scans);
    return scans;
  }, []);

  const refreshAnalytics = useCallback(async (bookId: string) => {
    const next = await getBookAnalytics(bookId);
    setAnalytics(next);
    return next;
  }, []);

  const refreshBookDetail = useCallback(
    async (bookId: string, preferredChapter?: number | null) => {
      const detail = await getBook(bookId);
      setChapters(detail.chapters);
      const chapterNumber =
        preferredChapter ?? selectedChapterNumber ?? detail.chapters.at(-1)?.number ?? null;
      setSelectedChapterNumber(chapterNumber);

      if (chapterNumber) {
        const summary = detail.chapters.find((item) => item.number === chapterNumber);
        setChapterDetail(await getChapter(bookId, chapterNumber, summary));
      } else {
        setChapterDetail(null);
      }

      const truth = await listTruthFiles(bookId);
      const available = truth.filter((file) => file.available);
      setTruthFiles(available);
      const firstTruth = available[0]?.name ?? "";
      setSelectedTruthFile((current) => current || firstTruth);

      if (available.some((file) => file.name === "character_matrix.md")) {
        const matrix = await getTruthFile(bookId, "character_matrix.md");
        setCharacterMatrix(matrix.content ?? "");
      } else {
        setCharacterMatrix("");
      }

      await refreshAnalytics(bookId);
      return detail;
    },
    [refreshAnalytics, selectedChapterNumber]
  );

  const bootstrap = useCallback(async () => {
    try {
      await ensureInkosWorkspace();
      const status = await getNovelStatus();
      if (!status.reachable) {
        setBootError("InkOS 运行时未就绪，请确认 gateway 已启动且已安装 inkos CLI");
        return;
      }
      setBootError("");
      setActionError("");
      await refreshBooks();
      await refreshRadar();
      void daemon.refresh();
      portalModels.refresh();
    } catch (error) {
      setBootError(error instanceof Error ? error.message : "加载失败");
    }
  }, [daemon.refresh, portalModels.refresh, refreshBooks, refreshRadar]);

  useEffect(() => {
    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const latest = agent.sse.messages.at(-1);
    if (!latest || !shouldRefreshBooks(latest)) return;
    void refreshBooks().then((nextBooks) => {
      if (activeBookId) void refreshBookDetail(activeBookId);
      if (!activeBookId && nextBooks[0]) {
        setActiveBookId(nextBooks[0].id);
        setView("workspace");
        void refreshBookDetail(nextBooks[0].id);
      }
    });
  }, [activeBookId, agent.sse.messages, refreshBookDetail, refreshBooks]);

  useEffect(() => {
    const latest = agent.sse.messages.at(-1);
    if (!latest) return;
    if (latest.event === "radar:complete") {
      setActionNotice("市场雷达扫描完成");
      setActionError("");
      void refreshRadar();
    }
    if (latest.event === "radar:error") {
      const parsed = latest.parsed as { error?: string } | undefined;
      showActionError(new Error(parsed?.error ?? "市场雷达失败"));
    }
  }, [agent.sse.messages, refreshRadar]);

  useEffect(() => {
    if (!activeBookId || !selectedTruthFile) return;
    void getTruthFile(activeBookId, selectedTruthFile).then((file) => setStoryDraft(file.content ?? ""));
  }, [activeBookId, selectedTruthFile]);

  async function openBook(bookId: string) {
    setActiveBookId(bookId);
    setView("workspace");
    await refreshBookDetail(bookId);
    await agent.ensureSession();
  }

  async function handleSend() {
    if (!command.trim()) return;
    const text = command;
    setCommand("");
    setActionError("");
    const selectedModel = portalModels.selected;
    if (!selectedModel) {
      showActionError(new Error("请先在 AccessKey 中配置并测试 LLM 模型。"));
      return;
    }
    try {
      const result = await agent.sendInstruction(text, {
        service: selectedModel.inkosService,
        model: selectedModel.modelName,
        llm: selectedModel
      });
      if (result?.error) {
        const message =
          typeof result.error === "string" ? result.error : result.error.message ?? "Agent 执行失败";
        showActionError(new Error(message));
        return;
      }
      await refreshBooks();
      if (activeBookId) await refreshBookDetail(activeBookId);
    } catch (error) {
      showActionError(error);
    }
  }

  async function handleRadar() {
    const selectedModel = portalModels.selected;
    if (!selectedModel) {
      showActionError(new Error("请先在 AccessKey 中配置并测试 LLM 模型。"));
      return;
    }
    setActionError("");
    setActionNotice("市场雷达扫描中...");
    setActionBusy(true);
    try {
      const result = await runRadarScan(selectedModel);
      const platform = typeof result.platform === "string" ? result.platform : "扫描完成";
      setActionNotice(`市场雷达完成：${platform}`);
      await refreshRadar();
    } catch (error) {
      showActionError(error);
    } finally {
      setActionBusy(false);
    }
  }

  async function handleWriteNext() {
    if (!activeBookId) {
      setView("list");
      return;
    }
    const selectedModel = portalModels.selected;
    if (!selectedModel) {
      showActionError(new Error("请先在 AccessKey 中配置并测试 LLM 模型。"));
      return;
    }
    setActionError("");
    setActionBusy(true);
    try {
      await writeNextChapter(activeBookId, undefined, selectedModel);
      setActionNotice("正在写作下一章...");
      await refreshBookDetail(activeBookId);
      await refreshBooks();
    } catch (error) {
      showActionError(error);
    } finally {
      setActionBusy(false);
    }
  }

  async function handleAudit() {
    if (!activeBookId || !selectedChapterNumber) return;
    const selectedModel = portalModels.selected;
    if (!selectedModel) {
      showActionError(new Error("请先在 AccessKey 中配置并测试 LLM 模型。"));
      return;
    }
    setActionError("");
    setActionBusy(true);
    try {
      await auditChapter(activeBookId, selectedChapterNumber, selectedModel);
      setActionNotice(`第 ${selectedChapterNumber} 章审计完成`);
      await refreshBookDetail(activeBookId, selectedChapterNumber);
      await refreshBooks();
    } catch (error) {
      showActionError(error);
    } finally {
      setActionBusy(false);
    }
  }

  async function handleRevise() {
    if (!activeBookId || !selectedChapterNumber) return;
    const selectedModel = portalModels.selected;
    if (!selectedModel) {
      showActionError(new Error("请先在 AccessKey 中配置并测试 LLM 模型。"));
      return;
    }
    setActionError("");
    setActionBusy(true);
    try {
      await reviseChapter(activeBookId, selectedChapterNumber, undefined, selectedModel);
      setActionNotice(`第 ${selectedChapterNumber} 章修订已提交`);
      await refreshBookDetail(activeBookId, selectedChapterNumber);
      await refreshBooks();
    } catch (error) {
      showActionError(error);
    } finally {
      setActionBusy(false);
    }
  }

  async function handleApprove() {
    if (!activeBookId || !selectedChapterNumber) return;
    const selectedModel = portalModels.selected;
    setActionBusy(true);
    try {
      await approveChapter(activeBookId, selectedChapterNumber, selectedModel);
      setActionNotice(`第 ${selectedChapterNumber} 章已通过`);
      await refreshBookDetail(activeBookId, selectedChapterNumber);
      await refreshBooks();
    } catch (error) {
      showActionError(error);
    } finally {
      setActionBusy(false);
    }
  }

  async function handleReject() {
    if (!activeBookId || !selectedChapterNumber) return;
    const selectedModel = portalModels.selected;
    setActionBusy(true);
    try {
      await rejectChapter(activeBookId, selectedChapterNumber, selectedModel);
      setActionNotice(`第 ${selectedChapterNumber} 章已驳回并回滚`);
      await refreshBookDetail(activeBookId, Math.max(1, selectedChapterNumber - 1));
      await refreshBooks();
    } catch (error) {
      showActionError(error);
    } finally {
      setActionBusy(false);
    }
  }

  async function handleSaveChapter(content: string) {
    if (!activeBookId || !selectedChapterNumber) return;
    const selectedModel = portalModels.selected;
    setActionBusy(true);
    try {
      await saveChapter(activeBookId, selectedChapterNumber, content, chapterDetail?.title, selectedModel);
      setActionNotice(`第 ${selectedChapterNumber} 章已保存`);
      await refreshBookDetail(activeBookId, selectedChapterNumber);
    } catch (error) {
      showActionError(error);
    } finally {
      setActionBusy(false);
    }
  }

  async function handleSaveTruth() {
    if (!activeBookId || !selectedTruthFile) return;
    setActionBusy(true);
    try {
      await saveTruthFile(activeBookId, selectedTruthFile, storyDraft);
    } finally {
      setActionBusy(false);
    }
  }

  async function handleExport(approvedOnly = false) {
    if (!activeBookId) return;
    const content = await exportBook(activeBookId, approvedOnly);
    const suffix = approvedOnly ? "-approved" : "";
    downloadText(`${activeBook?.title ?? activeBookId}${suffix}.txt`, content);
  }

  async function handleDeleteBook() {
    if (!activeBookId || !window.confirm(`确定删除《${activeBook?.title ?? activeBookId}》？此操作不可恢复。`)) return;
    setActionBusy(true);
    try {
      await deleteBook(activeBookId);
      setActiveBookId(null);
      setView("list");
      await refreshBooks();
      setActionNotice("书籍已删除");
    } catch (error) {
      showActionError(error);
    } finally {
      setActionBusy(false);
    }
  }

  async function handleExportWorkspace() {
    const snapshot = await exportWorkspace();
    downloadText(`inkos-workspace-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(snapshot, null, 2));
  }

  async function handleImportWorkspace(file: File) {
    const text = await file.text();
    const snapshot = JSON.parse(text);
    await importWorkspace(snapshot);
    await bootstrap();
    setActionNotice("工作区已导入");
  }

  const busy = agent.busy || actionBusy;

  const sidebarTabs: Array<{ id: SidebarTab; label: string; icon: typeof Search }> = [
    { id: "chapters", label: "章节", icon: FileText },
    { id: "truth", label: "档案", icon: FileText },
    { id: "radar", label: "雷达", icon: Activity },
    { id: "analytics", label: "统计", icon: BarChart3 },
    { id: "daemon", label: "守护", icon: Gauge },
    { id: "system", label: "系统", icon: Bot }
  ];

  return (
    <section className="overflow-hidden rounded-lg border border-slate-800 bg-[#05090b] text-slate-100 shadow-sm">
      <header className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <div className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-700 bg-[#0b1116] px-3 text-sm font-semibold">
            <Home className="h-4 w-4" />
            InkOS Studio
          </div>
          <span className="truncate text-sm text-slate-400">
            {view === "list" ? "小说列表" : activeBook?.title ?? "工作台"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="text-emerald-400">IndexedDB 本地存储</span>
          <button className="inkos-tool-btn" onClick={() => void bootstrap()} type="button">
            刷新
          </button>
        </div>
      </header>

      {bootError ? (
        <div className="border-b border-rose-900/40 bg-rose-950/20 px-5 py-3 text-sm text-rose-200">{bootError}</div>
      ) : null}
      {actionError ? (
        <div className="border-b border-rose-900/40 bg-rose-950/20 px-5 py-3 text-sm text-rose-200">{actionError}</div>
      ) : null}
      {actionNotice && !actionError ? (
        <div className="border-b border-emerald-900/40 bg-emerald-950/20 px-5 py-3 text-sm text-emerald-200">{actionNotice}</div>
      ) : null}

      {view === "list" ? (
        <div className="p-5">
          <InkosBookList
            books={books}
            onCreate={() => {
              setActiveBookId(null);
              setView("workspace");
            }}
            onSelect={(bookId) => void openBook(bookId)}
          />
          <div className="mt-6 rounded-lg border border-slate-800 bg-[#081014] p-4">
            <textarea
              className="min-h-[72px] w-full resize-none bg-transparent text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500"
              onChange={(event) => setCommand(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") void handleSend();
              }}
              placeholder="输入创意直接创建新书，例如：写一本悬疑刑侦长篇，双主角，目标 200 章..."
              value={command}
            />
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-800 pt-3">
              <div className="flex min-w-0 flex-col gap-1">
                <InkosModelSelector
                  disabled={busy}
                  emptyHint={portalModels.setupGap}
                  onSelect={portalModels.selectOption}
                  options={portalModels.options}
                  selectedId={portalModels.selectedId}
                />
                <span className="text-xs text-slate-500">{agent.status || "通过 Agent 调用 architect 建书"}</span>
              </div>
              <button
                className="inline-flex h-9 items-center gap-2 rounded-md bg-amber-500 px-4 text-sm font-semibold text-slate-950 disabled:bg-slate-700"
                disabled={busy || !command.trim()}
                onClick={() => void handleSend()}
                type="button"
              >
                <Send className="h-4 w-4" />
                发送给 Agent
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className={`grid min-h-[760px] ${compact ? "xl:grid-cols-[180px_1fr_340px]" : "xl:grid-cols-[200px_1fr_380px]"}`}>
          <InkosSessionSidebar
            activeSessionId={agent.sessionId}
            busy={busy}
            onCreate={() => void agent.createNewSession()}
            onDelete={(id) => void agent.removeSession(id)}
            onRename={(id, title) => void agent.renameActiveSession(id, title)}
            onSelect={(id) => void agent.selectSession(id)}
            sessions={agent.sessions}
          />

          <main className="flex min-h-[760px] flex-col border-slate-800 xl:border-r">
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {activeBook ? (
                <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                  <button className="text-amber-300 hover:underline" onClick={() => setView("list")} type="button">
                    ← 返回列表
                  </button>
                  <span>{activeBook.genre}</span>
                  <span>{chapterCount(activeBook, chapters)}/{activeBook.targetChapters} 章</span>
                  <span>{formatZhNumber(totalWords(chapters))} 字</span>
                  <span>{agent.status}</span>
                </div>
              ) : null}
              <InkosAgentFeed
                emptyHint={
                  activeBook
                    ? "输入指令让 Agent 写下一章、审计或修订。也可以直接点下方快捷按钮。"
                    : "输入书名、题材、主角和世界观，Agent 会调用 architect 创建新书并生成 foundation 文件。"
                }
                liveTools={agent.liveTools}
                messages={agent.feedMessages}
              />
              {chapterDetail ? (
                <InkosChapterReader
                  busy={busy}
                  chapter={chapterDetail}
                  onApprove={() => void handleApprove()}
                  onReject={() => void handleReject()}
                  onSave={(content) => void handleSaveChapter(content)}
                />
              ) : null}
            </div>

            <div className="border-t border-slate-800 bg-[#05090b] px-5 py-4">
              <div className="mb-3 flex flex-wrap gap-2">
                <button className="inkos-action-btn" disabled={!activeBookId || busy} onClick={() => void handleWriteNext()} type="button">
                  <WandSparkles className="h-4 w-4" />
                  写下一章
                </button>
                <button className="inkos-action-btn" disabled={!chapterDetail || busy} onClick={() => void handleAudit()} type="button">
                  <Search className="h-4 w-4" />
                  审计
                </button>
                <button className="inkos-action-btn" disabled={!chapterDetail || busy} onClick={() => void handleRevise()} type="button">
                  <PenLine className="h-4 w-4" />
                  修订
                </button>
                <button className="inkos-action-btn" disabled={!activeBookId} onClick={() => void handleExport(false)} type="button">
                  <Download className="h-4 w-4" />
                  导出
                </button>
                <button className="inkos-action-btn" disabled={!activeBookId} onClick={() => void handleExport(true)} type="button">
                  <Download className="h-4 w-4" />
                  仅已通过
                </button>
                <button className="inkos-action-btn" disabled={busy} onClick={() => void handleRadar()} type="button">
                  <Activity className="h-4 w-4" />
                  市场雷达
                </button>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#081014] p-3">
                <textarea
                  className="min-h-[72px] w-full resize-none bg-transparent text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500"
                  onChange={(event) => setCommand(event.target.value)}
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") void handleSend();
                  }}
                  placeholder={
                    activeBook
                      ? "输入指令，例如：直接写第二章 / 审计当前章节 / 根据反馈修订..."
                      : "输入创意创建新书，Agent 会调用 architect 完成建书..."
                  }
                  value={command}
                />
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-800 pt-3">
                  <InkosModelSelector
                    disabled={busy}
                    emptyHint={portalModels.setupGap}
                    onSelect={portalModels.selectOption}
                    options={portalModels.options}
                    selectedId={portalModels.selectedId}
                  />
                  <button
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-amber-500 text-slate-950 disabled:bg-slate-700"
                    disabled={busy || !command.trim()}
                    onClick={() => void handleSend()}
                    type="button"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </main>

          <aside className="grid content-start gap-2 bg-[#05090b] p-3">
            <Panel title="小说切换">
              <InkosBookListCompact
                activeBookId={activeBookId ?? ""}
                books={books}
                onBack={() => setView("list")}
                onSelect={(bookId) => void openBook(bookId)}
              />
            </Panel>

            <div className="flex flex-wrap gap-1 rounded-lg border border-slate-900 bg-[#071013] p-2">
              {sidebarTabs.map((tab) => (
                <button
                  className={`rounded px-2 py-1 text-xs ${
                    sidebarTab === tab.id ? "bg-amber-500/20 text-amber-300" : "text-slate-500 hover:text-slate-300"
                  }`}
                  key={tab.id}
                  onClick={() => setSidebarTab(tab.id)}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {sidebarTab === "chapters" ? (
              <Panel title="章节">
                <div className="mb-2 flex flex-wrap gap-1">
                  {(["all", "review", "approved", "failed"] as ChapterFilter[]).map((filter) => (
                    <button
                      className={`rounded px-2 py-0.5 text-xs ${
                        chapterFilter === filter ? "bg-slate-700 text-slate-200" : "text-slate-500"
                      }`}
                      key={filter}
                      onClick={() => setChapterFilter(filter)}
                      type="button"
                    >
                      {filter === "all" ? "全部" : filter === "review" ? "待审" : filter === "approved" ? "已通过" : "未过"}
                    </button>
                  ))}
                </div>
                <div className="max-h-64 space-y-1 overflow-y-auto">
                  {filteredChapters.length ? (
                    filteredChapters.map((chapter) => (
                      <button
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-300 hover:bg-slate-800"
                        key={chapter.number}
                        onClick={() => {
                          if (!activeBookId) return;
                          setSelectedChapterNumber(chapter.number);
                          void getChapter(activeBookId, chapter.number, chapter).then(setChapterDetail);
                        }}
                        type="button"
                      >
                        <span className={`h-2 w-2 shrink-0 rounded-full ${statusDot(chapter.status)}`} />
                        <span className={`truncate ${chapter.number === selectedChapterNumber ? "text-amber-300" : ""}`}>
                          {String(chapter.number).padStart(2, "0")} {chapter.title}
                        </span>
                      </button>
                    ))
                  ) : (
                    <EmptyLine text="暂无匹配章节" />
                  )}
                </div>
              </Panel>
            ) : null}

            {sidebarTab === "truth" ? (
              <>
                <Panel title="角色">
                  {(characters.length ? characters : ["待从角色矩阵解析"]).map((name, index) => (
                    <div className="flex items-center justify-between rounded-md bg-[#0b1418] px-3 py-2 text-sm" key={name}>
                      <span className="inline-flex items-center gap-2 text-slate-300">
                        <UsersRound className="h-4 w-4 text-slate-500" />
                        {name}
                      </span>
                      <span className={index === 0 ? "text-xs text-emerald-300" : "text-xs text-blue-300"}>
                        {index === 0 ? "主角" : "配角"}
                      </span>
                    </div>
                  ))}
                </Panel>
                <Panel title="核心文件">
                  {truthFiles.map((file) => (
                    <button
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-800 ${
                        file.name === selectedTruthFile ? "text-amber-300" : "text-slate-300"
                      }`}
                      key={file.name}
                      onClick={() => setSelectedTruthFile(file.name)}
                      type="button"
                    >
                      <FileText className="h-4 w-4 text-slate-500" />
                      {storyTitle(file.name, file.label)}
                    </button>
                  ))}
                  {!truthFiles.length ? <EmptyLine text="建书后自动生成" /> : null}
                </Panel>
                <Panel title="文件编辑">
                  <div className="mb-2 flex gap-2">
                    <button
                      className={`rounded px-2 py-1 text-xs ${!truthPreview ? "bg-slate-700 text-slate-200" : "text-slate-500"}`}
                      onClick={() => setTruthPreview(false)}
                      type="button"
                    >
                      编辑
                    </button>
                    <button
                      className={`rounded px-2 py-1 text-xs ${truthPreview ? "bg-slate-700 text-slate-200" : "text-slate-500"}`}
                      onClick={() => setTruthPreview(true)}
                      type="button"
                    >
                      预览
                    </button>
                  </div>
                  {truthPreview ? (
                    <div className="max-h-48 overflow-y-auto rounded-md border border-slate-800 bg-[#05090b] p-3">
                      <InkosMarkdown content={storyDraft} />
                    </div>
                  ) : (
                    <textarea
                      className="min-h-[160px] w-full resize-y rounded-md border border-slate-800 bg-[#081014] p-3 text-xs leading-6 text-slate-200 outline-none focus:border-amber-500"
                      onChange={(event) => setStoryDraft(event.target.value)}
                      value={storyDraft}
                    />
                  )}
                  <button
                    className="mt-2 inline-flex h-9 items-center gap-2 rounded-md bg-slate-800 px-3 text-sm font-semibold text-slate-100 disabled:text-slate-500"
                    disabled={!selectedTruthFile || busy}
                    onClick={() => void handleSaveTruth()}
                    type="button"
                  >
                    <Save className="h-4 w-4" />
                    保存
                  </button>
                </Panel>
              </>
            ) : null}

            {sidebarTab === "radar" ? (
              <Panel title="市场雷达">
                <InkosRadarPanel busy={busy} onScan={() => void handleRadar()} scans={radarScans} />
              </Panel>
            ) : null}

            {sidebarTab === "analytics" ? (
              <Panel title="书籍统计">
                <InkosAnalyticsPanel analytics={analytics} />
              </Panel>
            ) : null}

            {sidebarTab === "daemon" ? (
              <Panel title="守护进程">
                <InkosDaemonPanel
                  busy={busy}
                  config={daemon.config}
                  onStart={() => {
                    void daemon.startDaemon().catch(showActionError);
                  }}
                  onStop={() => {
                    void daemon.stopDaemon();
                  }}
                  onUpdate={(patch) => {
                    void daemon.updateConfig(patch);
                  }}
                />
              </Panel>
            ) : null}

            {sidebarTab === "system" ? (
              <Panel title="系统">
                <InfoRow icon={KeyRound} label="项目" value="门户小说工作区" />
                <InfoRow icon={Bot} label="Session" value={agent.sessionId ? agent.sessionId.slice(-8) : "未创建"} />
                <InfoRow
                  icon={Gauge}
                  label="守护进程"
                  value={daemon.config?.running ? "运行中" : "已停止"}
                />
                <InfoRow icon={Sparkles} label="Agent" value="architect / writer / auditor" />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button className="inkos-action-btn !h-8 !px-2 text-xs" onClick={() => void handleExportWorkspace()} type="button">
                    <Download className="h-3.5 w-3.5" />
                    导出工作区
                  </button>
                  <label className="inkos-action-btn !h-8 !cursor-pointer !px-2 text-xs">
                    <Upload className="h-3.5 w-3.5" />
                    导入
                    <input
                      accept="application/json"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void handleImportWorkspace(file);
                        event.target.value = "";
                      }}
                      type="file"
                    />
                  </label>
                  {activeBookId ? (
                    <button
                      className="inkos-action-btn !h-8 !px-2 text-xs text-rose-300"
                      disabled={busy}
                      onClick={() => void handleDeleteBook()}
                      type="button"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      删除书籍
                    </button>
                  ) : null}
                </div>
              </Panel>
            ) : null}
          </aside>
        </div>
      )}
    </section>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-900 bg-[#071013]">
      <div className="border-b border-slate-900 px-3 py-3 text-base font-semibold text-slate-200">{title}</div>
      <div className="grid gap-1 p-3">{children}</div>
    </section>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <div className="rounded-md bg-[#0b1418] px-3 py-2 text-sm text-slate-500">{text}</div>;
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Search; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-[#0b1418] px-3 py-2 text-sm">
      <span className="inline-flex items-center gap-2 text-slate-300">
        <Icon className="h-4 w-4 text-slate-500" />
        {label}
      </span>
      <span className="text-xs text-slate-500">{value}</span>
    </div>
  );
}
