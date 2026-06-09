"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Plus, Shield, UserPlus, X } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Shell } from "@/components/shell";
import { ApiError, api } from "@/lib/api";

type UserPublic = {
  id: string;
  username: string;
  display_name: string;
  roles: string[];
  permissions: string[];
  disabled: boolean;
  is_protected?: boolean;
};

type RolePublic = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
};

type CreateUserForm = {
  username: string;
  display_name: string;
  password: string;
  roles: string[];
};

const emptyForm: CreateUserForm = {
  username: "",
  display_name: "",
  password: "",
  roles: []
};

function isProtectedUser(user: UserPublic): boolean {
  return user.is_protected === true || user.username === "admin";
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [roles, setRoles] = useState<RolePublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState<CreateUserForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, rolesData] = await Promise.all([
        api.get<UserPublic[]>("/admin/users"),
        api.get<RolePublic[]>("/admin/roles")
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (err) {
      setError(err instanceof ApiError ? String(err.message) : "加载用户列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function openCreateForm() {
    setForm(emptyForm);
    setShowCreateForm(true);
    setMessage(null);
    setError(null);
  }

  function closeCreateForm() {
    setShowCreateForm(false);
    setForm(emptyForm);
  }

  function toggleRole(roleId: string) {
    setForm((current) => ({
      ...current,
      roles: current.roles.includes(roleId)
        ? current.roles.filter((id) => id !== roleId)
        : [...current.roles, roleId]
    }));
  }

  async function handleCreateUser(event: React.FormEvent) {
    event.preventDefault();
    if (!form.username.trim() || !form.display_name.trim() || !form.password.trim()) {
      setError("请填写用户名、显示名和密码。");
      return;
    }
    if (form.password.length < 8) {
      setError("密码至少 8 位。");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const created = await api.post<UserPublic>("/admin/users", {
        username: form.username.trim(),
        display_name: form.display_name.trim(),
        password: form.password,
        roles: form.roles
      });
      setUsers((current) => [...current, created]);
      setMessage(`用户「${created.username}」已创建。`);
      closeCreateForm();
    } catch (err) {
      setError(err instanceof ApiError ? String(err.message) : "创建用户失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleDisabled(user: UserPublic) {
    if (isProtectedUser(user) && !user.disabled) {
      setError("受保护用户不能禁用。");
      return;
    }

    setActionUserId(user.id);
    setError(null);
    try {
      const updated = await api.patch<UserPublic>(`/admin/users/${user.id}`, {
        disabled: !user.disabled
      });
      setUsers((current) => current.map((item) => (item.id === user.id ? updated : item)));
      setMessage(updated.disabled ? `用户「${user.username}」已禁用。` : `用户「${user.username}」已启用。`);
    } catch (err) {
      setError(err instanceof ApiError ? String(err.message) : "更新用户状态失败");
    } finally {
      setActionUserId(null);
    }
  }

  async function handleDelete(user: UserPublic) {
    if (isProtectedUser(user)) return;
    if (!window.confirm(`确定删除用户「${user.username}」？此操作不可恢复。`)) return;

    setActionUserId(user.id);
    setError(null);
    try {
      await api.delete(`/admin/users/${user.id}`);
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setMessage(`用户「${user.username}」已删除。`);
    } catch (err) {
      setError(err instanceof ApiError ? String(err.message) : "删除用户失败");
    } finally {
      setActionUserId(null);
    }
  }

  async function handleResetPassword(user: UserPublic) {
    const newPassword = window.prompt(`为「${user.username}」设置新密码（至少 8 位）：`);
    if (newPassword === null) return;
    if (newPassword.length < 8) {
      setError("新密码至少 8 位。");
      return;
    }

    setActionUserId(user.id);
    setError(null);
    try {
      await api.post(`/admin/users/${user.id}/reset-password`, { new_password: newPassword });
      setMessage(`用户「${user.username}」密码已重置。`);
    } catch (err) {
      setError(err instanceof ApiError ? String(err.message) : "重置密码失败");
    } finally {
      setActionUserId(null);
    }
  }

  return (
    <Shell>
      <PageHeader
        title="用户管理"
        description="超级管理员可以创建用户、禁用用户，并给用户分配角色。"
        action={
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-blue-700"
            onClick={openCreateForm}
            type="button"
          >
            <Plus className="h-4 w-4" />
            新增用户
          </button>
        }
      />

      {message ? (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">用户名</th>
              <th className="px-4 py-3 font-medium">显示名</th>
              <th className="px-4 py-3 font-medium">角色</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="border-t border-slate-200">
                <td className="px-4 py-8 text-center text-muted" colSpan={5}>
                  加载中…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr className="border-t border-slate-200">
                <td className="px-4 py-8 text-center text-muted" colSpan={5}>
                  暂无用户
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const protectedUser = isProtectedUser(user);
                const busy = actionUserId === user.id;

                return (
                  <tr className="border-t border-slate-200" key={user.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-medium text-ink">
                        {user.username}
                        {protectedUser ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                            <Shield className="h-3 w-3" />
                            受保护
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">{user.display_name}</td>
                    <td className="px-4 py-3 text-muted">{user.roles.join(", ") || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex h-7 items-center rounded-md px-2.5 text-xs font-semibold ${
                          user.disabled ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {user.disabled ? "禁用" : "启用"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {!protectedUser || user.disabled ? (
                          <ActionButton
                            disabled={busy || (protectedUser && !user.disabled)}
                            label={user.disabled ? "启用" : "禁用"}
                            onClick={() => void handleToggleDisabled(user)}
                          />
                        ) : null}
                        <ActionButton
                          disabled={busy}
                          icon={<KeyRound className="h-3.5 w-3.5" />}
                          label="重置密码"
                          onClick={() => void handleResetPassword(user)}
                        />
                        {!protectedUser ? (
                          <ActionButton
                            danger
                            disabled={busy}
                            label="删除"
                            onClick={() => void handleDelete(user)}
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showCreateForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div
            className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-lg"
            role="dialog"
            aria-labelledby="create-user-title"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-ink" id="create-user-title">
                  <UserPlus className="h-5 w-5" />
                  新增用户
                </h2>
                <p className="mt-1 text-sm text-muted">创建账号并分配角色。</p>
              </div>
              <button
                aria-label="关闭"
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                onClick={closeCreateForm}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form className="grid gap-4" onSubmit={(event) => void handleCreateUser(event)}>
              <Field label="用户名">
                <input
                  autoComplete="off"
                  className="form-input"
                  disabled={submitting}
                  minLength={2}
                  onChange={(event) => setForm({ ...form, username: event.target.value })}
                  required
                  value={form.username}
                />
              </Field>
              <Field label="显示名">
                <input
                  className="form-input"
                  disabled={submitting}
                  onChange={(event) => setForm({ ...form, display_name: event.target.value })}
                  required
                  value={form.display_name}
                />
              </Field>
              <Field label="密码">
                <input
                  autoComplete="new-password"
                  className="form-input"
                  disabled={submitting}
                  minLength={8}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  required
                  type="password"
                  value={form.password}
                />
              </Field>
              <div className="grid gap-2 rounded-md border border-slate-200 p-3">
                <div className="text-sm font-semibold text-slate-700">角色</div>
                {roles.length === 0 ? (
                  <p className="text-sm text-muted">暂无可用角色</p>
                ) : (
                  <div className="grid gap-2">
                    {roles.map((role) => (
                      <label className="flex items-start gap-2 text-sm text-slate-700" key={role.id}>
                        <input
                          checked={form.roles.includes(role.id)}
                          className="mt-0.5"
                          disabled={submitting}
                          onChange={() => toggleRole(role.id)}
                          type="checkbox"
                        />
                        <span>
                          <span className="font-medium">{role.name}</span>
                          <span className="ml-1 text-xs text-muted">({role.id})</span>
                          {role.description ? (
                            <span className="mt-0.5 block text-xs text-muted">{role.description}</span>
                          ) : null}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  className="h-10 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  disabled={submitting}
                  onClick={closeCreateForm}
                  type="button"
                >
                  取消
                </button>
                <button
                  className="h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={submitting}
                  type="submit"
                >
                  {submitting ? "创建中…" : "创建用户"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .form-input {
          height: 40px;
          width: 100%;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background: #fff;
          padding: 0 10px;
          font-size: 14px;
          color: #1f2933;
          outline: none;
        }
        .form-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }
      `}</style>
    </Shell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      {label}
      {children}
    </label>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  danger,
  icon
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      className={`inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
        danger
          ? "border-red-200 text-red-600 hover:bg-red-50"
          : "border-slate-300 text-slate-700 hover:bg-slate-50"
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}
