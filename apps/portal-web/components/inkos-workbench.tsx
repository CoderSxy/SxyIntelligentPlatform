"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bot,
  BookOpenText,
  ChevronDown,
  Circle,
  Download,
  FileSearch,
  FileText,
  FolderOpen,
  Gauge,
  Home,
  KeyRound,
  LibraryBig,
  PenLine,
  Save,
  Search,
  Send,
  Sparkles,
  Upload,
  UsersRound,
  WandSparkles
} from "lucide-react";

import {
  chapterFileName,
  createInkosBook,
  exportInkosWorkspace,
  importInkosWorkspace,
  InkosBookView,
  InkosChapterRecord,
  InkosStoryFileRecord,
  InkosWorkspaceSnapshot,
  InkosWorkspaceView,
  loadInkosWorkspace,
  resetInkosWorkspace,
  saveInkosChapter,
  saveInkosStoryFile
} from "@/lib/inkos-indexeddb";

function statusTone(status: string) {
  if (status.includes("failed")) return "text-rose-300";
  if (status.includes("review")) return "text-emerald-300";
  if (status === "draft") return "text-slate-300";
  return "text-cyan-300";
}

function statusDot(status: string) {
  if (status.includes("failed")) return "bg-rose-400";
  if (status.includes("review")) return "bg-emerald-400";
  if (status === "draft") return "bg-slate-400";
  return "bg-cyan-400";
}

function countWords(content: string) {
  return content.replace(/\s/g, "").length;
}

function deriveTitle(input: string) {
  const firstLine = input
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  if (!firstLine) return "未命名小说";
  return firstLine.replace(/[，。,.].*$/, "").slice(0, 18) || "未命名小说";
}

function chapterTitle(number: number, seed: string) {
  const cleaned = seed.trim().replace(/\s+/g, "");
  if (!cleaned) return `第${number}章`;
  return cleaned.slice(0, 12);
}

function draftChapter(book: InkosBookView, number: number, command: string) {
  const title = chapterTitle(number, command);
  return `# ${title}

${command || `继续推进《${book.title}》的主线。`}

【创作目标】
- 延续上一章的情绪压力。
- 推进一个可见线索，并保留一个未解问题。
- 章节完成后进入审稿队列。

【正文草稿】
夜色压在窗外，新的线索像一枚细小的钉子，卡在所有人都想忽略的位置。

主角没有立刻说话。他把刚才那句话在心里过了一遍，终于意识到真正危险的不是眼前的答案，而是这个答案出现得太早。

这一章还需要继续扩写。`;
}

function storyTitle(name: string) {
  const map: Record<string, string> = {
    "brief.md": "世界观设定",
    "story_bible.md": "叙事规则",
    "current_state.md": "状态卡",
    "pending_hooks.md": "伏笔池",
    "chapter_summaries.md": "支线进度",
    "character_matrix.md": "角色矩阵",
    "style_guide.md": "文风指南"
  };
  return map[name] ?? name.replace(".md", "");
}

