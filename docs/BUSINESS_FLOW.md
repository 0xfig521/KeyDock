# KeyDock 业务流程梳理

> 范围：`src/main.tsx` (前端) · `src-tauri/src/lib.rs` (Tauri 桥) · `crates/keydock-core/src/*` (核心) · `crates/keydock-cli/src/main.rs` (CLI)
> 视角：从前端每一个按钮开始，反向追踪到数据落盘与审计日志

---

## 0. 总体架构

```
┌─────────────────────────────────────────┐
│  React (src/main.tsx) — 1675 行单文件    │
│  - 锁屏 / 主界面两态                     │
│  - 三个 Tab: Secrets / Workspaces / Audit│
└────────────────┬────────────────────────┘
                 │ invoke<T>("command", args)
                 ▼
┌─────────────────────────────────────────┐
│  Tauri Bridge (src-tauri/src/lib.rs)    │
│  24 个 #[tauri::command]                 │
│  - AppState: db_path + Mutex<Option<DEK>>│
└────────────────┬────────────────────────┘
                 │ keydock-core::AppStore
                 ▼
┌─────────────────────────────────────────┐
│  keydock-core                            │
│  - vault.rs: master 密码 + DEK 加解密    │
│  - crypto.rs: XChaCha20Poly1305          │
│  - storage.rs: SQLite (5 张表) + audit   │
│  - keychain.rs: OS keyring (仅占位)      │
└────────────────┬────────────────────────┘
                 │ rusqlite + XChaCha20Poly1305
                 ▼
       ~/Library/Application Support/KeyDock/keydock.sqlite3
       (Linux: ~/.local/share/KeyDock/, Win: %APPDATA%)
```

**关键不变量**：
- DEK（数据加密密钥）只以 `Mutex<Option<Vec<u8>>>` 形式存在于 AppState 内存中
- 锁定 = `dek = None`；解锁失败或进程退出 = DEK 释放
- 敏感字段（`api_keys.encrypted_value`）永不出现在 list API（`list_api_keys` 不返回明文）
- 所有 reveal/copy/export 都会落 audit_logs

---

## 1. Vault 生命周期（开/关数据库）

### 1.1 启动时检查 vault 状态
- **触发**：App 挂载时 `useEffect`
- **代码**：`main.tsx:259-265`
- **调用**：`invoke<{initialized: boolean}>("get_vault_status")`
- **Tauri**：`get_vault_status` → `vault_status(&db_path)`
- **Core**：`vault.rs:18-24`，检查 `vault_meta.encrypted_dek` 是否存在
- **决定 UI**：`!vaultInitialized` → "Create Master Vault"；`vaultInitialized` → "Unlock Insurance Vault"

### 1.2 创建 Vault（首次使用）
- **触发**：锁屏表单提交 (`submitMasterPassword` @ `main.tsx:331-352`)
- **流程**：
  1. `invoke("setup_master_password", { password })`
  2. Tauri `setup_master_password` → `initialize_vault(&db_path, &password)`
  3. `vault.rs:26-45`：
     - 生成 16-byte 盐 → `Argon2id(19MB, t=2, p=1)` 派生 32-byte KEK
     - 生成 32-byte 随机 DEK
     - 用 KEK 加密 DEK (XChaCha20Poly1305) → 存 `vault_meta.kdf_salt` + `vault_meta.encrypted_dek`
     - 触发 `AppStore::open()` 跑 migration
  4. 内存缓存 `dek = Some(dek)`
  5. 前端 `setVaultReady(true)` + `refresh()` 拉取所有数据

### 1.3 解锁 Vault
- **触发**：同上表单提交（`vaultInitialized === true`）
- **调用**：`invoke("unlock_master_password", { password })`
- **Tauri**：`unlock_vault` → `vault.rs:47-57`：
  - 取 `kdf_salt` + `encrypted_dek` → 重派生 KEK → 解密 DEK
  - 错误密码 = 解密失败 = `anyhow!("decrypt secret")` 异常 → 前端 toast "incorrect password"
