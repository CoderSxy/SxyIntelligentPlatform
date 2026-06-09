"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Shield, ShieldCheck, Trash2, X } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Shell } from "@/components/shell";
import { ApiError, api } from "@/lib/api";

type RolePublic = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  is_protected?: boolean;
};

type PermissionGroup = {
  module_id: string;
  module_name: string;
  permissions: string[];
};

type RoleForm = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
};

const emptyForm: RoleForm = {
  id: "",
  name: "",
  description: "",
  permissions: []
};

function isProtectedRole(role: RolePublic): boolean {
  return role.is_protected === true || role.id === "super_admin";
}

function permissionCountLabel(permissions: string[]): string {
  if (permissions.includes("*")) return "全部权限";
  return `${permissions.length} 项权限`;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<RolePublic[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [form, setForm] = useState<RoleForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [actionRoleId, setActionRoleId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesData, permissionsData] = await Promise.all([
        api.get<RolePublic[]>("/admin/roles"),
        api.get<PermissionGroup[]>("/admin/permissions")
      ]);
      setRoles(rolesData);
      setPermissionGroups(permissionsData);
    } catch (err) {
      setError(err instanceof ApiError ? String(err.message) : "加载角色列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function openCreateModal() {
    setEditingRoleId(null);
    setForm(emptyForm);
    setShowModal(true);
    setMessage(null);
    setError(null);
  }

  function openEditModal(role: RolePublic) {
    setEditingRoleId(role.id);
    setForm({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions.includes("*") ? [] : [...role.permissions]
    });
    setShowModal(true);
    setMessage(null);
    setError(null);
  }

  function closeModal() {
    setShowModal(false);
    setEditingRoleId(null);
    setForm(emptyForm);
  }

  function togglePermission(code: string) {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(code)
        ? current.permissions.filter((item) => item !== code)
        : [...current.permissions, code]
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (editingRoleId) {
      if (!form.name.trim()) {
        setError("请填写角色名称。");
        return;
      }
    } else {
      if (!form.id.trim() || !form.name.trim()) {
        setError("请填写角色 ID 和名称。");
        return;
      }
      if (!/^[a-z][a-z0-9_]*$/.test(form.id.trim())) {
        setError("角色 ID 须以小写字母开头，仅含小写字母、数字和下划线。");
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      if (editingRoleId) {
        const updated = await api.patch<RolePublic>(`/admin/roles/${editingRoleId}`, {
          name: form.name.trim(),
          description: form.description.trim(),
          permissions: form.permissions
        });
        setRoles((current) => current.map((item) => (item.id === editingRoleId ? updated : item)));
        setMessage(`角色「${updated.name}」已更新。`);
      } else {
        const created = await api.post<RolePublic>("/admin/roles", {
          id: form.id.trim(),
          name: form.name.trim(),
          description: form.description.trim(),
          permissions: form.permissions
        });
        setRoles((current) => [...current, created]);
        setMessage(`角色「${created.name}」已创建。`);
      }
      closeModal();
    } catch (err) {
      setError(err instanceof ApiError ? String(err.message) : editingRoleId ? "更新角色失败" : "创建角色失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(role: RolePublic) {
    if (isProtectedRole(role)) return;
    if (!window.confirm(`确定删除角色「${role.name}」？此操作不可恢复。`)) return;

    setActionRoleId(role.id);
    setError(null);
    try {
      await api.delete(`/admin/roles/${role.id}`);
      setRoles((current) => current.filter((item) => item.id !== role.id));
      setMessage(`角色「${role.name}」已删除。`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(err.message || "该角色已分配给用户，无法删除。");
      } else {
        setError(err instanceof ApiError ? String(err.message) : "删除角色失败");
      }
    } finally {
      setActionRoleId(null);
    }
  }

  return (
    <Shell>
      <PageHeader
        title="角色权限"
        description="按模块拆分权限，超级管理员可维护普通用户的角色和功能权限。"
        action={
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-blue-700"
            onClick={openCreateModal}
            type="button"
          >
            <Plus className="h-4 w-4" />
            新增角色
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

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white px-5 py-12 text-center text-sm text-muted shadow-sm">
          加载中…
        </div>
      ) : roles.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white px-5 py-12 text-center text-sm text-muted shadow-sm">
          暂无角色
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {roles.map((role) => {
            const protectedRole = isProtectedRole(role);
            const busy = actionRoleId === role.id;

            return (
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={role.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-ink">{role.name}</h2>
                      {protectedRole ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          <Shield className="h-3 w-3" />
                          受保护
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 font-mono text-xs text-muted">{role.id}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {permissionCountLabel(role.permissions)}
                  </span>
                </div>

                <p className="mt-3 text-sm text-muted">{role.description || "—"}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <ActionButton
                    disabled={busy}
                    icon={<Pencil className="h-3.5 w-3.5" />}
                    label="编辑"
                    onClick={() => openEditModal(role)}
                  />
                  {!protectedRole ? (
                    <ActionButton
                      danger
                      disabled={busy}
                      icon={<Trash2 className="h-3.5 w-3.5" />}
                      label="删除"
                      onClick={() => void handleDelete(role)}
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6">
          <div
            className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg border border-slate-200 bg-white shadow-lg"
            role="dialog"
            aria-labelledby="role-modal-title"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-ink" id="role-modal-title">
                  <ShieldCheck className="h-5 w-5" />
                  {editingRoleId ? "编辑角色" : "新增角色"}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {editingRoleId ? "更新角色名称、描述和权限。" : "创建自定义角色并分配模块权限。"}
                </p>
              </div>
              <button
                aria-label="关闭"
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                onClick={closeModal}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => void handleSubmit(event)}>
              <div className="grid gap-4 overflow-y-auto px-6 py-5">
                <Field label="角色 ID">
                  <input
                    autoComplete="off"
                    className="form-input"
                    disabled={submitting || Boolean(editingRoleId)}
                    onChange={(event) => setForm({ ...form, id: event.target.value })}
                    pattern="^[a-z][a-z0-9_]*$"
                    required={!editingRoleId}
                    value={form.id}
                  />
                </Field>
                <Field label="名称">
                  <input
                    className="form-input"
                    disabled={submitting}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    required
                    value={form.name}
                  />
                </Field>
                <Field label="描述">
                  <textarea
                    className="form-textarea"
                    disabled={submitting}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                    rows={2}
                    value={form.description}
                  />
                </Field>

                <div className="grid gap-3">
                  <div className="text-sm font-semibold text-slate-700">权限</div>
                  {permissionGroups.length === 0 ? (
                    <p className="text-sm text-muted">暂无可用权限</p>
                  ) : (
                    <div className="grid gap-3">
                      {permissionGroups.map((group) => (
                        <div
                          className="rounded-md border border-slate-200 p-3"
                          key={group.module_id}
                        >
                          <div className="mb-2 text-sm font-semibold text-slate-700">{group.module_name}</div>
                          <div className="grid gap-2">
                            {group.permissions.map((code) => (
                              <label className="flex items-center gap-2 text-sm text-slate-700" key={code}>
                                <input
                                  checked={form.permissions.includes(code)}
                                  className="h-4 w-4"
                                  disabled={submitting}
                                  onChange={() => togglePermission(code)}
                                  type="checkbox"
                                />
                                <span className="font-mono text-xs">{code}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
                <button
                  className="h-10 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  disabled={submitting}
                  onClick={closeModal}
                  type="button"
                >
                  取消
                </button>
                <button
                  className="h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={submitting}
                  type="submit"
                >
                  {submitting ? "保存中…" : editingRoleId ? "保存更改" : "创建角色"}
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
        .form-input:disabled {
          background: #f8fafc;
          color: #64748b;
        }
        .form-textarea {
          width: 100%;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background: #fff;
          padding: 8px 10px;
          font-size: 14px;
          color: #1f2933;
          outline: none;
          resize: vertical;
        }
        .form-textarea:focus {
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
