# KeyDock v0.6.0 之后的下一步执行计划

> 当前版本：v0.6.0  
> 基准路线：`docs/ROADMAP.md`  
> 目标：把 v0.6 已完成的 Presets 基础能力稳定下来，并进入 v0.7 的 AI-agent-safe mode。

## 1. v0.6.0 已完成进度

v0.6.0 已经完成 KeyDock 的核心产品重心迁移：从旧 Key 模型切到 **Secrets + Secret Fields + Presets**。

已完成：

- Preset 成为唯一主概念：可复用、可组合、可激活的环境变量合集。
- Secret Field 模型落地：Secret 不再只是固定 key 表单，可以维护通用字段、敏感字段和 ENV 字段。
- Preset Entry 映射 Secret Field：环境变量从加密字段解析，不再依赖旧 Key 模型。
- Preset composition / preview / activate / deactivate 基础链路已具备。
- CLI 支持：
  - `keydock preset activate <preset>`
  - `keydock preset current`
  - `keydock preset deactivate`
  - `keydock run <preset> -- <cmd>`
  - `keydock hook <zsh|bash>`
- 已修复活跃 preset 在映射或字段变化后的 env 刷新问题。
- App 文案、README、官网 SEO 和 docs 已统一为 Preset 术语。
- v0.6.0 tag 已发布，CI release workflow 由 tag push 触发。

## 2. v0.6.0 后仍需补齐的 v0.6 收尾项

这些不是新方向，而是 launch-ready workflow 的收尾，建议先做成 `v0.6.1` / `v0.6.x` 稳定版本。

### 2.1 First-run onboarding

目标：新用户 3 分钟内完成第一次 scoped command injection。

需要做：

- 首次解锁后引导创建第一个 Secret。
- 从模板创建第一个常用服务字段，例如 OpenAI / Anthropic / Cloudflare。
- 引导创建第一个 Preset，例如 `startup` 或 `ai-dev`。
- 引导把 Secret Field 映射到 ENV 名。
- 最后展示可复制命令：

```bash
keydock run startup -- bun run dev
```

验收标准：

- 不读 README 也能完成第一个 Secret → Preset → CLI command。
- 取消 onboarding 不破坏 vault 状态。
- onboarding 可从 Settings 或空状态重新打开。

### 2.2 Demo / sample preset

目标：方便截图、录屏、官网 demo 和用户试用。

需要做：

- 提供一键创建 sample data。
- sample data 不包含真实 secret。
- 明确标识为 sample。
- 支持一键清除 sample data。

建议 sample：

- `ai-dev`：OpenAI / Anthropic / OpenRouter。
- `cloud-deploy`：GitHub / Cloudflare / Vercel。
- `fullstack-dev`：include `ai-dev` + `cloud-deploy`。

### 2.3 官网与 README 的真实演示资产

目标：让用户 10 秒内理解价值。

需要做：

- 官网补 3 个真实截图或 GIF：
  1. Secret Field 管理。
  2. Preset mapping / composition。
  3. `keydock run` 命令级注入。
- README 增加 Quick Start 截图或终端演示。
- README 明确 macOS ad-hoc signing / unsigned 安装提示。

### 2.4 Release / updater 链路回归

目标：确保 tag 发布后用户能下载、更新、安装。

需要做：

- 检查 `v0.6.0` GitHub Release assets 是否由 CI 正常生成。
- 检查 DMG、updater metadata、下载 URL 是否指向 `0xfig-labs/KeyDock`。
- Settings 中版本号、latest release link、update check 文案要一致。

## 3. v0.7 主线：AI-agent-safe mode

v0.7 应该把 KeyDock 和普通 secret manager 拉开差距：**不是只保存 secret，而是让 AI agent / script / dev server 只能拿到当前命令需要的 scoped secrets**。

### 3.1 `keydock plan` 注入预览

先做 `plan`，再做强约束 policy。

命令草案：

```bash
keydock plan startup -- bun run dev
```

输出应包含：

```text
Preset: startup
Command: bun run dev
Injecting:
  OPENAI_API_KEY
  ANTHROPIC_API_KEY
Redaction: enabled
Policy: preview-only
```

验收标准：

