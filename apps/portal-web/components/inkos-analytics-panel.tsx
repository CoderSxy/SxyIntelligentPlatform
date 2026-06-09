"use client";

import type { BookAnalytics } from "@/lib/inkos-indexeddb-api";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-slate-800 bg-[#0b1418] p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-100">{value}</div>
    </div>
  );
}

export function InkosAnalyticsPanel({ analytics }: { analytics: BookAnalytics | null }) {
  if (!analytics) {
    return <div className="rounded-md bg-[#0b1418] px-3 py-4 text-center text-xs text-slate-500">选择书籍后查看统计</div>;
  }

  const statusEntries = Object.entries(analytics.statusDistribution).sort((a, b) => b[1] - a[1]);

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="总章节" value={analytics.totalChapters} />
        <StatCard label="总字数" value={analytics.totalWords.toLocaleString("zh-CN")} />
        <StatCard label="平均字数" value={analytics.avgWords.toLocaleString("zh-CN")} />
        <StatCard label="Token 用量" value={analytics.totalTokens.toLocaleString("zh-CN")} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <StatCard label="已通过" value={analytics.approvedChapters} />
        <StatCard label="待审阅" value={analytics.pendingReview} />
        <StatCard label="未通过" value={analytics.failedReview} />
      </div>
      {statusEntries.length ? (
        <div className="rounded-md border border-slate-800 bg-[#0b1418] p-3">
          <div className="text-xs font-semibold text-slate-400">状态分布</div>
          <div className="mt-2 space-y-1">
            {statusEntries.map(([status, count]) => (
              <div className="flex items-center justify-between text-xs" key={status}>
                <span className="text-slate-400">{status}</span>
                <span className="font-semibold text-slate-200">{count}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