- **强约束**：`crypto.rs:73-75` 强制密码 ≥ 8 字符

### 1.4 锁定 Vault
- **按钮**：侧边栏底部 "Lock Database" (`main.tsx:838-845`)
- **处理**：`handleLockVault` → `invoke("lock_vault")` → `dek = None`
- **前端副作用**：
  - `setRevealed({})` — 立刻清掉所有已揭示的明文缓存
  - `setExportedEnv("")` — 立刻清掉导出的 .env 内容
  - UI 回到锁屏

### 1.5 ⚠️ 安全空白（值得记录）
- **`keychain.rs` 整个模块未被使用** — `load_or_create_master_key` 没有调用方，OS keyring 是死代码
- 当前完全依赖用户密码，无 Touch ID / 恢复短语
- 这与 `docs/SECURITY_MODEL.md` 中"Touch ID/passkey 延后"的设计一致，但 keychain.rs 模块应当删除或保留待用

---

## 2. Secrets & Keys Tab（服务与凭证）

### 2.1 Tab 切换
- **按钮**：`Secrets & Keys` / `Workspaces` / `Security Audit` (左栏 `main.tsx:773-822`)
- **逻辑**：`setActiveTab(tab)`
- **副作用**：
  - 切到 secrets → `setShowApiKeyForm(false)`，关闭未保存的 API key 表单
  - 切到 workspaces → `setExportedEnv("")`，清掉上次导出的 .env
  - 切到 audit → 无副作用（数据由 `refresh()` 拉取时同步）

### 2.2 创建服务（Secret Group）
- **按钮**：Services 列右上角 `+` (`main.tsx:860-870`)
- **前置**：点击时 `setShowSecretForm(!showSecretForm)`，并重置 `secretForm = emptySecretForm` + `editingSecretId = ""`
- **表单字段** (`main.tsx:950-1022`)：name / category / baseUrl / modelName / tags / description
- **提交**：`handleSaveSecret` (`main.tsx:366-425`)
- **去重检查**（前端）`main.tsx:371-385`：
  - 创建：检查 `secrets.some(s => s.name === form.name)`
  - 编辑：排除自身后再查
  - 重复 → toast 报错，不发请求
- **Tauri 调用**：
  - 创建 → `create_secret({ input })` → `AppStore::create_secret()` (`storage.rs:147-171`)
  - 编辑 → `update_secret({ id, input })` → `AppStore::update_secret()` (`storage.rs:173-196`)
- **数据库**：`secrets` 表 INSERT/UPDATE，name 唯一约束
- **Audit**：创建 `create_secret`、编辑 `edit_secret`，`target_id = secret.id`
- **前端副作用**：表单关闭，列表自动选中新建项

### 2.3 编辑服务
- **按钮**：服务详情页头部 "Edit Group" (`main.tsx:1058-1078`)
- **处理**：
  1. `editingSecretId = id`
  2. 用现有值回填 `secretForm`
  3. `setShowSecretForm(true)` 进入编辑态
- **注意**：dashboardUrl 字段从 TS 接口存在但 Rust 端不接收（`docsUrl/loginUrl/notes` 一律写 null），字段显示但未持久化
- **取消编辑**：底部 "Cancel" 按钮 (`main.tsx:1026-1032`) — 关闭表单但**不会**清掉 `editingSecretId`，下次打开仍为编辑态（潜在 bug，见 §6）

### 2.4 删除服务
- **按钮**：服务详情页头部 "Delete Group" (`main.tsx:1080-1088`)
- **处理**：`handleDeleteSecret` (`main.tsx:427-437`)
  - `confirm()` 弹窗确认
  - `invoke("delete_secret", { idOrName: id })`
  - Tauri → `storage.rs:230-236` → `DELETE FROM secrets WHERE id = ?`
  - **级联清理**（迁移时启用 `PRAGMA foreign_keys = ON`）：
    - `api_keys.secret_id ON DELETE CASCADE` → 关联 key 全删
    - `workspace_variables.secret_id/api_key_id ON DELETE CASCADE` → 映射全删
  - Audit `delete_secret`
