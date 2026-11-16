# 卡小西 · Git 协作规范

| 项目 | 内容 |
|---|---|
| 版本 | v1.0 |
| 适用 | 所有开发者 |
| 工具 | 微信开发者工具「版本管理」/ 命令行 Git / GitHub、Gitee |

---

## 1. 分支模型

```
main          ← 可发布版本，只接受来自 develop 的合并
 └── develop  ← 日常集成分支，所有人从这里拉功能分支
      ├── feature/task-signup    功能
      ├── feature/calendar       功能
      ├── fix/signup-race        缺陷
      └── hotfix/…              线上紧急修复（从 main 拉，修完合回 main + develop）
```

| 分支 | 用途 | 谁能改 | 保护 |
|---|---|---|---|
| `main` | 线上版本，每次合并打 tag | 负责人 | 禁止直接 push |
| `develop` | 集成测试 | 全体 | 禁止直接 push（初期可放开） |
| `feature/*` | 单个功能 | 开发者本人 | — |
| `fix/*` | 缺陷修复 | 开发者本人 | — |
| `hotfix/*` | 线上紧急修复 | 负责人 | — |

**规则**

1. 任何改动都从 `develop` 拉分支，不直接在 `develop` 提交；
2. 分支名全部小写，用 `-` 分词，不超过 4 段；
3. 功能分支生命周期 ≤ 2 周，超过就拆分；
4. 合并后删除远程分支。

---

## 2. 分支命名

```
feature/<模块>-<简述>
fix/<问题简述>
hotfix/<版本>-<问题简述>
```

示例：

- `feature/task-apply`
- `feature/calendar-month`
- `feature/todo-priority`
- `fix/signup-count-race`
- `hotfix/1.0.1-reminder-time`

禁止：`test`、`dev2`、`zhangsan`、`新分支`。

---

## 3. 提交信息规范

采用 **Conventional Commits**，中文描述，一行说清：

```
<type>(<scope>): <subject>
```

| type | 含义 |
|---|---|
| `feat` | 新功能 |
| `fix` | 修复缺陷 |
| `docs` | 文档 |
| `style` | 格式（不影响逻辑） |
| `refactor` | 重构 |
| `perf` | 性能 |
| `test` | 测试 |
| `chore` | 构建、依赖、配置 |
| `ci` | 流水线 |

`scope` 用模块名：`task`、`signup`、`calendar`、`todo`、`erke`、`auth`、`cloud`、`docs`。

示例：

```
feat(task): 支持多场次发布与报名截止
fix(signup): 修复并发报名导致的名额超卖
feat(erke): 二课按学年实时统计
docs(db): 补充附件过期字段
chore: 初始化工程骨架
```

**禁止**：`update`、`修改`、`提交`、`1`、`aaa`。

### 3.1 提交粒度

- 一个提交只做一件事（能独立回滚）；
- 不要把格式化与业务改动混在同一提交；
- 单次提交文件数建议 ≤ 10。

---

## 4. 开发流程（标准 7 步）

```bash
# 1. 同步
git checkout develop
git pull origin develop

# 2. 拉分支
git checkout -b feature/task-apply

# 3. 开发 + 本地自检
npx eslint miniprogram cloudfunctions

# 4. 提交
git add .
git commit -m "feat(task): 实现报名与候补"

# 5. 推送
git push -u origin feature/task-apply

# 6. 提 PR（develop ← feature）
#    填写：做了什么、怎么测、影响范围、截图

# 7. 评审通过后合并，删除分支
git checkout develop
git pull
git branch -d feature/task-apply
```

---

## 5. 合并与评审

### 5.1 PR 要求

- 标题同提交规范；
- 描述包含：改动点、测试方式、影响页面/接口、是否需重新部署云函数；
- 关联 issue（如有）；
- 至少 1 人 approve。

### 5.2 评审清单

- [ ] 符合 [05-代码规范.md](./05-代码规范.md)
- [ ] 没有越权（新 action 是否鉴权）
- [ ] 没有客户端直连数据库
- [ ] 数据库字段与 03 文档一致
- [ ] 空态、错误态、加载态齐全
- [ ] 真机验证过
- [ ] 没有提交 `env.js`、`project.private.config.json`

