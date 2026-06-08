import { PageHeader } from "@/components/page-header";
import { Shell } from "@/components/shell";

export default function VideoAppPage() {
  return (
    <Shell>
      <PageHeader
        title="AI小说转视频创作"
        description="一期通过 Toonflow 适配器承接任务创建和状态查询，保留 Toonflow-web 的专业创作界面。"
        action={
          <button className="h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white">
            创建视频任务
          </button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {["选择小说章节", "生成分镜任务", "查看视频输出"].map((item) => (
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={item}>
            <h2 className="text-base font-semibold">{item}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">通过 gateway-api 统一记录任务和权限。</p>
          </div>
        ))}
      </div>
    </Shell>
  );
}

