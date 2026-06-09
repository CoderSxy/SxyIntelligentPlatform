from __future__ import annotations

import os


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
