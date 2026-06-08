from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime

from app.core.permissions import DEFAULT_MODULES, DEFAULT_ROLES, permissions_for_roles
from app.core.security import hash_password, verify_password


@dataclass
class UserRecord:
    id: str
    username: str
    display_name: str
    password_hash: str
    roles: list[str]
    disabled: bool = False


@dataclass
class AccessKeyRecord:
    id: str
    provider: str
    label: str
    secret: str
    scope: str
    owner_id: str
    base_url: str | None = None
    enabled: bool = True
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))


@dataclass
class ModelConfigRecord:
    id: str
    provider: str
    model_type: str
    model_name: str
    display_name: str
    capability: str
    access_key_id: str
    default_params: dict
    enabled: bool = True
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))


@dataclass
class ScenarioBindingRecord:
    scenario: str
    llm_model_id: str | None = None
    image_model_id: str | None = None
    video_model_id: str | None = None
    updated_at: datetime = field(default_factory=lambda: datetime.now(UTC))


@dataclass
class TaskRecord:
    id: str
    module_id: str
    title: str
    owner_id: str
    status: str
    payload: dict
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))


class InMemoryRepository:
    def __init__(self) -> None:
        self.users: dict[str, UserRecord] = {}
        self.access_keys: dict[str, AccessKeyRecord] = {}
        self.model_configs: dict[str, ModelConfigRecord] = {}
        self.scenario_bindings: dict[str, ScenarioBindingRecord] = {}
        self.tasks: dict[str, TaskRecord] = {}
        self.create_user(
            username="admin",
            display_name="超级管理员",
            password="Admin@123456",
            roles=["super_admin"],
        )

    def create_user(
        self,
        username: str,
        display_name: str,
        password: str,
        roles: list[str],
    ) -> UserRecord:
        if self.get_user_by_username(username) is not None:
            raise ValueError("username already exists")

        user = UserRecord(
            id=str(uuid.uuid4()),
            username=username,
            display_name=display_name,
            password_hash=hash_password(password),
            roles=roles,
        )
        self.users[user.id] = user
        return user

    def get_user_by_username(self, username: str) -> UserRecord | None:
        return next(
            (user for user in self.users.values() if user.username == username),
            None,
        )

    def authenticate(self, username: str, password: str) -> UserRecord | None:
        user = self.get_user_by_username(username)
        if user is None or user.disabled:
            return None
        if not verify_password(password, user.password_hash):
            return None
        return user

    def list_users(self) -> list[UserRecord]:
        return list(self.users.values())

    def list_roles(self) -> list[dict]:
        return DEFAULT_ROLES

    def list_modules(self) -> list[dict]:
        return DEFAULT_MODULES

    def user_permissions(self, user: UserRecord) -> set[str]:
        return permissions_for_roles(user.roles)

    def create_access_key(
        self,
        provider: str,
        label: str,
        secret: str,
        scope: str,
        owner_id: str,
        base_url: str | None = None,
        enabled: bool = True,
    ) -> AccessKeyRecord:
        access_key = AccessKeyRecord(
            id=str(uuid.uuid4()),
            provider=provider,
            label=label,
            secret=secret,
            scope=scope,
            owner_id=owner_id,
            base_url=base_url,
            enabled=enabled,
        )
        self.access_keys[access_key.id] = access_key
        return access_key

    def list_access_keys(self, owner_id: str, include_platform: bool) -> list[AccessKeyRecord]:
        return [
            access_key
            for access_key in self.access_keys.values()
            if access_key.owner_id == owner_id
            or (include_platform and access_key.scope == "platform")
        ]

    def create_model_config(
        self,
        provider: str,
        model_type: str,
        model_name: str,
        display_name: str,
        capability: str,
        access_key_id: str,
        default_params: dict,
        enabled: bool = True,
    ) -> ModelConfigRecord:
        if access_key_id not in self.access_keys:
            raise ValueError("access key does not exist")

        model_config = ModelConfigRecord(
            id=str(uuid.uuid4()),
            provider=provider,
            model_type=model_type,
            model_name=model_name,
            display_name=display_name,
            capability=capability,
            access_key_id=access_key_id,
            default_params=default_params,
            enabled=enabled,
        )
        self.model_configs[model_config.id] = model_config
        return model_config

    def list_model_configs(self) -> list[ModelConfigRecord]:
        return list(self.model_configs.values())

    def get_model_config(self, model_config_id: str | None) -> ModelConfigRecord | None:
        if model_config_id is None:
            return None
        return self.model_configs.get(model_config_id)

    def upsert_scenario_binding(
        self,
        scenario: str,
        llm_model_id: str | None,
        image_model_id: str | None,
        video_model_id: str | None,
    ) -> ScenarioBindingRecord:
        for model_id in [llm_model_id, image_model_id, video_model_id]:
            if model_id is not None and model_id not in self.model_configs:
                raise ValueError("model config does not exist")

        binding = ScenarioBindingRecord(
            scenario=scenario,
            llm_model_id=llm_model_id,
            image_model_id=image_model_id,
            video_model_id=video_model_id,
        )
        self.scenario_bindings[scenario] = binding
        return binding

    def get_scenario_binding(self, scenario: str) -> ScenarioBindingRecord | None:
        return self.scenario_bindings.get(scenario)

    def list_scenario_bindings(self) -> list[ScenarioBindingRecord]:
        return list(self.scenario_bindings.values())

    def create_task(
        self,
        module_id: str,
        title: str,
        payload: dict,
        owner_id: str,
    ) -> TaskRecord:
        task = TaskRecord(
            id=str(uuid.uuid4()),
            module_id=module_id,
            title=title,
            owner_id=owner_id,
            status="queued",
            payload=payload,
        )
        self.tasks[task.id] = task
        return task

    def list_tasks(self, owner_id: str, include_all: bool) -> list[TaskRecord]:
        if include_all:
            return list(self.tasks.values())
        return [task for task in self.tasks.values() if task.owner_id == owner_id]


repository = InMemoryRepository()
