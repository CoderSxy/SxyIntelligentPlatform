"use client";

import { Activity, Radar } from "lucide-react";

import type { InkosRadarRecord } from "@/lib/inkos-indexeddb-api";

export function InkosRadarPanel({
  scans,
  busy,
  onScan
}: {
  scans: InkosRadarRecord[];
  busy: boolean;
  onScan: () => void;
}) {
  const latest = scans[0];

  return (
    <div className="grid gap-3">
      <button className="inkos-action-btn w-full justify-center" disabled={busy} onClick={onScan} type="button">
        <Activity className="h-4 w-4" />
        {busy ? "扫描中..." : "扫描市场"}
      </button>

      {latest?.marketSummary ? (
        <div className="rounded-md border border-slate-800 bg-[#0b1418] p-3">
          <div className="text-xs font-semibold text-emerald-300">最新摘要</div>
          <p className="mt-2 text-xs leading-6 text-slate-400">{latest.marketSummary}</p>
        </div>
      ) : null}

      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">扫描历史</div>
      {scans.length ? (
        scans.map((scan) => (
          <details className="rounded-md border border-slate-800 bg-[#0b1418]" key={scan.id}>
            <summary className="cursor-pointer px-3 py-2 text-xs text-slate-300">
              <span className="inline-flex items-center gap-2">
                <Radar className="h-3.5 w-3.5 text-slate-500" />
                {new Date(scan.timestamp).toLocaleString("zh-CN")}
              </span>
              <span className="mt-1 block truncate text-slate-500">{scan.summaryPreview || "市场扫描"}</span>
            </summary>
            <div className="border-t border-slate-800 px-3 py-2 text-xs leading-6 text-slate-400">
              {scan.marketSummary || "无摘要"}
              {Array.isArray(scan.result.recommendations) && scan.result.recommendations.length ? (
                <ul className="mt-2 space-y-2">
                  {(scan.result.recommendations as Array<Record<string, unknown>>).slice(0, 5).map((item, index) => (
                    <li className="rounded bg-[#05090b] p-2" key={index}>
                      <div className="font-semibold text-slate-200">{String(item.concept ?? item.genre ?? "推荐")}</div>
                      <div className="text-slate-500">
                        {String(item.platform ?? "")} · 置信度 {String(item.confidence ?? "-")}
                      </div>
                      {item.reasoning ? <div className="mt-1">{String(item.reasoning)}</div> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </details>
        ))
      ) : (
        <div className="rounded-md bg-[#0b1418] px-3 py-4 text-center text-xs text-slate-500">暂无扫描记录</div>
      )}
    </div>
  );
}
