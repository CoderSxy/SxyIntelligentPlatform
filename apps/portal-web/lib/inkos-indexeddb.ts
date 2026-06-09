"use client";

import type {
  BookDetail,
  BookSession,
  BookSummary,
  ChapterDetail,
  ChapterSummary,
  SessionDetail,
  SessionMessage,
  TruthFileDetail,
  TruthFileSummary
} from "@/lib/inkos-types";

export type InkosProjectConfig = {
  id: string;
  name: string;
  version: string;
  language: string;
  llm: {
    provider: string;
    service: string;
    configSource: string;
    model: string;
    apiFormat: string;
    stream: boolean;
    temperature: number;
  };
  inputGovernanceMode: string;
  createdAt: string;
  updatedAt: string;
};

export type InkosBookRecord = {
  id: string;
  title: string;
  genre: string;
  platform: string;
  language: string;
  status: string;
  targetChapters: number;
  chapterWordCount: number;
  createdAt: string;
  updatedAt: string;
};

export type InkosChapterRecord = {
  id: string;
  bookId: string;
  number: number;
  title: string;
  status: string;
  wordCount: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  auditIssues: string[];
  lengthWarnings: string[];
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
};

export type InkosStoryFileRecord = {
  id: string;
  bookId: string;
  name: string;
  title: string;
  content: string;
  updatedAt: string;
};

export type InkosBookView = InkosBookRecord & {
  chapters: InkosChapterRecord[];
  totalWords: number;
  failedChapters: number;
  warningCount: number;
};

export type InkosSessionRecord = {
  sessionId: string;
  bookId: string | null;
  title: string | null;
  messages: SessionMessage[];
  createdAt: string;
  updatedAt: string;
};

export type InkosRadarRecord = {
  id: string;
  timestamp: string;
  marketSummary: string;
  summaryPreview: string;
  result: Record<string, unknown>;
};

export type InkosDaemonConfig = {
  id: string;
  running: boolean;
  writeCron: string;
  radarCron: string;
  maxConcurrentBooks: number;
  eventLog: Array<{
    id: string;
    timestamp: string;
    type: "started" | "stopped" | "chapter" | "radar" | "error";
    message: string;
    bookId?: string;
    chapter?: number;
  }>;
  updatedAt: string;
};

export type InkosWorkspaceSnapshot = {
  project: InkosProjectConfig;
  books: InkosBookRecord[];
  chapters: InkosChapterRecord[];
  storyFiles: InkosStoryFileRecord[];
  sessions?: InkosSessionRecord[];
  radarScans?: InkosRadarRecord[];
};

export type InkosWorkspaceView = {
  project: InkosProjectConfig;
  books: InkosBookView[];
  storyFiles: InkosStoryFileRecord[];
};

const DB_NAME = "sxy-inkos-workspace";
const DB_VERSION = 4;
const PROJECT_ID = "default";

const storyTemplates = [
  ["brief.md", "创作简报", "# 创作简报\n\n"],
  ["story_bible.md", "故事圣经", "# 故事圣经\n\n"],
  ["character_matrix.md", "角色矩阵", "# 角色矩阵\n\n"],
  ["current_state.md", "当前状态", "# 当前状态\n\n"],
  ["chapter_summaries.md", "章节摘要", "# 章节摘要\n\n"],
  ["pending_hooks.md", "伏笔池", "# 伏笔池\n\n"],
  ["style_guide.md", "文风指南", "# 文风指南\n\n"]
] as const;

function now() {
  return new Date().toISOString();
}

