from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api import admin, auth, keys, model_configs, modules, novel, tasks
from app.services.inkos_studio import start_studio_process
from app.db.config import SessionLocal
from app.db.seed import seed_roles_and_admin


def create_app() -> FastAPI:
    app = FastAPI(
        title="Sxy Intelligent Platform Gateway",
        version="0.1.0",
        description="Local API gateway for AI portal modules, RBAC, keys, and tasks.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://127.0.0.1:3012", "http://localhost:3012"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    def on_startup() -> None:
        session = SessionLocal()
        try:
            seed_roles_and_admin(session)
        finally:
            session.close()
        try:
            start_studio_process()
        except Exception:
            # Studio can be started manually; novel routes will retry on demand.
            pass

    @app.get("/api/health")
    def health() -> dict[str, str]:
        session = SessionLocal()
        try:
            session.execute(text("SELECT 1"))
        except Exception:
            raise HTTPException(status_code=503, detail="Database unavailable")
        finally:
            session.close()
        return {"status": "ok"}

    app.include_router(auth.router, prefix="/api")
    app.include_router(modules.router, prefix="/api")
    app.include_router(keys.router, prefix="/api")
    app.include_router(model_configs.router, prefix="/api")
    app.include_router(tasks.router, prefix="/api")
    app.include_router(admin.router, prefix="/api")
    app.include_router(novel.router, prefix="/api")
    return app


app = create_app()
