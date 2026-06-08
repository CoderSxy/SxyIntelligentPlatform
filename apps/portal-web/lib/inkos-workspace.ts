import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

type BookJson = {
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

type ChapterIndexItem = {
  number: number;
  title: string;
  status: string;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
  auditIssues?: string[];
  lengthWarnings?: string[];
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
};

export type InkosBook = BookJson & {
  chapters: ChapterIndexItem[];
  totalWords: number;
  failedChapters: number;
  warningCount: number;
};

export type InkosChapter = ChapterIndexItem & {
  content: string;
};

export type InkosStoryFile = {
  name: string;
  title: string;
  content: string;
};

async function exists(target: string) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

export async function resolveInkosProjectRoot() {
  const candidates = [
    path.resolve(process.cwd(), "../sxy-novel"),
    path.resolve(process.cwd(), "../../sxy-novel"),
    path.resolve(process.cwd(), "../../../sxy-novel"),
    path.resolve(process.cwd(), "sxy-novel")
  ];

  for (const candidate of candidates) {
    if (await exists(path.join(candidate, "inkos.json"))) return candidate;
  }

  return candidates[0];
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

export async function getInkosBooks(): Promise<InkosBook[]> {
  const root = await resolveInkosProjectRoot();
  const booksRoot = path.join(root, "books");
  if (!(await exists(booksRoot))) return [];

  const entries = await readdir(booksRoot, { withFileTypes: true });
  const books = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const bookRoot = path.join(booksRoot, entry.name);
        const book = await readJson<BookJson>(path.join(bookRoot, "book.json"));
        const chapters = await readJson<ChapterIndexItem[]>(path.join(bookRoot, "chapters", "index.json"));
        const totalWords = chapters.reduce((sum, chapter) => sum + (chapter.wordCount ?? 0), 0);
        const failedChapters = chapters.filter((chapter) => chapter.status.includes("failed")).length;
        const warningCount = chapters.reduce(
          (sum, chapter) => sum + (chapter.auditIssues?.length ?? 0) + (chapter.lengthWarnings?.length ?? 0),
          0
        );

        return {
          ...book,
          chapters,
          totalWords,
          failedChapters,
          warningCount
        };
      })
  );

  return books.sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));
}

export async function getInkosBook(bookId?: string) {
  const books = await getInkosBooks();
  if (!books.length) return undefined;
  return books.find((book) => book.id === bookId) ?? books[0];
}

export async function getInkosChapter(bookId: string, chapterNumber?: number): Promise<InkosChapter | undefined> {
  const root = await resolveInkosProjectRoot();
  const book = await getInkosBook(bookId);
  if (!book) return undefined;

  const chapter = book.chapters.find((item) => item.number === chapterNumber) ?? book.chapters[0];
  if (!chapter) return undefined;

  const fileName = `${String(chapter.number).padStart(4, "0")}_${chapter.title}.md`;
  const content = await readFile(path.join(root, "books", book.id, "chapters", fileName), "utf8");

  return {
    ...chapter,
    content
  };
}

export async function getInkosStoryFiles(bookId: string): Promise<InkosStoryFile[]> {
  const root = await resolveInkosProjectRoot();
  const storyRoot = path.join(root, "books", bookId, "story");
  if (!(await exists(storyRoot))) return [];

  const entries = await readdir(storyRoot, { withFileTypes: true });
  const important = [
    "brief.md",
    "story_bible.md",
    "character_matrix.md",
    "current_state.md",
    "chapter_summaries.md",
    "pending_hooks.md",
    "style_guide.md"
  ];

  const files = await Promise.all(
    important
      .filter((name) => entries.some((entry) => entry.name === name))
      .map(async (name) => ({
        name,
        title: name.replace(".md", "").replaceAll("_", " "),
        content: await readFile(path.join(storyRoot, name), "utf8")
      }))
  );

  return files;
}

export function chapterFileName(chapter: ChapterIndexItem) {
  return `${String(chapter.number).padStart(4, "0")}_${chapter.title}.md`;
}
