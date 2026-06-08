# Access Key Model Configs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade AccessKey management into a model configuration center that supports LLM, image, and video models for AI novel creation and novel-to-video workflows.

**Architecture:** Keep the phase-1 in-memory repository pattern and add model configuration plus scenario binding records beside access keys. The FastAPI gateway exposes catalog, model config, and scenario binding APIs; the Next.js settings page presents three configuration areas: service keys, model configs, and workflow defaults.

**Tech Stack:** Python 3.13, FastAPI, Pydantic, pytest, Next.js, React, TypeScript, Tailwind CSS.

---

### Task 1: Backend Tests

**Files:**
- Create: `services/gateway-api/app/tests/test_model_configs.py`

- [x] Add tests for provider catalog defaults.
- [x] Add tests for creating LLM, image, and video model configs.
- [x] Add tests for binding model configs to `novel_creation` and `novel_to_video`.

### Task 2: Backend Implementation

**Files:**
- Modify: `services/gateway-api/app/models/schemas.py`
- Modify: `services/gateway-api/app/models/__init__.py`
- Modify: `services/gateway-api/app/services/repository.py`
- Modify: `services/gateway-api/app/services/serializers.py`
- Create: `services/gateway-api/app/core/model_catalog.py`
- Create: `services/gateway-api/app/api/model_configs.py`
- Modify: `services/gateway-api/app/main.py`

- [x] Add model type, capability, provider catalog, model config, and scenario binding schemas.
- [x] Add repository methods and serializers.
- [x] Add API endpoints for catalogs, model configs, and scenario bindings.

### Task 3: Frontend Configuration Center

**Files:**
- Modify: `apps/portal-web/lib/types.ts`
- Modify: `apps/portal-web/app/settings/keys/page.tsx`

- [x] Add typed frontend records for service keys, model configs, and scenario bindings.
- [x] Replace simple key cards with service key, model config, and workflow default sections.
- [x] Include LLM, image, and video model examples for novel creation and novel-to-video.

### Task 4: Verification

**Files:**
- Check: backend tests
- Check: frontend typecheck
- Check: frontend build

- [x] Run `PYTHONPATH=services/gateway-api python3.13 -m pytest services/gateway-api/app/tests -q`.
- [x] Run `npm run typecheck:web` under Node 24.
- [x] Run `npm run build:web` under Node 24.