- **前端**：`setSelectedSecret("")` → `refresh()` 重新拉取

### 2.5 添加 API Key
- **按钮**：服务详情 "Add API Key" (`main.tsx:1116-1132`)
- **前置**：自动预填表单
  - `name = "default"`
  - `envName = serviceName.toUpperCase().replace(/[^A-Z0-9]/g, "_") + "_API_KEY"`
- **表单字段** (`main.tsx:1151-1196`)：name / envName / value (password) / includeByDefault
- **提交**：`handleCreateApiKey` (`main.tsx:439-470`)
- **去重**：同服务下不能重名
- **Tauri**：`create_api_key({ secret, input })` → `storage.rs:238-264`
  - 验证 `env_name` 通过 `validate_env_name`（必须 ASCII 大写字母/数字/下划线）
  - `encrypt_secret(&master_key, &value)` → `v1:base64(nonce):base64(ciphertext)` 存 `encrypted_value`
  - Audit `create_api_key`
- **前端**：自动选中当前 service 并 `refresh()`

### 2.6 揭示 API Key 明文
- **按钮**：每个 key 右侧 "👁 Reveal Key" (`main.tsx:1245-1253`)
- **处理**：`handleRevealKey` (`main.tsx:483-500`)
  1. `invoke<string>("reveal_api_key", { apiKey: id })` → Tauri `storage.rs:316-326`
  2. Core 端：`api_key_value()` 取 `encrypted_value` → `decrypt_secret()` → 返回明文
  3. 同步写 audit `reveal_api_key`（包含 env_name）
  4. 前端 `setRevealed({...prev, [id]: value})`
  5. **30 秒自动隐藏**：`setTimeout(..., 30000)` 从 `revealed` 删掉
- **安全特性**：明文仅存在于 React state `revealed`，不会落盘
- **安全空白**：明文会出现在 DevTools React state 中（无桌面专属防截屏）

### 2.7 复制 API Key
- **按钮**：👁 旁边 "Copy Value" (`main.tsx:1255-1268`)
- **前提**：`!val` (未 reveal) 时按钮 disabled
- **处理**：`handleCopyText(val, "API Key Value", key.id, envName)` (`main.tsx:603-628`)
  1. `invoke("quick_copy_text", { text })` → Tauri 用 `arboard::Clipboard` 写系统剪贴板
  2. `invoke("audit_copy", { targetId, workspaceId, envName })` → 写 audit
  3. UI 显示 4 秒 ✓ 图标（`copiedText === val`）
  4. **30 秒后清剪贴板**：`invoke("clear_clipboard_if_matches", { expected: text })` — 仅当剪贴板内容仍是原值才清

### 2.8 删除 API Key
- **按钮**：每个 key 最右侧 "🗑 Delete Key" (`main.tsx:1270-1278`)
- **处理**：`handleDeleteApiKey` → `delete_api_key` → `storage.rs:328-339`
  - 解析 id 或 `secret/key-name` 路径
  - DELETE + audit `delete_api_key`
  - 级联清理 `workspace_variables`

### 2.9 快速开始 Presets
- **按钮**：Dashboard 欢迎页 4 张预设卡片 (OpenRouter / DeepSeek / Cloudflare / Tavily) (`main.tsx:1301-1322`)
- **处理**：`handleApplyPreset(preset)` (`main.tsx:630-649`)
  - 把预设值写进 `secretForm` + `apiKeyForm`，并打开 secret form
  - **不直接调后端** — 只是填表，用户还需点 "Create Group" → 触发正常创建流程
  - 之后还要单独 "Add API Key" 创建 key（preset 不会自动建 key）

### 2.10 搜索 Services
- **控件**：Services 列顶部搜索框 (`main.tsx:873-879`)
- **逻辑**：`main.tsx:293-298` — `filteredSecrets` 按 name 或 tags 子串匹配
- **无后端调用** — 纯前端过滤

---

## 3. Workspaces Tab（环境注入编排）

