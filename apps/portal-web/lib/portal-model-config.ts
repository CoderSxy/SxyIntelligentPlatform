import type { AccessKey, ModelConfig } from "@/lib/types";

export const PORTAL_MODEL_STORAGE_KEY = "sxy-model-service-config";
export const INKOS_SELECTED_MODEL_STORAGE_KEY = "inkos-workbench-selected-model";

export type PortalModelConfig = {
  keys: AccessKey[];
  models: ModelConfig[];
};

export type InkosCustomServiceEntry = {
  service: "custom";
  name: string;
  baseUrl: string;
  apiFormat: "chat" | "responses";
  stream: boolean;
};

export type NovelLlmOption = {
  id: string;
  label: string;
  modelName: string;
  displayName: string;
  provider: string;
  accessKeyLabel: string;
  inkosService: string;
  apiKey: string;
  customService?: InkosCustomServiceEntry;
};

const PROVIDER_PRESETS: Record<string, { service: string; baseUrl: string }> = {
  OpenAI: { service: "openai", baseUrl: "https://api.openai.com/v1" },
  DeepSeek: { service: "deepseek", baseUrl: "https://api.deepseek.com" },
  Anthropic: { service: "anthropic", baseUrl: "https://api.anthropic.com" },
  通义千问: { service: "bailian", baseUrl: "https://dashscope.aliyuncs.com/apps/anthropic" },
  硅基流动: { service: "siliconcloud", baseUrl: "https://api.siliconflow.cn/v1" },
  AtlasCloud: { service: "openrouter", baseUrl: "https://api.atlascloud.ai/v1" }
};

function normalizeBaseUrl(value?: string) {
  return (value ?? "").trim().replace(/\/+$/, "");
}

function portalProtocolToApiFormat(protocol?: AccessKey["apiProtocol"]): "chat" | "responses" {
  if (protocol === "openai-responses") return "responses";
  return "chat";
}

function isLlmModel(model: ModelConfig) {
  if (model.modelType === "llm") return true;
  return model.capabilities?.includes("text") ?? model.capability === "novel_writing";
}

function isUsableKey(key: AccessKey | undefined) {
  if (!key || !key.enabled) return false;
  if (!key.secret?.trim() || !key.baseUrl?.trim()) return false;
  return key.status !== "invalid";
}

function buildNovelLlmOption(key: AccessKey, modelName: string, optionId: string, displayName: string): NovelLlmOption {
  const binding = resolveInkosBinding(key);
  return {
    id: optionId,
    label: `${displayName} · ${key.provider}`,
    modelName,
    displayName,
    provider: key.provider,
    accessKeyLabel: key.label,
    inkosService: binding.inkosService,
    apiKey: key.secret!.trim(),
    customService: binding.customService
  };
}

export function resolveInkosBinding(key: AccessKey): Pick<NovelLlmOption, "inkosService" | "customService"> {
  const preset = PROVIDER_PRESETS[key.provider];
  const keyBase = normalizeBaseUrl(key.baseUrl);
  if (preset && (!keyBase || keyBase === normalizeBaseUrl(preset.baseUrl))) {
    return { inkosService: preset.service };
  }

  const customName = key.label.trim() || key.provider;
  return {
    inkosService: `custom:${customName}`,
    customService: {
      service: "custom",
      name: customName,
      baseUrl: key.baseUrl?.trim() ?? "",
      apiFormat: portalProtocolToApiFormat(key.apiProtocol),
      stream: true
    }
  };
}

export function loadPortalModelConfig(): PortalModelConfig {
  if (typeof window === "undefined") {
    return { keys: [], models: [] };
  }
  const raw = window.localStorage.getItem(PORTAL_MODEL_STORAGE_KEY);
  if (!raw) return { keys: [], models: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<PortalModelConfig>;
    return {
      keys: Array.isArray(parsed.keys) ? parsed.keys : [],
      models: Array.isArray(parsed.models) ? parsed.models : []
    };
  } catch {
    return { keys: [], models: [] };
  }
}

export const PORTAL_MODEL_CONFIG_CHANGED_EVENT = "portal-model-config-changed";

export function savePortalModelConfig(config: PortalModelConfig) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PORTAL_MODEL_STORAGE_KEY, JSON.stringify(config));
  window.dispatchEvent(new Event(PORTAL_MODEL_CONFIG_CHANGED_EVENT));
}

export function listNovelLlmOptions(config: PortalModelConfig = loadPortalModelConfig()): NovelLlmOption[] {
  const keyById = new Map(config.keys.map((key) => [key.id, key]));
  const options: NovelLlmOption[] = [];
  const coveredKeyIds = new Set<string>();

  for (const model of config.models) {
    if (!model.enabled || !isLlmModel(model)) continue;
    const key = keyById.get(model.accessKeyId ?? "");
    if (!isUsableKey(key)) continue;

    coveredKeyIds.add(key!.id);
    options.push(buildNovelLlmOption(key!, model.modelName, model.id, model.displayName));
  }

  for (const key of config.keys) {
    if (!isUsableKey(key) || coveredKeyIds.has(key.id)) continue;
    const modelName = key.checkModel?.trim();
    if (!modelName) continue;
    options.push(buildNovelLlmOption(key, modelName, `key-auto-${key.id}`, `${key.label} · ${modelName}`));
  }

  return options.sort((left, right) => left.label.localeCompare(right.label, "zh-CN"));
}

export function describeNovelLlmSetupGap(config: PortalModelConfig = loadPortalModelConfig()): string {
  if (!config.keys.length) {
    return "请先在 AccessKey 新增 LLM Key 并保存";
  }

  const enabledKeys = config.keys.filter((key) => key.enabled);
  const readyKeys = enabledKeys.filter((key) => key.secret?.trim() && key.baseUrl?.trim() && key.status !== "invalid");
  if (!readyKeys.length) {
    return "请在 AccessKey 填写 API Key、Base URL 并保存";
  }

  if (listNovelLlmOptions(config).length > 0) {
    return "";
  }

  const hasLlmModel = config.models.some((model) => model.enabled && isLlmModel(model));
  if (!hasLlmModel) {
    return "请在 AccessKey 新增文本 LLM 模型，或选择带默认模型的供应商";
  }

  return "请在 AccessKey 检查模型绑定的 Key 是否已填写并保存";
}

export function loadSelectedNovelModelId(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(INKOS_SELECTED_MODEL_STORAGE_KEY) ?? "";
}

export function saveSelectedNovelModelId(modelId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INKOS_SELECTED_MODEL_STORAGE_KEY, modelId);
}
