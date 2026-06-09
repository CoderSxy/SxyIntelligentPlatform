/**
 * @deprecated 文件存储模式（sxy-novel 直连 studio 代理）。
 * 门户 Novel 模块请使用 `@/lib/inkos-client`（IndexedDB + AccessKey + runtime/execute）。
 */
import { api, ApiError } from "@/lib/api";
import type {
  AgentResponse,
  BookDetail,
  BookSession,
  BookSummary,
  ChapterDetail,
  ChapterSummary,
  CreateBookPayload,
  ModelInfo,
  ServiceInfo,
  SessionDetail,
  TruthFileDetail,
  TruthFileSummary
} from "@/lib/inkos-types";

const BASE = "/novel/v1";

function formatInkosError(status: number, body: Record<string, unknown>) {
  const nested = body.error;
  const detail =
    (typeof nested === "object" && nested !== null && "message" in nested
      ? String((nested as { message?: string }).message)
      : undefined) ??
    (typeof body.error === "string" ? body.error : undefined) ??
    (typeof body.response === "string" ? body.response : undefined) ??
    (typeof body.detail === "string" ? body.detail : undefined) ??
    responseFallback(status);

  if (/api key/i.test(detail)) {
    return "未配置 LLM API Key。请在 inkos 项目 secrets 或门户「设置 → 密钥」中配置后再试。";
  }
  return detail;
}

function responseFallback(status: number) {
  if (status === 401 || status === 403) return "无权限执行此操作";
  if (status === 502 || status === 503) return "InkOS Studio 暂不可用，请确认 gateway 已启动";
  return "请求失败";
}

async function inkosFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    throw new ApiError(response.status, formatInkosError(response.status, body));
  }

  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return (await response.text()) as T;
  }
  return response.json() as Promise<T>;
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
  }>("/novel/status");
}

export async function listBooks() {
  const data = await inkosFetch<{ books: BookSummary[] }>("/books");
  return data.books;
}

export async function getBook(bookId: string) {
  return inkosFetch<{ book: BookDetail; chapters: ChapterSummary[]; nextChapter: number }>(
    `/books/${encodeURIComponent(bookId)}`
  );
}

export async function deleteBook(bookId: string) {
  return inkosFetch<{ ok: boolean }>(`/books/${encodeURIComponent(bookId)}`, {
    method: "DELETE"
  });
}

export async function createBook(payload: CreateBookPayload) {
  return inkosFetch<{ bookId: string; status: string }>("/books/create", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

type RawChapterResponse = {
  chapterNumber?: number;
  filename?: string;
  content?: string;
};

function countZhChars(content: string) {
  return content.replace(/\s/g, "").length;
}

export async function getChapter(bookId: string, chapterNumber: number, summary?: ChapterSummary) {
  const raw = await inkosFetch<RawChapterResponse>(
    `/books/${encodeURIComponent(bookId)}/chapters/${chapterNumber}`
  );
  const content = raw.content ?? "";

  return {
    number: summary?.number ?? raw.chapterNumber ?? chapterNumber,
    title: summary?.title ?? `第${chapterNumber}章`,
    status: summary?.status,
    wordCount: summary?.wordCount ?? countZhChars(content),
    fileName: summary?.fileName ?? raw.filename ?? null,
    updatedAt: summary?.updatedAt ?? "",
    auditIssues: summary?.auditIssues ?? [],
    content
  } satisfies ChapterDetail;
}

export async function writeNextChapter(bookId: string, wordCount?: number) {
  return inkosFetch<{ status: string; bookId: string }>(
    `/books/${encodeURIComponent(bookId)}/write-next`,
    {
      method: "POST",
      body: JSON.stringify({ wordCount })
    }
  );
}

export async function auditChapter(bookId: string, chapterNumber: number) {
  return inkosFetch<unknown>(`/books/${encodeURIComponent(bookId)}/audit/${chapterNumber}`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function reviseChapter(bookId: string, chapterNumber: number, brief?: string) {
  return inkosFetch<unknown>(`/books/${encodeURIComponent(bookId)}/revise/${chapterNumber}`, {
    method: "POST",
    body: JSON.stringify({ mode: "spot-fix", brief })
  });
}

export async function listTruthFiles(bookId: string) {
  return inkosFetch<{ files: TruthFileSummary[] }>(`/books/${encodeURIComponent(bookId)}/truth`);
}

export async function getTruthFile(bookId: string, fileName: string) {
  return inkosFetch<TruthFileDetail>(`/books/${encodeURIComponent(bookId)}/truth/${fileName}`);
}

export async function saveTruthFile(bookId: string, fileName: string, content: string) {
  return inkosFetch<{ ok: boolean }>(`/books/${encodeURIComponent(bookId)}/truth/${fileName}`, {
    method: "PUT",
    body: JSON.stringify({ content })
  });
}

export async function listServices() {
  return inkosFetch<{ services: ServiceInfo[] }>("/services");
}

export async function listServiceModels(service: string) {
  return inkosFetch<{ models: ModelInfo[] }>(`/services/${encodeURIComponent(service)}/models`);
}

export async function syncServiceSecret(service: string, apiKey: string) {
  return inkosFetch<{ ok: boolean }>(`/services/${encodeURIComponent(service)}/secret`, {
    method: "PUT",
    body: JSON.stringify({ apiKey })
  });
}

export async function updateServicesConfig(input: {
  services?: Array<Record<string, unknown>>;
  service?: string;
  defaultModel?: string;
}) {
  return inkosFetch<{ ok: boolean }>("/services/config", {
    method: "PUT",
    body: JSON.stringify(input)
  });
}

export async function listSessions(bookId?: string | null) {
  const query = bookId === undefined ? "" : `?bookId=${bookId === null ? "null" : encodeURIComponent(bookId)}`;
  return inkosFetch<{ sessions: BookSession[] }>(`/sessions${query}`);
}

export async function getSession(sessionId: string) {
  return inkosFetch<{ session: SessionDetail }>(`/sessions/${encodeURIComponent(sessionId)}`);
}

export async function createSession(bookId?: string | null) {
  return inkosFetch<{ session: BookSession }>("/sessions", {
    method: "POST",
    body: JSON.stringify({ bookId: bookId ?? null })
  });
}

export async function runAgent(input: {
  instruction: string;
  sessionId: string;
  activeBookId?: string;
  model?: string;
  service?: string;
}) {
  return inkosFetch<AgentResponse>("/agent", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function exportBook(bookId: string, format = "txt") {
  return inkosFetch<string>(`/books/${encodeURIComponent(bookId)}/export?format=${encodeURIComponent(format)}`);
}

export async function runRadarScan() {
  return inkosFetch<Record<string, unknown>>("/radar/scan", {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function getRadarHistory() {
  return inkosFetch<{ items: Array<Record<string, unknown>> }>("/radar/history");
}

export function eventsUrl() {
  return `/api${BASE}/events`;
}