### 3.1 创建 Workspace
- **按钮**：Workspaces 列顶部表单 `+` (`main.tsx:1350-1360`)
- **输入约束**：`onChange` 中 `toLowerCase().replace(/[^a-z0-9_-]/g, "")` — 强制 kebab-case
- **去重**：`handleCreateWorkspace` (`main.tsx:502-525`) — 不允许同名
- **Tauri**：`create_workspace({ name, description: null })` → `storage.rs:341-350`
  - 简单 INSERT，无加密字段
- **Audit**：无（设计取舍 — workspace 创建不算敏感操作）

### 3.2 选择 Workspace
- **按钮**：左栏 workspace 列表项 (`main.tsx:1372-1390`)
- **副作用**：
  - `setSelectedWorkspace(ws.id)`
  - `setExportedEnv("")` — 切走时清掉旧导出
  - 通过 `useEffect([selectedWorkspace, vaultReady])` (`main.tsx:268-275`) 自动 `list_workspace_variables` 拉取映射

### 3.3 删除 Workspace
- **按钮**：工作区详情页头部 "Delete Workspace" (`main.tsx:1408-1416`)
- **Tauri**：`delete_workspace` → `storage.rs:372-379`
  - 级联清 `workspace_variables`
  - **无 audit**（同创建）

### 3.4 映射 API Key → ENV 变量
- **控件**：内联表单 (`main.tsx:1438-1491`)
  - "API Key Source" Select — 列出**所有** api_keys (跨 service)，格式 `secretName/keyName`
  - "Export Environment Name" Input — 自定义 ENV 名
- **UX 联动** (`main.tsx:1447-1451`)：选 key 时自动填入该 key 的默认 `envName`
- **提交**：`handleMapVariable` (`main.tsx:539-560`)
- **Tauri**：`set_workspace_variable({ workspace, envName, apiKey })` → `storage.rs:381-411`
  - 验证 env_name 合法
  - `UNIQUE(workspace_id, env_name)` — 同 workspace 同 env 名 → UPSERT
  - 自动分配 `sort_order = MAX + 1`
  - Audit `edit_workspace`（注意 action 名复用了 edit_workspace，详见 §6）

### 3.5 批量添加 Service 默认 Keys
- **按钮**：映射区右上 "Add selected service defaults" (`main.tsx:1426-1434`)
- **前提**：`selectedSecret && selectedWorkspace`（需要左侧 secrets tab 选中服务）
- **Tauri**：`add_secret_default_api_keys_to_workspace({ workspace, secret })` → `storage.rs:413-433`
  - 过滤出 `include_by_default === true && env_name.is_some()` 的 key
  - 对每个 key 调用 `set_workspace_variable`
- **反馈**：toast 显示映射数量

### 3.6 解绑 ENV 变量
- **按钮**：映射项右侧 "Unbind" (`main.tsx:1509-1516`)
- **处理**：`handleRemoveVariable(envName)` → `delete_workspace_variable`
- **Audit**：`edit_workspace`，`env_name` 记录被删的 env 名

### 3.7 复制 shell 命令
- **控件**：工作区详情 "Terminal Inject Command" 整块可点 (`main.tsx:1532-1538`)
- **行为**：模板化 `keydock run -w <name> -- bun run dev`，调用 `handleCopyText` 走通用复制流程（含 30s 清剪贴板 + audit）
- **注意**：复制的是**建议命令字符串**，不是实际值，不会暴露明文

### 3.8 导出 .env
- **按钮**：右侧 "Generate .env" (`main.tsx:1549-1556`)
- **处理**：`handleExportWorkspace` (`main.tsx:592-601`)
  - `invoke<string>("export_env", { workspace })` → `storage.rs:551-556`
  - Core 端：`workspace_env()` 遍历 `workspace_variables` JOIN secrets + api_keys，对每条解密 value → `format_env()` 拼成 `KEY=VALUE\n...`
  - **shell 转义**：`storage.rs:729-738` 简单字符集判断，非字母数字+_-./: → 单引号包裹
  - Audit `export`（无 env_name 字段）
