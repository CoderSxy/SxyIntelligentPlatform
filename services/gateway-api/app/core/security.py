from __future__ import annotations

import base64
import hashlib
import hmac
import os
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt

from app.core.settings import SXY_JWT_EXPIRE_HOURS, SXY_JWT_SECRET

JWT_ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 120_000)
    return "pbkdf2_sha256$120000${}${}".format(
        base64.b64encode(salt).decode(),
        base64.b64encode(digest).decode(),
    )


def verify_password(password: str, password_hash: str) -> bool:
    try:
        algorithm, rounds, salt_text, digest_text = password_hash.split("$", 3)
    except ValueError:
        return False

    if algorithm != "pbkdf2_sha256":
        return False

    salt = base64.b64decode(salt_text)
    expected_digest = base64.b64decode(digest_text)
    actual_digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode(),
        salt,
        int(rounds),
    )
    return hmac.compare_digest(actual_digest, expected_digest)


def create_access_token(
    subject: str,
    roles: list[str],
    permissions: set[str],
    expires_delta: timedelta | None = None,
) -> dict[str, Any]:
    expires_at = datetime.now(UTC) + (expires_delta or timedelta(hours=12))
    return {
        "sub": subject,
        "roles": roles,
        "permissions": sorted(permissions),
        "exp": int(expires_at.timestamp()),
    }


def encode_access_token(
    subject: str,
    roles: list[str],
    permissions: set[str],
) -> str:
    payload = create_access_token(
        subject,
        roles,
        permissions,
        expires_delta=timedelta(hours=SXY_JWT_EXPIRE_HOURS),
    )
    return jwt.encode(payload, SXY_JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, SXY_JWT_SECRET, algorithms=[JWT_ALGORITHM])
