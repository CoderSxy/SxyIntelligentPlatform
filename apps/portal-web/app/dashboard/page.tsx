"use client";

import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Shell } from "@/components/shell";
import { StatusBadge } from "@/components/status-badge";
import { useAuthStore } from "@/lib/auth-store";
import { visibleModules } from "@/lib/permissions";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const modules = user ? visibleModules(user) : [];

  return (
    <Shell>
      <PageHeader
        title="平台仪表盘"
        description="一期先打通统一入口、权限、Key 和任务中心，AI 能力通过适配器逐步接入。"
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {modules.map((module) => (
          <Link
            href={module.href}
            key={module.id}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-brand"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-ink">{module.name}</h2>
              <StatusBadge>{module.status === "active" ? "已接入" : "预留"}</StatusBadge>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">{module.description}</p>
          </Link>
        ))}
      </section>
      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        {[
          ["用户角色", "超级管理员、管理员、创作用户、只读用户"],
          ["权限控制", "菜单、页面、接口三层权限校验"],
          ["服务编排", "FastAPI 网关统一管理任务、Key 和适配器"]
        ].map(([title, body]) => (
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={title}>
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
          </div>
        ))}
      </section>
    </Shell>
  );
}
