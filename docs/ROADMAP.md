# KeyDock 下一阶段发展路线

> 状态：v0.6.0 已发布，路线进入执行更新  
> 适用阶段：v0.6.1 → v1.0  
> 仓库：[0xfig-labs/KeyDock](https://github.com/0xfig-labs/KeyDock)  
> 官网：https://keydock.0xfig.xyz

## 1. 一句话方向

KeyDock 的产品主概念已收敛为 **Presets**：Preset 是可复用、可组合、可激活、可替换的全局环境变量合集。额外的 Global Profile 等概念不再作为顶层产品概念出现。

KeyDock 下一阶段应聚焦为：

> **AI 时代的本地优先开发者密钥工作台：让 API Key 留在本地，只给 shell、脚本、dev server 和 AI coding agents 注入当前命令真正需要的 scoped secrets。**

不要过早进入“大而全的企业 SecretOps / Vault / RBAC / 云同步”竞争。KeyDock 更适合先成为开发者工作站层的安全入口：解决 `.env` 到处复制、全局 shell export、AI agent 读取完整环境变量、项目间 token 混乱等高频痛点。

## 2. 当前项目状态

### 2.1 已具备的基础

- **桌面端**：Tauri v2 + React + TypeScript。
- **核心层**：Rust preset，包含 `keydock-core` 与 `keydock-cli`。
- **本地加密 vault**：使用 master password、Argon2id、data-encryption key、加密存储。
- **Secret/service 管理**：支持服务分组、多个 key 条目、敏感/非敏感字段。
- **Preset 映射**：将不同服务的 key 映射成环境变量。
- **CLI 工作流**：
  - `keydock preset activate <preset>`
  - `keydock run <preset> -- <cmd>`
  - `keydock preset current`
  - `keydock preset deactivate`
  - `keydock hook <zsh|bash>`
- **审计基础**：已存在 reveal、copy、export、mutation 等敏感操作记录。
- **官网**：`web/` 已有 landing page，并通过 Cloudflare Pages 部署。
- **发布流程**：tag `v*` 触发 GitHub Actions release，自动构建 DMG 与 updater metadata。

### 2.2 v0.6.0 已完成的关键进展

- 版本已发布到 `v0.6.0`，tag push 已触发 CI release workflow。
- 版本文件已对齐到 `0.6.0`：根 `package.json`、Tauri 配置、Rust crates 与 `Cargo.lock`。
- 产品主线已从旧 Key 模型迁移到 **Secrets + Secret Fields + Presets**。
- Preset 已承担环境变量合集、组合、预览、激活、停用和 `keydock run` 注入能力。
- Secret Field 已支持普通字段、敏感字段、ENV 字段，并可映射到 Preset Entry。
- 已移除产品层面的旧环境管理术语，App、README、官网和 docs 统一使用 Preset。
- 官网 SEO 与 landing page 文案已围绕本地 API Key vault、reusable env presets、AI-agent-safe scoped injection 更新。
- 已修复活跃 preset 在映射或字段变化后的 env 刷新问题。
- 发布前验证已通过：主应用 build、web build、web lint、Rust `cargo check`。

### 2.3 当前主要短板

| 类型 | 问题 | 影响 |
| --- | --- | --- |
| 首次体验 | 新用户从下载到跑出第一个 `keydock run` 的路径还不够短 | 降低转化与分享传播 |
| Demo 表达 | 官网/README 还缺强截图、GIF、真实使用案例 | 用户难以 10 秒理解价值 |
| Agent 安全 | 目前已有 one-shot injection，但还没有完整的 agent-safe 模式、allowlist、日志脱敏 | 差异化还未产品化 |
| 信任资产 | threat model、密钥生命周期说明、分发安全说明还不够系统 | 安全工具缺乏信任感 |
| 安装分发 | macOS 仍是 ad-hoc signing，未 notarized | 普通用户安装阻力较大 |
| 增长闭环 | GitHub description/topics、README CTA、官网下载/Star 指标还需要持续优化 | 开源项目启动传播效率不足 |

## 3. 产品定位

### 3.1 推荐定位

KeyDock 是：

- 本地优先的 secret preset。
- 面向个人开发者、小团队和 AI-assisted coding workflow。
- 用桌面端管理 secrets，用 CLI 注入 scoped env vars。
- 默认假设 AI coding agent、脚本和 dev server 都不应该看到完整 shell 环境。

KeyDock 不是：

- 不是企业级 Vault 替代品。
- 不是云端团队权限平台的第一阶段产品。
- 不是“再做一个 `.env` 编辑器”。
- 不是只靠“加密”作为卖点的 generic secrets manager。

### 3.2 推荐 GitHub 描述

```text
Local-first secret preset for AI-era developers. Store API keys locally and inject scoped env vars into shells, scripts, and coding agents.
```

### 3.3 推荐 Topics

```text
secrets-management local-first developer-tools tauri react rust cli env-vars api-keys ai-agents secret-injection desktop-app
```

### 3.4 核心叙事

#### 英文

> Stop leaking API keys to AI coding agents.

#### 中文

> 别再把 API Key 暴露给 AI 编程助手。

### 3.5 差异化

| 竞品/替代方式 | 常见定位 | KeyDock 差异 |
| --- | --- | --- |
| `.env` 文件 | 简单、普遍、低门槛 | KeyDock 提供本地加密、preset 映射、命令级注入和审计 |
| 1Password | 密码管理器 + CLI | KeyDock 聚焦开发者 preset 与 one-shot command injection |
| Doppler | 云端团队 secret 管理 | KeyDock 优先本地、不要求云账号和组织配置 |
| Infisical | 开源 SecretOps 平台 | KeyDock 更轻、更偏工作站层和 AI agent 安全 |
| HashiCorp Vault/OpenBao | 企业级密钥基础设施 | KeyDock 不试图替代 infra vault，先解决本地开发体验 |
| macOS Keychain wrapper | OS 原生凭据存储 | KeyDock 提供跨服务组织、preset 映射、CLI/桌面统一体验 |

## 4. 用户画像与使用场景

### 4.1 目标用户

#### P0：独立开发者 / indie hacker

痛点：

- 同时维护多个项目，每个项目都有 OpenAI、Anthropic、Cloudflare、Vercel、Supabase、Stripe 等 key。
- `.env.local` 到处复制，容易过期、泄露、遗忘。
- 经常用 AI coding agent，不希望 agent 直接读取完整本机环境变量。

KeyDock 价值：

- 一个本地 vault 管全部项目 secrets。
- 按 preset 注入项目所需 env vars。
- `keydock run project -- bun run dev` 替代手动 export。

#### P1：AI-assisted 工程师

痛点：

- Codex、Claude Code、Cursor、脚本和测试命令可能读取环境变量。
- 真实 API key 可能被日志、错误输出、agent transcript 暴露。

KeyDock 价值：

- 只给当前命令注入必要 secrets。
- 后续通过 allowlist 和 redaction 降低泄露面。
- 审计“哪个命令访问过哪个 preset”。

#### P2：小团队 / studio

痛点：

- 团队还没到需要 Vault 的复杂度。
- 但共享 `.env`、Notion、Slack、密码管理器备注已经混乱。

KeyDock 价值：

- 先用加密导入/导出或 vault 文件共享建立轻量流程。
- 后续再考虑团队同步，而不是一开始引入云平台。

## 5. 北极星指标

### 5.1 产品使用指标

- 新用户从启动 app 到完成第一次 `keydock run` 的时间：目标 `< 3 分钟`。
- 每周 active preset 数量。
- 每周 `keydock run` 次数。
- 每个用户平均管理的 service / key 数。
- 审计事件数量：copy、reveal、run、export。

### 5.2 开源增长指标

- GitHub stars。
- Release downloads。
- 官网访问到 GitHub/download 点击率。
- README 到 Quick Start 完成率。
- Issues / discussions 里的真实使用反馈数量。

### 5.3 安全信任指标

- 是否有 threat model 文档。
- 是否有明确定义的本地存储路径和加密说明。
- 是否有 redaction 策略。
- 是否完成 macOS notarization。
- 是否提供安全问题反馈渠道。

## 6. 里程碑规划

## 6.1 v0.6：Launch-ready developer workflow

目标：把现有 MVP 打磨成“看完 README/官网就能安装试用、3 分钟内跑通第一个命令”的版本。

### 6.1.1 产品功能

#### 首次引导

新增 onboarding flow：

1. 创建 vault / 设置 master password。
2. 创建第一个 preset，例如 `startup`。
3. 选择一个服务预设：
   - OpenAI
   - Anthropic
   - GitHub
   - Cloudflare
   - Vercel
   - Supabase
   - Stripe
4. 输入一个 demo key。
5. 映射到环境变量。
6. 展示并复制：

```bash
keydock run startup -- bun run dev
```

验收标准：

- 新用户不看文档也能完成第一个 preset。
- onboarding 结束页提供 CLI 命令与 shell hook 说明。
- 失败/取消可安全返回，不破坏 vault 状态。

#### Demo preset

提供可选 demo 数据：

- 非真实 secret。
- 用于截图/录屏。
- 包含 AI Provider、Cloud Deploy、Search API 三类服务。

验收标准：

- demo 数据明确标记为 sample。
- 不混入真实 vault。
- 可一键清除。

#### 下载与更新体验

- Settings 里显示当前版本、最新版本、release link。
- 官网 download 链接指向 GitHub latest release。
- README 说明 unsigned/ad-hoc signing 状态与 macOS 安装提示。

验收标准：

- updater 地址与 release workflow 地址一致。
- release asset 名称稳定。
- 官网、README、GitHub repo 链接一致。

### 6.1.2 文档与官网

#### README 必须包含

- 30 秒价值说明。
- Quick Start。
- CLI examples。
- Security model。
- Why not `.env`。
- Why not Doppler / Infisical / Vault。
- Roadmap。

#### 官网必须包含

- Hero：Stop leaking API keys to AI coding agents。
- 3 个核心截图/GIF：
  1. Vault / Secrets UI。
  2. Preset mapping。
  3. CLI injection。
- How it works：
  1. Store locally。
  2. Map to preset。
  3. Run with scoped env。
- Trust section：
  - local-first
  - encrypted vault
  - preset activation
  - audit trail
- Download CTA：
  - GitHub Release
  - Star on GitHub

### 6.1.3 工程任务

- 确保 `bun run build` 通过。
- 确保 `cd web && bun run build` 通过。
- 确保 `cargo test --preset` 通过；在当前沙箱可使用：

```bash
CARGO_TARGET_DIR=/Users/icehugh/preset/KeyDock/target/codex-check cargo test --preset
```

- CI release workflow 不应手动创建 release；继续使用 tag `v*` 触发。
- 检查所有仓库链接均指向 `https://github.com/0xfig-labs/KeyDock`。

### 6.1.4 v0.6 发布清单

- [ ] README/README.zh-CN 完成。
- [ ] 官网完成截图/GIF。
- [ ] onboarding 完成。
- [ ] demo preset 完成。
- [ ] updater/release 链路验证。
- [x] changelog 更新。
- [x] 版本号更新。
- [x] tag `v0.6.0`。
- [ ] GitHub Release assets 正常。
- [ ] 官网下载链接正常。

## 6.2 v0.7：AI-agent-safe mode

目标：把 KeyDock 的差异化真正产品化。

### 6.2.1 Command-scoped allowlist

为 preset 增加 command policy：

```text
preset: startup
allowed env:
  - OPENAI_API_KEY
  - ANTHROPIC_API_KEY
commands:
  - bun run dev
  - npm test
  - wrangler deploy
```

能力：

- 仅给指定命令注入指定 env vars。
- 未授权命令需要用户确认或拒绝。
- 支持临时一次性授权。

验收标准：

- CLI 能解释当前命令将注入哪些 env vars。
- 用户能在桌面端查看/编辑 policy。
- audit log 记录 command、preset、env var names，不记录 secret values。

### 6.2.2 Agent profiles

新增 agent profile：

- Codex
- Claude Code
- Cursor
- Gemini CLI
- Generic Shell

每个 profile 定义：

- 默认 deny 全局 secrets。
- 推荐 `keydock run` 模式。
- 哪些 env var 可以注入。
- 是否启用输出 redaction。

验收标准：

- 用户能为一个 preset 选择 agent profile。
- CLI 输出 profile 名称与注入摘要。

### 6.2.3 Output redaction

为 CLI 增加 redaction layer：

- 检测当前注入的 secret values。
- 对 stdout/stderr 中出现的 secret 做替换。
- 支持显示前后缀：

```text
sk-****abcd
```

验收标准：

- 不把完整 secret 写入终端输出。
- redaction 不影响命令 exit code。
- redaction 行为可配置，但默认开启。

### 6.2.4 Audit trail 增强

新增事件类型：

- `preset_run`
- `env_injected`
- `policy_denied`
- `redaction_applied`
- `agent_profile_used`

验收标准：

- 桌面端 audit tab 能筛选事件类型。
- audit event 不包含 secret values。
- CLI run 失败时也记录必要上下文。

### 6.2.5 v0.7 发布清单

- [ ] command policy 数据模型。
- [ ] CLI allowlist enforcement。
- [ ] 桌面端 policy 编辑 UI。
- [ ] agent profiles。
- [ ] output redaction。
- [ ] audit event 扩展。
- [ ] threat model 更新。
- [ ] 官网增加 agent-safe demo。

## 6.3 v0.8：Secret health 与 repo scanner

目标：从“存储与注入”扩展到“发现风险与维护健康”。

### 6.3.1 Secret health checks

能力：

- 标记过期时间。
- 提醒即将过期。
- 检查空值、重复值、弱命名。
- 显示未映射 key。
- 显示长期未使用 key。

验收标准：

- Dashboard 显示 health summary。
- 每个 preset 有 health score。
- 用户可忽略/延后某条提醒。

### 6.3.2 Repo scanner

扫描范围：

- `.env`
- `.env.local`
- `.env.*`
- MCP config
- agent config
- shell scripts
- CI config

能力：

- 发现疑似 secret。
- 建议导入 KeyDock。
- 建议加入 `.gitignore`。
- 不上传扫描内容。

验收标准：

- 默认只扫描用户选择的目录。
- 结果不展示完整 secret。
- 支持导出 scan report。

## 6.4 v0.9：Sharing-light

目标：在不做云平台的情况下，解决小团队轻量共享。

### 6.4.1 Encrypted export/import

能力：

- 导出 preset。
- 导出 service group。
- 使用 passphrase 或 recipient public key 加密。
- 导入时支持冲突解决。

验收标准：

- 导出文件不含明文 secret。
- 导入预览只显示 service/env var names。
- 冲突策略明确：skip、overwrite、rename。

### 6.4.2 Team-lite workflow

不做账号系统，先支持：

- `keydock export preset startup --out startup.keydock`
- `keydock import startup.keydock`
- README 给出小团队共享方式。

## 6.5 v1.0：Stable local-first release

目标：稳定、可信、可长期使用。

v1.0 标准：

- macOS notarized distribution。
- 稳定 vault schema migration。
- 完整 threat model。
- 完整 backup/restore 文档。
- CLI 命令稳定。
- 无明显 onboarding 断点。
- 官网、README、release notes、screenshots 完整。
- 至少 3 个真实用户场景案例。

## 7. 工程优先级

### 7.1 P0：必须优先

- onboarding。
- docs/官网截图。
- agent-safe command flow。
- updater/release 链路稳定。
- redaction。
- audit event 不含 secret values。

### 7.2 P1：重要但可排后

- secret health checks。
- repo scanner。
- agent profiles。
- import/export。
- Homebrew tap。
- macOS notarization。

### 7.3 P2：暂缓

- 云同步。
- 团队账号。
- RBAC。
- 企业审计导出。
- 插件市场。
- Local HTTP API。

## 8. 设计原则

### 8.1 Local-first by default

- 不要求账号。
- 不上传 secrets。
- 不默认开启云同步。
- 本地 vault 可备份、可迁移。

### 8.2 Least privilege for commands

- 命令只拿到必要 env vars。
- 默认不把整个 preset 暴露给 agent。
- CLI 在执行前应能展示注入摘要。

### 8.3 Secret values never in logs

- audit log 只记录 names、preset、command、timestamp。
- stdout/stderr redaction 默认开启。
- 错误信息不得包含 secret values。

### 8.4 Desktop for clarity, CLI for flow

- 桌面端负责可视化管理、审计、策略编辑。
- CLI 负责高速执行、shell 集成和自动化。
- 两者共享同一 core model。

## 9. 数据模型演进建议

### 9.1 Preset policy

新增概念：

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

### 9.2 Run audit event

新增字段：

```text
RunAuditEvent
  command
  args_hash
  preset_id
  injected_env_names[]
  denied_env_names[]
  agent_profile
  redaction_count
  exit_code
```

注意：

- 不保存 command 输出。
- 不保存 secret values。
- 对过长 command 做截断或 hash。

## 10. CLI 体验草案

### 10.1 查看注入计划

```bash
keydock plan startup -- bun run dev
```

输出：

```text
Preset: startup
Command: bun run dev
Injecting:
  OPENAI_API_KEY
  ANTHROPIC_API_KEY
Redaction: enabled
Policy: allowed
```

### 10.2 agent-safe 运行

```bash
keydock run startup --agent codex -- bun run test
```

### 10.3 仅注入指定变量

```bash
keydock run startup --env OPENAI_API_KEY -- bun run eval
```

### 10.4 扫描 repo

```bash
keydock scan .
```

### 10.5 导入 `.env`

```bash
keydock import-env .env.local --preset startup
```

## 11. 官网与传播计划

### 11.1 官网结构

1. Hero：
   - Headline：Stop leaking API keys to AI coding agents.
   - Subheadline：Local-first secret preset for scoped env injection.
   - CTA：Download / Star on GitHub。
2. Problem：
   - `.env` sprawl。
   - global exports。
   - AI agents reading secrets。
3. How it works：
   - Store locally。
   - Map preset。
   - Run scoped command。
4. Demo：
   - GIF：add secret → map env → `keydock run`。
5. Security：
   - local-first。
   - encrypted vault。
   - preset activation。
   - audit trail。
6. CLI：
   - 3 个命令示例。
7. Roadmap：
   - agent-safe mode。
   - redaction。
   - scanner。
8. Download：
   - GitHub release。

### 11.2 内容发布节奏

#### 第 1 篇

标题：

```text
Stop leaking API keys to AI coding agents
```

内容：

- 为什么 `.env` 在 AI agent 时代风险更高。
- KeyDock 如何通过 scoped command injection 降低暴露面。

#### 第 2 篇

标题：

```text
Why I built a local-first secret preset instead of another cloud vault
```

内容：

- 不和 Vault/Doppler/Infisical 正面竞争。
- 先解决 workstation layer。

#### 第 3 篇

标题：

```text
From .env sprawl to preset-based secrets
```

内容：

- 多项目、多 provider、多 key 的实际痛点。
- preset mapping 示例。

## 12. 发布与版本策略

### 12.1 版本命名

- `v0.6.0`：launch-ready workflow。
- `v0.7.0`：agent-safe mode。
- `v0.8.0`：health checks / scanner。
- `v0.9.0`：sharing-light。
- `v1.0.0`：stable local-first release。

### 12.2 发布流程

遵循项目 `AGENTS.md`：

- 推送 tag `v*` 触发 `.github/workflows/release.yml`。
- 不手动使用 `gh release create`。
- tag 前更新：
  - `tauri.conf.json`
  - `src-tauri/Cargo.toml`
  - `crates/keydock-core/Cargo.toml`
  - `crates/keydock-cli/Cargo.toml`
  - `CHANGELOG.md`
  - `CHANGELOG.zh.md`

如果根 `package.json` 也作为产品版本展示，应同步更新。

## 13. 风险与应对

| 风险 | 说明 | 应对 |
| --- | --- | --- |
| 定位过宽 | 同时做 vault、team、cloud、scanner、agent safety 会分散 | v0.6/v0.7 只围绕 local-first scoped injection |
| 安全承诺过强 | 安全工具容易被用户理解为“绝对安全” | 文档明确 threat model、边界和限制 |
| agent-safe 伪安全 | 如果只是换个方式 export env，差异不足 | 必须有 allowlist、redaction、audit |
| macOS 安装阻力 | 未 notarized 影响普通用户信任 | v1.0 前完成 Developer ID signing/notarization |
| 与大厂工具竞争 | Doppler/Infisical/1Password 资源更强 | 避开团队云平台，聚焦 workstation + AI agent |
| 数据迁移风险 | vault schema 演进可能破坏用户数据 | 每次 schema 变更加 migration 测试和 backup 文档 |

## 14. 下一步执行清单

当前详细执行计划见：[`docs/NEXT_STEPS.md`](./NEXT_STEPS.md)。

### v0.6.1：Launch polish

- [ ] 检查 `v0.6.0` GitHub Release assets、DMG、updater metadata 和下载链接。
- [ ] 设计并实现 first-run onboarding。
- [ ] 增加 sample preset / demo data，支持一键创建和清除。
- [ ] 官网补真实截图或 GIF：Secret Field、Preset mapping、CLI injection。
- [ ] README 补充安装提示、macOS ad-hoc signing 说明和更短 Quick Start。

### v0.7.0：AI-agent-safe mode

- [ ] 实现 `keydock plan <preset> -- <cmd>` 注入预览。
- [ ] 设计 PresetPolicy 数据模型与 migration。
- [ ] 实现 command-scoped allowlist / deny / confirm。
- [ ] 增加 agent profiles：Codex、Claude Code、Cursor、Generic Shell。
- [ ] 实现 stdout/stderr redaction，默认隐藏已注入 secret values。
- [ ] 扩展 audit events：preset_run、env_injected、policy_denied、redaction_applied、agent_profile_used。

### 暂缓

- [ ] 云同步、团队账号、RBAC、企业审计导出。
- [ ] Local HTTP API、插件市场、system-wide env 写入。

## 15. 成功标准

KeyDock 下一阶段成功，不是“功能最多”，而是满足以下标准：

- 用户 10 秒内知道它解决什么问题。
- 用户 3 分钟内完成第一次 scoped command injection。
- README 和官网能明确回答：
  - 为什么不用 `.env`？
  - 为什么不用全局 export？
  - 为什么 AI agent 需要不同的 secret flow？
  - KeyDock 与 Doppler/Infisical/Vault 的边界是什么？
- CLI 与桌面端形成闭环。
- agent-safe mode 成为项目最清晰的差异化标签。

最终目标：

> 当开发者准备运行 AI agent、dev server、deploy script 或测试命令时，默认想到：不要 export 全局 secrets，用 KeyDock scoped run。
