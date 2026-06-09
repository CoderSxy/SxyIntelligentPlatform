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
    monkeypatch.setattr(
        "app.services.inkos_studio.studio_status",
        lambda: {
            "reachable": True,
            "managedProcess": False,
            "projectName": "portal-novel",
            "activeStudioProject": "portal-novel",
            "projectMatched": True,
            "studioUrl": "http://127.0.0.1:4568",
            "autoStart": False,
            "storageMode": "indexeddb",
        },
    )

    from app.main import create_app

    return TestClient(create_app())


def _login(client: TestClient) -> None:
    response = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "Admin@123456"},
    )
    assert response.status_code == 200


def test_novel_status_requires_auth(api_client):
    response = api_client.get("/api/novel/status")
    assert response.status_code == 401


def test_novel_status_ok(api_client):
    _login(api_client)
    response = api_client.get("/api/novel/status")
    assert response.status_code == 200
    body = response.json()
    assert body["reachable"] is True
    assert body.get("projectMatched") is True


def test_novel_proxy_requires_permission(api_client, monkeypatch):
    _login(api_client)

    class FakeResponse:
        status_code = 200
        content = b'{"books":[]}'
        headers = {"content-type": "application/json"}

    async def fake_proxy(**_kwargs):
        return FakeResponse()

    monkeypatch.setattr("app.api.novel.proxy_request", fake_proxy)

    response = api_client.get("/api/novel/v1/books")
    assert response.status_code == 200
    assert response.json() == {"books": []}
