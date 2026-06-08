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

```bash
npm install
npm run dev:web
```

```bash
python3.13 -m venv .venv
.venv/bin/python -m pip install -e "services/gateway-api[dev]"
npm run dev:api
```

## 默认管理员

```text
username: admin
password: Admin@123456
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