function extractCharacters(content: string) {
  const names = Array.from(content.matchAll(/[《#\n\r\s-]*([\u4e00-\u9fa5]{2,4})[：:]/g)).map((match) => match[1]);
  return Array.from(new Set(names)).slice(0, 4);
}

function downloadJson(fileName: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function InkosWorkbench({ compact = false }: { compact?: boolean }) {
  const [workspace, setWorkspace] = useState<InkosWorkspaceView | null>(null);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [selectedStoryId, setSelectedStoryId] = useState("");
  const [command, setCommand] = useState("");
  const [storyDraft, setStoryDraft] = useState("");
  const [message, setMessage] = useState("正在加载 InkOS Studio");
  const [busy, setBusy] = useState(false);

  async function refresh(preferredBookId = selectedBookId, preferredChapterId = selectedChapterId) {
    const next = await loadInkosWorkspace();
    const nextBook = next.books.find((book) => book.id === preferredBookId) ?? next.books[0];
    const nextChapter = nextBook?.chapters.find((chapter) => chapter.id === preferredChapterId) ?? nextBook?.chapters.at(-1);
    const nextStory = next.storyFiles.find((file) => file.id === selectedStoryId && file.bookId === nextBook?.id) ?? next.storyFiles.find((file) => file.bookId === nextBook?.id);

    setWorkspace(next);
    setSelectedBookId(nextBook?.id ?? "");
    setSelectedChapterId(nextChapter?.id ?? "");
    setSelectedStoryId(nextStory?.id ?? "");
    setMessage(next.books.length ? "InkOS Studio 已就绪" : "输入创意即可创建第一本书");
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedBook = useMemo(
    () => workspace?.books.find((book) => book.id === selectedBookId),
    [selectedBookId, workspace]
  );
  const selectedChapter = useMemo(
    () => selectedBook?.chapters.find((chapter) => chapter.id === selectedChapterId) ?? selectedBook?.chapters.at(-1),
    [selectedBook, selectedChapterId]
  );
  const storyFiles = useMemo(
    () => workspace?.storyFiles.filter((file) => file.bookId === selectedBookId) ?? [],
    [selectedBookId, workspace]
  );
  const selectedStoryFile = useMemo(
    () => storyFiles.find((file) => file.id === selectedStoryId) ?? storyFiles[0],
    [selectedStoryId, storyFiles]
  );
  const characterFile = storyFiles.find((file) => file.name === "character_matrix.md");
  const characters = extractCharacters(characterFile?.content ?? "");

  useEffect(() => {
    setStoryDraft(selectedStoryFile?.content ?? "");
  }, [selectedStoryFile]);

  async function createBookFromCommand() {
    if (!command.trim()) return;
    setBusy(true);
    const title = deriveTitle(command);
    const book = await createInkosBook({
      title,
      genre: "mystery",
      platform: "tomato",
      targetChapters: 200,
      chapterWordCount: 3000
    });
    const nextWorkspace = await loadInkosWorkspace();
    const files = nextWorkspace.storyFiles.filter((file) => file.bookId === book.id);
    const brief = files.find((file) => file.name === "brief.md");
    const currentState = files.find((file) => file.name === "current_state.md");
    const charactersFile = files.find((file) => file.name === "character_matrix.md");
    if (brief) await saveInkosStoryFile({ ...brief, content: `# 世界观设定\n\n${command.trim()}\n` });
    if (currentState) await saveInkosStoryFile({ ...currentState, content: `# 状态卡\n\n当前任务：根据初始创意建立《${title}》的开篇方向。\n` });
    if (charactersFile) await saveInkosStoryFile({ ...charactersFile, content: "# 角色矩阵\n\n顾白：主角/观察者\n林知夏：搭档/行动线\n老周：旧案关联人\n" });
    setCommand("");
    setMessage(`已创建《${book.title}》，可以开始写下一章`);
    await refresh(book.id);
    setBusy(false);
  }

  async function writeNextChapter() {
    if (!selectedBook) {
      await createBookFromCommand();
      return;
    }
    setBusy(true);
    const number = (selectedBook.chapters.at(-1)?.number ?? 0) + 1;
    const content = draftChapter(selectedBook, number, command);
    const chapter = await saveInkosChapter({
      bookId: selectedBook.id,
      number,
      title: chapterTitle(number, command),
      content,
      status: "ready-for-review"
    });
    setCommand("");
    setMessage(`已为 ${selectedBook.title} 完成第 ${number} 章，字数 ${chapter.wordCount}`);
    await refresh(selectedBook.id, chapter.id);
    setBusy(false);
  }

  async function auditCurrentChapter() {
    if (!selectedBook || !selectedChapter) return;
    setBusy(true);
    const issue = selectedChapter.wordCount < selectedBook.chapterWordCount * 0.6 ? "字数低于目标，需要继续扩写。" : "结构完整，可进入人工审稿。";
    const chapter = await saveInkosChapter({
      bookId: selectedBook.id,
      number: selectedChapter.number,
      title: selectedChapter.title,
      content: `${selectedChapter.content}\n\n【审稿记录】${issue}`,
      status: issue.includes("低于") ? "audit-failed" : "ready-for-review"
    });
    setMessage(`审计完成：${chapter.status}`);
    await refresh(selectedBook.id, chapter.id);
    setBusy(false);
  }

  async function saveCurrentStoryFile() {
    if (!selectedStoryFile) return;
    const updated = await saveInkosStoryFile({ ...selectedStoryFile, content: storyDraft });
    setMessage(`已保存 ${updated.name}`);
    await refresh(updated.bookId, selectedChapterId);
    setSelectedStoryId(updated.id);
  }

  async function handleExport() {
    const snapshot = await exportInkosWorkspace();
    downloadJson("inkos-indexeddb-workspace.json", snapshot);
    setMessage("已导出当前工作区");
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const snapshot = JSON.parse(await file.text()) as InkosWorkspaceSnapshot;
    await importInkosWorkspace(snapshot);
    setMessage("已导入工作区快照");
    await refresh(snapshot.books[0]?.id ?? "");
    event.target.value = "";
  }

  async function handleReset() {
    await resetInkosWorkspace();
    setCommand("");
    setMessage("已重置为空 InkOS 项目");
    await refresh("", "");
  }

  if (!workspace) {
    return <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">{message}</div>;
  }

  return (
    <section className="overflow-hidden rounded-lg border border-slate-800 bg-[#05090b] text-slate-100 shadow-sm">
      <header className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <div className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-700 bg-[#0b1116] px-3 text-sm font-semibold">
            <Home className="h-4 w-4" />
            首页 / InkOS Studio
          </div>
          <span className="truncate text-sm text-slate-400">{selectedBook?.title ?? "默认空项目"}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="inkos-tool-btn" onClick={() => void handleReset()} type="button">
            重置
          </button>
          <label className="inkos-tool-btn cursor-pointer">
            <Upload className="h-4 w-4" />
            导入
            <input accept="application/json" className="hidden" onChange={handleImport} type="file" />
          </label>
          <button className="inkos-tool-btn" onClick={() => void handleExport()} type="button">
            <Download className="h-4 w-4" />
            导出
          </button>
        </div>
      </header>

      <div className={`grid min-h-[760px] ${compact ? "xl:grid-cols-[1fr_360px]" : "xl:grid-cols-[1fr_430px]"}`}>
        <main className="flex min-h-[760px] flex-col border-slate-800 xl:border-r">
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <StudioFeed book={selectedBook} chapter={selectedChapter} message={message} />
          </div>

          <div className="border-t border-slate-800 bg-[#05090b] px-5 py-4">
            <div className="mb-3 flex flex-wrap gap-2">
              <button className="inkos-action-btn" disabled={busy} onClick={() => void writeNextChapter()} type="button">
                <WandSparkles className="h-4 w-4" />
                写下一章
              </button>
              <button className="inkos-action-btn" disabled={!selectedChapter || busy} onClick={() => void auditCurrentChapter()} type="button">
                <Search className="h-4 w-4" />
                审计
              </button>
              <button className="inkos-action-btn" onClick={() => void handleExport()} type="button">
                <Download className="h-4 w-4" />
                导出
              </button>
              <button className="inkos-action-btn" onClick={() => setMessage("市场雷达已记录为待接入快捷操作")} type="button">
                <Activity className="h-4 w-4" />
                市场雷达
              </button>
            </div>

            <div className="rounded-lg border border-slate-800 bg-[#081014] p-3">
              <textarea
                className="min-h-[72px] w-full resize-none bg-transparent text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500"
                onChange={(event) => setCommand(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") void writeNextChapter();
                }}
                placeholder={selectedBook ? "输入指令，例如：让主角发现一个被删除的监控片段..." : "输入故事创意、书名、主角和卖点，直接创建书籍..."}
                value={command}
              />
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-800 pt-3">
                <button className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-800" type="button">
                  <Bot className="h-4 w-4" />
                  DeepSeek · deepseek-v4-flash
                  <ChevronDown className="h-3 w-3" />
                </button>
                <button className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-amber-500 text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700" disabled={busy || !command.trim()} onClick={() => void writeNextChapter()} type="button">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </main>

        <aside className="grid content-start gap-2 bg-[#05090b] p-3">
          <Panel title="章节">
            {selectedBook?.chapters.length ? (
              selectedBook.chapters.slice(-9).map((chapter) => (
                <button
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-300 hover:bg-slate-800"
                  key={chapter.id}
                  onClick={() => setSelectedChapterId(chapter.id)}
                  type="button"
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${statusDot(chapter.status)}`} />
                  <span className="truncate">
                    {String(chapter.number).padStart(2, "0")} {chapter.title}
                  </span>
                </button>
              ))
            ) : (
              <EmptyLine text="输入创意后开始生成章节" />
            )}
          </Panel>

          <Panel title="角色">
            {(characters.length ? characters : ["顾白", "林知夏", "老周"]).map((name, index) => (
              <div className="flex items-center justify-between rounded-md bg-[#0b1418] px-3 py-2 text-sm" key={name}>
                <span className="inline-flex items-center gap-2 text-slate-300">
                  <UsersRound className="h-4 w-4 text-slate-500" />
                  {name}
                </span>
                <span className={index === 0 ? "rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300" : "rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300"}>
                  {index === 0 ? "主角" : "配角"}
                </span>
              </div>
            ))}
          </Panel>

          <Panel title="核心文件">
            {storyFiles.map((file) => (
              <button
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-800 ${file.id === selectedStoryFile?.id ? "text-amber-300" : "text-slate-300"}`}
                key={file.id}
                onClick={() => setSelectedStoryId(file.id)}
                type="button"
              >
                <FileText className="h-4 w-4 text-slate-500" />
                {storyTitle(file.name)}
              </button>
            ))}
            {!storyFiles.length ? <EmptyLine text="创建书籍后自动生成核心文件" /> : null}
          </Panel>

          <Panel title="文件编辑">
            <div className="text-xs text-slate-500">{selectedStoryFile?.name ?? "未选择文件"}</div>
            <textarea
              className="mt-2 min-h-[180px] w-full resize-y rounded-md border border-slate-800 bg-[#081014] p-3 text-xs leading-6 text-slate-200 outline-none focus:border-amber-500"
              onChange={(event) => setStoryDraft(event.target.value)}
              value={storyDraft}
            />
            <button className="mt-2 inline-flex h-9 items-center gap-2 rounded-md bg-slate-800 px-3 text-sm font-semibold text-slate-100 disabled:cursor-not-allowed disabled:text-slate-500" disabled={!selectedStoryFile} onClick={() => void saveCurrentStoryFile()} type="button">
              <Save className="h-4 w-4" />
              保存文件
            </button>
          </Panel>

          <Panel title="MCP 与快捷操作">
            <InfoRow icon={KeyRound} label="AccessKey" value="使用门户配置" />
            <InfoRow icon={Bot} label="MCP" value="待接入 inkos 工具链" />
            <InfoRow icon={Gauge} label="守护进程" value="本地 IndexedDB 模式" />
            <InfoRow icon={Sparkles} label="快捷操作" value="写作 / 审计 / 导出 / 雷达" />
          </Panel>
        </aside>
      </div>
    </section>
  );
}

function StudioFeed({
  book,
  chapter,
  message
}: {
  book?: InkosBookView;
  chapter?: InkosChapterRecord;
  message: string;
}) {
  if (!book) {
    return (
      <div className="flex min-h-[560px] flex-col justify-center">
        <div className="max-w-3xl">
          <div className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-800 bg-[#081014] px-3 text-sm text-slate-300">
            <BookOpenText className="h-4 w-4 text-amber-400" />
            默认空 InkOS 项目
          </div>
          <h2 className="mt-5 text-3xl font-semibold tracking-normal text-slate-100">输入内容，直接开始创作书籍</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
            可以输入书名、题材、主角、爽点、世界观或第一章方向。系统会在 IndexedDB 中创建书籍、核心文件和创作状态卡。
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <StarterCard title="悬疑刑侦" text="美容院命案、删除监控、双主角博弈" />
            <StarterCard title="都市爽文" text="低谷主角、行业暗线、连续反转" />
            <StarterCard title="奇幻冒险" text="禁忌设定、队伍成长、世界谜题" />
          </div>
        </div>
      </div>
    );
  }

  const latest = chapter ?? book.chapters.at(-1);
  return (
    <div className="grid gap-7">
      <div className="flex flex-col gap-2">
        <div className="text-sm text-slate-400">{message}</div>
        <h2 className="text-2xl font-semibold text-slate-100">{book.title}</h2>
        <div className="flex flex-wrap gap-3 text-sm text-slate-400">
          <span>{book.genre}</span>
          <span>{book.platform}</span>
          <span>{book.chapters.length}/{book.targetChapters} 章</span>
          <span>{book.totalWords.toLocaleString("zh-CN")} 字</span>
        </div>
      </div>

      {book.chapters.map((item) => (
        <div className="grid gap-3 border-b border-slate-900 pb-5" key={item.id}>
          <div className="flex items-center justify-between gap-3">
            <div className="rounded-lg border border-slate-800 bg-[#081014] px-4 py-2 text-sm font-semibold text-slate-300">
              写作 · {book.title}
            </div>
            <button className="rounded-lg bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-200" type="button">
              写下一章
            </button>
          </div>
          <p className="text-base leading-8 text-slate-200">
            已为 {book.title} 完成第 {item.number} 章《{item.title}》，字数 {item.wordCount}，状态{" "}
            <span className={statusTone(item.status)}>{item.status}</span>。
          </p>
        </div>
      ))}

      {latest ? (
        <article className="rounded-lg border border-slate-800 bg-[#081014] p-5">
          <div className="flex flex-col gap-2 border-b border-slate-800 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-100">
                {String(latest.number).padStart(4, "0")} {latest.title}
              </h3>
              <p className="mt-1 text-xs text-slate-500">{chapterFileName(latest)}</p>
            </div>
            <span className={`inline-flex w-fit items-center gap-2 rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold ${statusTone(latest.status)}`}>
              <Circle className="h-2 w-2 fill-current" />
              {latest.status}
            </span>
          </div>
          <pre className="mt-4 max-h-[360px] overflow-auto whitespace-pre-wrap text-sm leading-7 text-slate-300">{latest.content}</pre>
        </article>
      ) : null}
    </div>
  );
}

function StarterCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#081014] p-4">
      <div className="text-sm font-semibold text-slate-100">{title}</div>
      <div className="mt-2 text-xs leading-5 text-slate-500">{text}</div>
    </div>
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

function InfoRow({ icon: Icon, label, value }: { icon: typeof FileSearch; label: string; value: string }) {
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
