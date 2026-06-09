"use client";

import { useEffect, useRef, useState } from "react";

import { eventsUrl } from "@/lib/inkos-client";
import type { InkosSseMessage } from "@/lib/inkos-types";

function parseEventData(data: string) {
  if (!data) return undefined;
  try {
    return JSON.parse(data) as unknown;
  } catch {
    return data;
  }
}

const TRACKED_EVENTS = [
  "log",
  "llm:progress",
  "write:start",
  "write:complete",
  "write:error",
  "draft:start",
  "draft:complete",
  "draft:error",
  "audit:start",
  "audit:complete",
  "audit:error",
  "revise:start",
  "revise:complete",
  "revise:error",
  "agent:start",
  "agent:complete",
  "agent:error",
  "tool:start",
  "tool:update",
  "tool:end",
  "book:creating",
  "session:title",
  "radar:start",
  "radar:complete",
  "radar:error"
];

export function useInkosSse(enabled = true) {
  const [messages, setMessages] = useState<InkosSseMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const source = new EventSource(eventsUrl());
    sourceRef.current = source;

    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);

    const handle = (event: Event) => {
      const messageEvent = event as MessageEvent<string>;
      const name = messageEvent.type ?? "message";
      if (name === "ping") return;
      setMessages((current) => [
        ...current.slice(-200),
        {
          event: name,
          data: messageEvent.data,
          parsed: parseEventData(messageEvent.data)
        }
      ]);
    };

    for (const eventName of TRACKED_EVENTS) {
      source.addEventListener(eventName, handle);
    }

    return () => {
      for (const eventName of TRACKED_EVENTS) {
        source.removeEventListener(eventName, handle);
      }
      source.close();
      sourceRef.current = null;
      setConnected(false);
    };
  }, [enabled]);

  return { messages, connected, clear: () => setMessages([]) };
}
