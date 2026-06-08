from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, auth, keys, model_configs, modules, tasks


def create_app() -> FastAPI:
    app = FastAPI(
        title="Sxy Intelligent Platform Gateway",
        version="0.1.0",
        description="Local API gateway for AI portal modules, RBAC, keys, and tasks.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://127.0.0.1:3000", "http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(auth.router, prefix="/api")
    app.include_router(modules.router, prefix="/api")
    app.include_router(keys.router, prefix="/api")
    app.include_router(model_configs.router, prefix="/api")
    app.include_router(tasks.router, prefix="/api")
    app.include_router(admin.router, prefix="/api")
    return app


app = create_app()
