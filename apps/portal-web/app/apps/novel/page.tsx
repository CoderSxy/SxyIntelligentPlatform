import Link from "next/link";

import { InkosWorkbench } from "@/components/inkos-workbench";
import { PageHeader } from "@/components/page-header";
import { Shell } from "@/components/shell";

export default function NovelAppPage() {
  return (
    <Shell>
      <PageHeader
        title="AI小说创作"
        description="内嵌 inkos 空项目，书籍、章节和故事档案保存到浏览器 IndexedDB。"
        action={
          <Link className="inline-flex h-10 items-center rounded-md bg-brand px-4 text-sm font-semibold text-white" href="/apps/novel/workbench">
            打开完整工作台
          </Link>
        }
      />
      <InkosWorkbench compact />
    </Shell>
  );
}
