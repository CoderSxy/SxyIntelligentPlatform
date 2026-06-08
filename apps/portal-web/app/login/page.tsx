import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-5">
      <form className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-ink">登录平台</h1>
        <label className="mt-5 block text-sm font-medium text-slate-700">
          用户名
          <input
            className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-brand"
            defaultValue="admin"
          />
        </label>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          密码
          <input
            className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-brand"
            defaultValue="Admin@123456"
            type="password"
          />
        </label>
        <Link
          href="/dashboard"
          className="mt-6 flex h-10 w-full items-center justify-center rounded-md bg-brand text-sm font-semibold text-white hover:bg-blue-700"
        >
          登录
        </Link>
      </form>
    </main>
  );
}

