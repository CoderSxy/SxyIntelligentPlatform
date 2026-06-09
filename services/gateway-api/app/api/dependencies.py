import jwt
from fastapi import Cookie, HTTPException, status

from app.core.permissions import has_permission
from app.core.security import decode_access_token
from app.core.settings import AUTH_COOKIE_NAME
from app.services.repository import UserRecord, repository


def current_user(
    sxy_access_token: str | None = Cookie(default=None, alias=AUTH_COOKIE_NAME),
) -> UserRecord:
    if not sxy_access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    try:
        payload = decode_access_token(sxy_access_token)
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from None

    user = repository.get_user_by_id(payload["sub"])
    if user is None:
        user = repository.get_user_by_username(payload["sub"])
    if user is None or user.disabled:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid local user context",
        )
    return user


def require_permission(user: UserRecord, permission: str) -> None:
    permissions = repository.user_permissions(user)
    if not has_permission(permissions, permission):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Missing permission: {permission}",
        )
