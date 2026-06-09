# 用户登录与权限管理模块设计

**日期：** 2026-06-09  
**状态：** 已评审  
**范围：** 在现有 SxyIntelligentPlatform 一期骨架上，将内存存储替换为 MySQL 持久化，重新落地 RBAC 权限模型，打通真实登录鉴权与前后端管理页面。

---

## 1. 背景与目标

### 1.1 现状

项目已具备一期骨架：

- **后端**（`services/gateway-api`）：RBAC 权限码、密码哈希、登录接口、用户/角色管理接口、`require_permission` 校验
- **前端**（`apps/portal-web`）：登录页、用户管理页、角色权限页、按权限过滤模块入口

主要缺口：

- 数据存储在 `InMemoryRepository`，重启即丢失
- 前端登录页仅跳转，未调用 API
- 鉴权依赖硬编码 `x-user: admin` 请求头，非真实 Token
- 管理页面使用静态假数据

### 1.2 目标

1. 用户可通过用户名/密码登录，JWT 存入 HttpOnly Cookie
2. 权限目录系统预置（`模块:操作` 格式），菜单入口与 API 共用同一套权限码
3. 角色完全可自定义（预置角色仅为种子），管理员可 CRUD 角色并勾选权限
4. 用户管理支持：列表、创建、编辑、启用/禁用、删除、管理员重置密码、用户自助改密
5. 所有数据持久化到 MySQL
6. `super_admin` 角色与 bootstrap `admin` 用户受硬性保护，不可删除或禁用

### 1.3 非目标（本期不做）

- 权限目录的动态扩展（管理员新增权限码）
- SSO / OAuth 第三方登录
- 多租户
- 操作审计日志
- Refresh Token 续期（本期固定 12 小时过期，过期重新登录）

---

## 2. 设计决策摘要

| 决策项 | 选择 |
|--------|------|
| 实现路径 | 渐进式替换（方案一）：保留现有路由与页面骨架，替换存储层与鉴权 |
| 权限格式 | 模块 + 操作码（如 `novel:view`），菜单与 API 共用 |
| 权限目录 | 系统预置、固定，由代码定义，管理员只分配 |
| 角色管理 | 完全自定义，预置角色仅为初始种子 |
| 鉴权方式 | JWT 存入 HttpOnly Cookie |
| 安全保护 | `super_admin` 角色 + bootstrap `admin` 用户不可删禁 |
| 用户管理 | 基础 CRUD + 管理员重置密码 + 用户自助改密 |

---

## 3. 架构

```mermaid
flowchart LR
    subgraph frontend [portal-web Next.js]
        LoginPage --> AuthContext
        AuthContext --> ApiClient
        Middleware --> AuthContext
        Shell --> PermissionGuard
    end

    subgraph backend [gateway-api FastAPI]
        AuthMiddleware --> JWTVerify
        AuthRouter --> UserService
        AdminRouter --> RoleService
        PermissionCheck[require_permission] --> RoleService
        UserService --> MySQL
        RoleService --> MySQL
    end

    ApiClient -->|Cookie credentials| AuthRouter
    ApiClient --> AdminRouter
```

### 3.1 前端职责

- 登录页调用 `/api/auth/login`
- 全局 `AuthProvider` 持有当前用户与权限列表
- Next.js `middleware.ts` 拦截未登录访问（`/login` 除外）
- `Shell` 组件按权限渲染侧边栏导航和 AI 模块入口
- API 请求统一 `credentials: "include"`

### 3.2 后端职责

- 从 HttpOnly Cookie 解析 JWT，加载用户身份
- 每个受保护接口通过 `require_permission("xxx:yyy")` 校验
- 权限目录由 `app/core/permissions.py` 的 `DEFAULT_MODULES` 派生
- 用户、角色、关联关系持久化到 MySQL

---

## 4. 数据模型

### 4.1 表结构

#### `users`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | VARCHAR(36) PK | UUID |
| `username` | VARCHAR(64) UNIQUE | 登录名 |
| `display_name` | VARCHAR(128) | 显示名 |
| `password_hash` | VARCHAR(256) | PBKDF2 哈希（沿用现有算法） |
| `disabled` | BOOLEAN DEFAULT false | 是否禁用 |
| `is_protected` | BOOLEAN DEFAULT false | 受保护标记（bootstrap admin） |
| `created_at` | DATETIME | 创建时间 |
| `updated_at` | DATETIME | 更新时间 |

#### `roles`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | VARCHAR(64) PK | 角色 slug（如 `novel_creator`） |
| `name` | VARCHAR(128) | 显示名称 |
| `description` | TEXT | 描述 |
| `is_protected` | BOOLEAN DEFAULT false | 受保护标记（`super_admin`） |
| `created_at` | DATETIME | 创建时间 |
| `updated_at` | DATETIME | 更新时间 |

#### `role_permissions`

