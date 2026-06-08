import { PageHeader } from "@/components/page-header";
import { Shell } from "@/components/shell";

const users = [
  { username: "admin", displayName: "超级管理员", roles: "super_admin", status: "启用" },
  { username: "novel_user", displayName: "小说创作用户", roles: "novel_creator", status: "启用" },
  { username: "video_user", displayName: "视频创作用户", roles: "video_creator", status: "启用" }
];

export default function UsersPage() {
  return (
    <Shell>
      <PageHeader
        title="用户管理"
        description="超级管理员可以创建用户、禁用用户，并给用户分配角色。"
        action={<button className="h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white">新增用户</button>}
      />
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">用户名</th>
              <th className="px-4 py-3 font-medium">显示名</th>
              <th className="px-4 py-3 font-medium">角色</th>
              <th className="px-4 py-3 font-medium">状态</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr className="border-t border-slate-200" key={user.username}>
                <td className="px-4 py-3 font-medium text-ink">{user.username}</td>
                <td className="px-4 py-3 text-muted">{user.displayName}</td>
                <td className="px-4 py-3 text-muted">{user.roles}</td>
                <td className="px-4 py-3 text-muted">{user.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}

