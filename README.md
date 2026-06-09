# SxyIntelligentPlatform

统一 AI 门户平台一期架构骨架。

## 组成

- `apps/portal-web`: Next.js 门户前端
- `services/gateway-api`: FastAPI 本地服务端
- `integrations`: inkos、Toonflow、XHS、MoneyPrinterTurbo 适配器边界
- `docs`: 架构和实施规划
- `data`: 本地上传和输出目录

## 环境

- Node.js: 24.11.0，通过 nvm 切换
- Python: 3.13

```bash
source ~/.nvm/nvm.sh
nvm use
```

## 开发命令

本地默认端口：门户 `http://127.0.0.1:3012`，API `http://127.0.0.1:8000`。

```bash
npm install
npm run dev:web
```

```bash
python3.13 -m venv .venv
.venv/bin/python -m pip install -e "services/gateway-api[dev]"
npm run dev:api
```

门户通过 `next.config.mjs` 将 `/api/*` 代理到本地 Gateway，前端请求与 JWT Cookie 同源，无需跨域配置。

## 环境变量

复制 `.env.example` 为 `.env`，按需修改：

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | MySQL 连接串 |
| `SXY_JWT_SECRET` | JWT 签名密钥（至少 32 字符） |
| `SXY_JWT_EXPIRE_HOURS` | Token 有效期（小时，默认 12） |
| `SXY_COOKIE_SECURE` | 生产环境设为 `true` 以启用 Secure Cookie |
| `SXY_BOOTSTRAP_ADMIN_USERNAME` | 首次启动种子管理员用户名 |
| `SXY_BOOTSTRAP_ADMIN_PASSWORD` | 首次启动种子管理员密码 |
| `NEXT_PUBLIC_API_BASE_URL` | 前端 API 基址（默认 `/api`，走 Next 代理） |

## MySQL 与数据库迁移

本地开发需先启动 MySQL，并创建数据库 `sxy_portal`。

```bash
cd services/gateway-api
../../.venv/bin/alembic upgrade head
```

应用启动时会自动执行角色与管理员种子数据（幂等）。

## 鉴权与 RBAC

- 登录：`POST /api/auth/login`，成功后 JWT 写入 HttpOnly Cookie `sxy_access_token`
- 当前用户：`GET /api/auth/me`；登出：`POST /api/auth/logout`
- 受保护路由由 Gateway `dependencies.py` 从 Cookie 解析 JWT 并加载用户权限
- 门户 `/login` 为公开页；其余路由由 Next.js middleware 校验登录态
- 管理页面：`/admin/users`（用户管理）、`/admin/roles`（角色权限）、`/settings/profile`（修改密码）
- Gateway CORS 允许 `http://127.0.0.1:3012` 与 `http://localhost:3012`，并启用 `allow_credentials`

## 默认管理员

```text
username: admin
password: Admin@123456
```

可通过 `SXY_BOOTSTRAP_ADMIN_*` 环境变量覆盖；仅当库中尚无用户时写入。

## 验证

```bash
npm run test:api
npm run typecheck:web
```

## 一期范围

- 统一门户首页
- 用户、角色、权限体系
- 超级管理员权限
- AccessKey 管理页面
- 任务中心
- AI 小说创作入口
- AI 小说转视频创作入口
- XHS 和 MoneyPrinterTurbo 后期接入规划
