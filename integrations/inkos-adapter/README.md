# Novel 模块（inkos 迁入 SxyIntelligentPlatform）

将 sxy-novel / InkOS 小说创作能力迁入门户，并做两处平台化改造。

## 设计目标（相对 sxy-novel）

| 能力 | sxy-novel | SxyIntelligentPlatform |
|------|-----------|------------------------|
| 小说数据 | 项目目录文件 `books/`、`story/` | 浏览器 **IndexedDB**（`sxy-inkos-workspace`） |
| 模型 / Key | InkOS Studio `#/services` + `secrets.json` | 门户 **AccessKey**（`设置 → 密钥`） |
| Agent 引擎 | 本地常驻 `inkos studio` | Gateway **无状态运行时**（按需临时拉起 InkOS） |
| 服务端落盘 | 有 | **无**（适合部署） |

## 架构

```
┌─────────────────────────────────────────────────────────┐
│  portal-web                                             │
│  ┌──────────────┐   ┌────────────────┐   ┌────────────┐ │
│  │ AccessKey    │   │ InkosWorkbench │   │ IndexedDB  │ │
│  │ (模型+Key)   │──▶│ + Agent Feed   │◀─▶│ 书籍/章节  │ │
│  └──────────────┘   └───────┬────────┘   └────────────┘ │
│                             │ snapshot                   │
└─────────────────────────────┼────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────┐
│  gateway-api                                            │
│  POST /api/novel/v1/runtime/execute                     │
│    → 临时目录 materialize → 临时 InkOS Studio → collect │
└─────────────────────────────────────────────────────────┘
```

## 前端文件职责

| 路径 | 职责 |
|------|------|
| `lib/inkos-client.ts` | **唯一 API 入口**（re-export indexeddb 实现） |
| `lib/inkos-indexeddb.ts` | IndexedDB schema、CRUD、导入导出 |
| `lib/inkos-indexeddb-api.ts` | 对齐 inkos REST 语义 + 调用 runtime/execute |
| `lib/portal-model-config.ts` | AccessKey → 可选 LLM 列表 |
| `components/inkos-workbench.tsx` | 工作台 UI |
| `components/inkos-model-selector.tsx` | 模型选择（读 AccessKey） |

已废弃、勿再接入：`inkos-api.ts`（文件存储代理）、`inkos-workspace.ts`、`inkos-studio-embed.tsx`

## 后端

| 路径 | 职责 |
|------|------|
| `app/api/novel.py` | `/novel/status`、`/novel/v1/runtime/execute` |
| `app/services/inkos_runtime.py` | snapshot ↔ 临时 InkOS 项目、执行 agent/write/audit/… |
| `app/core/inkos_settings.py` | `INKOS_NOVEL_STORAGE=indexeddb`（默认） |

## 环境变量

```bash
INKOS_NOVEL_STORAGE=indexeddb   # 默认；仅 indexeddb 模式启用 runtime/execute
```

仍需本机安装 `inkos` CLI（`npm i -g @actalk/inkos`），供 gateway 临时拉起运行时，**不用于持久化小说数据**。

## 本地开发

```bash
npm run dev:api
npm run dev:web
# http://127.0.0.1:3012/apps/novel
```

## 配置流程

1. **AccessKey**：新增 Key → 保存 → 测试；新增文本 LLM 模型并绑定 Key
2. **小说创作**：工作台选模型 → Agent 指令 / 写下一章 / 审计等
3. 数据自动写入 IndexedDB；换浏览器前请用「导出」备份

## Studio UI 能力（IndexedDB 模式）

| 能力 | 状态 |
|------|------|
| 多 Session 侧栏（新建/切换/重命名/删除） | ✅ |
| 章节 approve / reject / 手动编辑 | ✅（经 runtime） |
| 审计问题 / 篇幅警告展示 | ✅ |
| Markdown 章节阅读 + 档案预览 | ✅ |
| Radar 历史面板 + 扫描持久化 | ✅ |
| Analytics 统计面板 | ✅ |
| 守护进程 UI | ✅（浏览器内调度，关页即停） |
| 工作区导入/导出、删除书籍 | ✅ |

仍与原生 Studio 有差距：SSE 实时工具流、常驻服务端 daemon、Doctor/Genres/Import 等次要面板。

核心写作闭环（列表 → Agent → 写/审/修/过 → Truth 档案）已接通。
