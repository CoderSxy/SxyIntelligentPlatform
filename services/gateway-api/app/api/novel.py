from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from starlette.requests import ClientDisconnect

from app.api.dependencies import current_user, require_permission
from app.core.inkos_settings import INKOS_NOVEL_STORAGE
from app.core.permissions import has_permission
from app.services.inkos_runtime import execute_runtime_action
from app.services.inkos_studio import ensure_studio_running, proxy_request, proxy_sse, studio_status
from app.services.repository import UserRecord

router = APIRouter(prefix="/novel", tags=["novel"])


def _required_permission(method: str, path: str) -> str:
    normalized = path.strip("/")
    if method == "GET":
        if normalized.endswith("/export") or normalized.startswith("books/") and "/export" in normalized:
            return "novel:export"
        return "novel:view"
    if method == "DELETE":
        return "novel:delete"
    if "export-save" in normalized:
        return "novel:export"
    if normalized == "books/create" or normalized.endswith("/create"):
        return "novel:create"
    return "novel:edit"


def _authorize(user: UserRecord, permission: str) -> None:
    from app.services.repository import repository

    permissions = repository.user_permissions(user)
    if has_permission(permissions, permission):
        return
    if permission == "novel:edit" and has_permission(permissions, "novel:create"):
        return
    require_permission(user, permission)


class RuntimeExecutePayload(BaseModel):
    action: str
    snapshot: dict[str, Any] = Field(default_factory=dict)
    params: dict[str, Any] = Field(default_factory=dict)
    secrets: dict[str, Any] | None = None
    llm: dict[str, Any] | None = None


@router.get("/status")
def novel_status(user: UserRecord = Depends(current_user)) -> dict[str, object]:
    require_permission(user, "novel:view")
    return studio_status()


@router.post("/v1/runtime/execute")
async def runtime_execute(payload: RuntimeExecutePayload, user: UserRecord = Depends(current_user)) -> dict[str, object]:
    _authorize(user, "novel:edit")
    if INKOS_NOVEL_STORAGE != "indexeddb":
        raise HTTPException(status_code=400, detail="Runtime execute is only enabled for indexeddb storage mode")
    try:
        return await execute_runtime_action(
            action=payload.action,
            snapshot=payload.snapshot,
            params=payload.params,
            secrets=payload.secrets,
            llm_config=payload.llm,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@router.api_route("/v1/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_novel_v1(path: str, request: Request, user: UserRecord = Depends(current_user)):
    permission = _required_permission(request.method, path)
    _authorize(user, permission)

    try:
        body = await request.body()
    except ClientDisconnect:
        return Response(status_code=499)

    query = request.url.query

    if path == "events" and request.method == "GET":
        try:
            ensure_studio_running()
        except RuntimeError as error:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error
        return StreamingResponse(
            proxy_sse("/events", query),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        )

    try:
        upstream = await proxy_request(
            method=request.method,
            path=f"/{path}",
            query=query,
            headers=dict(request.headers),
            body=body if body else None,
        )
    except RuntimeError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"InkOS Studio proxy failed: {error}",
        ) from error

    excluded_headers = {"content-encoding", "content-length", "transfer-encoding", "connection"}
    response_headers = {
        key: value
        for key, value in upstream.headers.items()
        if key.lower() not in excluded_headers
    }

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=response_headers,
        media_type=upstream.headers.get("content-type"),
    )
