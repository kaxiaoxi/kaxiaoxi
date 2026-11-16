# 变更记录

格式：`版本 · 日期 · 变更摘要`

## v0.3.0 · 2026-11-17

- 任务模块：发布（多场次/人数不限/定时报名/指定部门）、列表、详情、报名、取消
- 云函数新增 `task.create/list/detail/apply/cancelApply/mine`
- 报名支持先到先得与审核两种模式，满员进候补，取消后自动递补
- 首页接入真实任务数据，任务列表加「发布」入口

## v0.2.0 · 2026-11-17

- 新增登录分流：`auth.login` 按 openid 返回 new/pending/active/rejected
- 新增注册：`auth.register`，6 项校验、学号唯一、状态 pending
- 新增主席审核：`member.review`（通过/拒绝）、`member.list`
- 页面：注册表单、等待审核页、首页/我的接入真实成员数据
- 云函数拆分为 `router + actions + lib`，统一错误码

## v0.1.0 · 2026-11-17

- 初始化工程骨架：`miniprogram/`、`cloudfunctions/api|cron|init`
- 建立工程配置：`project.config.json`、ESLint、Prettier、EditorConfig
- 完成需求、技术、数据库、开发指南、代码规范、Git 规范、用户说明共 7 份文档
- 建立高保真 UI 与线框图（`design/`）
- 初始化 Git 仓库，建立 `main` / `develop` 分支