- 不执行命令，只展示将注入的 env names。
- 不输出 secret values。
- 支持 composite preset 的最终解析结果。
- 冲突变量有明确提示。

### 3.2 Command-scoped policy

为 Preset 增加命令级策略。

建议模型：

```text
PresetPolicy
  id
  preset_id
  default_mode: allow | confirm | deny
  allowed_commands[]
  allowed_env_vars[]
  agent_profile
  redaction_enabled
  created_at
  updated_at
```

第一版可以先做最小可用：

- `default_mode`：`allow` / `confirm` / `deny`。
- `allowed_env_vars`：限制当前命令可注入的 env names。
- `allowed_commands`：用简单 command prefix 或 exact command 匹配。

验收标准：

- CLI 在执行前能判断当前命令是否允许。
- deny 时不执行目标命令。
- confirm 模式下给出清晰注入摘要。
- audit log 不记录 secret values。

### 3.3 Agent profiles

目标：给不同 AI coding agent 默认安全策略。

P0 profiles：

- Codex
- Claude Code
- Cursor
- Generic Shell

每个 profile 定义：

- 默认 redaction 是否开启。
- 推荐 env allowlist。
- CLI 输出中的 profile 名称。
- 后续是否需要更严格的 confirm。

命令草案：

```bash
keydock run startup --agent codex -- bun run test
```

验收标准：

- CLI 输出当前使用的 profile。
- profile 不改变 secret value，只影响注入策略和 redaction。
- 桌面端能查看/选择 profile。

### 3.4 Output redaction

目标：即使目标命令输出 secret，也默认脱敏。

第一版范围：

- 仅 redaction 当前注入的 secret values。
- 同时处理 stdout / stderr。
- 保留目标命令 exit code。
- 默认开启，可通过 policy 禁用。

显示格式建议：

```text
sk-****abcd
```

验收标准：

- 完整 secret 不出现在终端输出。
- redaction 不改变命令成功/失败状态。
- audit 记录 redaction count，但不记录原文。

### 3.5 Audit event 扩展

新增事件类型：

- `preset_run`
- `env_injected`
- `policy_denied`
- `redaction_applied`
- `agent_profile_used`

验收标准：

- Audit tab 能按事件类型筛选。
- 记录 command、preset、env var names、exit code。
- 不记录 secret values。
- 命令失败也要记录必要上下文。

## 4. v0.8 预研：Secret health 与 repo scanner

v0.7 完成前不要分散主线，但可以提前设计数据接口。

### 4.1 Secret health

后续能力：

- 过期提醒。
- 空值 / 重复值 / 长期未使用字段提示。
- 未映射 Secret Field 提示。
- Preset health score。

### 4.2 Repo scanner

后续能力：

- 扫描 `.env*`、shell scripts、CI config、agent config。
- 发现疑似 secret。
- 建议导入 KeyDock。
- 结果不展示完整 secret，不上传内容。

## 5. 推荐执行顺序

### P0：马上做

1. 检查 `v0.6.0` release assets 与 updater metadata。
2. 做 first-run onboarding。
3. 做 sample preset / demo data。
4. 给官网和 README 补真实截图或 GIF。
5. 实现 `keydock plan <preset> -- <cmd>`。

### P1：v0.7 主体

1. PresetPolicy 数据模型与 migration。
2. CLI policy enforcement。
3. Output redaction。
4. Agent profiles。
5. Audit event 扩展与筛选 UI。

### P2：延后

1. Repo scanner。
2. Secret health score。
3. Encrypted import/export。
4. Homebrew tap。
5. macOS notarization。

## 6. 下一个版本建议

建议下一个版本拆成两个节奏：

### v0.6.1：Launch polish

重点：

- onboarding。
- sample preset。
- 真实截图/GIF。
- release/updater 链路回归。
- README 安装说明补齐。

### v0.7.0：Agent-safe mode

重点：

- `keydock plan`。
- command policy。
- agent profiles。
- redaction。
- run audit 扩展。

## 7. 不做清单

近期不要做：

- 云同步。
- 团队账号 / RBAC。
- 企业审计导出。
- 插件市场。
- Local HTTP API。
- system-wide env 写入。

这些会稀释 KeyDock 当前最清晰的差异化：本地优先、命令级 scoped injection、AI-agent-safe secret flow。
