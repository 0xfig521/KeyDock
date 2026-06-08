# KeyDock 下一个版本计划：v0.6.0 Presets

> 结论：下一个版本最应该做 **Active Presets**。  
> 目标不是围绕 project preset 或单次 `keydock run`，而是让用户创建、组合、预览并激活 Presets，把一组全局环境变量加载到所有新终端，支持多项目同时使用。

## 1. v0.6 一句话目标

```text
Create one preset, activate it once, use the same trusted env vars across every project and new terminal.
```

中文：

```text
创建一个 Preset，激活一次，让所有新终端和多个项目共享同一组可信环境变量。
```

## 2. 为什么应该改成 Presets

KeyDock 之前的模型更偏 Preset 和 `keydock run`：

- Preset 容易被理解成项目级环境。
- `keydock run` 更适合单次命令隔离。
- 但用户真实需求是维护一个全局环境变量合集，并可以随时组合、替换、激活。

因此，下个版本的核心不应该是：

```text
给某个项目 preset 注入变量
```

而应该是：

```text
维护多个 Presets，并激活其中一个作为当前全局开发环境
```

## 3. 统一产品模型

v0.6 只保留一个主概念：

```text
Preset
```

Preset 同时承担三种能力：

| 能力 | 说明 | 是否作为独立顶层概念 |
| --- | --- | --- |
| 服务模板 | 从 OpenAI、Cloudflare、Vercel 等模板快速创建 | 否，只是 Create from template |
| 环境变量合集 | 保存一组 env vars / secrets | 是，叫 Preset |
| 可组合激活集合 | include 其它 presets，激活后写入 shell env | 否，仍叫 Preset |

也就是说，不再新增或强化：

- Preset
- Global Profile

这些概念都收敛进 Preset。

## 4. v0.6 不做什么

为了避免范围失控，v0.6 不做：

- 不做独立 Global Profile 概念。
- 不做项目级 Preset 主叙事。
- 不默认写真正 system-wide env。
- 不做 macOS `launchctl` / Windows `setx` / Linux `environment.d`。
- 不做团队、RBAC、云同步。
- 不做完整 agent policy engine。
- 不做 repo scanner。

## 5. v0.6 必做功能

## 5.1 Preset Templates

### 目标

让用户能从常见服务模板快速创建 preset。

### P0 内置模板

- OpenAI
- Anthropic
- OpenRouter
- GitHub
- Cloudflare
- Vercel
- Supabase
- Stripe

### 模板字段示例

```text
OpenAI
  OPENAI_API_KEY       secret required
  OPENAI_BASE_URL      optional
  OPENAI_MODEL         optional
```

```text
Cloudflare
  CLOUDFLARE_ACCOUNT_ID  required
  CLOUDFLARE_API_TOKEN   secret required
```

### 验收标准

- 用户能看到模板列表。
- 用户能从模板创建 preset。
- 敏感字段默认 masked。
- 字段名称遵循主流工具 env var 命名。

## 5.2 Preset CRUD

### 目标

用户可以创建和维护自己的环境变量合集。

### 需要支持

- 创建 preset。
- 编辑 preset 名称/描述。
- 添加 env var entry。
- 删除 env var entry。
- 启用/禁用 entry。
- 删除 preset。

### 验收标准

- Preset 可以保存 secret 与非 secret entries。
- UI 不展示 secret 明文，除非用户显式 reveal。
- 删除 preset 前有确认。

## 5.3 Preset Composition

### 目标

Preset 可以组合其它 presets。

例如：

```text
ai-dev
  OPENAI_API_KEY
  ANTHROPIC_API_KEY

cloud-deploy
  GITHUB_TOKEN
  CLOUDFLARE_API_TOKEN
  VERCEL_TOKEN

fullstack-dev
  includes ai-dev
  includes cloud-deploy
  SUPABASE_URL
  SUPABASE_ANON_KEY
```

### 冲突规则

推荐优先级：

```text
当前 preset 自己的 entries
  > 后 include 的 preset
  > 先 include 的 preset
  > 系统已有 env
```

### 验收标准

- 用户能 include / remove included preset。
- 预览时显示最终 env var names。
- 出现同名 env var 时显示冲突提示。

## 5.4 Preset Preview

### 目标

激活前让用户知道会导出哪些变量名，但不显示变量值。

CLI：

```bash
keydock preset preview fullstack-dev
```

输出：

```text
Preset: fullstack-dev
Would export 8 env vars:
  OPENAI_API_KEY
  ANTHROPIC_API_KEY
  GITHUB_TOKEN
  CLOUDFLARE_API_TOKEN
  VERCEL_TOKEN
  SUPABASE_URL
  SUPABASE_ANON_KEY
  STRIPE_SECRET_KEY
Secret values: hidden
Conflicts: none
```

### 验收标准

- 不打印 secret values。
- 显示 env var names。
- 显示冲突。
- 显示 included presets 来源。

## 5.5 Active Preset

### 目标

用户可以激活一个 preset，作为当前全局开发环境。

CLI：

```bash
keydock preset activate fullstack-dev
keydock preset current
keydock preset deactivate
```

语义：

