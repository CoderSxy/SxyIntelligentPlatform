"use client";

import { Check, Pencil, X } from "lucide-react";
import { useEffect, useState } from "react";

import { InkosMarkdown } from "@/components/inkos-markdown";
import type { ChapterDetail } from "@/lib/inkos-types";

function normalizeStatus(status: string | undefined | null) {
  return status?.trim() || "unknown";
}

function statusTone(status: string | undefined | null) {
  const value = normalizeStatus(status);
  if (value.includes("failed")) return "text-rose-300";
  if (value.includes("review") || value === "approved") return "text-emerald-300";
  if (value === "draft" || value === "outlining") return "text-slate-300";
  return "text-cyan-300";
}

export function InkosChapterReader({
  chapter,
  busy,
  onApprove,
  onReject,
  onSave
}: {
  chapter: ChapterDetail;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onSave: (content: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(chapter.content);

  useEffect(() => {
    setDraft(chapter.content);
    setEditing(false);
  }, [chapter.number, chapter.content]);

  const canReview =
    normalizeStatus(chapter.status).includes("review") ||
    normalizeStatus(chapter.status) === "ready-for-review" ||
    normalizeStatus(chapter.status) === "needsRevision";

  return (
    <article className="mt-6 rounded-lg border border-slate-800 bg-[#081014] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">
            {String(chapter.number).padStart(4, "0")} {chapter.title}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {chapter.fileName} · {(chapter.wordCount ?? 0).toLocaleString("zh-CN")} 字
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs font-semibold ${statusTone(chapter.status)}`}>{normalizeStatus(chapter.status)}</span>
          {canReview ? (
            <>
              <button className="inkos-action-btn !h-8 !px-3" disabled={busy} onClick={onApprove} type="button">
                <Check className="h-3.5 w-3.5" />
                通过
              </button>
              <button className="inkos-action-btn !h-8 !px-3" disabled={busy} onClick={onReject} type="button">
                <X className="h-3.5 w-3.5" />
                驳回
              </button>
            </>
          ) : null}
          <button
            className="inkos-action-btn !h-8 !px-3"
            disabled={busy}
            onClick={() => {
              if (editing) {
                onSave(draft);
                setEditing(false);
              } else {
                setDraft(chapter.content);
                setEditing(true);
              }
            }}
            type="button"
          >
            <Pencil className="h-3.5 w-3.5" />
            {editing ? "保存" : "编辑"}
          </button>
        </div>
      </div>

      {chapter.auditIssues?.length ? (
        <div className="mt-4 rounded-md border border-rose-900/40 bg-rose-950/20 p-3">
          <div className="text-xs font-semibold text-rose-200">审计问题 ({chapter.auditIssues.length})</div>
          <ul className="mt-2 space-y-1 text-xs text-rose-100/80">
            {chapter.auditIssues.map((issue, index) => (
              <li key={`${issue}-${index}`}>• {issue}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {chapter.lengthWarnings?.length ? (
        <div className="mt-3 rounded-md border border-amber-900/40 bg-amber-950/20 p-3">
          <div className="text-xs font-semibold text-amber-200">篇幅警告</div>
          <ul className="mt-2 space-y-1 text-xs text-amber-100/80">
            {chapter.lengthWarnings.map((warning, index) => (
              <li key={`${warning}-${index}`}>• {warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {chapter.reviewNote ? (
        <div className="mt-3 rounded-md border border-slate-800 bg-[#05090b] p-3 text-xs text-slate-400">{chapter.reviewNote}</div>
      ) : null}

      <div className="mt-4 max-h-[420px] overflow-auto">
        {editing ? (
          <textarea
            className="min-h-[320px] w-full resize-y rounded-md border border-slate-800 bg-[#05090b] p-3 text-sm leading-7 text-slate-200 outline-none focus:border-amber-500"
            onChange={(event) => setDraft(event.target.value)}
            value={draft}
          />
        ) : (
          <InkosMarkdown content={chapter.content} />
        )}
      </div>
    </article>
  );
}