| 字段 | 类型 | 说明 |
|------|------|------|
| `role_id` | VARCHAR(64) FK → roles.id | 角色 |
| `permission_code` | VARCHAR(64) | 权限码（如 `novel:view` 或 `*`） |

复合主键：`(role_id, permission_code)`

#### `user_roles`

| 字段 | 类型 | 说明 |
|------|------|------|
| `user_id` | VARCHAR(36) FK → users.id | 用户 |
| `role_id` | VARCHAR(64) FK → roles.id | 角色 |

复合主键：`(user_id, role_id)`

### 4.2 权限目录

权限码**不入库**。由 `DEFAULT_MODULES` 中各模块的 `permissions` 列表派生，通过 `GET /api/admin/permissions` 按模块分组返回给前端勾选面板。

### 4.3 种子数据

Alembic 迁移执行时写入：

1. 预置角色（`DEFAULT_ROLES` 全部导入），`super_admin` 标记 `is_protected=true`，权限含 `*`
2. bootstrap 用户 `admin`（密码从环境变量 `SXY_BOOTSTRAP_ADMIN_PASSWORD` 读取，默认 `Admin@123456`），`is_protected=true`，绑定 `super_admin` 角色
3. 种子写入幂等：已存在则跳过

### 4.4 权限计算

```python
def user_permissions(user) -> set[str]:
    permissions = set()
    for role in user.roles:
        permissions.update(role.permission_codes)
    return permissions

def has_permission(permissions, required) -> bool:
    return "*" in permissions or required in permissions
```

---

## 5. JWT Cookie 策略

| 属性 | 值 |
|------|-----|
| Cookie 名 | `sxy_access_token` |
| HttpOnly | true |
| SameSite | Lax |
| Path | `/` |
| Secure | 开发环境 false，生产环境 true |
| 有效期 | 12 小时（`SXY_JWT_EXPIRE_HOURS` 可配置） |
| 签名密钥 | `SXY_JWT_SECRET` 环境变量 |
| Payload | `sub`(username), `roles`, `permissions`, `exp` |

- `POST /api/auth/login`：验证通过后签发 JWT 并 `Set-Cookie`
- `POST /api/auth/logout`：`Set-Cookie` 清除（`max-age=0`）
- 鉴权失败返回 401，权限不足返回 403

---

## 6. API 设计

### 6.1 认证 `/api/auth`

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | `/login` | 公开 | 校验用户名密码，签发 JWT 写 Cookie，返回 `UserPublic` |
| POST | `/logout` | 已登录 | 清除 Cookie |
| GET | `/me` | 已登录 | 返回当前用户（含 roles、permissions） |
| POST | `/change-password` | 已登录 | 自助改密：请求体 `{ old_password, new_password }` |

### 6.2 用户管理 `/api/admin/users`

| 方法 | 路径 | 所需权限 | 说明 |
|------|------|----------|------|
| GET | `/users` | `user:view` | 用户列表 |
| POST | `/users` | `user:create` | 创建用户 |
| PATCH | `/users/{id}` | `user:update`（改显示名/角色）或 `user:disable`（改启用状态） | 更新用户信息；`is_protected` 用户不可禁用 |
| DELETE | `/users/{id}` | `user:delete` | 删除用户；`is_protected` 拒绝 |
| POST | `/users/{id}/reset-password` | `user:update` | 管理员重置密码；请求体 `{ new_password }` |

### 6.3 角色管理 `/api/admin/roles`

| 方法 | 路径 | 所需权限 | 说明 |
|------|------|----------|------|
| GET | `/roles` | `role:view` | 角色列表（含 permissions） |
| POST | `/roles` | `role:create` | 创建角色；请求体 `{ id, name, description, permissions }` |
| PATCH | `/roles/{id}` | `role:update` | 更新名称、描述、权限 |
| DELETE | `/roles/{id}` | `role:delete` | 删除角色；`is_protected` 或有用户绑定时拒绝 |

### 6.4 权限目录 `/api/admin/permissions`

| 方法 | 路径 | 所需权限 | 说明 |
|------|------|----------|------|
| GET | `/permissions` | `role:view` | 固定权限目录，按模块分组返回 |

### 6.5 现有业务接口改造

所有已有接口（`/keys`、`/tasks`、`/model-configs`、`/modules` 等）：

- 移除 `x-user` 请求头鉴权
- `current_user` 依赖改为从 Cookie JWT 解析
- 保持现有 `require_permission(...)` 调用不变

---

## 7. 权限 Enforcement

### 7.1 模块入口门槛权限

| 模块/页面 | 门槛权限 |
|-----------|----------|
| 仪表盘 `/dashboard` | 登录即可 |
| AI 小说 `/apps/novel` | `novel:view` |
| AI 转视频 `/apps/video` | `video:view` |
| 任务中心 `/tasks` | `task:view_own` 或 `task:view_all` |
| AccessKey `/settings/keys` | `key:view` |
| 用户管理 `/admin/users` | `user:view` |
| 角色权限 `/admin/roles` | `role:view` |
| 个人设置 `/settings/profile` | 登录即可 |

