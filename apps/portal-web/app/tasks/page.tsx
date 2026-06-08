import { PageHeader } from "@/components/page-header";
import { Shell } from "@/components/shell";
import { StatusBadge } from "@/components/status-badge";
import { Task } from "@/lib/types";

const tasks: Task[] = [
  {
    id: "task-novel-demo",
    moduleId: "novel",
    title: "长篇小说章节生成",
    status: "queued",
    createdAt: "2026-06-08 09:30"
  },
  {
    id: "task-video-demo",
    moduleId: "video",
    title: "第一章分镜视频生成",
    status: "running",
    createdAt: "2026-06-08 09:45"
  }
];

export default function TasksPage() {
  return (
    <Shell>
      <PageHeader title="任务中心" description="统一查看 AI 小说、小说转视频和后续发布任务。" />
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">任务</th>
              <th className="px-4 py-3 font-medium">模块</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">创建时间</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr className="border-t border-slate-200" key={task.id}>
                <td className="px-4 py-3 font-medium text-ink">{task.title}</td>
                <td className="px-4 py-3 text-muted">{task.moduleId}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={task.status}>{task.status}</StatusBadge>
                </td>
                <td className="px-4 py-3 text-muted">{task.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}