function defaultProject(): InkosProjectConfig {
  const current = now();
  return {
    id: PROJECT_ID,
    name: "sxy-inkos",
    version: "0.1.0",
    language: "zh",
    llm: {
      provider: "openai",
      service: "platform",
      configSource: "portal",
      model: "default",
      apiFormat: "chat",
      stream: true,
      temperature: 0.7
    },
    inputGovernanceMode: "v2",
    createdAt: current,
    updatedAt: current
  };
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function ensureObjectStores(db: IDBDatabase) {
  if (!db.objectStoreNames.contains("project")) db.createObjectStore("project", { keyPath: "id" });
  if (!db.objectStoreNames.contains("books")) db.createObjectStore("books", { keyPath: "id" });
  if (!db.objectStoreNames.contains("chapters")) {
    const store = db.createObjectStore("chapters", { keyPath: "id" });
    store.createIndex("bookId", "bookId");
  }
  if (!db.objectStoreNames.contains("storyFiles")) {
    const store = db.createObjectStore("storyFiles", { keyPath: "id" });
    store.createIndex("bookId", "bookId");
  }
  if (!db.objectStoreNames.contains("sessions")) {
    const store = db.createObjectStore("sessions", { keyPath: "sessionId" });
    store.createIndex("bookId", "bookId");
  }
  if (!db.objectStoreNames.contains("radarScans")) {
    const store = db.createObjectStore("radarScans", { keyPath: "id" });
    store.createIndex("timestamp", "timestamp");
  }
  if (!db.objectStoreNames.contains("daemon")) {
    db.createObjectStore("daemon", { keyPath: "id" });
  }
}

function openInkosDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      ensureObjectStores(request.result);
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      console.warn("[inkos] IndexedDB upgrade blocked — close other tabs using this site");
    };
  });
}

async function getAllFromStore<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  if (!db.objectStoreNames.contains(storeName)) return [];
  return requestToPromise(db.transaction(storeName).objectStore(storeName).getAll()) as Promise<T[]>;
}

async function withDb<T>(run: (db: IDBDatabase) => Promise<T>) {
  const db = await openInkosDb();
  try {
    return await run(db);
  } finally {
    db.close();
  }
}

function countWords(content: string) {
  return content.replace(/\s/g, "").length;
}

function slug(input: string) {
  return input.trim().replace(/\s+/g, "-") || `book-${Date.now()}`;
}

export function chapterFileName(chapter: Pick<InkosChapterRecord, "number" | "title">) {
  return `${String(chapter.number).padStart(4, "0")}_${chapter.title}.md`;
}

export async function ensureInkosWorkspace() {
  await withDb(async (db) => {
    const tx = db.transaction("project", "readwrite");
    const store = tx.objectStore("project");
    const existing = await requestToPromise(store.get(PROJECT_ID));
    if (!existing) store.put(defaultProject());
    await txDone(tx);
  });
}

export async function loadInkosWorkspace(): Promise<InkosWorkspaceView> {
  await ensureInkosWorkspace();
  return withDb(async (db) => {
    const [project, books, chapters, storyFiles] = await Promise.all([
      requestToPromise(db.transaction("project").objectStore("project").get(PROJECT_ID)) as Promise<InkosProjectConfig>,
      requestToPromise(db.transaction("books").objectStore("books").getAll()) as Promise<InkosBookRecord[]>,
      requestToPromise(db.transaction("chapters").objectStore("chapters").getAll()) as Promise<InkosChapterRecord[]>,
      requestToPromise(db.transaction("storyFiles").objectStore("storyFiles").getAll()) as Promise<InkosStoryFileRecord[]>
    ]);

    const bookViews = books
      .map((book) => {
        const bookChapters = chapters.filter((chapter) => chapter.bookId === book.id).sort((a, b) => a.number - b.number);
        return {
          ...book,
          chapters: bookChapters,
          totalWords: bookChapters.reduce((sum, chapter) => sum + chapter.wordCount, 0),
          failedChapters: bookChapters.filter((chapter) => chapter.status.includes("failed")).length,
          warningCount: bookChapters.reduce(
            (sum, chapter) => sum + chapter.auditIssues.length + chapter.lengthWarnings.length,
            0
          )
        };
      })
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt) * -1);

    return {
      project,
      books: bookViews,
      storyFiles
    };
  });
}

export async function createInkosBook(input: {
  title: string;
  genre: string;
  platform: string;
  targetChapters: number;
  chapterWordCount: number;
}) {
  const current = now();
  const baseBookId = slug(input.title);
  const bookId = await withDb(async (db) => {
    const store = db.transaction("books").objectStore("books");
    let candidate = baseBookId;
    let index = 2;
    while (await requestToPromise(store.get(candidate))) {
      candidate = `${baseBookId}-${index}`;
      index += 1;
    }
    return candidate;
  });
  const book: InkosBookRecord = {
    id: bookId,
    title: input.title.trim() || "未命名小说",
    genre: input.genre,
    platform: input.platform,
    language: "zh",
    status: "active",
    targetChapters: input.targetChapters,
    chapterWordCount: input.chapterWordCount,
    createdAt: current,
    updatedAt: current
  };

  await withDb(async (db) => {
    const tx = db.transaction(["books", "storyFiles"], "readwrite");
    tx.objectStore("books").put(book);
    for (const [name, title, content] of storyTemplates) {
      tx.objectStore("storyFiles").put({
        id: `${bookId}:${name}`,
        bookId,
        name,
        title,
        content,
        updatedAt: current
      } satisfies InkosStoryFileRecord);
    }
    await txDone(tx);
  });

  return book;
}

