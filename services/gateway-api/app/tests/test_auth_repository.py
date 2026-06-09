import pytest


def test_authenticate_admin(db_session):
    from app.services.auth_repository import AuthRepository

    repo = AuthRepository(db_session)
    user = repo.authenticate("admin", "Admin@123456")
    assert user is not None
    assert "super_admin" in user.roles


def test_cannot_delete_protected_admin(db_session):
    from app.services.auth_repository import AuthRepository

    repo = AuthRepository(db_session)
    admin = repo.get_user_by_username("admin")
    with pytest.raises(ValueError, match="Protected"):
        repo.delete_user(admin.id)


def test_cannot_delete_role_with_users(db_session):
    from app.services.auth_repository import AuthRepository

    repo = AuthRepository(db_session)
    with pytest.raises(ValueError, match="assigned"):
        repo.delete_role("super_admin")
