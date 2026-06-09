from app.core.security import (
    create_access_token,
    decode_access_token,
    encode_access_token,
    hash_password,
    verify_password,
)


def test_password_hash_verification_round_trip():
    hashed = hash_password("Sxy-Admin-123")

    assert hashed != "Sxy-Admin-123"
    assert verify_password("Sxy-Admin-123", hashed)
    assert not verify_password("wrong-password", hashed)


def test_access_token_contains_subject_and_permissions():
    token = create_access_token(
        subject="admin",
        roles=["super_admin"],
        permissions={"*"},
    )

    assert token["sub"] == "admin"
    assert token["roles"] == ["super_admin"]
    assert token["permissions"] == ["*"]
    assert "exp" in token


def test_jwt_round_trip():
    token = encode_access_token("admin", ["super_admin"], {"*"})
    payload = decode_access_token(token)
    assert payload["sub"] == "admin"
    assert payload["roles"] == ["super_admin"]
    assert "*" in payload["permissions"]
