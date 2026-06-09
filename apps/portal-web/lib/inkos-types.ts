export type BookSummary = {
  id: string;
  title: string;
  status: string;
  platform: string;
  genre: string;
  targetChapters: number;
  updatedAt: string;
  chaptersWritten?: number;
  chapters?: number;
  chapterCount?: number;
  lastChapterNumber?: number;
  totalWords?: number;
  approvedChapters?: number;
  pendingReview?: number;
  pendingReviewChapters?: number;
  failedReview?: number;
  failedChapters?: number;
  recentRunStatus?: string | null;
};

export type BookDetail = BookSummary & {
  createdAt: string;
  chapterWordCount: number;
  language: "zh" | "en" | null;
};

export type ChapterSummary = {
  number: number;
  title: string;
  status?: string;
  wordCount?: number;
  auditIssueCount?: number;
  updatedAt?: string;
  fileName?: string | null;
  auditIssues?: string[];
  lengthWarnings?: string[];
};

export type ChapterDetail = ChapterSummary & {
  auditIssues?: string[];
  reviewNote?: string;
  content: string;
};

export type TruthFileSummary = {
  name: string;
  label: string;
  exists: boolean;
  path: string;
  optional: boolean;
  available: boolean;
};

export type TruthFileDetail = TruthFileSummary & {
  content: string | null;
};

export type BookSession = {
  sessionId: string;
  bookId: string | null;
  title: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ToolExecution = {
  id: string;
  tool: string;
  label?: string;
  agent?: string;
  status: "running" | "processing" | "completed" | "error";
  args?: Record<string, unknown>;
  result?: string;
  details?: unknown;
  error?: string;
  stages?: Array<{ label: string; status: "pending" | "active" | "completed" }>;
  startedAt?: number;
  completedAt?: number;
};

export type SessionMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  thinking?: string;
  toolExecutions?: ToolExecution[];
};

export type SessionDetail = BookSession & {
  messages: SessionMessage[];
  activeBookId?: string;
};

export type ServiceInfo = {
  service: string;
  label: string;
  group?: string;
  connected: boolean;
};

export type ModelInfo = {
  id: string;
  name?: string;
};

export type InkosSseMessage = {
  event: string;
  data: string;
  parsed?: unknown;
};

export type CreateBookPayload = {
  title: string;
  genre: string;
  platform: string;
  targetChapters?: number;
  chapterWordCount?: number;
  language?: "zh" | "en";
  brief?: string;
};

export type AgentResponse = {
  response?: string;
  error?: string | { code?: string; message?: string };
  session?: {
    sessionId: string;
    activeBookId?: string;
  };
};
