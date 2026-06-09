from __future__ import annotations

from fastapi import Response

from app.core.settings import AUTH_COOKIE_NAME, SXY_COOKIE_SECURE, SXY_JWT_EXPIRE_HOURS


def set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=SXY_COOKIE_SECURE,
        max_age=SXY_JWT_EXPIRE_HOURS * 3600,
        path="/",
    )


def clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(key=AUTH_COOKIE_NAME, path="/")
