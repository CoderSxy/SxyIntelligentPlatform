from fastapi import APIRouter, Depends

from app.api.dependencies import current_user, require_permission
from app.core.permissions import has_permission
from app.models import AccessKeyCreate, AccessKeyPublic
from app.services.repository import UserRecord, repository
from app.services.serializers import serialize_access_key

router = APIRouter(prefix="/keys", tags=["keys"])


@router.get("", response_model=list[AccessKeyPublic])
def list_keys(user: UserRecord = Depends(current_user)) -> list[AccessKeyPublic]:
    require_permission(user, "key:view")
    permissions = repository.user_permissions(user)
    include_platform = has_permission(permissions, "key:update")
    return [
        serialize_access_key(access_key)
        for access_key in repository.list_access_keys(user.id, include_platform)
    ]


@router.post("", response_model=AccessKeyPublic)
def create_key(
    payload: AccessKeyCreate,
    user: UserRecord = Depends(current_user),
) -> AccessKeyPublic:
    require_permission(user, "key:create")
    if payload.scope == "platform":
        require_permission(user, "key:update")
    access_key = repository.create_access_key(
        provider=payload.provider,
        label=payload.label,
        secret=payload.secret,
        scope=payload.scope,
        owner_id=user.id,
        base_url=payload.base_url,
        enabled=payload.enabled,
    )
    return serialize_access_key(access_key)
