import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Shell } from "@/components/shell";
import { chapterFileName, getInkosBook, getInkosChapter, getInkosStoryFiles, resolveInkosProjectRoot } from "@/lib/inkos-workspace";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    book?: string;
    chapter?: string;
  }>;
};

function statusStyle(status: string) {
  if (status.includes("failed")) return "bg-red-100 text-red-700";
  if (status.includes("review")) return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

function excerpt(content: string, max = 1800) {
  const normalized = content.replace(/^# .+\n+/, "").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max)}...`;
}

export default async function NovelWorkbenchPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const selectedChapter = params.chapter ? Number(params.chapter) : undefined;
  const [projectRoot, book] = await Promise.all([resolveInkosProjectRoot(), getInkosBook(params.book)]);

  if (!book) {
    return (
      <Shell>
        <PageHeader title="inkos 小说工作台" description="未找到 inkos 生成的小说项目，请确认 ../sxy-novel/inkos.json 是否存在。" />
      </Shell>
    );
  }

  const [chapter, storyFiles] = await Promise.all([getInkosChapter(book.id, selectedChapter), getInkosStoryFiles(book.id)]);
  const currentChapter = chapter ?? undefined;

  return (
    <Shell>
      <PageHeader
        title="inkos 小说工作台"
        description={`当前读取：${projectRoot}`}
        action={
          <Link className="inline-flex h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700" href="/apps/novel">
            返回小说入口
          </Link>
        }
      />

      <section className="grid gap-4 lg:grid-cols-5">
        {[
          ["书名", book.title],
          ["状态", book.status],
          ["目标章节", `${book.targetChapters}`],
          ["已生成", `${book.chapters.length}`],
          ["总字数", book.totalWords.toLocaleString("zh-CN")]
        ].map(([label, value]) => (
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" key={label}>
            <div className="text-xs font-medium text-muted">{label}</div>
            <div className="mt-2 break-all text-lg font-semibold text-ink">{value}</div>
          </div>
        ))}
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[360px_1fr]">
        <aside className="h-fit rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-base font-semibold text-ink">章节列表</h2>
            <p className="mt-1 text-sm text-muted">点击章节查看正文和审稿结果。</p>
          </div>
          <div className="max-h-[720px] overflow-y-auto">
            {book.chapters.map((item) => {
              const active = currentChapter?.number === item.number;
              return (
                <Link
                  className={`block border-b border-slate-100 px-4 py-3 text-sm hover:bg-slate-50 ${active ? "bg-blue-50" : ""}`}
                  href={`/apps/novel/workbench?book=${encodeURIComponent(book.id)}&chapter=${item.number}`}
                  key={item.number}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-ink">
                      {String(item.number).padStart(4, "0")} {item.title}
                    </div>
                    <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${statusStyle(item.status)}`}>{item.status}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                    <span>{item.wordCount.toLocaleString("zh-CN")} 字</span>
                    <span>{item.auditIssues?.length ?? 0} 条审稿意见</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </aside>

        <main className="grid gap-5">
          {currentChapter ? (
            <>
              <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-ink">
                      第{currentChapter.number}章 {currentChapter.title}
                    </h2>
                    <p className="mt-2 text-sm text-muted">{chapterFileName(currentChapter)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className={`rounded-md px-2.5 py-1 font-semibold ${statusStyle(currentChapter.status)}`}>{currentChapter.status}</span>
                    <span className="rounded-md bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                      {currentChapter.wordCount.toLocaleString("zh-CN")} 字
                    </span>
                  </div>
                </div>
                <div className="prose prose-slate mt-5 max-w-none whitespace-pre-wrap text-[15px] leading-8 text-slate-800">
                  {excerpt(currentChapter.content)}
                </div>
              </article>

              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-ink">审稿与生成质量</h3>
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <Metric label="Prompt Tokens" value={currentChapter.tokenUsage?.promptTokens?.toLocaleString("zh-CN") ?? "-"} />
                  <Metric label="Completion Tokens" value={currentChapter.tokenUsage?.completionTokens?.toLocaleString("zh-CN") ?? "-"} />
                  <Metric label="Total Tokens" value={currentChapter.tokenUsage?.totalTokens?.toLocaleString("zh-CN") ?? "-"} />
                </div>
                <div className="mt-4 grid gap-3">
                  {[...(currentChapter.lengthWarnings ?? []), ...(currentChapter.auditIssues ?? [])].length ? (
                    [...(currentChapter.lengthWarnings ?? []), ...(currentChapter.auditIssues ?? [])].map((issue, index) => (
                      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700" key={`${issue}-${index}`}>
                        {issue}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">当前章节没有审稿问题。</div>
                  )}
                </div>
              </section>
            </>
          ) : null}

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-ink">故事档案</h3>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {storyFiles.map((file) => (
                <details className="rounded-md border border-slate-200 bg-slate-50 p-4" key={file.name}>
                  <summary className="cursor-pointer text-sm font-semibold text-ink">{file.title}</summary>
                  <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-6 text-slate-700">{file.content.slice(0, 4000)}</pre>
                </details>
              ))}
            </div>
          </section>
        </main>
      </section>
    </Shell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className="mt-1 text-base font-semibold text-ink">{value}</div>
    </div>
  );
}
