"use client";

import { api, ApiError } from "@/lib/api";
import {
  appendInkosDaemonEvent,
  buildInkosExportText,
  computeInkosBookAnalytics,
  createInkosBook,
  createInkosSession,
  deleteInkosBook,
  deleteInkosSession,
  exportInkosWorkspace,
  importInkosWorkspace,
  getInkosBookDetail,
  getInkosChapter,
  getInkosDaemonConfig,
  getInkosSession,
  getInkosTruthFile,
  listInkosBooks,
  listInkosRadarScans,
  listInkosSessions,
  listInkosTruthFiles,
  loadInkosWorkspace,
  mergeInkosWorkspace,
  renameInkosSession,
  saveInkosDaemonConfig,
  saveInkosRadarScan,
  saveInkosSession,
  saveInkosStoryFile,
  type BookAnalytics,
  type InkosDaemonConfig,
  type InkosRadarRecord,
  type InkosSessionRecord,
  type InkosWorkspaceSnapshot
} from "@/lib/inkos-indexeddb";
import type { AgentResponse, BookSession, CreateBookPayload, SessionDetail } from "@/lib/inkos-types";
import type { NovelLlmOption } from "@/lib/portal-model-config";

type RuntimeExecuteResponse = {
  snapshot: InkosWorkspaceSnapshot;
  result: {
    agent?: AgentResponse;
    session?: SessionDetail;
    writeNext?: Record<string, unknown>;
    audit?: Record<string, unknown>;
    revise?: Record<string, unknown>;
    radar?: Record<string, unknown>;
    approve?: Record<string, unknown>;
    reject?: Record<string, unknown>;
    saveChapter?: Record<string, unknown>;
  };
};

function buildSecrets(option?: NovelLlmOption | null) {
  if (!option) return { services: {} };
  return { services: { [option.inkosService]: { apiKey: option.apiKey } } };
}

function buildLlmConfig(option?: NovelLlmOption | null) {
  if (!option) return undefined;
  return {
    service: option.inkosService,
    model: option.modelName,
    apiFormat: option.customService?.apiFormat ?? "chat"
  };
}

async function executeRuntime(input: {
  action: string;
  params?: Record<string, unknown>;
  llm?: NovelLlmOption | null;
}) {
  const snapshot = await exportInkosWorkspace();
  try {
    const response = await api.post<RuntimeExecuteResponse>("/novel/v1/runtime/execute", {
      action: input.action,
      snapshot,
      params: input.params ?? {},
      secrets: buildSecrets(input.llm),
      llm: buildLlmConfig(input.llm)
    });
    await mergeInkosWorkspace(response.snapshot);
    return response;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, error instanceof Error ? error.message : "运行时执行失败");
  }
}

export async function getNovelStatus() {
  return api.get<{
    reachable: boolean;
    managedProcess: boolean;
    projectName: string;
    activeStudioProject?: string | null;
    projectMatched: boolean;
    studioUrl: string;
    autoStart: boolean;
    storageMode: string;
  }>("/novel/status");
}

export const listBooks = listInkosBooks;
export const getBook = getInkosBookDetail;
export async function getChapter(bookId: string, chapterNumber: number, summary?: import("@/lib/inkos-types").ChapterSummary) {
  const detail = await getInkosChapter(bookId, chapterNumber);
  if (!summary) return detail;
  return {
    ...detail,
    title: summary.title ?? detail.title,
    status: summary.status ?? detail.status,
    wordCount: summary.wordCount ?? detail.wordCount,
    fileName: summary.fileName ?? detail.fileName,
    updatedAt: summary.updatedAt ?? detail.updatedAt,
    auditIssues: summary.auditIssues ?? detail.auditIssues,
    lengthWarnings: summary.lengthWarnings ?? detail.lengthWarnings
  };
}
export const listTruthFiles = listInkosTruthFiles;
export const getTruthFile = getInkosTruthFile;
export const saveTruthFile = async (bookId: string, fileName: string, content: string) => {
  const workspace = await loadInkosWorkspace();
  const file = workspace.storyFiles.find((item) => item.bookId === bookId && item.name === fileName);
  if (!file) throw new Error(`档案不存在: ${fileName}`);
  await saveInkosStoryFile({ ...file, content });
  return { ok: true };
};
export const deleteBook = deleteInkosBook;
export const createBook = async (payload: CreateBookPayload) => {
  const book = await createInkosBook({
    title: payload.title,
    genre: payload.genre,
    platform: payload.platform,
    targetChapters: payload.targetChapters ?? 100,
    chapterWordCount: payload.chapterWordCount ?? 3000
  });
  return { bookId: book.id, status: "created" };
};
export const createSession = createInkosSession;
export const getSession = getInkosSession;
export const listSessions = listInkosSessions;
export const renameSession = renameInkosSession;
export const deleteSession = deleteInkosSession;
export const getBookAnalytics = computeInkosBookAnalytics;
export const getRadarHistory = listInkosRadarScans;
export const getDaemonConfig = getInkosDaemonConfig;
export const saveDaemonConfig = saveInkosDaemonConfig;
export const appendDaemonEvent = appendInkosDaemonEvent;
export const exportWorkspace = exportInkosWorkspace;
export const importWorkspace = async (snapshot: InkosWorkspaceSnapshot) => {
  await importInkosWorkspace(snapshot);
  return { ok: true };
};

