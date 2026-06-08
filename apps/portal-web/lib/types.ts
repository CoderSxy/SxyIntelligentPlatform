export type Permission = string;

export type User = {
  id: string;
  username: string;
  displayName: string;
  roles: string[];
  permissions: Permission[];
  disabled?: boolean;
};

export type ModuleStatus = "active" | "planned";

export type PortalModule = {
  id: string;
  name: string;
  description: string;
  status: ModuleStatus;
  href: string;
  requiredPermission: Permission;
};

export type TaskStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export type Task = {
  id: string;
  moduleId: string;
  title: string;
  status: TaskStatus;
  createdAt: string;
};

export type AccessKey = {
  id: string;
  provider: string;
  label: string;
  scope: "personal" | "platform";
  maskedSecret: string;
  secret?: string;
  baseUrl?: string;
  modelsBaseUrl?: string;
  checkModel?: string;
  apiProtocol?: "openai-completions" | "openai-responses" | "anthropic-messages" | "google-generative-ai" | "custom";
  proxyUrl?: string;
  enabled: boolean;
  status?: "untested" | "testing" | "valid" | "invalid";
};

export type ModelType = "llm" | "image" | "video";

export type ModelCapability =
  | "novel_writing"
  | "storyboard"
  | "prompt_generation"
  | "image_generation"
  | "video_generation";

export type ModelConfig = {
  id: string;
  provider: string;
  modelType: ModelType;
  modelName: string;
  displayName: string;
  capability: ModelCapability;
  capabilities?: Array<"text" | "image" | "video" | "audio">;
  accessKeyId?: string;
  accessKeyLabel: string;
  defaultParams: Record<string, string | number | boolean>;
  modes?: string[];
  supportsThinking?: boolean;
  audioSupport?: "none" | "optional" | "required";
  durations?: number[];
  resolutions?: string[];
  enabled: boolean;
};

export type ScenarioBinding = {
  id: "novel_creation" | "novel_to_video";
  name: string;
  description: string;
  llmModelId?: string;
  imageModelId?: string;
  videoModelId?: string;
  imageQuality?: string;
  videoRatio?: "16:9" | "9:16" | "1:1";
  videoDuration?: number;
  videoResolution?: string;
};
