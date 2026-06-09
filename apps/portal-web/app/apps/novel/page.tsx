import { InkosWorkbench } from "@/components/inkos-workbench";
import { PageHeader } from "@/components/page-header";
import { Shell } from "@/components/shell";

export default function NovelAppPage() {
  return (
    <Shell>
      <PageHeader
        title="AI小说创作"
        description="小说数据保存在浏览器 IndexedDB；Agent 写作通过服务端无状态 InkOS 运行时执行。"
      />
      <InkosWorkbench />
    </Shell>
  );
}
