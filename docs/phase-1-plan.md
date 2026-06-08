# 第一期架构搭建规划

## 目标

第一期先完成统一 AI 门户底座，不重写已有 AI 子项目。平台提供统一登录、用户角色权限、AccessKey 管理、任务中心和模块入口；`inkos`、`Toonflow-web`、`Toonflow-app` 通过适配器逐步接入。

## 技术栈

- 前端：Next.js、React、TypeScript、Tailwind CSS、TanStack Query、Zustand
- 后端：Python 3.13、FastAPI、Pydantic
- 权限：RBAC，用户-角色-权限模型
- 本地开发：内存仓储优先跑通，后续替换 SQLite/PostgreSQL
- Node：通过 nvm 使用 24.11.0

## 一期模块

- AI小说创作：`inkos` 入口和后续 API 适配器
- AI小说转视频创作：`Toonflow-web` 前端入口和 `Toonflow-app` 服务端适配器
- AccessKey 管理：本地服务端保存，前端只展示脱敏信息
- 用户权限：超级管理员、管理员、小说创作用户、视频创作用户、只读用户
- 任务中心：统一记录 AI 创作任务状态
- 小红书和 MoneyPrinterTurbo：仅预留模块和权限位

## 默认账号

开发期默认超级管理员：

```text
username: admin
password: Admin@123456
```

## 本地命令

```bash
source ~/.nvm/nvm.sh
nvm use
npm install
npm run dev:web
```

```bash
python3.13 -m venv .venv
.venv/bin/python -m pip install -e "services/gateway-api[dev]"
npm run dev:api
```

## 后续演进

1. 将后端内存仓储替换为 SQLite/PostgreSQL。
2. 为 AccessKey 增加本地加密和系统 Keychain 支持。
3. 将 `inkos` 项目能力接入 `integrations/inkos-adapter`。
4. 将 Toonflow 任务创建、状态查询和输出归档接入 `integrations/toonflow-adapter`。
5. 增加 Celery/RQ Worker 执行长任务。
6. 后期接入 XHS_ALL_IN_ONE 和 MoneyPrinterTurbo。

