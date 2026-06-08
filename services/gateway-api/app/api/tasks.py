from fastapi import APIRouter, Depends

from app.api.dependencies import current_user, require_permission
from app.core.permissions import has_permission
from app.models import TaskCreate, TaskPublic
from app.services.repository import UserRecord, repository
from app.services.serializers import serialize_task

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskPublic])
def list_tasks(user: UserRecord = Depends(current_user)) -> list[TaskPublic]:
    permissions = repository.user_permissions(user)
    include_all = has_permission(permissions, "task:view_all")
    if not include_all:
        require_permission(user, "task:view_own")
    return [
        serialize_task(task)
        for task in repository.list_tasks(user.id, include_all=include_all)
    ]


@router.post("", response_model=TaskPublic)
def create_task(
    payload: TaskCreate,
    user: UserRecord = Depends(current_user),
) -> TaskPublic:
    required_permission = f"{payload.module_id}:create"
    require_permission(user, required_permission)
    task = repository.create_task(
        module_id=payload.module_id,
        title=payload.title,
        payload=payload.payload,
        owner_id=user.id,
    )
    return serialize_task(task)