export async function saveInkosChapter(input: {
  bookId: string;
  number: number;
  title: string;
  content: string;
  status: string;
}) {
  const current = now();
  const chapter: InkosChapterRecord = {
    id: `${input.bookId}:${input.number}`,
    bookId: input.bookId,
    number: input.number,
    title: input.title.trim() || `第${input.number}章`,
    status: input.status,
    wordCount: countWords(input.content),
    content: input.content,
    createdAt: current,
    updatedAt: current,
    auditIssues: [],
    lengthWarnings: []
  };

  await withDb(async (db) => {
    const tx = db.transaction(["books", "chapters"], "readwrite");
    tx.objectStore("chapters").put(chapter);
    const bookStore = tx.objectStore("books");
    const book = (await requestToPromise(bookStore.get(input.bookId))) as InkosBookRecord | undefined;
    if (book) bookStore.put({ ...book, updatedAt: current });
    await txDone(tx);
  });

  return chapter;
}

export async function saveInkosStoryFile(file: InkosStoryFileRecord) {
  const updated = { ...file, updatedAt: now() };
  await withDb(async (db) => {
    const tx = db.transaction("storyFiles", "readwrite");
    tx.objectStore("storyFiles").put(updated);
    await txDone(tx);
  });
  return updated;
}

function chapterReviewCounts(chapters: InkosChapterRecord[]) {
  let approved = 0;
  let pendingReview = 0;
  let failedReview = 0;
  for (const chapter of chapters) {
    const status = chapter.status;
    if (status === "approved") approved += 1;
    else if (status.includes("failed")) failedReview += 1;
    else if (status.includes("review")) pendingReview += 1;
  }
  return { approved, pendingReview, failedReview };
}

function toBookSummary(book: InkosBookRecord, chapters: InkosChapterRecord[]): BookSummary {
  const bookChapters = chapters.filter((chapter) => chapter.bookId === book.id);
  const review = chapterReviewCounts(bookChapters);
  const lastChapter = bookChapters.at(-1);
  return {
    id: book.id,
    title: book.title,
    status: book.status,
    platform: book.platform,
    genre: book.genre,
    targetChapters: book.targetChapters,
    updatedAt: book.updatedAt,
    chaptersWritten: bookChapters.length,
    chapterCount: bookChapters.length,
    lastChapterNumber: lastChapter?.number,
    totalWords: bookChapters.reduce((sum, chapter) => sum + chapter.wordCount, 0),
    approvedChapters: review.approved,
    pendingReview: review.pendingReview,
    pendingReviewChapters: review.pendingReview,
    failedReview: review.failedReview,
    failedChapters: review.failedReview
  };
}

function toChapterSummary(chapter: InkosChapterRecord): ChapterSummary {
  return {
    number: chapter.number,
    title: chapter.title,
    status: chapter.status,
    wordCount: chapter.wordCount,
    auditIssueCount: chapter.auditIssues.length,
    updatedAt: chapter.updatedAt,
    fileName: chapterFileName(chapter),
    auditIssues: chapter.auditIssues,
    lengthWarnings: chapter.lengthWarnings
  };
}

export async function listInkosBooks(): Promise<BookSummary[]> {
  const workspace = await loadInkosWorkspace();
  return workspace.books.map((book) => toBookSummary(book, book.chapters));
}

export async function getInkosBookDetail(bookId: string) {
  const workspace = await loadInkosWorkspace();
  const book = workspace.books.find((item) => item.id === bookId);
  if (!book) throw new Error(`书籍不存在: ${bookId}`);
  const chapters = book.chapters.map(toChapterSummary);
  const detail: BookDetail = {
    ...toBookSummary(book, book.chapters),
    createdAt: book.createdAt,
    chapterWordCount: book.chapterWordCount,
    language: book.language as BookDetail["language"]
  };
  const nextChapter = chapters.length ? Math.max(...chapters.map((item) => item.number)) + 1 : 1;
  return { book: detail, chapters, nextChapter };
}

