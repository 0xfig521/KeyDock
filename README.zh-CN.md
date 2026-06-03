<p align="center">
  <img src="public/icon.png" alt="KeyDock logo" width="96" height="96" />
</p>

<h1 align="center">KeyDock</h1>

<p align="center">
  <strong>面向 AI 时代的开发者密钥工作台。</strong>
  <br />
  本地优先的密钥管理、基于工作区的环境变量注入，以及一个精致的桌面控制中心。
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

> KeyDock 把分散的 API Key、云服务 Token、模型端点和项目级环境变量，收进一个**本地加密的工作区**；你可以通过桌面端或 CLI 一键激活。

## 为什么需要 KeyDock？

今天的开发工作流里到处都是密钥：AI 服务商 Key、代理地址、账号 ID、云平台 Token、搜索 API、客户项目凭证。

把它们复制到不同 `.env` 文件里很脆弱；全局导出到 shell 又不安全。

KeyDock 提供一个更清晰的闭环：

1. 把密钥存进本地加密保险库。
2. 按服务和工作区组织 Key。
3. 将 Key 映射为环境变量。
4. 为新 shell 激活一个工作区，或只给某一次命令注入环境变量。

## 亮点功能

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

## 使用体验

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

## 项目架构

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

## 快速开始

### 环境要求

- [Bun](https://bun.sh/)
- [Rust](https://www.rust-lang.org/tools/install)
- [Tauri v2](https://tauri.app/) 对应平台依赖

### 安装并启动

```bash
bun install
bun run tauri dev
```

### 构建前端资源

```bash
bun run build
```

### 运行 Rust 测试

```bash
cargo test
```

### 查看 CLI 帮助

```bash
cargo run -p keydock-cli -- --help
```

## CLI 命令速查

```bash
keydock activate <workspace>      # 为新 shell 持久化工作区环境变量
keydock deactivate                # 删除当前 active plaintext env cache
keydock current                   # 查看当前激活的工作区
keydock hook <zsh|bash>           # 输出 shell hook 代码
keydock list                      # 列出工作区和已映射的环境变量
keydock open                      # 在 macOS 上打开 KeyDock 桌面端
keydock run <workspace> -- <cmd>  # 使用工作区环境变量运行命令
```

## 安全模型

KeyDock 的默认设计是 **local-first**：

- 使用 master password，并通过 **Argon2id** 派生密钥。
- 解锁后解密本地 data-encryption key。
- 保险库解锁期间，解密后的 key 只保留在应用内存中。
- 工作区激活会写入 plaintext env cache，让新 shell 能加载映射后的变量。
- Touch ID / passkey 计划作为便利解锁路径，而不是唯一根密钥。

> 请像对待其它明文 shell secret 一样对待已激活的工作区缓存：它是本地的、方便的，也应当只在需要时短期存在。

## 当前范围

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

## 开发工作流

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
  为每天在项目、模型、云服务和客户之间切换的开发者而生。
</p>
