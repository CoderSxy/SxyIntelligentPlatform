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


def test_login_sets_cookie_and_returns_user(api_client):
    response = api_client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "Admin@123456"},
    )
    assert response.status_code == 200
    assert "sxy_access_token" in response.cookies
    body = response.json()
    assert "access_token" not in body
    assert body["user"]["username"] == "admin"


def test_login_invalid_credentials_401(api_client):
    response = api_client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "wrong-password"},
    )
    assert response.status_code == 401


def test_me_requires_auth_401(api_client):
    response = api_client.get("/api/auth/me")
    assert response.status_code == 401


def test_logout_clears_cookie(api_client):
    login = api_client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "Admin@123456"},
    )
    assert login.status_code == 200
    assert "sxy_access_token" in login.cookies

    logout = api_client.post("/api/auth/logout", cookies=login.cookies)
    assert logout.status_code == 200
    assert logout.json() == {"ok": True}

    me = api_client.get("/api/auth/me", cookies=logout.cookies)
    assert me.status_code == 401
