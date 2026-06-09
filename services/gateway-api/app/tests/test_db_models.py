from app.db.models import Role, RolePermission, User, UserRole


def test_user_role_models_have_expected_tablenames():
    assert User.__tablename__ == "users"
    assert Role.__tablename__ == "roles"
    assert RolePermission.__tablename__ == "role_permissions"
    assert UserRole.__tablename__ == "user_roles"
