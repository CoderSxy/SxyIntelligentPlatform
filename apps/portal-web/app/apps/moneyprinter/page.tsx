import { PageHeader } from "@/components/page-header";
import { Shell } from "@/components/shell";

export default function MoneyPrinterAppPage() {
  return (
    <Shell>
      <PageHeader
        title="智能整理发布内容视频"
        description="该模块一期仅保留权限、菜单和适配器位置，后续接入 MoneyPrinterTurbo。"
      />
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-muted">
        模块预留中
      </div>
    </Shell>
  );
}

