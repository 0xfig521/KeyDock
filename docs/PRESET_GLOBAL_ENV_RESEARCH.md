# KeyDock Preset 统一模型调研

> 调研日期：2026-06-08  
> 结论：KeyDock 下一阶段应把 **Preset** 与 **Global Profile** 收敛进 **Preset**。Preset 不只是服务模板，而是“可组合、可激活、可替换的全局环境变量合集”。

## 1. 最终结论

KeyDock 的主概念应简化为：

```text
Preset = 一组可复用的环境变量集合
```

Preset 可以来自：

1. **Service Preset**：围绕单个服务，例如 OpenAI、Cloudflare、Vercel。
2. **Composite Preset**：组合多个 presets，例如 `ai-dev`、`fullstack-dev`、`cloud-deploy`。
3. **Active Preset**：当前被激活并写入 KeyDock-managed shell env 的 preset。

但在产品 UI/CLI 中，不建议把这些拆成 Preset / Global Profile / Preset 三个并列概念。对用户来说，它们都可以叫 **Presets**。

推荐一句话：

> Presets are reusable env collections. Activate one preset, and every new terminal can use the same trusted API keys across projects.

中文：

> Preset 是可复用的环境变量合集。激活一个 Preset 后，所有新终端和多个项目都能共享这组可信 API Keys。

## 2. 为什么不再使用 Preset / Global Profile

### 2.1 Preset 的问题

“Preset” 容易让用户理解成：

- 某个项目目录。
- 某个 repo。
- 某个团队空间。
- 某个 IDE preset。

但你现在想做的是：

```text
维护一个全局环境变量合集，可以随时组合、替换、激活，让多个项目同时使用。
```

这不是传统意义的 project preset。

因此继续叫 Preset 会误导用户。

### 2.2 Global Profile 的问题

“Global Profile” 能表达全局激活，但会带来另一个问题：

- Preset 是什么？
- Profile 又是什么？
- Preset 又是什么？
- 用户到底应该点哪个？

对一个开发者工具来说，概念越少越好。

如果 Preset 本身就能被组合和激活，那就不需要额外引入 Global Profile。

### 2.3 Preset 更符合用户心智

用户真实想法更像：

```text
我需要一套 AI 开发常用变量。
我需要一套 Cloud 部署常用变量。
我需要一套 Fullstack 项目常用变量。
我想随时切换这些集合。
```

这些都可以叫：

```text
Presets
```

例如：

```text
Preset: ai-dev
  OPENAI_API_KEY
  ANTHROPIC_API_KEY
  OPENROUTER_API_KEY

Preset: cloud-deploy
  GITHUB_TOKEN
  CLOUDFLARE_ACCOUNT_ID
  CLOUDFLARE_API_TOKEN
  VERCEL_TOKEN

Preset: fullstack-dev
  includes ai-dev
  includes cloud-deploy
  SUPABASE_URL
  SUPABASE_ANON_KEY
  STRIPE_SECRET_KEY
```

## 3. 推荐产品模型

## 3.1 PresetDefinition

内置模板，用来快速创建 preset。

例如：

```text
OpenAI
  OPENAI_API_KEY       secret required
  OPENAI_BASE_URL      non-secret optional
  OPENAI_MODEL         non-secret optional
```

```text
Cloudflare
  CLOUDFLARE_ACCOUNT_ID  non-secret required
  CLOUDFLARE_API_TOKEN   secret required
```

这些是系统内置的“模板”，用户不需要理解它是另一个产品概念。UI 上可以叫：

```text
Create preset from template
```

## 3.2 Preset

用户真正管理的是 Preset。

Preset 是一组 env vars：

```text
Preset
  id
  name
  description
  entries[]
  included_presets[]
  created_at
  updated_at
```

Preset entry：

```text
PresetEntry
  env_name
  value_source
  sensitive
  enabled
  sort_order
```

其中 `value_source` 可以指向已有 secret/key，也可以是非敏感明文配置。

## 3.3 Composite Preset

Composite Preset 不是新概念，只是 Preset 的一种能力：可以 include 其它 presets。

