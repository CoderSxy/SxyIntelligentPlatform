"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/lib/auth-store";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(username, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? "用户名或密码错误" : "登录失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-5">
      <form
        className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        onSubmit={onSubmit}
      >
        <h1 className="text-xl font-semibold text-ink">登录平台</h1>
        {error ? (
          <p className="mt-4 rounded-md bg-red-100 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        <label className="mt-5 block text-sm font-medium text-slate-700">
          用户名
          <input
            className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-brand"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            disabled={submitting}
          />
        </label>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          密码
          <input
            className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-brand"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            disabled={submitting}
          />
        </label>
        <button
          type="submit"
          className="mt-6 flex h-10 w-full items-center justify-center rounded-md bg-brand text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={submitting}
        >
          {submitting ? "登录中…" : "登录"}
        </button>
      </form>
    </main>
  );
}
