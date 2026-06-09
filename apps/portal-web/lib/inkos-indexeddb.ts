"use client";

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

export type InkosWorkspaceSnapshot = {
  project: InkosProjectConfig;
  books: InkosBookRecord[];
  chapters: InkosChapterRecord[];
  storyFiles: InkosStoryFileRecord[];
};

export type InkosWorkspaceView = {
  project: InkosProjectConfig;
  books: InkosBookView[];
  storyFiles: InkosStoryFileRecord[];
};

const DB_NAME = "sxy-inkos-workspace";
const DB_VERSION = 1;
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

function openInkosDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
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
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
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

export async function exportInkosWorkspace(): Promise<InkosWorkspaceSnapshot> {
  await ensureInkosWorkspace();
  return withDb(async (db) => ({
    project: (await requestToPromise(db.transaction("project").objectStore("project").get(PROJECT_ID))) as InkosProjectConfig,
    books: (await requestToPromise(db.transaction("books").objectStore("books").getAll())) as InkosBookRecord[],
    chapters: (await requestToPromise(db.transaction("chapters").objectStore("chapters").getAll())) as InkosChapterRecord[],
    storyFiles: (await requestToPromise(db.transaction("storyFiles").objectStore("storyFiles").getAll())) as InkosStoryFileRecord[]
  }));
}

export async function importInkosWorkspace(snapshot: InkosWorkspaceSnapshot) {
  await withDb(async (db) => {
    const tx = db.transaction(["project", "books", "chapters", "storyFiles"], "readwrite");
    tx.objectStore("project").put({ ...snapshot.project, id: PROJECT_ID, updatedAt: now() });
    for (const book of snapshot.books) tx.objectStore("books").put(book);
    for (const chapter of snapshot.chapters) tx.objectStore("chapters").put(chapter);
    for (const file of snapshot.storyFiles) tx.objectStore("storyFiles").put(file);
    await txDone(tx);
  });
}

export async function resetInkosWorkspace() {
  await withDb(async (db) => {
    const tx = db.transaction(["project", "books", "chapters", "storyFiles"], "readwrite");
    tx.objectStore("project").clear();
    tx.objectStore("books").clear();
    tx.objectStore("chapters").clear();
    tx.objectStore("storyFiles").clear();
    tx.objectStore("project").put(defaultProject());
    await txDone(tx);
  });
}
