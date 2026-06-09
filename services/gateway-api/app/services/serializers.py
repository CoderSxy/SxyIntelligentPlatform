from app.models import AccessKeyPublic, ModelConfigPublic, ScenarioBindingPublic, TaskPublic, UserPublic
from app.services.repository import (
    AccessKeyRecord,
    ModelConfigRecord,
    ScenarioBindingRecord,
    TaskRecord,
    UserRecord,
    repository,
)


def mask_secret(secret: str) -> str:
    if len(secret) <= 8:
        return "****"
    return f"{secret[:4]}...{secret[-4:]}"


def serialize_user(user: UserRecord) -> UserPublic:
    permissions = sorted(repository.user_permissions(user))
    return UserPublic(
        id=user.id,
        username=user.username,
        display_name=user.display_name,
        roles=user.roles,
        permissions=permissions,
        disabled=user.disabled,
    )


def serialize_access_key(access_key: AccessKeyRecord) -> AccessKeyPublic:
    return AccessKeyPublic(
        id=access_key.id,
        provider=access_key.provider,
        label=access_key.label,
        scope=access_key.scope,
        owner_id=access_key.owner_id,
        masked_secret=mask_secret(access_key.secret),
        base_url=access_key.base_url,
        enabled=access_key.enabled,
        created_at=access_key.created_at,
    )


def serialize_model_config(model_config: ModelConfigRecord) -> ModelConfigPublic:
    return ModelConfigPublic(
        id=model_config.id,
        provider=model_config.provider,
        model_type=model_config.model_type,
        model_name=model_config.model_name,
        display_name=model_config.display_name,
        capability=model_config.capability,
        access_key_id=model_config.access_key_id,
        default_params=model_config.default_params,
        enabled=model_config.enabled,
        created_at=model_config.created_at,
    )


def serialize_scenario_binding(binding: ScenarioBindingRecord) -> ScenarioBindingPublic:
    return ScenarioBindingPublic(
        scenario=binding.scenario,
        llm_model_id=binding.llm_model_id,
        image_model_id=binding.image_model_id,
        video_model_id=binding.video_model_id,
        updated_at=binding.updated_at,
    )


def serialize_task(task: TaskRecord) -> TaskPublic:
    return TaskPublic(
        id=task.id,
        module_id=task.module_id,
        title=task.title,
        owner_id=task.owner_id,
        status=task.status,
        payload=task.payload,
        created_at=task.created_at,
    )
