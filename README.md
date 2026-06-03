<p align="center">
  <img src="public/icon.png" alt="KeyDock logo" width="96" height="96" />
</p>

<h1 align="center">KeyDock</h1>

<p align="center">
  <strong>Developer Secret Workspace for the AI era.</strong>
  <br />
  Local-first secret management, workspace-based environment injection, and a polished desktop control center for modern developer workflows.
</p>

<p align="center">
  <a href="#english">English</a>
  ·
  <a href="#中文">中文</a>
</p>

<p align="center">
  <img alt="Status" src="https://img.shields.io/badge/status-MVP-7c3aed?style=flat-square" />
  <img alt="Local first" src="https://img.shields.io/badge/local--first-yes-10b981?style=flat-square" />
  <img alt="Tauri" src="https://img.shields.io/badge/Tauri-v2-24c8db?style=flat-square" />
  <img alt="React" src="https://img.shields.io/badge/React-18-61dafb?style=flat-square" />
  <img alt="Rust" src="https://img.shields.io/badge/Rust-core-f97316?style=flat-square" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-111827?style=flat-square" />
</p>

---

## English

> KeyDock turns scattered API keys, cloud tokens, model endpoints, and project-specific env vars into a **local encrypted workspace** you can activate from the desktop app or CLI.

### Why KeyDock?

Modern developer workflows are full of secrets: AI provider keys, proxy URLs, account IDs, cloud tokens, search APIs, and per-client credentials. Copying them between `.env` files is fragile; exporting them globally is risky.

KeyDock gives you a safer loop:

1. Store secrets in a local encrypted vault.
2. Group keys by service and workspace.
3. Map keys to environment variables.
4. Activate a workspace for new shells, or run one command with env vars injected.

### Highlights

| Capability | What it does |
| --- | --- |
| **Local encrypted vault** | Keeps secret groups and key entries on your machine. |
| **Workspace activation** | Persists a selected workspace into KeyDock's active env cache for new shells. |
| **One-shot command injection** | Runs a command with a workspace's env vars without changing global shell state. |
| **Desktop control center** | Tauri + React UI for dashboard, secrets, workspaces, audit, and settings. |
| **Quick-start presets** | Built-in presets for OpenRouter, DeepSeek, Cloudflare, and Tavily. |
| **Audit visibility** | Tracks sensitive actions such as reveal, copy, export, and mutations. |
| **Shell integration** | Generates hooks for `zsh` and `bash`. |
| **Bilingual UI foundation** | Includes English and Chinese locale files powered by i18next. |

### How it feels

```bash
# Activate a workspace for future shells
keydock activate startup

# Check what is currently active
keydock current

# Run a command with a workspace injected just for this process
keydock run startup -- bun run dev

# Clean up active workspace cache
keydock deactivate
```

### Project architecture

```text
KeyDock
├─ src/                  # React desktop UI
│  ├─ components/         # Dashboard, secrets, workspaces, audit, settings
│  ├─ hooks/              # Vault, secrets, keys, workspaces, clipboard, theme, i18n
│  ├─ i18n/               # English / Chinese locale resources
│  └─ lib/tauri.ts        # Typed frontend bridge to Tauri commands
├─ src-tauri/             # Tauri shell and native command handlers
├─ crates/keydock-core/   # Vault, crypto, storage, models, workspace env logic
└─ crates/keydock-cli/    # `keydock` command-line interface
```

### Quick start

#### Prerequisites