- **前端**：写到 `exportedEnv` state，下方显示只读 `<Textarea>`
- **再复制**："Copy .env parameters" 按钮 (`main.tsx:1566-1572`) — 走通用 `handleCopyText` 流程，**明文会进剪贴板**

---

## 4. Security Audit Tab

### 4.1 刷新日志
- **按钮**：右上 "Reload logs" (`main.tsx:1603-1611`)
- **处理**：直接调 `refresh()` (`main.tsx:301-329`) → 并发拉 secrets/keys/workspaces/audit 全部数据
- **当前**：`refresh()` 总是拉**所有**数据，单纯刷新 audit 有点重（潜在优化点，见 §6）

### 4.2 显示
- **数据源**：`auditLogs` state，由 `refresh()` 从 `invoke("list_audit_logs", { limit: 50 })` 拉取
- **排序**：后端 `ORDER BY created_at DESC LIMIT ?` (`storage.rs:572-588`)
- **颜色编码** (`main.tsx:1627-1631`)：action 含 `copy`/`reveal` → 琥珀色；其他 → 翠绿色

### 4.3 Audit 写入触发点全表
| Action 名 | 触发位置 | 字段 |
|---|---|---|
| `create_secret` | `storage.rs:168` (create_secret) | target_id=secret_id |
| `edit_secret` | `storage.rs:193` (update_secret) | target_id=secret_id |
| `delete_secret` | `storage.rs:234` (delete_secret) | target_id=secret_id |
| `create_api_key` | `storage.rs:261` (create_api_key) | target_id=key_id |
| `reveal_api_key` | `storage.rs:319` (reveal_api_key) | target_id=key_id, env_name=key.env_name |
| `delete_api_key` | `storage.rs:332` (delete_api_key) | target_id=key_id, env_name=key.env_name |
| `edit_workspace` | `storage.rs:403` (set_workspace_variable) | target_id=key_id, workspace_id, env_name |
| `edit_workspace` | `storage.rs:464` (delete_workspace_variable) | workspace_id, env_name |
| `export` | `storage.rs:554` (export_env_text) | workspace_id |
| `copy` | `main.tsx:606` → `audit_copy` Tauri 命令 | target_id, workspace_id, env_name |

**⚠️ 命名不一致**：
- Core 写入的叫 `edit_workspace`，但前端 `audit.tsx` 用 `log.action.includes("copy")` / `reveal` 区分敏感度，"edit" 被归到绿色
- Tauri 桥里的 `audit_copy` 命令也写 action=`"copy"`（与 cli 端的 `copy_command` 一致）
- 建议：统一命名为 `map_workspace_variable` / `unmap_workspace_variable` / `copy` / `export` / `reveal`

---

## 5. 通用能力

### 5.1 剪贴板（前端走 arboard）
- **写入**：`quick_copy_text({ text })` → `arboard::Clipboard::set_text()`
- **条件清空**：`clear_clipboard_if_matches({ expected })` → 仅当剪贴板当前内容 == expected 时才清空
- **CLI 等价物**：`copy_command` 阻塞当前线程 `thread::sleep(Duration::from_secs(clear_after))` 再清剪贴板

### 5.2 错误处理
- 前端 `showError(error)` (`main.tsx:651-657`) 统一从 `error.message` 抽消息 → toast 显示
- Tauri `CommandError` (`src-tauri/src/lib.rs:9-21`) 把 `anyhow::Error` 包成 `{ message }` 序列化
- Core 端用 `anyhow!` + `?` 链路，错误链会冒泡到前端

### 5.3 状态持久化
- 整个 DB 都在 `~/Library/Application Support/KeyDock/keydock.sqlite3`
- DEK 不持久化 → 重启后必须输入 master 密码
- 环境变量 `KEYDOCK_DB_PATH` 可覆盖 DB 路径（CLI 用）
- 环境变量 `KEYDOCK_MASTER_PASSWORD` 可跳过 CLI 密码输入（仅 CLI 用，桌面端无此快捷方式）

