from fastapi import APIRouter, Depends

from app.api.dependencies import current_user
from app.core.permissions import has_permission
from app.models import ModulePublic
from app.services.repository import UserRecord, repository

router = APIRouter(prefix="/modules", tags=["modules"])


@router.get("", response_model=list[ModulePublic])
def list_modules() -> list[ModulePublic]:
    return [ModulePublic(**module) for module in repository.list_modules()]


@router.get("/my", response_model=list[ModulePublic])
def list_my_modules(user: UserRecord = Depends(current_user)) -> list[ModulePublic]:
    permissions = repository.user_permissions(user)
    modules = []
    for module in repository.list_modules():
        if any(has_permission(permissions, permission) for permission in module["permissions"]):
            modules.append(ModulePublic(**module))
    return modules

