from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.permissions import DEFAULT_ROLES
from app.core.security import hash_password
from app.core.settings import SXY_BOOTSTRAP_ADMIN_PASSWORD, SXY_BOOTSTRAP_ADMIN_USERNAME
from app.db.models import Role, RolePermission, User, UserRole


def seed_roles_and_admin(session: Session) -> None:
    for role_data in DEFAULT_ROLES:
        existing = session.get(Role, role_data["id"])
        if existing is None:
            role = Role(
                id=role_data["id"],
                name=role_data["name"],
                description=role_data["description"],
                is_protected=role_data["id"] == "super_admin",
            )
            session.add(role)
            session.flush()
            for code in role_data["permissions"]:
                session.add(RolePermission(role_id=role.id, permission_code=code))
        else:
            role = existing

    session.flush()

    admin = session.scalar(
        select(User).where(User.username == SXY_BOOTSTRAP_ADMIN_USERNAME)
    )
    if admin is None:
        admin = User(
            username=SXY_BOOTSTRAP_ADMIN_USERNAME,
            display_name="超级管理员",
            password_hash=hash_password(SXY_BOOTSTRAP_ADMIN_PASSWORD),
            is_protected=True,
        )
        session.add(admin)
        session.flush()
        session.add(UserRole(user_id=admin.id, role_id="super_admin"))

    session.commit()