---

## 6. 潜在问题与建议

### 6.1 业务正确性
| 严重 | 位置 | 问题 | 建议 |
|---|---|---|---|
| 中 | `main.tsx:1026-1032` | "Cancel" 关表单但不清 `editingSecretId` — 下次点 `+` 创建时会带着上次编辑的 ID | Cancel 时同步 `setEditingSecretId("")` |
| 中 | `main.tsx:1353` | workspace 名称强制小写，但 `setMappingEnv` 输出大写 — 不一致 | 统一规范或放宽 |
| 低 | `main.tsx:1067` | 编辑 secret 表单把 `dashboardUrl` 读出来但 `input.dashboardUrl` 一律写 null (`main.tsx:397`) — 用户改了也丢 | 完整 round-trip 或 UI 删字段 |
| 低 | `main.tsx:402-409` | `editingSecretId` 存在但 service 切换 (`onClick @894`) 也只清自己保留的 `editingSecretId`；不切换时存在脏状态 | 抽到 `setSelectedSecret` 内部统一重置 |
| 低 | `storage.rs:401-411` | UPSERT 时 `id = ?1` 但用的是新生成的 UUID → ON CONFLICT 实际是覆盖其他字段，行的 id 会**保持原值**（因为 INSERT 的 id 与已有行的 id 冲突，被外键/CONFLICT 忽略） | UPSERT 时用 COALESCE 或显式查询 |
| 低 | `storage.rs:403` | audit `edit_workspace` 实际是 set variable 动作 — 命名误导 | 改 `map_workspace_variable` |

### 6.2 性能
| 严重 | 位置 | 问题 | 建议 |
|---|---|---|---|
| 中 | `main.tsx:301-329` | `refresh()` 总是并发 4 个 invoke + 1 个 variables；切 workspace 单独又 invoke 一次 | 拆出 `refreshAudit()` 单独刷新 |
| 低 | `main.tsx:225` | 每次 Tab 切换都重新渲染整个 secrets/workspaces 列表 | 拆成独立子组件 + React.memo |
| 低 | `storage.rs:200` | `list_secrets` 没 LIMIT — 大量服务时变慢 | 加可选 limit + 索引 |

### 6.3 安全（与 docs/SECURITY_MODEL.md 对照）
| 严重 | 位置 | 问题 | 建议 |
|---|---|---|---|
| 高 | `crates/keydock-core/src/keychain.rs` | 整个模块未被使用，引入依赖但无功能 | 删除或启用 Touch ID 解锁路径 |
| 中 | `main.tsx:239` | `revealed` state 在 DevTools 可见 — 调试模式下能拿到所有明文 | 上线用 production build；考虑把明文放在 ref 而非 state |
| 中 | `main.tsx:490-496` | reveal 30s 超时在组件 unmount 后仍会跑 `setState` | 存 timer ref，unmount 时 clear |
| 中 | `main.tsx:1061-1078` | 编辑 secret 时回填了 `dashboardUrl` 但永远不会被持久化（Rust 端写 null） | 要么把字段全打通，要么 UI 删字段 |
| 低 | `main.tsx:1245-1253` | reveal 按钮无冷却 — 30s 内连续点会重置计时器 | 记录开始时间，到点才清 |
| 低 | `storage.rs:320` | reveal audit 写的是 `env_name` 但 `target_id` 是 api_key_id — 没记录 workspace 上下文 | 加可选 workspace 维度 |

### 6.4 UX/可用性
| 严重 | 位置 | 问题 | 建议 |
|---|---|---|---|
| 中 | `main.tsx:1546-1574` | 导出 .env 后无"清空"按钮；下次生成会覆盖，但用户可能误复制旧的 | 加显式"刷新导出"按钮 |
| 中 | `main.tsx:1290-1322` | preset 卡片点完只填表，不会自动建 service+key | 改成"一键创建"流程 |
| 中 | `main.tsx:1301-1322` | Dashboard 无快速"去创建 workspace"入口 | 加一个 CTA |
| 低 | `main.tsx:1140-1147` | API Key form 的 "Cancel" 按钮文案与 "X" 风格不一致 | 统一 |
| 低 | `main.tsx:1599-1601` | Audit tab 文案是"local database decryption" — 仅 reflect reveal/copy 的部分 | 补完整说明 |