export async function getInkosChapter(bookId: string, chapterNumber: number) {
  const workspace = await loadInkosWorkspace();
  const book = workspace.books.find((item) => item.id === bookId);
  const chapter = book?.chapters.find((item) => item.number === chapterNumber);
  if (!chapter) throw new Error(`章节不存在: ${chapterNumber}`);
  return {
    ...toChapterSummary(chapter),
    content: chapter.content
  } satisfies ChapterDetail;
}

export async function listInkosTruthFiles(bookId: string): Promise<TruthFileSummary[]> {
  const workspace = await loadInkosWorkspace();
  return workspace.storyFiles
    .filter((file) => file.bookId === bookId)
    .map((file) => ({
      name: file.name,
      label: file.title,
      exists: true,
      path: `story/${file.name}`,
      optional: false,
      available: true
    }));
}

export async function getInkosTruthFile(bookId: string, fileName: string): Promise<TruthFileDetail> {
  const workspace = await loadInkosWorkspace();
  const file = workspace.storyFiles.find((item) => item.bookId === bookId && item.name === fileName);
  if (!file) throw new Error(`档案不存在: ${fileName}`);
  return {
    name: file.name,
    label: file.title,
    exists: true,
    path: `story/${file.name}`,
    optional: false,
    available: true,
    content: file.content
  };
}

export async function deleteInkosBook(bookId: string) {
  await withDb(async (db) => {
    const tx = db.transaction(["books", "chapters", "storyFiles", "sessions"], "readwrite");
    tx.objectStore("books").delete(bookId);
    const chapterStore = tx.objectStore("chapters");
    const chapters = (await requestToPromise(chapterStore.index("bookId").getAll(bookId))) as InkosChapterRecord[];
    for (const chapter of chapters) chapterStore.delete(chapter.id);
    const storyStore = tx.objectStore("storyFiles");
    const files = (await requestToPromise(storyStore.index("bookId").getAll(bookId))) as InkosStoryFileRecord[];
    for (const file of files) storyStore.delete(file.id);
    const sessionStore = tx.objectStore("sessions");
    const sessions = (await requestToPromise(sessionStore.index("bookId").getAll(bookId))) as InkosSessionRecord[];
    for (const session of sessions) sessionStore.delete(session.sessionId);
    await txDone(tx);
  });
}

function createSessionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createInkosSession(bookId?: string | null): Promise<{ session: BookSession }> {
  const current = now();
  const session: InkosSessionRecord = {
    sessionId: createSessionId(),
    bookId: bookId ?? null,
    title: null,
    messages: [],
    createdAt: current,
    updatedAt: current
  };
  await withDb(async (db) => {
    const tx = db.transaction("sessions", "readwrite");
    tx.objectStore("sessions").put(session);
    await txDone(tx);
  });
  return { session };
}

export async function getInkosSession(sessionId: string): Promise<{ session: SessionDetail }> {
  const session = await withDb(async (db) => {
    return (await requestToPromise(db.transaction("sessions").objectStore("sessions").get(sessionId))) as
      | InkosSessionRecord
      | undefined;
  });
  if (!session) throw new Error(`会话不存在: ${sessionId}`);
  return {
    session: {
      sessionId: session.sessionId,
      bookId: session.bookId,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messages: session.messages,
      activeBookId: session.bookId ?? undefined
    }
  };
}

export async function saveInkosSession(session: InkosSessionRecord) {
  await withDb(async (db) => {
    const tx = db.transaction("sessions", "readwrite");
    tx.objectStore("sessions").put({ ...session, updatedAt: now() });
    await txDone(tx);
  });
}

export async function listInkosSessions(bookId?: string | null): Promise<BookSession[]> {
  const sessions = await withDb(async (db) => {
    return (await requestToPromise(db.transaction("sessions").objectStore("sessions").getAll())) as InkosSessionRecord[];
  });
  const filtered =
    bookId === undefined
      ? sessions
      : sessions.filter((session) => (bookId === null ? session.bookId === null : session.bookId === bookId));
  return filtered
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((session) => ({
      sessionId: session.sessionId,
      bookId: session.bookId,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    }));
}

export async function renameInkosSession(sessionId: string, title: string) {
  const session = await withDb(async (db) => {
    return (await requestToPromise(db.transaction("sessions").objectStore("sessions").get(sessionId))) as
      | InkosSessionRecord
      | undefined;
  });
  if (!session) throw new Error(`会话不存在: ${sessionId}`);
  await saveInkosSession({ ...session, title: title.trim() || null });
  return { ok: true };
}

