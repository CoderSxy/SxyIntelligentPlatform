"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  appendDaemonEvent,
  getDaemonConfig,
  listBooks,
  runRadarScan,
  saveDaemonConfig,
  writeNextChapter,
  type InkosDaemonConfig
} from "@/lib/inkos-client";
import type { NovelLlmOption } from "@/lib/portal-model-config";

function cronMinutes(cron: string, fallback: number) {
  const match = cron.match(/^\*\/(\d+)/);
  return match ? Number(match[1]) : fallback;
}

function cronHours(cron: string, fallback: number) {
  const match = cron.match(/^0 \*\/(\d+)/);
  return match ? Number(match[1]) : fallback;
}

export function useInkosDaemon(llm: NovelLlmOption | null) {
  const [config, setConfig] = useState<InkosDaemonConfig | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const radarTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const busyRef = useRef(false);

  const refresh = useCallback(async () => {
    const next = await getDaemonConfig();
    setConfig(next);
    return next;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (radarTimerRef.current) {
      clearInterval(radarTimerRef.current);
      radarTimerRef.current = null;
    }
  }, []);

  const runDaemonTick = useCallback(async () => {
    if (busyRef.current || !llm) return;
    busyRef.current = true;
    try {
      const books = await listBooks();
      const active = books.filter((book) => book.status === "active").slice(0, config?.maxConcurrentBooks ?? 3);
      for (const book of active) {
        try {
          await writeNextChapter(book.id, undefined, llm);
          await appendDaemonEvent({
            type: "chapter",
            message: `${book.title} 自动写作完成`,
            bookId: book.id
          });
        } catch (error) {
          await appendDaemonEvent({
            type: "error",
            message: error instanceof Error ? error.message : "自动写作失败",
            bookId: book.id
          });
        }
      }
      await refresh();
    } finally {
      busyRef.current = false;
    }
  }, [config?.maxConcurrentBooks, llm, refresh]);

  const startDaemon = useCallback(async () => {
    if (!llm) throw new Error("请先在 AccessKey 中配置 LLM");
    const current = await saveDaemonConfig({ running: true });
    setConfig(current);
    await appendDaemonEvent({ type: "started", message: "守护进程已启动（浏览器内调度）" });
    stopTimer();
    const writeMinutes = cronMinutes(current.writeCron, 15);
    timerRef.current = setInterval(() => void runDaemonTick(), writeMinutes * 60 * 1000);

    const radarHours = cronHours(current.radarCron, 6);
    const radarMs = radarHours * 60 * 60 * 1000;
    radarTimerRef.current = setInterval(async () => {
      try {
        await runRadarScan(llm);
        await appendDaemonEvent({ type: "radar", message: "定时市场雷达完成" });
        await refresh();
      } catch (error) {
        await appendDaemonEvent({
          type: "error",
          message: error instanceof Error ? error.message : "定时雷达失败"
        });
      }
    }, radarMs);
  }, [llm, refresh, runDaemonTick, stopTimer]);

  const stopDaemon = useCallback(async () => {
    stopTimer();
    const current = await saveDaemonConfig({ running: false });
    setConfig(current);
    await appendDaemonEvent({ type: "stopped", message: "守护进程已停止" });
  }, [stopTimer]);

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  const updateConfig = useCallback(async (patch: Partial<InkosDaemonConfig>) => {
    const next = await saveDaemonConfig(patch);
    setConfig(next);
    return next;
  }, []);

  return {
    config,
    refresh,
    startDaemon,
    stopDaemon,
    updateConfig
  };
}
