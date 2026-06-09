from __future__ import annotations

import json
import logging
import os
import shutil
import subprocess
import time
from pathlib import Path
from typing import AsyncIterator
from urllib.error import URLError
from urllib.request import urlopen

import httpx

from app.core.inkos_settings import (
    INKOS_AUTO_START,
    INKOS_NOVEL_STORAGE,
    INKOS_PROJECT_ROOT,
    INKOS_STUDIO_ENTRY,
    INKOS_STUDIO_PORT,
    INKOS_STUDIO_URL,
)

logger = logging.getLogger(__name__)

_studio_process: subprocess.Popen[bytes] | None = None


def ensure_inkos_project_root() -> Path:
    root = INKOS_PROJECT_ROOT
    root.mkdir(parents=True, exist_ok=True)
    if (root / "inkos.json").is_file():
        return root

    inkos_bin = shutil.which("inkos")
    if inkos_bin:
        subprocess.run(
            [inkos_bin, "init", "--lang", "zh"],
            cwd=str(root),
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        if (root / "inkos.json").is_file():
            return root

    minimal_config = {
        "name": "portal-novel",
        "version": "0.1.0",
        "language": "zh",
        "llm": {
            "provider": "openai",
            "service": "platform",
            "configSource": "portal",
            "model": "",
            "apiFormat": "chat",
            "stream": True,
        },
        "notify": [],
        "inputGovernanceMode": "v2",
        "daemon": {
            "schedule": {"radarCron": "0 */6 * * *", "writeCron": "*/15 * * * *"},
            "maxConcurrentBooks": 3,
        },
    }
    import json

    (root / "inkos.json").write_text(json.dumps(minimal_config, indent=2), encoding="utf-8")
    (root / "books").mkdir(exist_ok=True)
    (root / "radar").mkdir(exist_ok=True)
    sync_inkos_secrets_from_env(root)
    return root


_ENV_TO_INKOS_SERVICE: dict[str, str] = {
    "OPENAI_API_KEY": "openai",
    "INKOS_LLM_API_KEY": "openai",
    "DEEPSEEK_API_KEY": "deepseek",
    "MOONSHOT_API_KEY": "moonshot",
    "ANTHROPIC_API_KEY": "anthropic",
    "DASHSCOPE_API_KEY": "bailian",
    "SILICONFLOW_API_KEY": "siliconcloud",
}


def sync_inkos_secrets_from_env(root: Path | None = None) -> bool:
    """Merge known API key env vars into .inkos/secrets.json without overwriting existing entries."""
    project_root = root or INKOS_PROJECT_ROOT
    secrets_dir = project_root / ".inkos"
    secrets_path = secrets_dir / "secrets.json"

    incoming: dict[str, dict[str, str]] = {}
    for env_name, service_id in _ENV_TO_INKOS_SERVICE.items():
        value = os.environ.get(env_name, "").strip()
        if value:
            incoming[service_id] = {"apiKey": value}

    if not incoming:
        return False

    secrets_dir.mkdir(parents=True, exist_ok=True)
    existing: dict[str, object] = {"services": {}}
    if secrets_path.is_file():
        try:
            parsed = json.loads(secrets_path.read_text(encoding="utf-8"))
            if isinstance(parsed, dict) and isinstance(parsed.get("services"), dict):
                existing = parsed
        except json.JSONDecodeError:
            pass

    services = existing.setdefault("services", {})
    if not isinstance(services, dict):
        services = {}
        existing["services"] = services

    changed = False
    for service_id, entry in incoming.items():
        current = services.get(service_id)
        if isinstance(current, dict) and current.get("apiKey"):
            continue
        services[service_id] = entry
        changed = True

    if changed:
        secrets_path.write_text(json.dumps(existing, indent=2), encoding="utf-8")
        logger.info("Synced inkos secrets from environment for %s", project_root)
    return changed


def studio_api_url(path: str) -> str:
    normalized = path if path.startswith("/") else f"/{path}"
    if normalized.startswith("/api/v1/"):
        suffix = normalized
    else:
        suffix = f"/api/v1{normalized}"
    return f"{INKOS_STUDIO_URL.rstrip('/')}{suffix}"


def expected_project_name() -> str:
    config_path = INKOS_PROJECT_ROOT / "inkos.json"
    if config_path.is_file():
        try:
            return json.loads(config_path.read_text(encoding="utf-8")).get("name", "portal-novel")
        except json.JSONDecodeError:
            pass
    return "portal-novel"


def fetch_studio_project_name(timeout: float = 1.5) -> str | None:
    try:
        with urlopen(studio_api_url("/project"), timeout=timeout) as response:
            if response.status != 200:
                return None
            payload = json.loads(response.read().decode("utf-8"))
            name = payload.get("name")
            return name if isinstance(name, str) else None
    except (URLError, TimeoutError, OSError, json.JSONDecodeError):
        return None


def studio_serves_portal_project(timeout: float = 1.5) -> bool:
    project_name = fetch_studio_project_name(timeout=timeout)
    return project_name == expected_project_name()


def is_studio_reachable(timeout: float = 1.5) -> bool:
    return studio_serves_portal_project(timeout=timeout)


def _terminate_managed_process() -> None:
    global _studio_process
    if _studio_process is None or _studio_process.poll() is not None:
        _studio_process = None
        return
    _studio_process.terminate()
    try:
        _studio_process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        _studio_process.kill()
        _studio_process.wait(timeout=5)
    _studio_process = None


def start_studio_process() -> None:
    global _studio_process

    ensure_inkos_project_root()
    sync_inkos_secrets_from_env()
    if not INKOS_AUTO_START or INKOS_STUDIO_ENTRY is None:
        return
    if is_studio_reachable():
        return

    if _studio_process and _studio_process.poll() is None:
        _terminate_managed_process()

    env = {**os.environ, "INKOS_STUDIO_PORT": str(INKOS_STUDIO_PORT)}
    _studio_process = subprocess.Popen(
        ["node", str(INKOS_STUDIO_ENTRY), str(INKOS_PROJECT_ROOT)],
        cwd=str(INKOS_PROJECT_ROOT),
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    logger.info("Started inkos studio on port %s for %s", INKOS_STUDIO_PORT, INKOS_PROJECT_ROOT)


def ensure_studio_running(timeout_seconds: float = 20.0) -> None:
    ensure_inkos_project_root()
    if is_studio_reachable():
        return

    active_name = fetch_studio_project_name()
    if active_name and active_name != expected_project_name():
        logger.warning(
            "InkOS Studio on %s serves project %r, expected %r; starting portal studio on configured port.",
            INKOS_STUDIO_URL,
            active_name,
            expected_project_name(),
        )

    start_studio_process()
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        if is_studio_reachable(timeout=1.0):
            return
        time.sleep(0.4)

    raise RuntimeError(
        f"InkOS Studio for portal-novel is not reachable at {INKOS_STUDIO_URL}. "
        f"Port may be occupied by another inkos project. "
        f"Set INKOS_STUDIO_PORT to a free port or stop the other studio instance."
    )


def studio_status() -> dict[str, object]:
    expected_name = expected_project_name()
    if INKOS_NOVEL_STORAGE == "indexeddb":
        return {
            "reachable": INKOS_STUDIO_ENTRY is not None,
            "managedProcess": False,
            "projectName": expected_name,
            "activeStudioProject": None,
            "projectMatched": True,
            "studioUrl": "",
            "autoStart": False,
            "storageMode": INKOS_NOVEL_STORAGE,
        }

    active_name = fetch_studio_project_name()
    return {
        "reachable": studio_serves_portal_project(),
        "managedProcess": _studio_process is not None and _studio_process.poll() is None,
        "projectName": expected_name,
        "activeStudioProject": active_name,
        "projectMatched": active_name == expected_name,
        "studioUrl": INKOS_STUDIO_URL,
        "autoStart": INKOS_AUTO_START,
        "storageMode": INKOS_NOVEL_STORAGE,
    }


async def proxy_request(
    *,
    method: str,
    path: str,
    query: str = "",
    headers: dict[str, str] | None = None,
    body: bytes | None = None,
) -> httpx.Response:
    ensure_studio_running()
    url = studio_api_url(path)
    if query:
        url = f"{url}?{query}"

    forwarded_headers = {
        key: value
        for key, value in (headers or {}).items()
        if key.lower() not in {"host", "content-length", "connection"}
    }

    async with httpx.AsyncClient(timeout=httpx.Timeout(300.0, connect=10.0)) as client:
        return await client.request(method, url, headers=forwarded_headers, content=body)


async def proxy_sse(path: str, query: str = "") -> AsyncIterator[bytes]:
    ensure_studio_running()
    url = studio_api_url(path)
    if query:
        url = f"{url}?{query}"

    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream("GET", url, headers={"Accept": "text/event-stream"}) as response:
            response.raise_for_status()
            async for chunk in response.aiter_bytes():
                yield chunk
