# 卡小西 · 广工影协指南

> 影协内部协作小程序：任务派发、报名与候补、请假递补、活动提醒、影协年历、部门待办、二课时长汇总。

## 当前阶段

**MVP 功能完整**（v1.0.0，待提审）

- 需求 / 技术 / 数据库设计已冻结
- 高保真 UI 22 页完成
- 小程序骨架、云函数骨架、ESLint/Prettier、Git 分支已配置
- 20 个页面、39 个云函数 action 全部完成

## 文档

| 文档 | 内容 | 版本 |
|---|---|---|
| [docs/01-需求与设计.md](./docs/01-需求与设计.md) | 组织与权限、任务/报名/候补/请假/二课规则、页面清单、验收 | v0.7 |
| [docs/02-技术方案.md](./docs/02-技术方案.md) | 架构、工程结构、API、事务递补、定时任务、订阅消息、排期 | v0.7 |
| [docs/03-数据库设计.md](./docs/03-数据库设计.md) | **数据库字典**：10 张表的字段/类型/必填/示例、枚举、索引 | v0.3 |
| [docs/04-开发与协作指南.md](./docs/04-开发与协作指南.md) | **配置 + 分支 + 提交 + 用 AI 写代码的流程** | v2.0 |
| [docs/05-代码规范.md](./docs/05-代码规范.md) | **强制规范**：命名、JS/WXML/WXSS、云函数、数据库、安全、AI 规则 | v1.0 |
| [docs/07-用户使用说明.md](./docs/07-用户使用说明.md) | 给成员/部长/主席的操作手册 | v1.0 |
| [AGENTS.md](./AGENTS.md) | 给 AI 编码助手的硬性约束 | — |
| [docs/CHANGELOG.md](./docs/CHANGELOG.md) | 变更记录 | — |

## 设计

| 目录 | 内容 |
|---|---|
| [design/ui/](./design/ui/) | 高保真 UI 22 页（iOS 风格）+ 可交互 HTML |
| [design/wireframe/](./design/wireframe/) | 灰度线框图 22 页 |
| [assets/design/](./assets/design/) | 卡小西 IP 素材与取色板 |

## 工程结构

```
kaxiaoxi/
├── miniprogram/            # 小程序端（原生）
│   ├── pages/              # launch / home / task / calendar / mine
│   ├── services/api.js     # 云函数统一调用
│   ├── utils/              # 纯函数
│   └── styles/             # 全局变量
├── cloudfunctions/
│   ├── api/                # 单入口路由
│   ├── cron/               # 定时任务
│   └── init/               # 一次性初始化
├── docs/                   # 全部文档
├── design/                 # 设计稿
└── assets/design/          # IP 素材
```

## 快速开始

```bash
npm install                                        # 安装 lint 工具
npm run check                                      # 代码检查
```

用微信开发者工具导入仓库根目录（AppID 与云环境已配置好），右键三个云函数「上传并部署」，再执行一次 `init` 云函数。

## Git

- 远程：Gitee 私有仓库
- 默认分支 `main`（可发布），集成分支 `develop`
- 功能分支 `feature/<模块>-<简述>`，修复 `fix/<问题>`
- 提交格式 `type(scope): subject`

## 下一步

1. 接入 `auth.login` 真实逻辑（members 集合 + 审核状态）
2. 任务模块：发布 / 列表 / 详情 / 报名 / 候补
3. 请假与递补（事务）
4. 二课实时统计与导出

