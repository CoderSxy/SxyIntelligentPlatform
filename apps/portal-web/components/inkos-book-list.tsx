"use client";

import { BookOpenText, Plus } from "lucide-react";

import type { BookSummary, ChapterSummary } from "@/lib/inkos-types";

function formatZhNumber(value: number | undefined | null) {
  return (value ?? 0).toLocaleString("zh-CN");
}

function chapterCount(book: BookSummary, chapters?: ChapterSummary[]) {
  if (chapters?.length) return chapters.length;
  return book.chapterCount ?? book.chaptersWritten ?? book.chapters ?? 0;
}

function totalWords(chapters?: ChapterSummary[]) {
  return chapters?.reduce((sum, chapter) => sum + (chapter.wordCount ?? 0), 0) ?? 0;
}

export function InkosBookList({
  books,
  selectedBookId,
  onSelect,
  onCreate
}: {
  books: BookSummary[];
  selectedBookId?: string;
  onSelect: (bookId: string) => void;
  onCreate: () => void;
}) {
  if (!books.length) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 bg-[#071013] p-10 text-center">
        <BookOpenText className="h-10 w-10 text-amber-400" />
        <h3 className="mt-4 text-xl font-semibold text-slate-100">还没有小说</h3>
        <p className="mt-2 max-w-md text-sm leading-7 text-slate-400">
          这是一个空的 InkOS 项目。输入创意、书名和世界观，Agent 会自动调用 architect 建书，再由 writer 开始写作。
        </p>
        <button
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-md bg-amber-500 px-4 text-sm font-semibold text-slate-950"
          onClick={onCreate}
          type="button"
        >
          <Plus className="h-4 w-4" />
          开始创建第一本
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <button
        className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 bg-[#071013] p-5 text-slate-400 transition hover:border-amber-500/60 hover:text-amber-300"
        onClick={onCreate}
        type="button"
      >
        <Plus className="h-8 w-8" />
        <span className="mt-3 text-sm font-semibold">新建小说</span>
      </button>
      {books.map((book) => (
        <button
          className={`flex min-h-[180px] flex-col rounded-lg border p-5 text-left transition hover:border-amber-500/50 ${
            book.id === selectedBookId
              ? "border-amber-500/70 bg-amber-500/5"
              : "border-slate-800 bg-[#071013]"
          }`}
          key={book.id}
          onClick={() => onSelect(book.id)}
          type="button"
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-100">{book.title}</h3>
            <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">{book.status}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
            <span>{book.genre}</span>
            <span>{book.platform}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
            {(book.approvedChapters ?? 0) > 0 ? (
              <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-300">已通过 {book.approvedChapters}</span>
            ) : null}
            {(book.pendingReview ?? 0) > 0 ? (
              <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-300">待审 {book.pendingReview}</span>
            ) : null}
            {(book.failedReview ?? 0) > 0 ? (
              <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-rose-300">未过 {book.failedReview}</span>
            ) : null}
          </div>
          <div className="mt-auto pt-3 text-sm text-slate-400">
            {chapterCount(book)} 章 · 目标 {book.targetChapters} 章
            {book.totalWords ? ` · ${formatZhNumber(book.totalWords)} 字` : ""}
          </div>
        </button>
      ))}
    </div>
  );
}

export function InkosBookListCompact({
  books,
  activeBookId,
  onSelect,
  onBack
}: {
  books: BookSummary[];
  activeBookId: string;
  onSelect: (bookId: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-2">
      <button className="w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-500 hover:bg-slate-800" onClick={onBack} type="button">
        ← 全部小说
      </button>
      {books.map((book) => (
        <button
          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-800 ${
            book.id === activeBookId ? "text-amber-300" : "text-slate-300"
          }`}
          key={book.id}
          onClick={() => onSelect(book.id)}
          type="button"
        >
          <BookOpenText className="h-4 w-4 shrink-0 text-slate-500" />
          <span className="truncate">{book.title}</span>
        </button>
      ))}
    </div>
  );
}

export { formatZhNumber, chapterCount, totalWords };
