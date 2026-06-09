import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.db.models  # noqa: F401
from app.db.config import Base
from app.db.seed import seed_roles_and_admin


@pytest.fixture()
def api_client(monkeypatch):
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    test_session_local = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    session = test_session_local()
    seed_roles_and_admin(session)
    session.close()

    monkeypatch.setattr("app.db.config.SessionLocal", test_session_local)
    monkeypatch.setattr("app.services.repository.SessionLocal", test_session_local)

    from app.main import create_app

    return TestClient(create_app())


@pytest.fixture()
def logged_in_admin_client(api_client):
    response = api_client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "Admin@123456"},
    )
    assert response.status_code == 200
    return api_client


def test_list_users_requires_auth(api_client):
    response = api_client.get("/api/admin/users")
    assert response.status_code == 401


def test_admin_can_create_user(logged_in_admin_client):
    response = logged_in_admin_client.post(
        "/api/admin/users",
        json={
            "username": "novel_user",
            "display_name": "小说用户",
            "password": "Novel@1234",
            "roles": ["novel_creator"],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["username"] == "novel_user"
    assert body["display_name"] == "小说用户"
    assert "novel_creator" in body["roles"]


def test_admin_can_list_roles(logged_in_admin_client):
    response = logged_in_admin_client.get("/api/admin/roles")
    assert response.status_code == 200
    roles = response.json()
    assert any(role["id"] == "super_admin" for role in roles)


def test_admin_can_create_custom_role(logged_in_admin_client):
    response = logged_in_admin_client.post(
        "/api/admin/roles",
        json={
            "id": "custom_editor",
            "name": "自定义编辑",
            "description": "Custom editor role",
            "permissions": ["novel:view", "novel:edit"],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == "custom_editor"
    assert "novel:view" in body["permissions"]


def test_cannot_delete_super_admin_role(logged_in_admin_client):
    response = logged_in_admin_client.delete("/api/admin/roles/super_admin")
    assert response.status_code in (400, 409)
