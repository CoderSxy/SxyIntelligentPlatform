"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpenText,
  Clapperboard,
  Gauge,
  KeyRound,
  ListChecks,
  LogOut,
  ShieldCheck,
  UserCog,
  UsersRound
} from "lucide-react";

import { useAuthStore } from "@/lib/auth-store";
import { hasPermission, visibleModules } from "@/lib/permissions";

const navItems = [
  { href: "/dashboard", label: "仪表盘", icon: Gauge, permission: "*" },
  { href: "/tasks", label: "任务中心", icon: ListChecks, permission: "task:view_own" },
  { href: "/settings/keys", label: "AccessKey", icon: KeyRound, permission: "key:view" },
  { href: "/settings/profile", label: "个人设置", icon: UserCog, permission: "*" },
  { href: "/admin/users", label: "用户管理", icon: UsersRound, permission: "user:view" },
  { href: "/admin/roles", label: "角色权限", icon: ShieldCheck, permission: "role:view" }
];

const moduleIcons = {
  novel: BookOpenText,
  video: Clapperboard
};

export function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const modules = user ? visibleModules(user) : [];

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-surface text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200 bg-white px-4 py-5 lg:block">
        <div className="mb-7">
          <div className="text-lg font-semibold">Sxy AI Portal</div>
          <div className="mt-1 text-sm text-muted">{user?.displayName ?? "加载中…"}</div>
        </div>
        <nav className="space-y-1">
          {navItems
            .filter((item) => user && (item.permission === "*" || hasPermission(user, item.permission)))
            .map((item) => (
              <Link
                className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                href={item.href}
                key={item.href}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
        </nav>
        <div className="mt-8 border-t border-slate-200 pt-5">
          <div className="px-3 text-xs font-semibold uppercase text-muted">AI 模块</div>
          <div className="mt-2 space-y-1">
            {modules.map((module) => {
              const Icon = moduleIcons[module.id as keyof typeof moduleIcons] ?? Gauge;
              return (
                <Link
                  className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  href={module.href}
                  key={module.id}
                >
                  <Icon className="h-4 w-4" />
                  {module.name}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="absolute bottom-5 left-4 right-4">
          <button
            className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
            onClick={() => void handleLogout()}
            type="button"
          >
            <LogOut className="h-4 w-4" />
            退出登录
          </button>
        </div>
      </aside>
      <main className="lg:pl-72">
        <div className="mx-auto max-w-7xl px-5 py-6">{children}</div>
      </main>
    </div>
  );
}
