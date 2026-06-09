from __future__ import annotations

import json
import logging
import os
import re
import shutil
import socket
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Any

import httpx

from app.core.inkos_settings import INKOS_STUDIO_ENTRY

logger = logging.getLogger(__name__)

CHAPTER_FILE_RE = re.compile(r"^(\d{4})_(.+)\.md$")


def _find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def _wait_for_studio(port: int, timeout_seconds: float = 25.0) -> None:
    deadline = time.monotonic() + timeout_seconds
    url = f"http://127.0.0.1:{port}/api/v1/project"
    while time.monotonic() < deadline:
        try:
            with httpx.Client(timeout=1.5) as client:
                response = client.get(url)
                if response.status_code == 200:
                    return
        except httpx.HTTPError:
            pass
        time.sleep(0.35)
    raise RuntimeError(f"InkOS ephemeral studio did not become ready on port {port}")


def _default_inkos_config() -> dict[str, Any]:
    return {
        "name": "portal-novel-runtime",
        "version": "0.1.0",
        "language": "zh",
        "llm": {
            "provider": "openai",
            "service": "openai",
            "configSource": "studio",
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


def _apply_llm_config(config: dict[str, Any], llm_config: dict[str, Any] | None, secrets: dict[str, Any] | None) -> None:
    llm = config.setdefault("llm", {})
    if isinstance(llm_config, dict):
        service = llm_config.get("service")
        model = llm_config.get("model")
        if isinstance(service, str) and service.strip():
            llm["service"] = service.strip()
        if isinstance(model, str) and model.strip():
            llm["model"] = model.strip()
        api_format = llm_config.get("apiFormat")
        if isinstance(api_format, str) and api_format.strip():
            llm["apiFormat"] = api_format.strip()

    if not llm.get("service") and isinstance(secrets, dict):
        services = secrets.get("services")
        if isinstance(services, dict) and len(services) == 1:
            llm["service"] = next(iter(services.keys()))


def materialize_snapshot(
    workspace_dir: Path,
    snapshot: dict[str, Any],
    secrets: dict[str, Any] | None = None,
    llm_config: dict[str, Any] | None = None,
) -> None:
    workspace_dir.mkdir(parents=True, exist_ok=True)
    (workspace_dir / "books").mkdir(exist_ok=True)
    (workspace_dir / "radar").mkdir(exist_ok=True)

    project = snapshot.get("project") or {}
    config = _default_inkos_config()
    if isinstance(project, dict):
        config["name"] = project.get("name", config["name"])
        config["language"] = project.get("language", config["language"])
        project_llm = project.get("llm")
        if isinstance(project_llm, dict):
            config["llm"].update({key: value for key, value in project_llm.items() if value is not None})
    _apply_llm_config(config, llm_config, secrets)
    (workspace_dir / "inkos.json").write_text(json.dumps(config, indent=2), encoding="utf-8")

    secrets_dir = workspace_dir / ".inkos"
    secrets_dir.mkdir(exist_ok=True)
    secret_payload = secrets if secrets else {"services": {}}
    if "services" not in secret_payload:
        secret_payload = {"services": secret_payload}
    (secrets_dir / "secrets.json").write_text(json.dumps(secret_payload, indent=2), encoding="utf-8")

    books = snapshot.get("books") or []
    chapters = snapshot.get("chapters") or []
    story_files = snapshot.get("storyFiles") or []

    chapters_by_book: dict[str, list[dict[str, Any]]] = {}
    for chapter in chapters:
        if not isinstance(chapter, dict):
            continue
        book_id = chapter.get("bookId")
        if isinstance(book_id, str):
            chapters_by_book.setdefault(book_id, []).append(chapter)

    story_by_book: dict[str, list[dict[str, Any]]] = {}
    for story in story_files:
        if not isinstance(story, dict):
            continue
        book_id = story.get("bookId")
        if isinstance(book_id, str):
            story_by_book.setdefault(book_id, []).append(story)

    for book in books:
        if not isinstance(book, dict):
            continue
        book_id = book.get("id")
        if not isinstance(book_id, str) or not book_id:
            continue
        book_dir = workspace_dir / "books" / book_id
        chapters_dir = book_dir / "chapters"
        story_dir = book_dir / "story"
        chapters_dir.mkdir(parents=True, exist_ok=True)
        story_dir.mkdir(parents=True, exist_ok=True)

        book_meta = {
            "id": book_id,
            "title": book.get("title", book_id),
            "genre": book.get("genre", "other"),
            "platform": book.get("platform", "other"),
            "language": book.get("language", "zh"),
            "status": book.get("status", "active"),
            "targetChapters": book.get("targetChapters", 100),
            "chapterWordCount": book.get("chapterWordCount", 3000),
            "createdAt": book.get("createdAt"),
            "updatedAt": book.get("updatedAt"),
        }
        (book_dir / "book.json").write_text(json.dumps(book_meta, indent=2), encoding="utf-8")

        index_entries = []
        for chapter in sorted(chapters_by_book.get(book_id, []), key=lambda item: int(item.get("number", 0))):
            number = int(chapter.get("number", 0))
            title = str(chapter.get("title", f"第{number}章"))
            file_name = f"{str(number).zfill(4)}_{title}.md"
            content = str(chapter.get("content", ""))
            (chapters_dir / file_name).write_text(content, encoding="utf-8")
            index_entries.append(
                {
                    "number": number,
                    "title": title,
                    "status": chapter.get("status", "draft"),
                    "wordCount": chapter.get("wordCount", len(content.replace(" ", ""))),
                    "createdAt": chapter.get("createdAt"),
                    "updatedAt": chapter.get("updatedAt"),
                    "auditIssues": chapter.get("auditIssues", []),
                    "lengthWarnings": chapter.get("lengthWarnings", []),
                    "tokenUsage": chapter.get("tokenUsage"),
                }
            )
        (chapters_dir / "index.json").write_text(json.dumps(index_entries, indent=2), encoding="utf-8")

        for story in story_by_book.get(book_id, []):
            name = story.get("name")
            if not isinstance(name, str):
                continue
            (story_dir / name).write_text(str(story.get("content", "")), encoding="utf-8")

    radar_scans = snapshot.get("radarScans") or []
    radar_dir = workspace_dir / "radar"
    for scan in radar_scans:
        if not isinstance(scan, dict):
            continue
        timestamp = scan.get("timestamp")
        result = scan.get("result") if isinstance(scan.get("result"), dict) else scan
        if not isinstance(timestamp, str):
            timestamp = str(scan.get("id", "scan")).replace("scan-", "")
        safe_ts = timestamp.replace(":", "-").replace(".", "-")
        (radar_dir / f"scan-{safe_ts}.json").write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")


def collect_snapshot(workspace_dir: Path) -> dict[str, Any]:
    project_config = _default_inkos_config()
    config_path = workspace_dir / "inkos.json"
    if config_path.is_file():
        try:
            loaded = json.loads(config_path.read_text(encoding="utf-8"))
            if isinstance(loaded, dict):
                project_config.update(loaded)
        except json.JSONDecodeError:
            pass

    books: list[dict[str, Any]] = []
    chapters: list[dict[str, Any]] = []
    story_files: list[dict[str, Any]] = []
    radar_scans: list[dict[str, Any]] = []
    radar_dir = workspace_dir / "radar"
    if radar_dir.is_dir():
        for scan_file in sorted(radar_dir.glob("scan-*.json"), reverse=True):
            try:
                payload = json.loads(scan_file.read_text(encoding="utf-8"))
                if isinstance(payload, dict):
                    timestamp = str(payload.get("timestamp") or scan_file.stem.replace("scan-", ""))
                    market_summary = str(payload.get("marketSummary") or "")
                    recommendations = payload.get("recommendations") if isinstance(payload.get("recommendations"), list) else []
                    preview = market_summary[:120] or (
                        str(recommendations[0].get("concept", "")) if recommendations and isinstance(recommendations[0], dict) else ""
                    )
                    radar_scans.append(
                        {
                            "id": f"scan-{timestamp}",
                            "timestamp": timestamp,
                            "marketSummary": market_summary,
                            "summaryPreview": preview,
                            "result": payload,
                        }
                    )
            except (json.JSONDecodeError, OSError):
                continue

    books_root = workspace_dir / "books"
    if not books_root.is_dir():
        return {
            "project": project_config,
            "books": books,
            "chapters": chapters,
            "storyFiles": story_files,
            "radarScans": radar_scans,
        }

    for book_dir in books_root.iterdir():
        if not book_dir.is_dir():
            continue
        book_id = book_dir.name
        book_meta_path = book_dir / "book.json"
        if book_meta_path.is_file():
            try:
                book_meta = json.loads(book_meta_path.read_text(encoding="utf-8"))
                if isinstance(book_meta, dict):
                    books.append(book_meta)
                    continue
            except json.JSONDecodeError:
                pass
        books.append({"id": book_id, "title": book_id, "genre": "other", "platform": "other", "language": "zh", "status": "active", "targetChapters": 100, "chapterWordCount": 3000})

        chapters_dir = book_dir / "chapters"
        index_path = chapters_dir / "index.json"
        index_map: dict[int, dict[str, Any]] = {}
        if index_path.is_file():
            try:
                index_data = json.loads(index_path.read_text(encoding="utf-8"))
                if isinstance(index_data, list):
                    for entry in index_data:
                        if isinstance(entry, dict) and "number" in entry:
                            index_map[int(entry["number"])] = entry
            except json.JSONDecodeError:
                pass

        if chapters_dir.is_dir():
            for chapter_file in chapters_dir.glob("*.md"):
                match = CHAPTER_FILE_RE.match(chapter_file.name)
                if not match:
                    continue
                number = int(match.group(1))
                title = match.group(2)
                content = chapter_file.read_text(encoding="utf-8")
                meta = index_map.get(number, {})
                chapters.append(
                    {
                        "id": f"{book_id}:{number}",
                        "bookId": book_id,
                        "number": number,
                        "title": meta.get("title", title),
                        "status": meta.get("status", "draft"),
                        "wordCount": meta.get("wordCount", len(content.replace(" ", ""))),
                        "content": content,
                        "createdAt": meta.get("createdAt"),
                        "updatedAt": meta.get("updatedAt"),
                        "auditIssues": meta.get("auditIssues", []),
                        "lengthWarnings": meta.get("lengthWarnings", []),
                        "tokenUsage": meta.get("tokenUsage"),
                    }
                )

        story_dir = book_dir / "story"
        if story_dir.is_dir():
            for story_file in story_dir.glob("*.md"):
                story_files.append(
                    {
                        "id": f"{book_id}:{story_file.name}",
                        "bookId": book_id,
                        "name": story_file.name,
                        "title": story_file.stem,
                        "content": story_file.read_text(encoding="utf-8"),
                        "updatedAt": None,
                    }
                )

    return {
        "project": project_config,
        "books": books,
        "chapters": chapters,
        "storyFiles": story_files,
        "radarScans": radar_scans,
    }


class EphemeralStudio:
    def __init__(self, workspace_dir: Path, port: int, process: subprocess.Popen[bytes]) -> None:
        self.workspace_dir = workspace_dir
        self.port = port
        self.process = process

    @property
    def base_url(self) -> str:
        return f"http://127.0.0.1:{self.port}/api/v1"

    def close(self) -> None:
        if self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=5)


def _start_ephemeral_studio(workspace_dir: Path) -> EphemeralStudio:
    if INKOS_STUDIO_ENTRY is None:
        raise RuntimeError("inkos-studio entry not found")
    port = _find_free_port()
    env = {**os.environ, "INKOS_STUDIO_PORT": str(port)}
    process = subprocess.Popen(
        ["node", str(INKOS_STUDIO_ENTRY), str(workspace_dir)],
        cwd=str(workspace_dir),
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        _wait_for_studio(port)
    except Exception:
        process.kill()
        raise
    return EphemeralStudio(workspace_dir, port, process)


async def _studio_request(studio: EphemeralStudio, method: str, path: str, payload: dict[str, Any] | None = None) -> httpx.Response:
    url = f"{studio.base_url}{path}"
    async with httpx.AsyncClient(timeout=httpx.Timeout(300.0, connect=10.0)) as client:
        return await client.request(method, url, json=payload)


def _parse_studio_error(response: httpx.Response) -> str:
    try:
        body = response.json()
        if isinstance(body, dict):
            return str(body.get("error") or body.get("detail") or body.get("message") or response.text)
    except (json.JSONDecodeError, ValueError):
        pass
    return response.text or f"InkOS Studio HTTP {response.status_code}"


async def _studio_request_json(
    studio: EphemeralStudio,
    method: str,
    path: str,
    payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    response = await _studio_request(studio, method, path, payload)
    if response.status_code >= 400:
        raise RuntimeError(_parse_studio_error(response))
    data = response.json()
    return data if isinstance(data, dict) else {"result": data}


async def execute_runtime_action(
    *,
    action: str,
    snapshot: dict[str, Any],
    params: dict[str, Any] | None = None,
    secrets: dict[str, Any] | None = None,
    llm_config: dict[str, Any] | None = None,
) -> dict[str, Any]:
    params = params or {}
    temp_root = Path(tempfile.mkdtemp(prefix="inkos-runtime-"))
    studio: EphemeralStudio | None = None
    try:
        materialize_snapshot(temp_root, snapshot, secrets=secrets, llm_config=llm_config)
        studio = _start_ephemeral_studio(temp_root)
        result: dict[str, Any] = {}

        if action == "agent":
            session_id = params.get("sessionId")
            if not isinstance(session_id, str) or not session_id:
                created = await _studio_request(
                    studio,
                    "POST",
                    "/sessions",
                    {"bookId": params.get("activeBookId")},
                )
                created.raise_for_status()
                session_id = created.json().get("session", {}).get("sessionId")
            payload = {
                "instruction": params.get("instruction"),
                "sessionId": session_id,
                "activeBookId": params.get("activeBookId"),
                "service": params.get("service"),
                "model": params.get("model"),
            }
            result["agent"] = await _studio_request_json(studio, "POST", "/agent", payload)
            if session_id:
                session_response = await _studio_request(studio, "GET", f"/sessions/{session_id}")
                if session_response.status_code == 200:
                    result["session"] = session_response.json().get("session")

        elif action == "write-next":
            book_id = params.get("bookId")
            result["writeNext"] = await _studio_request_json(
                studio,
                "POST",
                f"/books/{book_id}/write-next",
                {"wordCount": params.get("wordCount")},
            )

        elif action == "audit":
            book_id = params.get("bookId")
            chapter = params.get("chapterNumber")
            result["audit"] = await _studio_request_json(studio, "POST", f"/books/{book_id}/audit/{chapter}", {})

        elif action == "revise":
            book_id = params.get("bookId")
            chapter = params.get("chapterNumber")
            result["revise"] = await _studio_request_json(
                studio,
                "POST",
                f"/books/{book_id}/revise/{chapter}",
                {"mode": "spot-fix", "brief": params.get("brief")},
            )

        elif action == "radar":
            result["radar"] = await _studio_request_json(studio, "POST", "/radar/scan", {})

        elif action == "approve":
            book_id = params.get("bookId")
            chapter = params.get("chapterNumber")
            result["approve"] = await _studio_request_json(
                studio, "POST", f"/books/{book_id}/chapters/{chapter}/approve", {}
            )

        elif action == "reject":
            book_id = params.get("bookId")
            chapter = params.get("chapterNumber")
            result["reject"] = await _studio_request_json(
                studio, "POST", f"/books/{book_id}/chapters/{chapter}/reject", {}
            )

        elif action == "save-chapter":
            book_id = params.get("bookId")
            chapter = params.get("chapterNumber")
            result["saveChapter"] = await _studio_request_json(
                studio,
                "PUT",
                f"/books/{book_id}/chapters/{chapter}",
                {"content": params.get("content"), "title": params.get("title")},
            )
        else:
            raise ValueError(f"Unsupported runtime action: {action}")

        return {"snapshot": collect_snapshot(temp_root), "result": result}
    finally:
        if studio is not None:
            studio.close()
        shutil.rmtree(temp_root, ignore_errors=True)