- [Bun](https://bun.sh/)
- [Rust](https://www.rust-lang.org/tools/install)
- Platform requirements for [Tauri v2](https://tauri.app/)

#### Install and run

```bash
bun install
bun run tauri dev
```

#### Build frontend assets

```bash
bun run build
```

#### Run Rust tests

```bash
cargo test
```

#### Inspect the CLI

```bash
cargo run -p keydock-cli -- --help
```

### CLI reference

```bash
keydock activate <workspace>      # Persist workspace env vars for new shells
keydock deactivate                # Remove the active plaintext env cache
keydock current                   # Show the active workspace
keydock hook <zsh|bash>           # Print shell hook code
keydock list                      # List workspaces and mapped env vars
keydock open                      # Open the KeyDock desktop app on macOS
keydock run <workspace> -- <cmd>  # Run a command with workspace env vars
```

### Security model

KeyDock is designed as a **local-first** vault:

- A master password derives a key with **Argon2id**.
- A local data-encryption key is decrypted after unlock.
- The decrypted key stays in app memory while the vault is unlocked.
- Workspace activation writes a plaintext env cache so new shells can load mapped variables.
- Touch ID / passkey unlock is planned as a convenience path, not the root trust anchor.

> Treat activated workspace env caches like any other plaintext shell secret: convenient, local, and intentionally short-lived in your workflow.

### Current scope

Implemented / in progress:

- Local encrypted secret groups
- Multiple key entries per secret
- Sensitive and non-sensitive entries
- Workspace-to-env mapping
- CLI workspace activation and one-shot command injection
- Tauri desktop UI
- Quick copy formats
- Audit log UI
- English / Chinese app localization resources

Deferred:

- Local HTTP API
- Health checks
- Cloud sync
- Team sharing
- RBAC
- Plugin system
- Automatic workspace switching

### Development workflow

```bash
# install dependencies
bun install

# launch desktop app
bun run tauri dev

# run frontend build
bun run build

# run Rust tests
cargo test
```

---

## 中文

> KeyDock 把分散的 API Key、云服务 Token、模型端点和项目级环境变量，收进一个**本地加密的工作区**；你可以通过桌面端或 CLI 一键激活。

### 为什么需要 KeyDock？

今天的开发工作流里到处都是密钥：AI 服务商 Key、代理地址、账号 ID、云平台 Token、搜索 API、客户项目凭证。把它们复制到不同 `.env` 文件里很脆弱；全局导出到 shell 又不安全。

KeyDock 提供一个更清晰的闭环：

1. 把密钥存进本地加密保险库。
2. 按服务和工作区组织 Key。
3. 将 Key 映射为环境变量。
4. 为新 shell 激活一个工作区，或只给某一次命令注入环境变量。

### 亮点功能

| 能力 | 说明 |
| --- | --- |
| **本地加密保险库** | Secret 分组与 Key 条目保存在本机。 |
| **工作区激活** | 将选中的工作区写入 KeyDock 的 active env cache，供新 shell 加载。 |
| **单次命令注入** | 不污染全局 shell 状态，只给当前命令注入工作区环境变量。 |
| **桌面控制台** | 基于 Tauri + React，包含 Dashboard、Secrets、Workspaces、Audit、Settings。 |
| **快速预设** | 内置 OpenRouter、DeepSeek、Cloudflare、Tavily 等常用服务预设。 |
| **审计可见性** | 记录 reveal、copy、export、mutation 等敏感操作。 |
| **Shell 集成** | 支持生成 `zsh` / `bash` hook。 |
| **双语基础** | 内置 English / 中文 locale，基于 i18next。 |

### 使用体验

```bash
# 为后续新 shell 激活一个工作区
keydock activate startup

# 查看当前激活状态
keydock current

# 仅为这一次命令注入工作区环境变量
keydock run startup -- bun run dev

# 清除当前激活的工作区缓存
keydock deactivate
```

### 项目架构

```text
KeyDock
├─ src/                  # React 桌面端 UI
│  ├─ components/         # Dashboard、Secrets、Workspaces、Audit、Settings
│  ├─ hooks/              # Vault、Secrets、Keys、Workspaces、Clipboard、Theme、i18n
│  ├─ i18n/               # 英文 / 中文语言资源
│  └─ lib/tauri.ts        # 前端到 Tauri commands 的类型化桥接
├─ src-tauri/             # Tauri 外壳与原生命令处理
├─ crates/keydock-core/   # Vault、Crypto、Storage、Models、Workspace env 逻辑
└─ crates/keydock-cli/    # `keydock` 命令行工具
```

### 快速开始

#### 环境要求

- [Bun](https://bun.sh/)
- [Rust](https://www.rust-lang.org/tools/install)
- [Tauri v2](https://tauri.app/) 对应平台依赖

#### 安装并启动

```bash
bun install
bun run tauri dev
```

#### 构建前端资源

```bash
bun run build
```

#### 运行 Rust 测试

```bash
cargo test
```

#### 查看 CLI 帮助

```bash
cargo run -p keydock-cli -- --help
```

### CLI 命令速查

```bash
keydock activate <workspace>      # 为新 shell 持久化工作区环境变量
keydock deactivate                # 删除当前 active plaintext env cache
keydock current                   # 查看当前激活的工作区
keydock hook <zsh|bash>           # 输出 shell hook 代码
keydock list                      # 列出工作区和已映射的环境变量
keydock open                      # 在 macOS 上打开 KeyDock 桌面端
keydock run <workspace> -- <cmd>  # 使用工作区环境变量运行命令
```

### 安全模型

KeyDock 的默认设计是 **local-first**：

- 使用 master password，并通过 **Argon2id** 派生密钥。
- 解锁后解密本地 data-encryption key。
- 保险库解锁期间，解密后的 key 只保留在应用内存中。
- 工作区激活会写入 plaintext env cache，让新 shell 能加载映射后的变量。
- Touch ID / passkey 计划作为便利解锁路径，而不是唯一根密钥。

> 请像对待其它明文 shell secret 一样对待已激活的工作区缓存：它是本地的、方便的，也应当只在需要时短期存在。

### 当前范围

已实现 / 进行中：

- 本地加密 Secret 分组
- 每个 Secret 支持多个 Key 条目
- 敏感与非敏感条目
- Workspace 到环境变量的映射
- CLI 工作区激活与单次命令注入
- Tauri 桌面端 UI
- Quick copy 格式
- Audit log UI
- 英文 / 中文应用语言资源

暂缓：

- Local HTTP API
- Health checks
- Cloud sync
- Team sharing
- RBAC
- Plugin system
- Automatic workspace switching

### 开发工作流

```bash
# 安装依赖
bun install

# 启动桌面端
bun run tauri dev

# 前端构建
bun run build

# Rust 测试
cargo test
```

---

<p align="center">
  Built for developers who switch projects, models, clouds, and clients all day.
  <br />
  为每天在项目、模型、云服务和客户之间切换的开发者而生。
</p>
