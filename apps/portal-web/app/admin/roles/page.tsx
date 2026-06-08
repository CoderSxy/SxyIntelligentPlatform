import { PageHeader } from "@/components/page-header";
import { Shell } from "@/components/shell";

const roles = [
  ["super_admin", "所有权限"],
  ["admin", "用户、任务、Key 管理"],
  ["novel_creator", "AI 小说创作"],
  ["video_creator", "AI 小说转视频"],
  ["viewer", "只读查看"]
];

export default function RolesPage() {
  return (
    <Shell>
      <PageHeader title="角色权限" description="按模块拆分权限，超级管理员可维护普通用户的角色和功能权限。" />
      <div className="grid gap-4 lg:grid-cols-2">
        {roles.map(([id, description]) => (
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={id}>
            <h2 className="text-base font-semibold text-ink">{id}</h2>
            <p className="mt-2 text-sm text-muted">{description}</p>
          </div>
        ))}
      </div>
    </Shell>
  );
}