### 5.3 合并方式

- 功能分支 → `develop`：**Squash merge**（保持 develop 历史干净）；
- `develop` → `main`：**Merge commit**，并打 tag。

---

## 6. 冲突处理

```bash
git checkout develop
git pull origin develop
git checkout feature/xxx
git rebase develop        # 或 merge，团队统一用 rebase
# 解决冲突后
git add <files>
git rebase --continue
git push --force-with-lease
```

- 冲突文件必须**逐行理解**后再解决，禁止直接选「双方都保留」；
- 冲突涉及 `app.json`、`project.config.json` 时，找负责人一起看；
- 解决后必须重新跑一遍主流程。

---

## 7. 版本与发布

| 项 | 规则 |
|---|---|
| 版本号 | 语义化 `MAJOR.MINOR.PATCH`，如 `1.2.0` |
| tag | `v1.2.0`，打在 `main` 的发布提交上 |
| 小程序版本 | 开发者工具上传时填写与 tag 一致的备注：`v1.2.0 报名与候补` |
| 发布记录 | 每次发布在 `docs/CHANGELOG.md` 记一行 |

发版流程：

```bash
git checkout main
git merge --no-ff develop -m "chore: release v1.2.0"
git tag -a v1.2.0 -m "v1.2.0 报名与候补"
git push origin main --tags
```

然后在开发者工具「上传」→ 公众平台「提交审核」→ 发布。

---

## 8. 微信开发者工具的 Git 配置

开发者工具内置「版本管理」，无需额外客户端。

### 8.1 首次开启

1. 打开项目 → 顶部菜单「版本管理」；
2. 若提示「未初始化 Git 仓库」，点「初始化」；
3. 右上角「设置」→「远程仓库」→「添加」：
   - 名称：`origin`
   - URL：`https://github.com/<org>/kaxiaoxi.git`（或 Gitee 地址）
4. 输入账号密码 / Token（GitHub 需 Personal Access Token）。

### 8.2 切换分支

1. 「版本管理」→ 左侧「分支」；
2. 双击分支名切换；
3. 新建分支：右键 `develop` →「新建分支」→ 输入 `feature/xxx`。

### 8.3 日常操作

| 操作 | 位置 |
|---|---|
| 拉取 | 右上角「拉取」 |
| 推送 | 右上角「推送」 |
| 提交 | 左侧「工作区」勾选文件 → 填信息 → 提交 |
| 查看历史 | 左侧「提交记录」 |
| 解决冲突 | 冲突文件会标红，点开用内置编辑器合并 |

### 8.4 注意

- 开发者工具的 Git **不会自动 stash**，切换分支前先提交或贮藏；
- 大文件（设计稿 PNG）不要提交，已在 `.gitignore` 排除；
- 推送失败先「拉取」，不要强推 `main`。

---

## 9. 常见问题

| 问题 | 处理 |
|---|---|
| 误提交 `env.js` | `git rm --cached miniprogram/env.js` 后提交 |
| 提交了 `project.private.config.json` | 同上，并确认 `.gitignore` 生效 |
| 分支落后太多 | `git pull --rebase origin develop` |
| 想撤销最近一次提交（未推送） | `git reset --soft HEAD~1` |
| 已推送要撤销 | `git revert <commit>`，禁止 `reset --hard` 后强推共享分支 |
| 忘记拉最新代码就开发 | 先 `git stash` → `pull` → `stash pop` |

---

## 10. 仓库初始化记录（本次已执行）

- 仓库根目录：`卡小西/`
- 默认分支：`main`
- 集成分支：`develop`
- 已创建首个提交：`chore: 初始化工程骨架与规范文档`
- 本地 Git 身份：`kaxiaoxi-dev <dev@kaxiaoxi.local>`（首次提交用，后续请改成自己的）

> 每个开发者克隆后请设置自己的身份：
>
> ```bash
> git config user.name "你的名字"
> git config user.email "你的邮箱"
> ```