```text
activate = 替换当前 active preset
```

激活后写入：

```text
~/.config/KeyDock/active-env.sh
~/.config/KeyDock/active-preset.json
```

新 shell 通过 KeyDock hook 加载。

### 验收标准

- 同一时间只有一个 active preset。
- 激活另一个 preset 会替换当前 active preset。
- deactivate 会删除 active env 文件和 active preset state。
- 当前 shell 不会自动改变；新 shell 生效。
- UI 明确提示：“New terminals will load this preset”。

## 5.6 Shell Integration

### 目标

复用现有 shell hook，但文案和状态改为 Active Preset。

当前已有基础：

```text
active-env.sh
keydock hook zsh/bash
```

v0.6 需要做：

- hook 加载 active preset env。
- Dashboard 显示 hook 是否安装。
- Presets 页面提示新 shell 生效。

### 验收标准

- zsh/bash 新终端能加载 active preset。
- hook 不在 shell 启动时调用卡住的 CLI。
- active-env.sh 文件头明确提示含 plaintext secrets。

## 6. 推荐 CLI

```bash
keydock preset templates
keydock preset list
keydock preset show <preset>
keydock preset create <preset>
keydock preset create <preset> --template openai
keydock preset include <preset> <included-preset>
keydock preset remove-include <preset> <included-preset>
keydock preset preview <preset>
keydock preset activate <preset>
keydock preset current
keydock preset deactivate
```

`keydock run` 保留，但定位为高级用法：

```bash
keydock run --preset fullstack-dev -- bun run dev
```

这个可以 v0.7 再做。v0.6 不必强行扩展 run。

## 7. 推荐 UI

主导航建议：

```text
Dashboard
Presets
Secrets
Audit
Settings
```

### Presets 页面

包含：

- Active Preset card。
- Preset list。
- Create preset。
- Create from template。
- Preview。
- Activate / Deactivate。

### Preset 编辑页

包含：

- Basic info。
- Entries。
- Included presets。
- Conflict warnings。
- Final env preview。

### Dashboard

展示：

```text
Active Preset: fullstack-dev
Env vars: 8
Shell hook: installed
Next terminals will load this preset.
```

## 8. P0 / P1 / P2

## 8.1 P0

必须完成：

- [ ] UI/文档主概念改为 Presets。
- [ ] Preset templates。
- [ ] Preset CRUD。
- [ ] Preset composition。
- [ ] Preset preview。
- [ ] Preset activate/current/deactivate。
- [ ] Shell hook 加载 active preset。
- [ ] Dashboard 显示 active preset。
- [ ] README/官网主叙事改为 Presets。

## 8.2 P1

尽量完成：

- [ ] 冲突检测与优先级 UI。
- [ ] 从 `.env` 导入为 preset。
- [ ] preset 导出 `.env`。
- [ ] included presets 排序。
- [ ] audit 记录 activate/deactivate/preview/export。

## 8.3 P2

延后：

- [ ] OS-level user env。
- [ ] GUI app env exposure。
- [ ] output redaction。
- [ ] command allowlist。
- [ ] repo scanner。
- [ ] team sharing。

## 9. 推荐实现顺序

```text
1. 数据模型：Preset / PresetEntry / PresetInclude
2. Core：resolve preset env + conflict handling
3. CLI：preset list/show/preview/activate/current/deactivate
4. Shell：active-preset.json + active-env.sh
5. UI：Presets 页面替代 Presets 主入口
6. Templates：OpenAI/Anthropic/OpenRouter/GitHub/Cloudflare/Vercel/Supabase/Stripe
7. Docs/website：Preset 主叙事
8. v0.6 release
```

## 10. 安全边界

Active Preset 是便利模式，不是严格隔离模式。

文案必须明确：

```text
Active Preset makes selected secrets available to future shells. Deactivate it when you no longer need it.
```

中文：

```text
Active Preset 会让后续新终端获得这些变量；不需要时请停用。
```

不要承诺：

```text
完全防止 secrets 泄露。
```

可以承诺：

```text
KeyDock encrypts secrets at rest, makes activation explicit, shows exported env names, and lets users replace/deactivate active presets.
```

## 11. v0.6 发布标准

- [ ] 用户能从模板创建第一个 preset。
- [ ] 用户能组合 presets。
- [ ] 用户能 preview 最终 env var names。
- [ ] 用户能 activate preset。
- [ ] 新 terminal 能加载 active preset。
- [ ] 用户能 deactivate。
- [ ] README/官网不再把 Preset 作为主概念。
- [ ] 文档说明 Active Preset 的安全边界。
- [ ] `bun run build` 通过。
- [ ] `cd web && bun run build` 通过。
- [ ] Rust tests 通过。

## 12. 最终判断

下一个版本最应该做：

> **v0.6.0 Presets：可组合、可激活、可替换的全局环境变量合集。**

这比 Preset / Global Profile / `keydock run` 三条线并行更清晰。

用户主路径应变成：

```text
Create from template
  ↓
Compose presets
  ↓
Preview env vars
  ↓
Activate preset
  ↓
Open any project in a new terminal
  ↓
Use the same trusted API keys
```
