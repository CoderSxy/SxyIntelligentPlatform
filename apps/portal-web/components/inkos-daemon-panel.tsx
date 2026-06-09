"use client";

import { Gauge, Play, Square } from "lucide-react";

import type { InkosDaemonConfig } from "@/lib/inkos-indexeddb-api";

export function InkosDaemonPanel({
  config,
  busy,
  onStart,
  onStop,
  onUpdate
}: {
  config: InkosDaemonConfig | null;
  busy: boolean;
  onStart: () => void;
  onStop: () => void;
  onUpdate: (patch: Partial<InkosDaemonConfig>) => void;
}) {
  if (!config) {
    return <div className="rounded-md bg-[#0b1418] px-3 py-4 text-center text-xs text-slate-500">加载中...</div>;
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between rounded-md border border-slate-800 bg-[#0b1418] px-3 py-2">
        <span className="inline-flex items-center gap-2 text-sm text-slate-300">
          <Gauge className="h-4 w-4 text-slate-500" />
          守护进程
        </span>
        <span className={`text-xs font-semibold ${config.running ? "text-emerald-300" : "text-slate-500"}`}>
          {config.running ? "运行中" : "已停止"}
        </span>
      </div>

      <div className="flex gap-2">
        <button className="inkos-action-btn flex-1 justify-center" disabled={busy || config.running} onClick={onStart} type="button">
          <Play className="h-4 w-4" />
          启动
        </button>
        <button className="inkos-action-btn flex-1 justify-center" disabled={busy || !config.running} onClick={onStop} type="button">
          <Square className="h-4 w-4" />
          停止
        </button>
      </div>

      <label className="grid gap-1 text-xs text-slate-500">
        写作 Cron
        <input
          className="rounded border border-slate-800 bg-[#05090b] px-2 py-1.5 text-slate-200 outline-none focus:border-amber-500"
          onChange={(event) => onUpdate({ writeCron: event.target.value })}
          value={config.writeCron}
        />
      </label>
      <label className="grid gap-1 text-xs text-slate-500">
        雷达 Cron
        <input
          className="rounded border border-slate-800 bg-[#05090b] px-2 py-1.5 text-slate-200 outline-none focus:border-amber-500"
          onChange={(event) => onUpdate({ radarCron: event.target.value })}
          value={config.radarCron}
        />
      </label>
      <label className="grid gap-1 text-xs text-slate-500">
        并发书籍数
        <input
          className="rounded border border-slate-800 bg-[#05090b] px-2 py-1.5 text-slate-200 outline-none focus:border-amber-500"
          max={10}
          min={1}
          onChange={(event) => onUpdate({ maxConcurrentBooks: Number(event.target.value) || 1 })}
          type="number"
          value={config.maxConcurrentBooks}
        />
      </label>

      <div className="text-xs text-slate-500">IndexedDB 模式下守护进程在浏览器标签页内调度，关闭页面后停止。</div>

      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">事件日志</div>
      {config.eventLog.length ? (
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {config.eventLog.map((event) => (
            <div className="rounded bg-[#0b1418] px-2 py-1.5 text-xs text-slate-400" key={event.id}>
              <span className="text-slate-500">{new Date(event.timestamp).toLocaleString("zh-CN")}</span>
              <span className="ml-2 text-slate-300">{event.message}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md bg-[#0b1418] px-3 py-4 text-center text-xs text-slate-500">暂无事件</div>
      )}
    </div>
  );
}
