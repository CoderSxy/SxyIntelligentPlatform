from fastapi import APIRouter, Depends

from app.api.dependencies import current_user, require_permission
from app.models import RolePublic, UserCreate, UserPublic
from app.services.repository import UserRecord, repository
from app.services.serializers import serialize_user

router = APIRouter(prefix="/admin", tags=["admin"])


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
    created = repository.create_user(
        username=payload.username,
        display_name=payload.display_name,
        password=payload.password,
        roles=payload.roles,
    )
    return serialize_user(created)


@router.get("/roles", response_model=list[RolePublic])
def list_roles(user: UserRecord = Depends(current_user)) -> list[RolePublic]:
    require_permission(user, "role:view")
    return [RolePublic(**role) for role in repository.list_roles()]

