"use client";

import { Bot, LoaderCircle, Wrench } from "lucide-react";

import { InkosMarkdown } from "@/components/inkos-markdown";
import { formatAgentFeed } from "@/lib/use-inkos-agent";
import type { SessionMessage, ToolExecution } from "@/lib/inkos-types";

function ToolCard({ tool }: { tool: ToolExecution }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#081014] p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
        {tool.status === "running" ? (
          <LoaderCircle className="h-4 w-4 animate-spin text-amber-400" />
        ) : (
          <Wrench className="h-4 w-4 text-slate-500" />
        )}
        {tool.label ?? tool.tool}
        {tool.agent ? <span className="text-xs text-slate-500">({tool.agent})</span> : null}
      </div>
      {tool.stages?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {tool.stages.map((stage) => (
            <span
              className={`rounded px-2 py-0.5 text-xs ${
                stage.status === "completed"
                  ? "bg-emerald-500/15 text-emerald-300"
                  : stage.status === "active"
                    ? "bg-amber-500/15 text-amber-300"
                    : "bg-slate-800 text-slate-500"
              }`}
              key={stage.label}
            >
              {stage.label}
            </span>
          ))}
        </div>
      ) : null}
      {tool.result ? <pre className="mt-3 whitespace-pre-wrap text-xs leading-6 text-slate-400">{tool.result}</pre> : null}
      {tool.error ? <div className="mt-2 text-xs text-rose-300">{tool.error}</div> : null}
    </div>
  );
}

function MessageCard({ message }: { message: SessionMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`rounded-lg border p-4 ${isUser ? "border-slate-800 bg-[#0b1116]" : "border-slate-900 bg-[#071013]"}`}>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {isUser ? "你" : <><Bot className="h-3.5 w-3.5" /> Agent</>}
      </div>
      {message.thinking ? (
        <details className="mb-3 rounded-md border border-slate-800 bg-[#05090b] p-3 text-xs text-slate-500">
          <summary className="cursor-pointer font-semibold text-slate-400">思考过程</summary>
          <pre className="mt-2 whitespace-pre-wrap leading-6">{message.thinking}</pre>
        </details>
      ) : null}
      <InkosMarkdown className="!text-sm" content={message.content} />
      {message.toolExecutions?.map((tool) => (
        <div className="mt-3" key={tool.id}>
          <ToolCard tool={tool} />
        </div>
      ))}
    </div>
  );
}

export function InkosAgentFeed({
  messages,
  liveTools,
  emptyHint
}: {
  messages: SessionMessage[];
  liveTools: ToolExecution[];
  emptyHint: string;
}) {
  const blocks = formatAgentFeed(messages, liveTools);

  if (!blocks.length) {
    return (
      <div className="flex min-h-[360px] flex-col justify-center rounded-lg border border-slate-800 bg-[#071013] p-8">
        <h3 className="text-lg font-semibold text-slate-100">InkOS Agent 工作台</h3>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">{emptyHint}</p>
        <div className="mt-6 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
          <div className="rounded-md bg-[#0b1116] p-3">architect · 根据创意建书</div>
          <div className="rounded-md bg-[#0b1116] p-3">writer · 写下一章</div>
          <div className="rounded-md bg-[#0b1116] p-3">auditor · 审计章节</div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {blocks.map((block, index) =>
        block.kind === "message" ? (
          <MessageCard key={`${block.message.timestamp}-${index}`} message={block.message} />
        ) : (
          <ToolCard key={block.tool.id} tool={block.tool} />
        )
      )}
    </div>
  );
}
