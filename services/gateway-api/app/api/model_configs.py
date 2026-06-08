from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import current_user, require_permission
from app.core.model_catalog import DEFAULT_MODEL_PROVIDERS, DEFAULT_SCENARIOS
from app.models import (
    ModelConfigCreate,
    ModelConfigPublic,
    ModelProviderPublic,
    ScenarioBindingCreate,
    ScenarioBindingPublic,
    ScenarioPublic,
)
from app.services.repository import UserRecord, repository
from app.services.serializers import serialize_model_config, serialize_scenario_binding

router = APIRouter(prefix="/model-configs", tags=["model-configs"])


@router.get("/providers", response_model=list[ModelProviderPublic])
def list_model_providers(user: UserRecord = Depends(current_user)) -> list[ModelProviderPublic]:
    require_permission(user, "key:view")
    return [ModelProviderPublic(**provider) for provider in DEFAULT_MODEL_PROVIDERS]


@router.get("/scenarios", response_model=list[ScenarioPublic])
def list_scenarios(user: UserRecord = Depends(current_user)) -> list[ScenarioPublic]:
    require_permission(user, "key:view")
    return [ScenarioPublic(**scenario) for scenario in DEFAULT_SCENARIOS]


@router.get("", response_model=list[ModelConfigPublic])
def list_model_configs(user: UserRecord = Depends(current_user)) -> list[ModelConfigPublic]:
    require_permission(user, "key:view")
    return [serialize_model_config(config) for config in repository.list_model_configs()]


@router.post("", response_model=ModelConfigPublic)
def create_model_config(
    payload: ModelConfigCreate,
    user: UserRecord = Depends(current_user),
) -> ModelConfigPublic:
    require_permission(user, "key:create")
    try:
        model_config = repository.create_model_config(
            provider=payload.provider,
            model_type=payload.model_type,
            model_name=payload.model_name,
            display_name=payload.display_name,
            capability=payload.capability,
            access_key_id=payload.access_key_id,
            default_params=payload.default_params,
            enabled=payload.enabled,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return serialize_model_config(model_config)


@router.get("/scenario-bindings", response_model=list[ScenarioBindingPublic])
def list_scenario_bindings(user: UserRecord = Depends(current_user)) -> list[ScenarioBindingPublic]:
    require_permission(user, "key:view")
    return [
        serialize_scenario_binding(binding)
        for binding in repository.list_scenario_bindings()
    ]


@router.post("/scenario-bindings", response_model=ScenarioBindingPublic)
def upsert_scenario_binding(
    payload: ScenarioBindingCreate,
    user: UserRecord = Depends(current_user),
) -> ScenarioBindingPublic:
    require_permission(user, "key:update")
    try:
        binding = repository.upsert_scenario_binding(
            scenario=payload.scenario,
            llm_model_id=payload.llm_model_id,
            image_model_id=payload.image_model_id,
            video_model_id=payload.video_model_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return serialize_scenario_binding(binding)
