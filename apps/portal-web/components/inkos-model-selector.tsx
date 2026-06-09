"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, ChevronDown } from "lucide-react";

import type { NovelLlmOption } from "@/lib/portal-model-config";

type Props = {
  options: NovelLlmOption[];
  selectedId: string;
  onSelect: (option: NovelLlmOption) => void;
  emptyHint?: string;
  disabled?: boolean;
};

export function InkosModelSelector({ options, selectedId, onSelect, emptyHint, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = useMemo(
    () => options.find((option) => option.id === selectedId) ?? options[0],
    [options, selectedId]
  );

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  if (!options.length) {
    return (
      <Link
        className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs font-semibold text-amber-300 hover:bg-slate-800"
        href="/settings/keys"
      >
        <Bot className="h-4 w-4" />
        {emptyHint ?? "请先在 AccessKey 配置并测试 LLM"}
      </Link>
    );
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        className="inline-flex max-w-[280px] items-center gap-2 rounded-md px-2 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <Bot className="h-4 w-4 shrink-0" />
        <span className="truncate">{selected ? `${selected.displayName} · ${selected.provider}` : "选择模型"}</span>
        <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="absolute bottom-full left-0 z-20 mb-2 max-h-64 w-[min(320px,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-slate-700 bg-[#0b1116] py-1 shadow-xl">
          {options.map((option) => {
            const active = option.id === selected?.id;
            return (
              <button
                className={`flex w-full flex-col gap-0.5 px-3 py-2 text-left text-xs hover:bg-slate-800 ${
                  active ? "bg-slate-800/80 text-amber-200" : "text-slate-200"
                }`}
                key={option.id}
                onClick={() => {
                  onSelect(option);
                  setOpen(false);
                }}
                type="button"
              >
                <span className="font-semibold">{option.displayName}</span>
                <span className="text-slate-500">
                  {option.provider} · {option.modelName}
                </span>
                <span className="text-slate-600">{option.accessKeyLabel}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
