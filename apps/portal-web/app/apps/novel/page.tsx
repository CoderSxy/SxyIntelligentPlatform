import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Shell } from "@/components/shell";
import { getInkosBook, resolveInkosProjectRoot } from "@/lib/inkos-workspace";

export const dynamic = "force-dynamic";

export default async function NovelAppPage() {
  const [projectRoot, book] = await Promise.all([resolveInkosProjectRoot(), getInkosBook()]);

  return (
    <Shell>
      <PageHeader
        title="AI小说创作"
        description="已将 inkos 生成的小说项目重构进当前门户，可直接查看书籍、章节、审稿问题和故事档案。"
        action={
          <Link className="inline-flex h-10 items-center rounded-md bg-brand px-4 text-sm font-semibold text-white" href="/apps/novel/workbench">
            打开 inkos 工作台
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-4">
        {[
          ["项目路径", projectRoot],
          ["当前书籍", book?.title ?? "未找到"],
          ["章节数量", String(book?.chapters.length ?? 0)],
          ["总字数", `${book?.totalWords.toLocaleString("zh-CN") ?? 0}`]
        ].map(([label, value]) => (
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={label}>
            <div className="text-sm text-muted">{label}</div>
            <div className="mt-2 break-all text-lg font-semibold text-ink">{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">生成结果处理</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              当前门户直接读取 inkos 项目产物，不复制章节文件；章节正文、审稿问题、字数和故事档案会在工作台内统一展示。
            </p>
          </div>
          <Link className="inline-flex h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700" href="/apps/novel/workbench">
            查看章节结果
          </Link>
        </div>
      </div>
    </Shell>
  );
}
