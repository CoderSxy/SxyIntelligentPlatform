"use client";

import { useState } from "react";
import { Save } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Shell } from "@/components/shell";
import { api, ApiError } from "@/lib/api";

export default function ProfilePage() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setMessage({ type: "error", text: "请填写所有密码字段。" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "两次输入的新密码不一致。" });
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/auth/change-password", {
        old_password: oldPassword,
        new_password: newPassword
      });
      setMessage({ type: "success", text: "密码修改成功。" });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const text =
        err instanceof ApiError
          ? err.status === 400
            ? "原密码不正确。"
            : err.message
          : "密码修改失败，请稍后重试。";
      setMessage({ type: "error", text });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Shell>
      <PageHeader title="个人设置" description="修改登录密码。修改成功后，请使用新密码重新登录。" />

      {message ? (
        <p
          className={`mb-5 rounded-md px-4 py-3 text-sm ${
            message.type === "success" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <form className="max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm" onSubmit={onSubmit}>
        <label className="block text-sm font-medium text-slate-700">
          当前密码
          <input
            autoComplete="current-password"
            className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-brand"
            disabled={submitting}
            onChange={(e) => setOldPassword(e.target.value)}
            type="password"
            value={oldPassword}
          />
        </label>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          新密码
          <input
            autoComplete="new-password"
            className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-brand"
            disabled={submitting}
            onChange={(e) => setNewPassword(e.target.value)}
            type="password"
            value={newPassword}
          />
        </label>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          确认新密码
          <input
            autoComplete="new-password"
            className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-brand"
            disabled={submitting}
            onChange={(e) => setConfirmPassword(e.target.value)}
            type="password"
            value={confirmPassword}
          />
        </label>
        <button
          className="mt-6 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-brand text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={submitting}
          type="submit"
        >
          <Save className="h-4 w-4" />
          {submitting ? "提交中…" : "修改密码"}
        </button>
      </form>
    </Shell>
  );
}