示例：

```text
fullstack-dev
  includes:
    ai-dev
    cloud-deploy
  own entries:
    SUPABASE_URL
    SUPABASE_ANON_KEY
```

冲突处理：

```text
后加入的 preset > 先加入的 preset
当前 preset own entries > included presets
```

更清晰的优先级：

```text
explicit entry in active preset
  > later included preset
  > earlier included preset
  > existing OS env
```

## 3.4 Active Preset

只能有一个当前 active preset。

激活后 KeyDock 写入：

```text
~/.config/KeyDock/active-env.sh
~/.config/KeyDock/active-preset.json
```

新 shell 通过 hook source `active-env.sh`。

Active preset 不是另一个产品概念，只是 Preset 的状态：

```text
Preset: fullstack-dev
Status: Active
```

## 4. CLI 设计

## 4.1 Preset 管理

```bash
keydock preset list
keydock preset show ai-dev
keydock preset create ai-dev
keydock preset delete ai-dev
```

## 4.2 从模板创建 Preset

```bash
keydock preset templates
keydock preset create openai-main --template openai
keydock preset create cloudflare-main --template cloudflare
```

## 4.3 组合 Preset

```bash
keydock preset include fullstack-dev ai-dev
keydock preset include fullstack-dev cloud-deploy
keydock preset remove-include fullstack-dev ai-dev
```

## 4.4 预览激活结果

```bash
keydock preset preview fullstack-dev
```

输出：

```text
Preset: fullstack-dev
Would export:
  OPENAI_API_KEY
  ANTHROPIC_API_KEY
  GITHUB_TOKEN
  CLOUDFLARE_API_TOKEN
  VERCEL_TOKEN
Secret values: hidden
Conflicts: none
```

## 4.5 激活 / 替换 / 停用

```bash
keydock preset activate fullstack-dev
keydock preset current
keydock preset deactivate
```

激活语义：

```text
activate = replace current active preset
```

也就是说，用户随时可以用另一个 preset 替换当前全局环境合集。

## 4.6 与 keydock run 的关系

`keydock run` 保留，但不再作为主叙事。

推荐定位：

```text
preset activate = 日常多项目、多终端使用
keydock run     = 一次性严格注入
```

CLI 可以支持：

```bash
keydock run --preset fullstack-dev -- bun run dev
```

但 v0.6 可先不做。

## 5. UI 信息架构

推荐主导航：

```text
Dashboard
Presets
Secrets
Audit
Settings
```

不再需要单独的 Presets。

## 5.1 Presets 页面

Presets 页面包含：

- 当前 Active Preset。
- 所有 Presets 列表。
- Create from Template。
- Include presets。
- Preview env vars。
- Activate / Deactivate。

示例：

```text
Active Preset
  fullstack-dev
  12 env vars
  OPENAI_API_KEY, ANTHROPIC_API_KEY, GITHUB_TOKEN, ...

Presets
  ai-dev
  cloud-deploy
  fullstack-dev
```

## 5.2 Preset 编辑页

展示：

```text
Preset: fullstack-dev

Included Presets
  ai-dev
  cloud-deploy

Entries
  SUPABASE_URL
  SUPABASE_ANON_KEY
  STRIPE_SECRET_KEY

Preview
  12 env vars will be exported
```

## 5.3 Dashboard

Dashboard 应显示：

```text
Active Preset: fullstack-dev
Shell hook: Installed
New terminals: will load 12 env vars
```

提供操作：

- Switch Preset
- Deactivate
- Copy hook command
- Preview active env names

## 6. 平台实现建议

## 6.1 v0.6 默认：KeyDock-managed shell env

继续使用当前已有模式：

```text
active-env.sh
shell hook source active-env.sh
```

优点：

- 当前代码已有基础。
- 不需要管理员权限。
- 可撤销。
- 对多 terminal / 多项目开发足够有效。
- 风险比真正 system-wide env 小。

## 6.2 不默认写 system-wide env

不要在 v0.6 默认使用：

