"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { createSession, deleteSession, getSession, listSessions, renameSession, runAgent } from "@/lib/inkos-client";
import { INKOS_STORAGE_MODE } from "@/lib/inkos-client";
import type { BookSession, InkosSseMessage, SessionDetail, SessionMessage, ToolExecution } from "@/lib/inkos-types";
import type { NovelLlmOption } from "@/lib/portal-model-config";
import { useInkosSse } from "@/lib/use-inkos-sse";

type LiveTool = ToolExecution & { sessionId?: string };

function toolLabel(tool: string, agent?: string) {
  if (tool === "sub_agent" && agent) {
    const map: Record<string, string> = {
      architect: "架构师 · 建书",
      writer: "写手 · 写作",
      auditor: "审计 · 审稿",
      reviser: "修订 · 改稿"
    };
    return map[agent] ?? `子代理 · ${agent}`;
  }
  return tool;
}

export function useInkosAgent(bookId: string | null) {
  const sse = useInkosSse(INKOS_STORAGE_MODE !== "indexeddb");
  const [sessions, setSessions] = useState<BookSession[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [liveTools, setLiveTools] = useState<LiveTool[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const refreshSessions = useCallback(async () => {
    const next = await listSessions(bookId);
    setSessions(next);
    return next;
  }, [bookId]);

  const refreshSession = useCallback(async (id = sessionId) => {
    if (!id) return null;
    const result = await getSession(id);
    setSession(result.session);
    return result.session;
  }, [sessionId]);

  const ensureSession = useCallback(async () => {
    if (sessionId) {
      const existing = await refreshSession(sessionId);
      if (existing) return existing;
    }
    const created = await createSession(bookId);
    setSessionId(created.session.sessionId);
    setSession({ ...created.session, messages: [] });
    await refreshSessions();
    return created.session;
  }, [bookId, refreshSession, refreshSessions, sessionId]);

  const selectSession = useCallback(
    async (id: string) => {
      setSessionId(id);
      setLiveTools([]);
      await refreshSession(id);
    },
    [refreshSession]
  );

  const createNewSession = useCallback(async () => {
    const created = await createSession(bookId);
    setSessionId(created.session.sessionId);
    setSession({ ...created.session, messages: [] });
    setLiveTools([]);
    await refreshSessions();
    return created.session;
  }, [bookId, refreshSessions]);

  const removeSession = useCallback(
    async (id: string) => {
      await deleteSession(id);
      const next = await refreshSessions();
      if (sessionId === id) {
        const fallback = next[0];
        if (fallback) {
          setSessionId(fallback.sessionId);
          await refreshSession(fallback.sessionId);
        } else {
          setSessionId("");
          setSession(null);
        }
      }
    },
    [refreshSession, refreshSessions, sessionId]
  );

  const renameActiveSession = useCallback(
    async (id: string, title: string) => {
      await renameSession(id, title);
      await refreshSessions();
      if (id === sessionId) await refreshSession(id);
    },
    [refreshSession, refreshSessions, sessionId]
  );

  useEffect(() => {
    setSessionId("");
    setSession(null);
    setLiveTools([]);
    void refreshSessions().then((items) => {
      if (items[0]) {
        setSessionId(items[0].sessionId);
        void refreshSession(items[0].sessionId);
      } else {
        void ensureSession();
      }
    });
  }, [bookId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const latest = sse.messages.at(-1);
    if (!latest) return;

    const parsed = latest.parsed as Record<string, unknown> | undefined;
    const eventSessionId = typeof parsed?.sessionId === "string" ? parsed.sessionId : undefined;
    if (eventSessionId && sessionId && eventSessionId !== sessionId) return;

    if (latest.event === "tool:start") {
      const id = String(parsed?.id ?? `tool-${Date.now()}`);
      const tool = String(parsed?.tool ?? "tool");
      const agent = typeof parsed?.agent === "string" ? parsed.agent : undefined;
      const args = (parsed?.args as Record<string, unknown> | undefined) ?? {};
      setLiveTools((current) => [
        ...current.filter((item) => item.id !== id),
        {
          id,
          tool,
          agent: typeof args.agent === "string" ? args.agent : agent,
          label: toolLabel(tool, typeof args.agent === "string" ? args.agent : agent),
          status: "running",
          args,
          stages: Array.isArray(parsed?.stages)
            ? (parsed?.stages as Array<{ label: string; status?: string }>).map((stage) => ({
                label: stage.label,
                status: (stage.status as "pending" | "active" | "completed") ?? "pending"
              }))
            : undefined,
          startedAt: Date.now(),
          sessionId: eventSessionId
        }
      ]);
    }

    if (latest.event === "tool:end") {
      const id = String(parsed?.id ?? "");
      setLiveTools((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                status: parsed?.isError ? "error" : "completed",
                result: typeof parsed?.result === "string" ? parsed.result : undefined,
                details: parsed?.details,
                error: parsed?.isError ? "执行失败" : undefined,
                completedAt: Date.now()
              }
            : item
        )
      );
    }

    if (latest.event === "llm:progress") {
      const chineseChars = typeof parsed?.chineseChars === "number" ? parsed.chineseChars : undefined;
      if (chineseChars) setStatus(`生成中 ${chineseChars} 字`);
    }

    if (latest.event === "agent:complete") {
      setBusy(false);
      setStatus("Agent 已完成");
      setLiveTools([]);
      void refreshSession();
      void refreshSessions();
    }

    if (latest.event === "agent:error") {
      setBusy(false);
      setStatus(typeof parsed?.error === "string" ? parsed.error : "Agent 执行失败");
    }

    if (["write:complete", "audit:complete", "revise:complete", "book:creating"].includes(latest.event)) {
      setStatus(latest.event);
    }
  }, [refreshSession, refreshSessions, sessionId, sse.messages]);

  const sendInstruction = useCallback(
    async (instruction: string, options?: { service?: string; model?: string; llm?: NovelLlmOption | null }) => {
      if (!instruction.trim()) return;
      setBusy(true);
      setStatus("Agent 正在处理...");
      try {
        const activeSession = await ensureSession();
        const result = await runAgent(
          {
            instruction: instruction.trim(),
            sessionId: activeSession.sessionId,
            activeBookId: bookId ?? undefined,
            service: options?.service,
            model: options?.model
          },
          options?.llm
        );
        await refreshSession(activeSession.sessionId);
        await refreshSessions();
        setStatus(result.response ?? "Agent 已响应");
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Agent 执行失败";
        setStatus(message);
        return { error: message };
      } finally {
        setBusy(false);
      }
    },
    [bookId, ensureSession, refreshSession, refreshSessions]
  );

  const feedMessages = useMemo(() => session?.messages ?? [], [session?.messages]);

  return {
    session,
    sessionId,
    sessions,
    feedMessages,
    liveTools,
    busy,
    status,
    sse,
    ensureSession,
    refreshSession,
    refreshSessions,
    selectSession,
    createNewSession,
    removeSession,
    renameActiveSession,
    sendInstruction
  };
}

export function formatAgentFeed(messages: SessionMessage[], liveTools: LiveTool[]) {
  const blocks: Array<
    | { kind: "message"; message: SessionMessage }
    | { kind: "tool"; tool: LiveTool }
  > = messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({ kind: "message" as const, message }));

  for (const tool of liveTools) {
    blocks.push({ kind: "tool", tool });
  }

  return blocks;
}

export function shouldRefreshBooks(event: InkosSseMessage) {
  return ["write:complete", "audit:complete", "revise:complete", "agent:complete", "book:creating"].includes(
    event.event
  );
}