export async function runAgent(
  input: {
    instruction: string;
    sessionId: string;
    activeBookId?: string;
    model?: string;
    service?: string;
  },
  llm?: NovelLlmOption | null
) {
  const response = await executeRuntime({
    action: "agent",
    params: input,
    llm
  });
  const session = response.result.session;
  if (session) {
    const record: InkosSessionRecord = {
      sessionId: session.sessionId,
      bookId: session.bookId,
      title: session.title,
      messages: session.messages ?? [],
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    };
    await saveInkosSession(record);
  }
  return response.result.agent ?? { response: "Agent 已响应" };
}

export async function writeNextChapter(bookId: string, wordCount?: number, llm?: NovelLlmOption | null) {
  const response = await executeRuntime({
    action: "write-next",
    params: { bookId, wordCount },
    llm
  });
  return response.result.writeNext ?? { status: "ok", bookId };
}

export async function auditChapter(bookId: string, chapterNumber: number, llm?: NovelLlmOption | null) {
  const response = await executeRuntime({
    action: "audit",
    params: { bookId, chapterNumber },
    llm
  });
  return response.result.audit ?? { ok: true };
}

export async function reviseChapter(bookId: string, chapterNumber: number, brief?: string, llm?: NovelLlmOption | null) {
  const response = await executeRuntime({
    action: "revise",
    params: { bookId, chapterNumber, brief },
    llm
  });
  return response.result.revise ?? { ok: true };
}

export async function approveChapter(bookId: string, chapterNumber: number, llm?: NovelLlmOption | null) {
  const response = await executeRuntime({
    action: "approve",
    params: { bookId, chapterNumber },
    llm
  });
  return response.result.approve ?? { ok: true };
}

export async function rejectChapter(bookId: string, chapterNumber: number, llm?: NovelLlmOption | null) {
  const response = await executeRuntime({
    action: "reject",
    params: { bookId, chapterNumber },
    llm
  });
  return response.result.reject ?? { ok: true };
}

export async function saveChapter(
  bookId: string,
  chapterNumber: number,
  content: string,
  title?: string,
  llm?: NovelLlmOption | null
) {
  const response = await executeRuntime({
    action: "save-chapter",
    params: { bookId, chapterNumber, content, title },
    llm
  });
  return response.result.saveChapter ?? { ok: true };
}

export async function runRadarScan(llm?: NovelLlmOption | null) {
  const response = await executeRuntime({
    action: "radar",
    llm
  });
  const radar = response.result.radar ?? {};
  if (Object.keys(radar).length) {
    await saveInkosRadarScan(radar);
  }
  return radar;
}

export async function exportBook(bookId: string, approvedOnly = false) {
  const workspace = await loadInkosWorkspace();
  if (!approvedOnly) return buildInkosExportText(bookId, workspace);
  const book = workspace.books.find((item) => item.id === bookId);
  if (!book) return "";
  const parts = book.chapters
    .filter((chapter) => chapter.status === "approved")
    .map((chapter) => `# ${chapter.title}\n\n${chapter.content}`.trim());
  return parts.join("\n\n---\n\n");
}

export function eventsUrl() {
  return "";
}

export async function syncServiceSecret() {
  return { ok: true };
}

export async function updateServicesConfig() {
  return { ok: true };
}

export type { BookAnalytics, BookSession, InkosDaemonConfig, InkosRadarRecord };
