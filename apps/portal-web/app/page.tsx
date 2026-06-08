import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-5">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-ink">Sxy Intelligent Platform</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          统一管理 AI 小说创作、小说转视频、任务中心、AccessKey 和用户权限。
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-11 items-center rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-blue-700"
        >
          进入门户
        </Link>
      </section>
    </main>
  );
}

