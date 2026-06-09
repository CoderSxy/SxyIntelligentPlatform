from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.permissions import DEFAULT_MODULES
from app.core.security import hash_password, verify_password
from app.db.models import Role, RolePermission, User, UserRole
from app.services.repository import UserRecord


@dataclass
class RoleRecord:
    id: str
    name: str
    description: str
    permissions: list[str]
    is_protected: bool = False


def _permission_catalog() -> set[str]:
    codes: set[str] = set()
    for module in DEFAULT_MODULES:
        codes.update(module["permissions"])
    return codes


def _validate_permission_codes(permissions: list[str]) -> None:
    catalog = _permission_catalog()
    invalid = [code for code in permissions if code != "*" and code not in catalog]
    if invalid:
        raise ValueError(f"Invalid permission codes: {', '.join(invalid)}")


def _user_to_record(user: User) -> UserRecord:
    return UserRecord(
        id=user.id,
        username=user.username,
        display_name=user.display_name,
        password_hash=user.password_hash,
        roles=[role.id for role in user.roles],
        disabled=user.disabled,
    )


def _role_to_record(role: Role) -> RoleRecord:
    return RoleRecord(
        id=role.id,
        name=role.name,
        description=role.description,
        permissions=[perm.permission_code for perm in role.permissions],
        is_protected=role.is_protected,
    )


class AuthRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def authenticate(self, username: str, password: str) -> UserRecord | None:
        user = self.get_user_by_username(username)
        if user is None or user.disabled:
            return None
        if not verify_password(password, user.password_hash):
            return None
        return user

    def get_user_by_username(self, username: str) -> UserRecord | None:
        user = self._session.scalar(select(User).where(User.username == username))
        if user is None:
            return None
        return _user_to_record(user)

    def get_user_by_id(self, user_id: str) -> UserRecord | None:
        user = self._session.get(User, user_id)
        if user is None:
            return None
        return _user_to_record(user)

    def list_users(self) -> list[UserRecord]:
        users = self._session.scalars(select(User)).all()
        return [_user_to_record(user) for user in users]

    def create_user(
        self,
        username: str,
        display_name: str,
        password: str,
        roles: list[str],
    ) -> UserRecord:
        if self.get_user_by_username(username) is not None:
            raise ValueError("username already exists")

        for role_id in roles:
            if self._session.get(Role, role_id) is None:
                raise ValueError(f"role does not exist: {role_id}")

        user = User(
            username=username,
            display_name=display_name,
            password_hash=hash_password(password),
        )
        self._session.add(user)
        self._session.flush()

        for role_id in roles:
            self._session.add(UserRole(user_id=user.id, role_id=role_id))

        self._session.commit()
        self._session.refresh(user)
        return _user_to_record(user)

    def update_user(
        self,
        user_id: str,
        display_name: str | None = None,
        role_ids: list[str] | None = None,
        disabled: bool | None = None,
    ) -> UserRecord:
        user = self._session.get(User, user_id)
        if user is None:
            raise ValueError("user does not exist")

        if disabled is True and user.is_protected:
            raise ValueError("Protected user cannot be disabled")

        if display_name is not None:
            user.display_name = display_name

        if disabled is not None:
            user.disabled = disabled

        if role_ids is not None:
            for role_id in role_ids:
                if self._session.get(Role, role_id) is None:
                    raise ValueError(f"role does not exist: {role_id}")

            self._session.execute(delete(UserRole).where(UserRole.user_id == user_id))
            for role_id in role_ids:
                self._session.add(UserRole(user_id=user_id, role_id=role_id))

        self._session.commit()
        self._session.refresh(user)
        return _user_to_record(user)

    def delete_user(self, user_id: str) -> None:
        user = self._session.get(User, user_id)
        if user is None:
            raise ValueError("user does not exist")
        if user.is_protected:
            raise ValueError("Protected user cannot be deleted")

        self._session.delete(user)
        self._session.commit()

    def reset_password(self, user_id: str, new_password: str) -> None:
        user = self._session.get(User, user_id)
        if user is None:
            raise ValueError("user does not exist")

        user.password_hash = hash_password(new_password)
        self._session.commit()

    def change_password(self, user_id: str, old_password: str, new_password: str) -> None:
        user = self._session.get(User, user_id)
        if user is None:
            raise ValueError("user does not exist")
        if not verify_password(old_password, user.password_hash):
            raise ValueError("incorrect password")

        user.password_hash = hash_password(new_password)
        self._session.commit()

    def list_roles(self) -> list[RoleRecord]:
        roles = self._session.scalars(select(Role)).all()
        return [_role_to_record(role) for role in roles]

    def get_role(self, role_id: str) -> RoleRecord | None:
        role = self._session.get(Role, role_id)
        if role is None:
            return None
        return _role_to_record(role)

    def create_role(
        self,
        role_id: str,
        name: str,
        description: str,
        permissions: list[str],
    ) -> RoleRecord:
        if self._session.get(Role, role_id) is not None:
            raise ValueError("role already exists")

        _validate_permission_codes(permissions)

        role = Role(id=role_id, name=name, description=description)
        self._session.add(role)
        self._session.flush()

        for code in permissions:
            self._session.add(RolePermission(role_id=role.id, permission_code=code))

        self._session.commit()
        self._session.refresh(role)
        return _role_to_record(role)

    def update_role(
        self,
        role_id: str,
        name: str | None = None,
        description: str | None = None,
        permissions: list[str] | None = None,
    ) -> RoleRecord:
        role = self._session.get(Role, role_id)
        if role is None:
            raise ValueError("role does not exist")

        if name is not None:
            role.name = name
        if description is not None:
            role.description = description

        if permissions is not None:
            _validate_permission_codes(permissions)
            self._session.execute(
                delete(RolePermission).where(RolePermission.role_id == role_id)
            )
            for code in permissions:
                self._session.add(RolePermission(role_id=role_id, permission_code=code))

        self._session.commit()
        self._session.refresh(role)
        return _role_to_record(role)

    def delete_role(self, role_id: str) -> None:
        role = self._session.get(Role, role_id)
        if role is None:
            raise ValueError("role does not exist")
        if self.count_users_for_role(role_id) > 0:
            raise ValueError("role is assigned to users")
        if role.is_protected:
            raise ValueError("Protected role cannot be deleted")

        self._session.delete(role)
        self._session.commit()

    def user_permissions(self, user: UserRecord) -> set[str]:
        if not user.roles:
            return set()

        permissions: set[str] = set()
        rows = self._session.scalars(
            select(RolePermission.permission_code).where(
                RolePermission.role_id.in_(user.roles)
            )
        ).all()
        permissions.update(rows)
        return permissions

    def count_users_for_role(self, role_id: str) -> int:
        return self._session.scalar(
            select(func.count()).select_from(UserRole).where(UserRole.role_id == role_id)
        ) or 0
