"use client";

import { MessageSquarePlus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import type { BookSession } from "@/lib/inkos-types";

function sessionLabel(session: BookSession) {
  if (session.title?.trim()) return session.title;
  const date = new Date(session.updatedAt);
  return `会话 ${date.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}`;
}

export function InkosSessionSidebar({
  sessions,
  activeSessionId,
  busy,
  onSelect,
  onCreate,
  onRename,
  onDelete
}: {
  sessions: BookSession[];
  activeSessionId: string;
  busy: boolean;
  onSelect: (sessionId: string) => void;
  onCreate: () => void;
  onRename: (sessionId: string, title: string) => void;
  onDelete: (sessionId: string) => void;
}) {
  const [renamingId, setRenamingId] = useState("");
  const [renameDraft, setRenameDraft] = useState("");

  return (
    <aside className="flex min-h-0 flex-col border-slate-800 bg-[#05090b] xl:border-r">
      <div className="flex items-center justify-between border-b border-slate-900 px-3 py-3">
        <span className="text-sm font-semibold text-slate-200">会话</span>
        <button
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-amber-300 disabled:opacity-40"
          disabled={busy}
          onClick={onCreate}
          title="新建会话"
          type="button"
        >
          <MessageSquarePlus className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {sessions.length ? (
          sessions.map((session) => (
            <div
              className={`group mb-1 rounded-md ${
                session.sessionId === activeSessionId ? "bg-amber-500/10 ring-1 ring-amber-500/30" : "hover:bg-slate-800/60"
              }`}
              key={session.sessionId}
            >
              {renamingId === session.sessionId ? (
                <form
                  className="flex gap-1 p-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    onRename(session.sessionId, renameDraft);
                    setRenamingId("");
                  }}
                >
                  <input
                    autoFocus
                    className="min-w-0 flex-1 rounded border border-slate-700 bg-[#081014] px-2 py-1 text-xs text-slate-100 outline-none focus:border-amber-500"
                    onChange={(event) => setRenameDraft(event.target.value)}
                    value={renameDraft}
                  />
                  <button className="rounded bg-amber-500 px-2 text-xs font-semibold text-slate-950" type="submit">
                    保存
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    className="min-w-0 flex-1 truncate px-2 py-2 text-left text-xs text-slate-300"
                    onClick={() => onSelect(session.sessionId)}
                    type="button"
                  >
                    {sessionLabel(session)}
                  </button>
                  <button
                    className="hidden h-7 w-7 shrink-0 items-center justify-center rounded text-slate-500 hover:text-amber-300 group-hover:inline-flex"
                    onClick={() => {
                      setRenamingId(session.sessionId);
                      setRenameDraft(session.title ?? "");
                    }}
                    title="重命名"
                    type="button"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="hidden h-7 w-7 shrink-0 items-center justify-center rounded text-slate-500 hover:text-rose-300 group-hover:inline-flex"
                    onClick={() => onDelete(session.sessionId)}
                    title="删除"
                    type="button"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="rounded-md bg-[#0b1418] px-3 py-4 text-center text-xs text-slate-500">暂无会话，点击 + 创建</div>
        )}
      </div>
    </aside>
  );
}
