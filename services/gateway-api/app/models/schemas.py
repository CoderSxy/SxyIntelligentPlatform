from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class UserPublic(BaseModel):
    id: str
    username: str
    display_name: str
    roles: list[str]
    permissions: list[str]
    disabled: bool = False


class LoginResponse(BaseModel):
    user: UserPublic


class ChangePasswordRequest(BaseModel):
    old_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8)


class UserCreate(BaseModel):
    username: str = Field(min_length=2)
    display_name: str = Field(min_length=1)
    password: str = Field(min_length=8)
    roles: list[str] = Field(default_factory=list)


class UserUpdate(BaseModel):
    display_name: str | None = None
    roles: list[str] | None = None
    disabled: bool | None = None


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=8)


class RolePublic(BaseModel):
    id: str
    name: str
    description: str
    permissions: list[str]


class RoleCreate(BaseModel):
    id: str = Field(min_length=2, pattern=r"^[a-z][a-z0-9_]*$")
    name: str = Field(min_length=1)
    description: str = ""
    permissions: list[str] = Field(default_factory=list)


class RoleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    permissions: list[str] | None = None


class PermissionGroupPublic(BaseModel):
    module_id: str
    module_name: str
    permissions: list[str]


class ModulePublic(BaseModel):
    id: str
    name: str
    description: str
    status: Literal["active", "planned"]
    permissions: list[str]


class AccessKeyCreate(BaseModel):
    provider: str = Field(min_length=1)
    label: str = Field(min_length=1)
    secret: str = Field(min_length=1)
    scope: Literal["personal", "platform"] = "personal"
    base_url: str | None = None
    enabled: bool = True


class AccessKeyPublic(BaseModel):
    id: str
    provider: str
    label: str
    scope: Literal["personal", "platform"]
    owner_id: str
    masked_secret: str
    base_url: str | None = None
    enabled: bool = True
    created_at: datetime


ModelType = Literal["llm", "image", "video"]
ModelCapability = Literal[
    "novel_writing",
    "storyboard",
    "prompt_generation",
    "image_generation",
    "video_generation",
]
ScenarioId = Literal["novel_creation", "novel_to_video"]


class ModelProviderPublic(BaseModel):
    id: str
    name: str
    model_types: list[ModelType]
    base_url: str
    recommended_models: list[str]


class ScenarioPublic(BaseModel):
    id: ScenarioId
    name: str
    description: str
    required_model_types: list[ModelType]
    optional_model_types: list[ModelType]


class ModelConfigCreate(BaseModel):
    provider: str = Field(min_length=1)
    model_type: ModelType
    model_name: str = Field(min_length=1)
    display_name: str = Field(min_length=1)
    capability: ModelCapability
    access_key_id: str = Field(min_length=1)
    default_params: dict = Field(default_factory=dict)
    enabled: bool = True


class ModelConfigPublic(BaseModel):
    id: str
    provider: str
    model_type: ModelType
    model_name: str
    display_name: str
    capability: ModelCapability
    access_key_id: str
    default_params: dict
    enabled: bool
    created_at: datetime


class ScenarioBindingCreate(BaseModel):
    scenario: ScenarioId
    llm_model_id: str | None = None
    image_model_id: str | None = None
    video_model_id: str | None = None


class ScenarioBindingPublic(BaseModel):
    scenario: ScenarioId
    llm_model_id: str | None = None
    image_model_id: str | None = None
    video_model_id: str | None = None
    updated_at: datetime


class TaskCreate(BaseModel):
    module_id: str
    title: str = Field(min_length=1)
    payload: dict = Field(default_factory=dict)


class TaskPublic(BaseModel):
    id: str
    module_id: str
    title: str
    owner_id: str
    status: Literal["queued", "running", "succeeded", "failed", "cancelled"]
    payload: dict
    created_at: datetime
