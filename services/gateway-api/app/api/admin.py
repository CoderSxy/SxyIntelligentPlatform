from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies import current_user, require_permission
from app.core.permissions import DEFAULT_MODULES
from app.models import (
    PermissionGroupPublic,
    ResetPasswordRequest,
    RoleCreate,
    RolePublic,
    RoleUpdate,
    UserCreate,
    UserPublic,
    UserUpdate,
)
from app.services.auth_repository import RoleRecord
from app.services.repository import UserRecord, repository
from app.services.serializers import serialize_user

router = APIRouter(prefix="/admin", tags=["admin"])


def _role_public(role: RoleRecord) -> RolePublic:
    return RolePublic(
        id=role.id,
        name=role.name,
        description=role.description,
        permissions=role.permissions,
    )


@router.get("/users", response_model=list[UserPublic])
def list_users(user: UserRecord = Depends(current_user)) -> list[UserPublic]:
    require_permission(user, "user:view")
    return [serialize_user(record) for record in repository.list_users()]


@router.post("/users", response_model=UserPublic)
def create_user(
    payload: UserCreate,
    user: UserRecord = Depends(current_user),
) -> UserPublic:
    require_permission(user, "user:create")
    try:
        created = repository.create_user(
            username=payload.username,
            display_name=payload.display_name,
            password=payload.password,
            roles=payload.roles,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from None
    return serialize_user(created)


@router.patch("/users/{user_id}", response_model=UserPublic)
def update_user(
    user_id: str,
    payload: UserUpdate,
    user: UserRecord = Depends(current_user),
) -> UserPublic:
    if payload.disabled is not None:
        require_permission(user, "user:disable")
    if payload.display_name is not None or payload.roles is not None:
        require_permission(user, "user:update")
    if (
        payload.display_name is None
        and payload.roles is None
        and payload.disabled is None
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    try:
        updated = repository.update_user(
            user_id=user_id,
            display_name=payload.display_name,
            role_ids=payload.roles,
            disabled=payload.disabled,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from None
    return serialize_user(updated)


@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    user: UserRecord = Depends(current_user),
) -> dict[str, bool]:
    require_permission(user, "user:delete")
    try:
        repository.delete_user(user_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from None
    return {"ok": True}


@router.post("/users/{user_id}/reset-password")
def reset_password(
    user_id: str,
    payload: ResetPasswordRequest,
    user: UserRecord = Depends(current_user),
) -> dict[str, bool]:
    require_permission(user, "user:update")
    try:
        repository.reset_password(user_id, payload.new_password)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from None
    return {"ok": True}


@router.get("/roles", response_model=list[RolePublic])
def list_roles(user: UserRecord = Depends(current_user)) -> list[RolePublic]:
    require_permission(user, "role:view")
    return [_role_public(role) for role in repository.list_roles()]


@router.post("/roles", response_model=RolePublic)
def create_role(
    payload: RoleCreate,
    user: UserRecord = Depends(current_user),
) -> RolePublic:
    require_permission(user, "role:create")
    try:
        role = repository.create_role(
            role_id=payload.id,
            name=payload.name,
            description=payload.description,
            permissions=payload.permissions,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from None
    return _role_public(role)


@router.patch("/roles/{role_id}", response_model=RolePublic)
def update_role(
    role_id: str,
    payload: RoleUpdate,
    user: UserRecord = Depends(current_user),
) -> RolePublic:
    require_permission(user, "role:update")
    try:
        role = repository.update_role(
            role_id=role_id,
            name=payload.name,
            description=payload.description,
            permissions=payload.permissions,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from None
    return _role_public(role)


@router.delete("/roles/{role_id}")
def delete_role(
    role_id: str,
    user: UserRecord = Depends(current_user),
) -> dict[str, bool]:
    require_permission(user, "role:delete")
    try:
        repository.delete_role(role_id)
    except ValueError as exc:
        detail = str(exc)
        status_code = (
            status.HTTP_409_CONFLICT
            if "Protected" in detail or "assigned" in detail
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(status_code=status_code, detail=detail) from None
    return {"ok": True}


@router.get("/permissions", response_model=list[PermissionGroupPublic])
def list_permissions(
    user: UserRecord = Depends(current_user),
) -> list[PermissionGroupPublic]:
    require_permission(user, "role:view")
    return [
        PermissionGroupPublic(
            module_id=module["id"],
            module_name=module["name"],
            permissions=module["permissions"],
        )
        for module in DEFAULT_MODULES
    ]