- macOS `launchctl setenv`
- Windows `setx /m`
- Linux system-level env

原因：

- 生效范围平台差异大。
- 撤销不直观。
- secret 暴露范围更广。
- 对已经运行的进程通常无效。

## 6.3 后续高级功能

可以后续提供：

```text
Expose active preset to GUI apps
```

平台实现：

- macOS：LaunchAgent / launchctl。
- Windows：user env via registry / setx。
- Linux：environment.d 或 desktop-specific integration。

但必须作为高级选项，并明确风险。

## 7. 安全表达

必须明确：

```text
Active Preset is a convenience mode. It makes selected secrets available to future shells. Use one-shot run mode when you need stricter command-level isolation.
```

中文：

```text
Active Preset 是便利模式，会让后续 shell 获得这些变量。如果需要更严格的命令级隔离，请使用一次性 run 模式。
```

不要承诺：

```text
KeyDock fully prevents secret leaks.
```

可以承诺：

```text
KeyDock keeps secrets encrypted at rest, makes activation explicit, shows exported env names, and lets users replace/deactivate active presets.
```

## 8. 推荐 v0.6 范围

## 8.1 v0.6 名称

```text
v0.6.0: Presets
```

或者：

```text
v0.6.0: Active Presets
```

## 8.2 v0.6 P0

必须做：

- [ ] 把 UI/文档主概念从 Preset 调整为 Preset。
- [ ] 内置 preset templates：OpenAI、Anthropic、OpenRouter、GitHub、Cloudflare、Vercel、Supabase、Stripe。
- [ ] 用户可以创建 preset。
- [ ] 用户可以从 template 创建 preset。
- [ ] 用户可以组合 presets。
- [ ] 用户可以 preview preset 输出的 env var names。
- [ ] 用户可以 activate preset。
- [ ] 用户可以 deactivate active preset。
- [ ] shell hook 加载 active preset。
- [ ] Dashboard 显示 active preset。
- [ ] CLI 支持 `keydock preset activate/current/deactivate/list/show`。

## 8.3 v0.6 P1

尽量做：

- [ ] preset 冲突检测。
- [ ] preset include 顺序调整。
- [ ] 导出 `.env`。
- [ ] 从 `.env` 导入为 preset。
- [ ] README/官网完整改为 Preset 叙事。

## 8.4 v0.6 P2

延后：

- [ ] system-wide env 写入。
- [ ] GUI app env 注入。
- [ ] command allowlist。
- [ ] output redaction。
- [ ] repo scanner。
- [ ] team sharing。

## 9. 需要改名的现有概念

当前代码/文档中的：

```text
Preset
Active Preset
preset env
preset variables
```

产品层建议改成：

```text
Preset
Active Preset
preset env
preset entries
```

实现层可以分阶段迁移，不必一次性重构所有数据库表。

建议策略：

1. v0.6 UI/CLI 文案先改成 Preset。
2. Rust 数据库表可先复用 preset 表，避免大迁移风险。
3. 后续版本再做 schema rename/migration。

## 10. 官网文案建议

Hero：

```text
Reusable env presets for every developer project.
```

副标题：

```text
Store API keys locally, compose them into presets, and activate one global env set for all new terminals.
```

中文：

```text
为每个开发项目准备可复用的环境变量 Presets。
```

```text
本地保存 API Keys，组合成 Presets，一键激活到所有新终端。
```

CTA：

```text
Create your first preset
+ Star on GitHub
```

## 11. 最终产品模型

最终收敛为：

```text
Secrets: 单个真实密钥和值
Preset Templates: 内置服务模板
Presets: 用户维护的可组合环境变量合集
Active Preset: 当前激活的 Preset
Run Mode: 对某条命令进行一次性注入
```

用户主路径：

```text
Create preset from template
  ↓
Compose presets
  ↓
Preview env vars
  ↓
Activate preset
  ↓
Open new terminal
  ↓
Use across projects
```

这比 Preset / Global Profile / Preset 三概念并存更清晰，也更符合“全局环境变量合集，可随时组合替换”的产品目标。
