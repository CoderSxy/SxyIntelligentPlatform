import Link from "next/link";

import { InkosWorkbench } from "@/components/inkos-workbench";
import { PageHeader } from "@/components/page-header";
import { Shell } from "@/components/shell";

export default function NovelWorkbenchPage() {
  return (
    <Shell>
      <PageHeader
        title="inkos 小说工作台"
        description="默认项目随门户初始化，数据保存在 IndexedDB。"
        action={
          <Link className="inline-flex h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700" href="/apps/novel">
            返回小说入口
          </Link>
        }
      />
      <InkosWorkbench />
    </Shell>
  );
}
