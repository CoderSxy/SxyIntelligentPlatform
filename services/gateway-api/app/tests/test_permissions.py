from app.core.permissions import (
    DEFAULT_MODULES,
    DEFAULT_ROLES,
    SUPER_ADMIN_ROLE,
    has_permission,
    permissions_for_roles,
)


def test_default_modules_include_phase_one_apps():
    module_ids = {module["id"] for module in DEFAULT_MODULES}

    assert "novel" in module_ids
    assert "video" in module_ids
    assert "keys" in module_ids
    assert "tasks" in module_ids
    assert "xhs" in module_ids
    assert "moneyprinter" in module_ids


def test_super_admin_has_all_permissions():
    permissions = permissions_for_roles([SUPER_ADMIN_ROLE])

    assert "*" in permissions
    assert has_permission(permissions, "novel:create")
    assert has_permission(permissions, "user:disable")
    assert has_permission(permissions, "permission:assign")


def test_novel_creator_is_limited_to_novel_and_own_tasks():
    permissions = permissions_for_roles(["novel_creator"])

    assert has_permission(permissions, "novel:create")
    assert has_permission(permissions, "task:view_own")
    assert not has_permission(permissions, "video:create")
    assert not has_permission(permissions, "user:create")


def test_video_creator_is_limited_to_video_and_own_tasks():
    permissions = permissions_for_roles(["video_creator"])

    assert has_permission(permissions, "video:create")
    assert has_permission(permissions, "task:view_own")
    assert not has_permission(permissions, "novel:create")
    assert not has_permission(permissions, "role:update")


def test_unknown_roles_do_not_grant_permissions():
    permissions = permissions_for_roles(["missing_role"])

    assert permissions == set()
    assert not has_permission(permissions, "novel:view")


def test_default_roles_have_stable_ids():
    role_ids = {role["id"] for role in DEFAULT_ROLES}

    assert {
        "super_admin",
        "admin",
        "novel_creator",
        "video_creator",
        "viewer",
    }.issubset(role_ids)
