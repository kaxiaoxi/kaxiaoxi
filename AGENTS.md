# AGENTS.md

本文件是「卡小西」微信小程序仓库对 AI 编码助手的入口约束。人类开发者同样适用。

## 项目

- 形态：微信小程序（原生）+ 微信云开发
- 工程根目录：本文件所在目录
- 端：仅微信小程序，无 H5、无 App、无网页后台
- 范围：影协内部工具，不做对外开放、不做支付

## 开工前必须阅读

1. `docs/05-代码规范.md` —— 强制规范
2. `docs/03-数据库设计.md` —— 字段与枚举以它为准
3. `docs/01-需求与设计.md` —— 业务规则
4. `docs/02-技术方案.md` —— 架构与接口约定

## 硬性规则

### 必须

- 只用微信官方组件与 API，CommonJS 模块，ES2017+，`const/let`
- 客户端数据一律走 `services/api.js` 的 `call(action, payload)`，禁止 `wx.cloud.database()`
- 新增 action 必须在 `cloudfunctions/api/index.js` 的 `router` 注册，并校验角色 + 数据范围
- 时间写库用 `db.serverDate()`
- 新增字段/枚举先改 `docs/03-数据库设计.md`，再改代码
- 代码必须通过 ESLint + Prettier
- 输出：改动清单 → 代码 → 自检结果 → 一行 commit message

### 禁止

- 引入新 npm 依赖（需人类批准）
- `console.log`（用 `console.warn/error`）
- 修改 `project.config.json` 的 `appid` / `miniprogramRoot` / `cloudfunctionRoot`
- 修改 `app.json` 的页面顺序与 TabBar 数量
- 修改 `design/**`、`assets/**`
- 客户端硬编码 appid、envId、手机号、学号
- 在前端判断名额、权限、状态（这些只能由云函数决定）
- 物理删除业务数据（用软删除）
- 空 `catch`、吞异常

## 目录约定

```
miniprogram/pages/<模块>/<页面>/index.{js,json,wxml,wxss}
miniprogram/components/<组件>/index.{js,json,wxml,wxss}
miniprogram/services/api.js
miniprogram/utils/*.js
miniprogram/styles/variables.wxss
cloudfunctions/api/index.js        # 单入口路由
cloudfunctions/cron/index.js       # 定时任务
cloudfunctions/init/index.js       # 一次性初始化
```

## 常用命令

```bash
npx eslint miniprogram cloudfunctions
npx prettier --check "miniprogram/**/*.{js,wxml,wxss,json}"
cd cloudfunctions/api && npm install
```

云函数改动后需在微信开发者工具「上传并部署」，AI 无法代替此步骤，需在输出中提醒。

## 完成定义（DoD）

- [ ] 页面已在 `app.json` 注册
- [ ] 新 action 已注册并鉴权
- [ ] 空态 / 加载态 / 错误态齐全
- [ ] ESLint 无 error
- [ ] 未提交 `env.js`、`project.private.config.json`
- [ ] 涉及数据库变更时，已更新 `docs/03`

## 提交信息

```
<type>(<scope>): <subject>
```

`type`: feat | fix | docs | style | refactor | perf | test | chore  
`scope`: task | signup | calendar | todo | erke | auth | cloud | docs

## 不确定时

业务规则（名额、候补、请假、二课口径）不要猜，先问人类，并指向 `docs/01` 对应章节。
