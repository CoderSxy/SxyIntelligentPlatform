from __future__ import annotations

import os
import shutil
from pathlib import Path


def _first_existing(paths: list[Path]) -> Path | None:
    for candidate in paths:
        if candidate.is_dir() and (candidate / "inkos.json").is_file():
            return candidate
    return None


def default_portal_novel_root() -> Path:
    repo_root = Path(__file__).resolve().parents[4]
    return repo_root / "data" / "portal-novel"


def resolve_inkos_project_root() -> Path:
    configured = os.getenv("INKOS_PROJECT_ROOT")
    if configured:
        return Path(configured).expanduser().resolve()

    return default_portal_novel_root()


def resolve_inkos_studio_entry() -> Path:
    inkos_bin = shutil.which("inkos")
    if inkos_bin:
        # `inkos` resolves to .../@actalk/inkos/dist/index.js
        inkos_pkg = Path(inkos_bin).resolve().parent.parent
        bundled = (
            inkos_pkg
            / "node_modules"
            / "@actalk"
            / "inkos-studio"
            / "dist"
            / "api"
            / "index.js"
        )
        if bundled.is_file():
            return bundled

    raise RuntimeError(
        "inkos-studio entry not found. Install inkos globally: npm install -g @actalk/inkos"
    )


def _safe_studio_entry() -> Path | None:
    if not shutil.which("inkos"):
        return None
    try:
        return resolve_inkos_studio_entry()
    except RuntimeError:
        return None


INKOS_PROJECT_ROOT = resolve_inkos_project_root()

# 4567 常被本地 inkos studio（如 sxy-novel）占用，门户默认使用独立端口。
INKOS_STUDIO_PORT = int(os.getenv("INKOS_STUDIO_PORT", "4568"))
INKOS_STUDIO_URL = os.getenv("INKOS_STUDIO_URL", f"http://127.0.0.1:{INKOS_STUDIO_PORT}")
INKOS_AUTO_START = os.getenv("INKOS_AUTO_START", "true").lower() == "true"
INKOS_STUDIO_ENTRY = _safe_studio_entry()
INKOS_NOVEL_STORAGE = os.getenv("INKOS_NOVEL_STORAGE", "indexeddb").strip().lower()
