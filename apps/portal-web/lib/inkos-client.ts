"use client";

/**
 * Novel 模块统一入口（SxyIntelligentPlatform 版 inkos）
 *
 * 与 sxy-novel 的两处核心差异：
 * 1. 模型配置 → 门户 AccessKey（localStorage + InkosModelSelector），不再用 inkos #/services
 * 2. 小说数据   → 浏览器 IndexedDB，不在服务器/项目目录落盘
 *
 * Agent / 写作 / 审计 / 修订 / 雷达 仍走 InkOS 引擎，经 gateway 无状态运行时执行：
 *   IndexedDB snapshot → POST /api/novel/v1/runtime/execute → 回写 IndexedDB
 */

export * from "@/lib/inkos-indexeddb-api";

export const INKOS_STORAGE_MODE = "indexeddb" as const;
