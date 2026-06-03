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
  <a href="README.md">English</a>
  ·
  <a href="README.zh-CN.md">中文</a>
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

<p align="center">
  Built for developers who switch projects, models, clouds, and clients all day.
</p>
