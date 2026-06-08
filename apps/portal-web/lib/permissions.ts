import { PortalModule, User } from "@/lib/types";

export const demoUser: User = {
  id: "local-admin",
  username: "admin",
  displayName: "超级管理员",
  roles: ["super_admin"],
  permissions: ["*"]
};

export const portalModules: PortalModule[] = [
  {
    id: "novel",
    name: "AI小说创作",
    description: "进入 inkos 小说工作台，管理世界观、角色、章节和导出。",
    status: "active",
    href: "/apps/novel",
    requiredPermission: "novel:view"
  },
  {
    id: "video",
    name: "AI小说转视频创作",
    description: "通过 Toonflow 链路把章节、分镜和素材转换成视频任务。",
    status: "active",
    href: "/apps/video",
    requiredPermission: "video:view"
  },
  {
    id: "xhs",
    name: "AI智能发小红书创作",
    description: "预留 XHS_ALL_IN_ONE 接入位，后期开放账号和发布能力。",
    status: "planned",
    href: "/apps/xhs",
    requiredPermission: "xhs:view"
  },
  {
    id: "moneyprinter",
    name: "智能整理发布内容视频",
    description: "预留 MoneyPrinterTurbo 接入位，后期开放内容视频流水线。",
    status: "planned",
    href: "/apps/moneyprinter",
    requiredPermission: "moneyprinter:view"
  }
];

export function hasPermission(user: User, permission: string) {
  return user.permissions.includes("*") || user.permissions.includes(permission);
}

export function visibleModules(user: User) {
  return portalModules.filter((module) => hasPermission(user, module.requiredPermission));
}

