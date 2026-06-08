# Phase 1 Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first-phase AI portal foundation with a Next.js web app, FastAPI gateway, RBAC user permissions, local access-key management, task center primitives, and integration slots for inkos, Toonflow, XHS, and MoneyPrinterTurbo.

**Architecture:** The portal web app owns user experience and permission-driven navigation. The FastAPI gateway owns authentication, RBAC, encrypted key metadata, task records, and adapter boundaries to existing AI systems. Integrations stay behind explicit adapter modules so existing projects can be connected incrementally without coupling the portal to their internals.

**Tech Stack:** Node.js 24 via nvm, Next.js, React, TypeScript, Tailwind CSS, Python 3.13, FastAPI, SQLModel/SQLAlchemy-compatible models, pytest-compatible tests.

---

### Task 1: Repository Foundation

**Files:**
- Create: `.nvmrc`
- Create: `.gitignore`
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `docs/phase-1-plan.md`
- Modify: `README.md`

- [x] Create a Node 24 workspace convention with `.nvmrc`.
- [x] Add root package scripts for web and API development.
- [x] Document the phase-1 scope and local commands.

### Task 2: Backend RBAC Core

**Files:**
- Create: `services/gateway-api/app/core/permissions.py`
- Create: `services/gateway-api/app/core/security.py`
- Create: `services/gateway-api/app/tests/test_permissions.py`
- Create: `services/gateway-api/app/tests/test_security.py`

- [x] Write failing tests for default roles, permissions, and permission checks.
- [x] Implement minimal RBAC helpers and password/JWT helpers.
- [x] Run focused Python tests.

### Task 3: FastAPI Gateway Skeleton

**Files:**
- Create: `services/gateway-api/pyproject.toml`
- Create: `services/gateway-api/app/main.py`
- Create: `services/gateway-api/app/api/*.py`
- Create: `services/gateway-api/app/models/*.py`
- Create: `services/gateway-api/app/services/*.py`

- [x] Add app factory and health endpoint.
- [x] Add auth, module, key, task, and admin route skeletons.
- [x] Add in-memory service layer for first-phase local development.

### Task 4: Portal Web Skeleton

**Files:**
- Create: `apps/portal-web/package.json`
- Create: `apps/portal-web/app/**`
- Create: `apps/portal-web/components/**`
- Create: `apps/portal-web/lib/**`

- [x] Add App Router structure.
- [x] Add login, dashboard, AI module, task, key, and admin screens.
- [x] Add permission-driven navigation and API client helpers.

### Task 5: Integration Placeholders

**Files:**
- Create: `integrations/README.md`
- Create: `integrations/*-adapter/README.md`

- [x] Add adapter contracts and planned connection points for inkos, Toonflow, XHS, and MoneyPrinterTurbo.

### Task 6: Verification

**Files:**
- Check: repository files
- Check: backend unit tests
- Check: package scripts

- [x] Run available backend tests.
- [x] Run syntax/import checks where dependencies are available.
- [x] Summarize any dependency installation steps that remain.
