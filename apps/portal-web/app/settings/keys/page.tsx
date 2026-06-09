"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Pencil, Plus, Save, Trash2, Zap } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Shell } from "@/components/shell";
import { loadPortalModelConfig, savePortalModelConfig } from "@/lib/portal-model-config";
import { AccessKey, ModelConfig, ModelType } from "@/lib/types";

const providers = [
  { name: "OpenAI", baseUrl: "https://api.openai.com/v1", protocol: "openai-responses", checkModel: "gpt-4.1-mini" },
  { name: "DeepSeek", baseUrl: "https://api.deepseek.com", protocol: "openai-completions", checkModel: "deepseek-chat" },
  { name: "通义千问", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", protocol: "openai-completions", checkModel: "qwen-plus" },
  { name: "硅基流动", baseUrl: "https://api.siliconflow.cn/v1", protocol: "openai-completions", checkModel: "Qwen/Qwen3-32B" },
  { name: "火山方舟", baseUrl: "https://ark.cn-beijing.volces.com/api/v3", protocol: "openai-completions", checkModel: "doubao-pro" },
  { name: "Anthropic", baseUrl: "https://api.anthropic.com", protocol: "anthropic-messages", checkModel: "claude-3-5-sonnet-latest" },
  { name: "即梦", baseUrl: "https://visual.volcengineapi.com", protocol: "custom", checkModel: "jimeng-image-v3" },
  { name: "可灵", baseUrl: "https://api.klingai.com", protocol: "custom", checkModel: "kling-v1-6" },
  { name: "AtlasCloud", baseUrl: "https://api.atlascloud.ai/v1", protocol: "openai-completions", checkModel: "deepseek-ai/deepseek-v4-pro" },
  { name: "自定义", baseUrl: "", protocol: "custom", checkModel: "" }
] as const;

const starterKeys: AccessKey[] = [
  {
    id: "key-deepseek",
    provider: "DeepSeek",
    label: "DeepSeek 平台 Key",
    scope: "platform",
    secret: "",
    maskedSecret: "未填写",
    baseUrl: "https://api.deepseek.com",
    modelsBaseUrl: "https://api.deepseek.com",
    checkModel: "deepseek-chat",
    apiProtocol: "openai-completions",
    enabled: true,
    status: "untested"
  },
  {
    id: "key-kling",
    provider: "可灵",
    label: "可灵视频 Key",
    scope: "platform",
    secret: "",
    maskedSecret: "未填写",
    baseUrl: "https://api.klingai.com",
    modelsBaseUrl: "https://api.klingai.com",
    checkModel: "kling-v1-6",
    apiProtocol: "custom",
    enabled: true,
    status: "untested"
  }
];

const starterModels: ModelConfig[] = [
  {
    id: "model-deepseek-chat",
    provider: "DeepSeek",
    modelType: "llm",
    modelName: "deepseek-chat",
    displayName: "DeepSeek Chat",
    capability: "novel_writing",
    capabilities: ["text"],
    accessKeyId: "key-deepseek",
    accessKeyLabel: "DeepSeek 平台 Key",
    defaultParams: {},
    enabled: true
  },
  {
    id: "model-kling-video",
    provider: "可灵",
    modelType: "video",
    modelName: "kling-v1-6",
    displayName: "可灵视频生成",
    capability: "video_generation",
    capabilities: ["video"],
    accessKeyId: "key-kling",
    accessKeyLabel: "可灵视频 Key",
    defaultParams: {},
    enabled: true
  }
];

type KeyForm = {
  provider: string;
  label: string;
  secret: string;
  baseUrl: string;
  enabled: boolean;
};

type ModelForm = {
  displayName: string;
  modelName: string;
  accessKeyId: string;
  capabilities: Array<"text" | "image" | "video" | "audio">;
  enabled: boolean;
};

const emptyKeyForm: KeyForm = {
  provider: "DeepSeek",
  label: "",
  secret: "",
  baseUrl: "https://api.deepseek.com",
  enabled: true
};

const emptyModelForm: ModelForm = {
  displayName: "",
  modelName: "",
  accessKeyId: "",
  capabilities: ["text"],
  enabled: true
};

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function maskSecret(secret?: string) {
  if (!secret) return "未填写";
  if (secret.length <= 8) return "****";
  return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
}

function modelTypeFromCapabilities(capabilities: ModelForm["capabilities"]): ModelType {
  if (capabilities.includes("video")) return "video";
  if (capabilities.includes("image")) return "image";
  return "llm";
}

function capabilityFromType(type: ModelType): ModelConfig["capability"] {
  if (type === "video") return "video_generation";
  if (type === "image") return "image_generation";
  return "novel_writing";
}

function readInitialConfig() {
  const stored = loadPortalModelConfig();
  return {
    keys: stored.keys.length ? stored.keys : starterKeys,
    models: stored.models.length ? stored.models : starterModels
  };
}

export default function AccessKeysPage() {
  const [keys, setKeys] = useState<AccessKey[]>(() => readInitialConfig().keys);
  const [models, setModels] = useState<ModelConfig[]>(() => readInitialConfig().models);
  const skipInitialPersist = useRef(true);
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [keyForm, setKeyForm] = useState<KeyForm>(emptyKeyForm);
  const [modelForm, setModelForm] = useState<ModelForm>(emptyModelForm);
  const [message, setMessage] = useState("这里只配置 Key 和模型；小说创作或小说转视频使用时，再按模型能力过滤可选项。");

  useEffect(() => {
    if (skipInitialPersist.current) {
      skipInitialPersist.current = false;
      return;
    }
    savePortalModelConfig({ keys, models });
  }, [keys, models]);

  const keyById = useMemo(() => new Map(keys.map((key) => [key.id, key])), [keys]);

  function chooseProvider(provider: string) {
    const preset = providers.find((item) => item.name === provider);
    setKeyForm((current) => ({
      ...current,
      provider,
      baseUrl: preset?.baseUrl ?? current.baseUrl
    }));
  }

  function resetKeyForm() {
    setEditingKeyId(null);
    setKeyForm(emptyKeyForm);
  }

  function resetModelForm() {
    setEditingModelId(null);
    setModelForm({ ...emptyModelForm, accessKeyId: keys[0]?.id ?? "" });
  }

  function saveKey() {
    if (!keyForm.provider.trim() || !keyForm.label.trim() || !keyForm.baseUrl.trim()) {
      setMessage("请填写供应商、配置名称和 Base URL。");
      return;
    }

    const preset = providers.find((item) => item.name === keyForm.provider);
    const nextKey: AccessKey = {
      id: editingKeyId ?? createId("key"),
      provider: keyForm.provider,
      label: keyForm.label,
      scope: "platform",
      secret: keyForm.secret,
      maskedSecret: maskSecret(keyForm.secret),
      baseUrl: keyForm.baseUrl,
      modelsBaseUrl: keyForm.baseUrl,
      checkModel: preset?.checkModel,
      apiProtocol: preset?.protocol as AccessKey["apiProtocol"],
      enabled: keyForm.enabled,
      status: "untested"
    };

    setKeys((current) => (editingKeyId ? current.map((key) => (key.id === editingKeyId ? nextKey : key)) : [nextKey, ...current]));
    setModels((current) => {
      const synced = current.map((model) =>
        model.accessKeyId === nextKey.id ? { ...model, provider: nextKey.provider, accessKeyLabel: nextKey.label } : model
      );
      if (!nextKey.checkModel?.trim()) return synced;

      const existing = synced.find(
        (model) => model.accessKeyId === nextKey.id && (model.modelType === "llm" || model.capabilities?.includes("text"))
      );
      if (existing) {
        return synced.map((model) =>
          model.id === existing.id
            ? {
                ...model,
                modelName: nextKey.checkModel!,
                displayName: model.displayName || `${nextKey.provider} ${nextKey.checkModel}`,
                enabled: true
              }
            : model
        );
      }

      return [
        {
          id: `model-auto-${nextKey.id}`,
          provider: nextKey.provider,
          modelType: "llm",
          modelName: nextKey.checkModel,
          displayName: `${nextKey.provider} ${nextKey.checkModel}`,
          capability: "novel_writing",
          capabilities: ["text"],
          accessKeyId: nextKey.id,
          accessKeyLabel: nextKey.label,
          defaultParams: {},
          enabled: true
        },
        ...synced
      ];
    });
    setMessage(editingKeyId ? "Key 配置已更新。" : "Key 配置已新增，已自动绑定默认 LLM 模型。");
    resetKeyForm();
  }

  function editKey(key: AccessKey) {
    setEditingKeyId(key.id);
    setKeyForm({
      provider: key.provider,
      label: key.label,
      secret: key.secret ?? "",
      baseUrl: key.baseUrl ?? "",
      enabled: key.enabled
    });
  }

  function deleteKey(id: string) {
    if (models.some((model) => model.accessKeyId === id)) {
      setMessage("这个 Key 正在被模型使用，请先调整模型绑定。");
      return;
    }
    setKeys((current) => current.filter((key) => key.id !== id));
    setMessage("Key 配置已删除。");
  }

  function testKey(id: string) {
    const target = keys.find((key) => key.id === id);
    if (!target) return;
    setKeys((current) => current.map((key) => (key.id === id ? { ...key, status: "testing" } : key)));
    window.setTimeout(() => {
      const valid = Boolean(target.secret?.trim() && target.baseUrl?.trim());
      setKeys((current) => current.map((key) => (key.id === id ? { ...key, status: valid ? "valid" : "invalid" } : key)));
      setMessage(valid ? "Key 配置字段完整，可用于后续模型调用。" : "Key 不可用：请填写 API Key 和 Base URL。");
    }, 400);
  }

  function saveModel() {
    if (!modelForm.displayName.trim() || !modelForm.modelName.trim() || !modelForm.accessKeyId) {
      setMessage("请填写模型名称、模型 ID，并绑定一个 Key。");
      return;
    }
    const key = keyById.get(modelForm.accessKeyId);
    if (!key) {
      setMessage("绑定的 Key 不存在。");
      return;
    }
    const modelType = modelTypeFromCapabilities(modelForm.capabilities);
    const nextModel: ModelConfig = {
      id: editingModelId ?? createId("model"),
      provider: key.provider,
      modelType,
      modelName: modelForm.modelName,
      displayName: modelForm.displayName,
      capability: capabilityFromType(modelType),
      capabilities: modelForm.capabilities,
      accessKeyId: key.id,
      accessKeyLabel: key.label,
      defaultParams: {},
      enabled: modelForm.enabled
    };
    setModels((current) => (editingModelId ? current.map((model) => (model.id === editingModelId ? nextModel : model)) : [nextModel, ...current]));
    setMessage(editingModelId ? "模型配置已更新。" : "模型配置已新增。");
    resetModelForm();
  }

  function editModel(model: ModelConfig) {
    setEditingModelId(model.id);
    setModelForm({
      displayName: model.displayName,
      modelName: model.modelName,
      accessKeyId: model.accessKeyId ?? "",
      capabilities: model.capabilities ?? [model.modelType === "llm" ? "text" : model.modelType],
      enabled: model.enabled
    });
  }

  function deleteModel(id: string) {
    setModels((current) => current.filter((model) => model.id !== id));
    setMessage("模型配置已删除。");
  }

  function toggleCapability(capability: ModelForm["capabilities"][number]) {
    setModelForm((current) => {
      const exists = current.capabilities.includes(capability);
      const next = exists ? current.capabilities.filter((item) => item !== capability) : [...current.capabilities, capability];
      return { ...current, capabilities: next.length ? next : ["text"] };
    });
  }

  return (
    <Shell>
      <PageHeader
        title="AccessKey 与模型配置"
        description="这里只维护模型服务本身：Key 是否可用、有哪些模型、模型绑定哪个 Key。具体创作场景会按能力标签过滤模型。"
        action={
          <div className="flex flex-wrap gap-2">
            <button className="action-button" onClick={resetModelForm}>
              <Plus className="h-4 w-4" />
              新增模型
            </button>
            <button className="primary-action" onClick={resetKeyForm}>
              <Plus className="h-4 w-4" />
              新增 Key
            </button>
          </div>
        }
      />

      <div className="mb-5 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{message}</div>

      <section className="mb-6 grid gap-5 xl:grid-cols-[360px_1fr]">
        <ConfigPanel title={editingKeyId ? "编辑 Key" : "新增 Key"}>
          <Field label="供应商">
            <select className="form-input" value={keyForm.provider} onChange={(event) => chooseProvider(event.target.value)}>
              {providers.map((provider) => (
                <option key={provider.name} value={provider.name}>
                  {provider.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="配置名称">
            <input className="form-input" value={keyForm.label} onChange={(event) => setKeyForm({ ...keyForm, label: event.target.value })} />
          </Field>
          <Field label="API Key / Token">
            <input
              className="form-input"
              type="password"
              value={keyForm.secret}
              onChange={(event) => setKeyForm({ ...keyForm, secret: event.target.value })}
              placeholder="仅本地保存，列表中脱敏展示"
            />
          </Field>
          <Field label="Base URL">
            <input className="form-input" value={keyForm.baseUrl} onChange={(event) => setKeyForm({ ...keyForm, baseUrl: event.target.value })} />
          </Field>
          <Field label="状态">
            <select className="form-input" value={keyForm.enabled ? "true" : "false"} onChange={(event) => setKeyForm({ ...keyForm, enabled: event.target.value === "true" })}>
              <option value="true">启用</option>
              <option value="false">停用</option>
            </select>
          </Field>
          <button className="primary-wide" onClick={saveKey}>
            <Save className="h-4 w-4" />
            保存 Key
          </button>
        </ConfigPanel>

        <div className="grid gap-4 lg:grid-cols-2">
          {keys.map((key) => (
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={key.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-ink">{key.label}</h2>
                  <p className="mt-1 text-sm text-muted">{key.provider}</p>
                </div>
                <StatusPill enabled={key.enabled} status={key.status} />
              </div>
              <code className="mt-4 block rounded-md bg-slate-950 px-3 py-2 text-sm text-white">{key.maskedSecret}</code>
              <div className="mt-3 truncate text-xs text-muted">Base URL：{key.baseUrl}</div>
              <div className="mt-4 flex flex-wrap gap-2">
                <IconButton icon={<Zap className="h-4 w-4" />} label="测试Key" onClick={() => testKey(key.id)} />
                <IconButton icon={<Pencil className="h-4 w-4" />} label="编辑" onClick={() => editKey(key)} />
                <IconButton danger icon={<Trash2 className="h-4 w-4" />} label="删除" onClick={() => deleteKey(key.id)} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <ConfigPanel title={editingModelId ? "编辑模型" : "新增模型"}>
          <Field label="绑定 Key">
            <select className="form-input" value={modelForm.accessKeyId} onChange={(event) => setModelForm({ ...modelForm, accessKeyId: event.target.value })}>
              <option value="">选择 Key</option>
              {keys.map((key) => (
                <option key={key.id} value={key.id}>
                  {key.label} / {key.provider}
                </option>
              ))}
            </select>
          </Field>
          <Field label="模型显示名">
            <input className="form-input" value={modelForm.displayName} onChange={(event) => setModelForm({ ...modelForm, displayName: event.target.value })} />
          </Field>
          <Field label="模型 ID">
            <input className="form-input" value={modelForm.modelName} onChange={(event) => setModelForm({ ...modelForm, modelName: event.target.value })} placeholder="例如 deepseek-chat / kling-v1-6" />
          </Field>
          <div className="grid gap-2 rounded-md border border-slate-200 p-3">
            <div className="text-sm font-semibold text-slate-700">模型能力</div>
            <div className="flex flex-wrap gap-3">
              {[
                ["text", "文本"],
                ["image", "图片"],
                ["video", "视频"],
                ["audio", "音频"]
              ].map(([value, label]) => (
                <label className="flex items-center gap-2 text-sm text-slate-700" key={value}>
                  <input checked={modelForm.capabilities.includes(value as ModelForm["capabilities"][number])} onChange={() => toggleCapability(value as ModelForm["capabilities"][number])} type="checkbox" />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <Field label="状态">
            <select className="form-input" value={modelForm.enabled ? "true" : "false"} onChange={(event) => setModelForm({ ...modelForm, enabled: event.target.value === "true" })}>
              <option value="true">启用</option>
              <option value="false">停用</option>
            </select>
          </Field>
          <button className="primary-wide" onClick={saveModel}>
            <Save className="h-4 w-4" />
            保存模型
          </button>
        </ConfigPanel>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">模型</th>
                <th className="px-4 py-3 font-medium">能力</th>
                <th className="px-4 py-3 font-medium">绑定 Key</th>
                <th className="px-4 py-3 font-medium">Key 状态</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {models.map((model) => {
                const key = keyById.get(model.accessKeyId ?? "");
                return (
                  <tr className="border-t border-slate-200" key={model.id}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink">{model.displayName}</div>
                      <div className="mt-1 text-xs text-muted">{model.modelName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {(model.capabilities ?? [model.modelType === "llm" ? "text" : model.modelType]).map((capability) => (
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700" key={capability}>
                            {capability}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {model.accessKeyLabel}
                      <div className="mt-1 text-xs">{model.provider}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill enabled={key?.enabled ?? false} status={key?.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <IconButton icon={<Pencil className="h-4 w-4" />} label="编辑" onClick={() => editModel(model)} />
                        <IconButton danger icon={<Trash2 className="h-4 w-4" />} label="删除" onClick={() => deleteModel(model.id)} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <style jsx>{`
        .form-input {
          height: 40px;
          width: 100%;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background: #fff;
          padding: 0 10px;
          font-size: 14px;
          color: #1f2933;
          outline: none;
        }
        .form-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }
        .action-button,
        .primary-action,
        .primary-wide,
        .icon-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 700;
        }
        .action-button,
        .icon-button {
          height: 36px;
          border: 1px solid #cbd5e1;
          background: #fff;
          color: #334155;
          padding: 0 10px;
        }
        .primary-action {
          height: 40px;
          border: 0;
          background: #2563eb;
          color: #fff;
          padding: 0 14px;
        }
        .primary-wide {
          height: 40px;
          width: 100%;
          border: 0;
          background: #2563eb;
          color: #fff;
        }
      `}</style>
    </Shell>
  );
}

function ConfigPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-ink">{title}</h2>
      <div className="grid gap-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      {label}
      {children}
    </label>
  );
}

function StatusPill({ status, enabled }: { status?: AccessKey["status"]; enabled: boolean }) {
  const label = !enabled ? "停用" : status === "valid" ? "可用" : status === "invalid" ? "不可用" : status === "testing" ? "测试中" : "未验证";
  const style = !enabled
    ? "bg-slate-100 text-slate-600"
    : status === "valid"
      ? "bg-emerald-100 text-emerald-700"
      : status === "invalid"
        ? "bg-red-100 text-red-700"
        : status === "testing"
          ? "bg-blue-100 text-blue-700"
          : "bg-amber-100 text-amber-700";

  return (
    <span className={`inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-xs font-semibold ${style}`}>
      {status === "valid" ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
      {label}
    </span>
  );
}

function IconButton({ icon, label, danger, onClick }: { icon: React.ReactNode; label: string; danger?: boolean; onClick: () => void }) {
  return (
    <button className={`icon-button ${danger ? "border-red-200 text-red-600" : ""}`} onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}