export async function deleteInkosSession(sessionId: string) {
  await withDb(async (db) => {
    const tx = db.transaction("sessions", "readwrite");
    tx.objectStore("sessions").delete(sessionId);
    await txDone(tx);
  });
}

export async function updateInkosChapter(
  bookId: string,
  chapterNumber: number,
  patch: Partial<Pick<InkosChapterRecord, "title" | "content" | "status" | "auditIssues" | "lengthWarnings" | "tokenUsage">>
) {
  const workspace = await loadInkosWorkspace();
  const book = workspace.books.find((item) => item.id === bookId);
  const chapter = book?.chapters.find((item) => item.number === chapterNumber);
  if (!chapter) throw new Error(`章节不存在: ${chapterNumber}`);
  const content = patch.content ?? chapter.content;
  const updated: InkosChapterRecord = {
    ...chapter,
    ...patch,
    content,
    wordCount: countWords(content),
    updatedAt: now()
  };
  await withDb(async (db) => {
    const tx = db.transaction(["chapters", "books"], "readwrite");
    tx.objectStore("chapters").put(updated);
    const bookStore = tx.objectStore("books");
    const bookRecord = (await requestToPromise(bookStore.get(bookId))) as InkosBookRecord | undefined;
    if (bookRecord) bookStore.put({ ...bookRecord, updatedAt: now() });
    await txDone(tx);
  });
  return updated;
}

export async function saveInkosRadarScan(result: Record<string, unknown>) {
  const timestamp = typeof result.timestamp === "string" ? result.timestamp : now();
  const marketSummary = typeof result.marketSummary === "string" ? result.marketSummary : "";
  const recommendations = Array.isArray(result.recommendations) ? result.recommendations : [];
  const preview =
    marketSummary.slice(0, 120) ||
    (recommendations[0] && typeof recommendations[0] === "object" && recommendations[0] !== null
      ? String((recommendations[0] as Record<string, unknown>).concept ?? "")
      : "");
  const record: InkosRadarRecord = {
    id: `scan-${timestamp}`,
    timestamp,
    marketSummary,
    summaryPreview: preview,
    result
  };
  await withDb(async (db) => {
    const tx = db.transaction("radarScans", "readwrite");
    tx.objectStore("radarScans").put(record);
    await txDone(tx);
  });
  return record;
}

export async function listInkosRadarScans(): Promise<InkosRadarRecord[]> {
  const scans = await withDb(async (db) => {
    return (await requestToPromise(db.transaction("radarScans").objectStore("radarScans").getAll())) as InkosRadarRecord[];
  });
  return scans.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

function defaultDaemonConfig(): InkosDaemonConfig {
  const current = now();
  return {
    id: PROJECT_ID,
    running: false,
    writeCron: "*/15 * * * *",
    radarCron: "0 */6 * * *",
    maxConcurrentBooks: 3,
    eventLog: [],
    updatedAt: current
  };
}

export async function getInkosDaemonConfig(): Promise<InkosDaemonConfig> {
  const config = await withDb(async (db) => {
    return (await requestToPromise(db.transaction("daemon").objectStore("daemon").get(PROJECT_ID))) as
      | InkosDaemonConfig
      | undefined;
  });
  return config ?? defaultDaemonConfig();
}

export async function saveInkosDaemonConfig(patch: Partial<InkosDaemonConfig>) {
  const current = await getInkosDaemonConfig();
  const updated = { ...current, ...patch, id: PROJECT_ID, updatedAt: now() };
  await withDb(async (db) => {
    const tx = db.transaction("daemon", "readwrite");
    tx.objectStore("daemon").put(updated);
    await txDone(tx);
  });
  return updated;
}

export async function appendInkosDaemonEvent(
  event: Omit<InkosDaemonConfig["eventLog"][number], "id" | "timestamp"> & { timestamp?: string }
) {
  const config = await getInkosDaemonConfig();
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: event.timestamp ?? now(),
    type: event.type,
    message: event.message,
    bookId: event.bookId,
    chapter: event.chapter
  };
  const eventLog = [entry, ...config.eventLog].slice(0, 50);
  return saveInkosDaemonConfig({ eventLog });
}

