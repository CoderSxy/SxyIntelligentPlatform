from fastapi import Header, HTTPException, status

from app.core.permissions import has_permission
from app.services.repository import UserRecord, repository


def current_user(x_user: str = Header(default="admin")) -> UserRecord:
    user = repository.get_user_by_username(x_user)
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