### 7.2 后端鉴权链路

```
Request → 读取 sxy_access_token Cookie → 验证 JWT 签名与过期
        → 按 sub 加载用户 → 检查 disabled
        → require_permission("xxx:yyy") → 403 或继续处理
```

### 7.3 前端保护

1. **Middleware**：除 `/login` 外，未登录访问重定向到 `/login`
2. **AuthProvider**：应用级用户状态，登录/登出时更新
3. **Shell**：按 permissions 过滤 `navItems` 和 `portalModules`
4. **页面级**：无门槛权限时渲染「无权限」提示（非白屏）
5. **API Client**：`credentials: "include"`，401 时清状态并重定向登录

---

## 8. 前端页面改造

| 页面 | 改造内容 |
|------|----------|
| `/login` | 表单提交调 API；错误提示；成功后跳 `/dashboard` |
| `/dashboard` | 从 AuthProvider 取用户，按权限展示模块卡片 |
| `/admin/users` | 对接用户 CRUD API；新增用户弹窗；禁用/删除/重置密码 |
| `/admin/roles` | 对接角色 CRUD API；按模块分组的权限勾选面板 |
| `/settings/profile`（新增） | 用户自助修改密码 |
| `Shell` | 显示真实用户名；增加「退出登录」按钮 |

### 8.1 交互约定

- 删除角色前检查用户绑定，有绑定则返回 409，前端提示先解绑
- `admin` 用户和 `super_admin` 角色标记「系统保护」，UI 隐藏删除/禁用按钮
- 表单校验与后端一致：用户名 ≥2 字符，密码 ≥8 字符

---

## 9. 错误处理

| 场景 | HTTP | 响应 |
|------|------|------|
| 用户名/密码错误 | 401 | `{ "detail": "Invalid username or password" }` |
| Token 缺失/过期/无效 | 401 | `{ "detail": "Not authenticated" }` |
| 缺权限 | 403 | `{ "detail": "Missing permission: xxx:yyy" }` |
| 删除受保护实体 | 400 | `{ "detail": "Protected resource cannot be deleted" }` |
| 删除有用户绑定的角色 | 409 | `{ "detail": "Role is assigned to N users" }` |
| 用户名已存在 | 409 | `{ "detail": "Username already exists" }` |
| 旧密码错误（改密） | 400 | `{ "detail": "Invalid old password" }` |
| MySQL 连接失败 | — | 启动时健康检查失败，日志明确报错 |

---

## 10. 环境变量

```env
# 已有
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api
SXY_BOOTSTRAP_ADMIN_USERNAME=admin
SXY_BOOTSTRAP_ADMIN_PASSWORD=Admin@123456

# 新增
DATABASE_URL=mysql+pymysql://user:pass@127.0.0.1:3306/sxy_portal
SXY_JWT_SECRET=<random-secret-at-least-32-chars>
SXY_JWT_EXPIRE_HOURS=12
```

---

## 11. 技术选型

| 层级 | 选型 |
|------|------|
| ORM | SQLAlchemy 2.0 |
| 迁移 | Alembic |
| MySQL 驱动 | PyMySQL |
| JWT | PyJWT |
| 后端测试 | pytest（沿用现有） |
| 前端测试 | 本期手动验证，后续可补 Playwright |

---

## 12. 迁移与启动流程

1. 配置 `DATABASE_URL` 并确保 MySQL 实例可用
2. 执行 `alembic upgrade head` 建表并写入种子数据
3. 启动 API，健康检查验证 DB 连通
4. 启动前端，访问 `/login` 用 bootstrap 账号登录验证

---

## 13. 测试策略

### 13.1 后端单元测试

- 密码哈希与验证（沿用 `test_security.py`）
- 权限计算：多角色合并、`*` 通配（沿用 `test_permissions.py`）
- JWT 签发、解析、过期
- 受保护实体删除/禁用拒绝
- 登录/登出 Cookie 写入与清除
- 各 admin API 权限门禁（401/403）
- 角色删除时用户绑定检查

### 13.2 前端验证（手动）

- 登录成功/失败流程
- 登出后无法访问受保护页面
- 不同角色用户看到的菜单和模块入口差异
- 用户管理 CRUD 与重置密码
- 角色管理 CRUD 与权限勾选
- 自助改密

---

## 14. 实现顺序建议

1. MySQL 模型 + Alembic 迁移 + 种子数据
2. `MySQLRepository` 替换 `InMemoryRepository`（用户/角色部分）
3. JWT Cookie 鉴权中间件，改造 `dependencies.py`
4. 完善 auth / admin API
5. 前端 AuthProvider + API Client + 登录页
6. 前端管理页面与用户/角色 CRUD
7. Middleware 路由保护 + Shell 改造
8. 清理 `demoUser`、`x-user` 头残留
9. 测试补齐与 `.env.example` 更新