export type BookAnalytics = {
  totalChapters: number;
  totalWords: number;
  avgWords: number;
  approvedChapters: number;
  pendingReview: number;
  failedReview: number;
  statusDistribution: Record<string, number>;
  totalTokens: number;
};

export async function computeInkosBookAnalytics(bookId: string): Promise<BookAnalytics> {
  const workspace = await loadInkosWorkspace();
  const book = workspace.books.find((item) => item.id === bookId);
  if (!book) throw new Error(`书籍不存在: ${bookId}`);
  const chapters = book.chapters;
  const review = chapterReviewCounts(chapters);
  const statusDistribution: Record<string, number> = {};
  let totalTokens = 0;
  for (const chapter of chapters) {
    statusDistribution[chapter.status] = (statusDistribution[chapter.status] ?? 0) + 1;
    totalTokens += chapter.tokenUsage?.totalTokens ?? 0;
  }
  const totalWords = chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0);
  return {
    totalChapters: chapters.length,
    totalWords,
    avgWords: chapters.length ? Math.round(totalWords / chapters.length) : 0,
    approvedChapters: review.approved,
    pendingReview: review.pendingReview,
    failedReview: review.failedReview,
    statusDistribution,
    totalTokens
  };
}

export async function exportInkosWorkspace(): Promise<InkosWorkspaceSnapshot> {
  await ensureInkosWorkspace();
  return withDb(async (db) => ({
    project: (await requestToPromise(db.transaction("project").objectStore("project").get(PROJECT_ID))) as InkosProjectConfig,
    books: await getAllFromStore<InkosBookRecord>(db, "books"),
    chapters: await getAllFromStore<InkosChapterRecord>(db, "chapters"),
    storyFiles: await getAllFromStore<InkosStoryFileRecord>(db, "storyFiles"),
    sessions: await getAllFromStore<InkosSessionRecord>(db, "sessions"),
    radarScans: await getAllFromStore<InkosRadarRecord>(db, "radarScans")
  }));
}

export async function importInkosWorkspace(snapshot: InkosWorkspaceSnapshot) {
  await withDb(async (db) => {
    const storeNames = ["project", "books", "chapters", "storyFiles", "sessions", "radarScans"].filter((name) =>
      db.objectStoreNames.contains(name)
    );
    const tx = db.transaction(storeNames, "readwrite");
    tx.objectStore("project").put({ ...snapshot.project, id: PROJECT_ID, updatedAt: now() });
    for (const book of snapshot.books) tx.objectStore("books").put(book);
    for (const chapter of snapshot.chapters) tx.objectStore("chapters").put(chapter);
    for (const file of snapshot.storyFiles) tx.objectStore("storyFiles").put(file);
    if (snapshot.sessions && db.objectStoreNames.contains("sessions")) {
      for (const session of snapshot.sessions) tx.objectStore("sessions").put(session);
    }
    if (snapshot.radarScans && db.objectStoreNames.contains("radarScans")) {
      for (const scan of snapshot.radarScans) tx.objectStore("radarScans").put(scan);
    }
    await txDone(tx);
  });
}

export async function mergeInkosWorkspace(snapshot: Partial<InkosWorkspaceSnapshot>) {
  const current = await exportInkosWorkspace();
  await importInkosWorkspace({
    project: snapshot.project ?? current.project,
    books: snapshot.books ?? current.books,
    chapters: snapshot.chapters ?? current.chapters,
    storyFiles: snapshot.storyFiles ?? current.storyFiles,
    sessions: snapshot.sessions ?? current.sessions,
    radarScans: snapshot.radarScans ?? current.radarScans
  });
}

export async function resetInkosWorkspace() {
  await withDb(async (db) => {
    const storeNames = ["project", "books", "chapters", "storyFiles", "sessions", "radarScans", "daemon"].filter((name) =>
      db.objectStoreNames.contains(name)
    );
    const tx = db.transaction(storeNames, "readwrite");
    for (const name of storeNames) tx.objectStore(name).clear();
    tx.objectStore("project").put(defaultProject());
    await txDone(tx);
  });
}

export function buildInkosExportText(bookId: string, workspace: InkosWorkspaceView) {
  const book = workspace.books.find((item) => item.id === bookId);
  if (!book) return "";
  const parts = book.chapters.map((chapter) => `# ${chapter.title}\n\n${chapter.content}`.trim());
  return parts.join("\n\n---\n\n");
}
