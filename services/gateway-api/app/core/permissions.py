SUPER_ADMIN_ROLE = "super_admin"

DEFAULT_MODULES = [
    {
        "id": "novel",
        "name": "AI小说创作",
        "description": "接入 inkos 小说工作台和可视化管理。",
        "status": "active",
        "permissions": [
            "novel:view",
            "novel:create",
            "novel:edit",
            "novel:delete",
            "novel:export",
        ],
    },
    {
        "id": "video",
        "name": "AI小说转视频创作",
        "description": "接入 Toonflow-web 和 Toonflow-app 视频生成链路。",
        "status": "active",
        "permissions": [
            "video:view",
            "video:create",
            "video:cancel",
            "video:download",
            "video:delete",
        ],
    },
    {
        "id": "keys",
        "name": "AccessKey管理",
        "description": "统一管理本地 AI 服务密钥和平台服务凭据。",
        "status": "active",
        "permissions": [
            "key:view",
            "key:create",
            "key:update",
            "key:delete",
        ],
    },
    {
        "id": "tasks",
        "name": "任务中心",
        "description": "统一查看小说、视频和后续发布任务。",
        "status": "active",
        "permissions": [
            "task:view_own",
            "task:view_all",
            "task:cancel_own",
            "task:cancel_any",
        ],
    },
    {
        "id": "admin",
        "name": "系统管理",
        "description": "管理用户、角色、模块权限和审计记录。",
        "status": "active",
        "permissions": [
            "user:view",
            "user:create",
            "user:update",
            "user:disable",
            "user:delete",
            "role:view",
            "role:create",
            "role:update",
            "role:delete",
            "permission:assign",
        ],
    },
    {
        "id": "xhs",
        "name": "AI智能发小红书创作",
        "description": "预留 XHS_ALL_IN_ONE 后期接入口。",
        "status": "planned",
        "permissions": [
            "xhs:view",
            "xhs:create",
            "xhs:publish",
        ],
    },
    {
        "id": "moneyprinter",
        "name": "智能整理发布内容视频",
        "description": "预留 MoneyPrinterTurbo 后期接入口。",
        "status": "planned",
        "permissions": [
            "moneyprinter:view",
            "moneyprinter:create",
            "moneyprinter:publish",
        ],
    },
]

DEFAULT_ROLES = [
    {
        "id": SUPER_ADMIN_ROLE,
        "name": "超级管理员",
        "description": "拥有平台所有权限。",
        "permissions": ["*"],
    },
    {
        "id": "admin",
        "name": "普通管理员",
        "description": "管理用户、任务、模块和密钥，不可越权修改超级管理员。",
        "permissions": [
            "user:view",
            "user:create",
            "user:update",
            "user:disable",
            "role:view",
            "permission:assign",
            "key:view",
            "key:create",
            "key:update",
            "key:delete",
            "task:view_all",
            "task:cancel_any",
        ],
    },
    {
        "id": "novel_creator",
        "name": "AI小说创作用户",
        "description": "可使用 AI 小说创作能力。",
        "permissions": [
            "novel:view",
            "novel:create",
            "novel:edit",
            "novel:export",
            "task:view_own",
            "task:cancel_own",
            "key:view",
        ],
    },
    {
        "id": "video_creator",
        "name": "AI小说转视频用户",
        "description": "可使用 AI 小说转视频创作能力。",
        "permissions": [
            "video:view",
            "video:create",
            "video:cancel",
            "video:download",
            "task:view_own",
            "task:cancel_own",
            "key:view",
        ],
    },
    {
        "id": "viewer",
        "name": "只读用户",
        "description": "只能查看自己被授权的内容。",
        "permissions": [
            "novel:view",
            "video:view",
            "task:view_own",
        ],
    },
]


def permissions_for_roles(role_ids: list[str]) -> set[str]:
    roles_by_id = {role["id"]: role for role in DEFAULT_ROLES}
    permissions: set[str] = set()

    for role_id in role_ids:
        role = roles_by_id.get(role_id)
        if role is None:
            continue
        permissions.update(role["permissions"])

    return permissions


def has_permission(permissions: set[str], required_permission: str) -> bool:
    return "*" in permissions or required_permission in permissions