---

## 7. 数据流总览（一图流）

```
                    ┌──────────────────────┐
   User 输入主密码  →│ vault.rs:initialize  │→ vault_meta 表
                    │ vault.rs:unlock      │→ 返回 DEK
                    └──────────┬───────────┘
                               │ DEK
                               ▼
                    ┌──────────────────────┐
   User 增删改查 ──→│ AppStore (rusqlite)  │←──┐
   services/keys   │ + XChaCha20Poly1305   │   │
   workspace/map   │                       │   │
                    └──────────┬───────────┘   │
                               │ 明文/密文       │
                               ▼                │
                    ┌──────────────────────┐   │
   reveal/copy ──→ │ decrypt + audit_logs │───┘
   export         │                       │
                    └──────────┬───────────┘
                               │
                               ▼
                  ① React state (UI 立即显示)
                  ② Tauri arboard (剪贴板)
                  ③ stdout (CLI `keydock run`)
```

---

## 8. CLI 与 Desktop 的功能矩阵

| 业务能力 | Desktop (Tauri) | CLI |
|---|---|---|
| Vault 初始化 | `setup_master_password` (UI 表单) | `keydock vault init --password` |
| Vault 解锁 | `unlock_master_password` (UI 表单) | 用 `KEYDOCK_MASTER_PASSWORD` env |
| Vault 锁定 | "Lock Database" 按钮 | 进程退出自动清 |
| 创建 service | UI 表单 | `keydock secret create` |
| 列出 service | UI 自动 | `keydock secret list` |
| 编辑 service | UI 表单 | ❌ 无（CLI 缺 update） |
| 删除 service | UI 按钮 | `keydock secret delete` |
| 添加 api key | UI 表单 | `keydock api-key add` |
| 列出 api key | UI 自动 | `keydock api-key list` |
| Reveal 明文 | UI 👁 按钮（30s） | `keydock api-key get` (无超时) |
| 复制到剪贴板 | UI 📋 按钮（30s 清） | `keydock copy <api_key> --clear-after 30` |
| 创建 workspace | UI 表单 | `keydock workspace create` |
| 列出 workspace | UI 自动 | `keydock workspace list` |
| 映射变量 | UI 表单 | `keydock workspace add-secret` / `workspace add` |
| 解绑变量 | UI Unbind 按钮 | `keydock workspace unset` |
| 删除 workspace | UI 按钮 | `keydock workspace delete` |
| 导出 .env | UI Generate 按钮 | `keydock export workspace` / `export secret` / `export api-key` |
| 启动命令注入 env | ❌ **不支持** (UI 只能复制命令文本) | `keydock run -w <ws> -- <cmd>` |
| 查看 audit | UI 列表 | `keydock audit --limit 50` |

**关键差异**：Desktop UI 跑不了 `keydock run` — 它只能"建议"命令让你复制到 shell。**这正是产品定位**：CLI 才是注入路径，UI 是管理面板。

---

## 9. 总结

- **业务闭环完整**：建库 → 解锁 → 建 service → 加 key → 映射到 workspace → 复制/导出/CLI run
- **审计覆盖良好**：除 workspace 自身 CRUD 外，所有密钥操作都留痕
- **前端代码组织差**：1675 行单文件 `main.tsx`，所有逻辑/UI/状态混在一起，迭代会很痛（**建议立即拆组件**）
- **dead code**：`keychain.rs` 整个模块未使用
- **CLI 缺 update_secret**，但 UI 有；CLI 缺 `run`-时的桌面端"Run"按钮，但产品定位如此
- **核心库设计良好**：命令/query/audit 三类职责清晰，纯 `&self` 方法无副作用竞争
