from __future__ import annotations

import os
from pathlib import Path


def _load_dotenv() -> None:
    for parent in Path(__file__).resolve().parents:
        env_file = parent / ".env"
        if not env_file.is_file():
            continue
        for line in env_file.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key, value = stripped.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())
        break


_load_dotenv()


def get_env(name: str, default: str | None = None) -> str:
    value = os.getenv(name, default)
    if value is None:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://root:password@127.0.0.1:3306/sxy_portal",
)
SXY_JWT_SECRET = os.getenv("SXY_JWT_SECRET", "dev-only-change-me-32chars-min!!")
SXY_JWT_EXPIRE_HOURS = int(os.getenv("SXY_JWT_EXPIRE_HOURS", "12"))
SXY_BOOTSTRAP_ADMIN_USERNAME = os.getenv("SXY_BOOTSTRAP_ADMIN_USERNAME", "admin")
SXY_BOOTSTRAP_ADMIN_PASSWORD = os.getenv("SXY_BOOTSTRAP_ADMIN_PASSWORD", "Admin@123456")
SXY_COOKIE_SECURE = os.getenv("SXY_COOKIE_SECURE", "false").lower() == "true"
AUTH_COOKIE_NAME = "sxy_access_token"
