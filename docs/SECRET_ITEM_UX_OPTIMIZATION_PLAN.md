# KeyDock Secret 体验优化方案：API Key 的 1Password

> 目标：把 KeyDock 的 Secret 体验做成 **API Key / Credential 的 1Password**。  
> 范围：交互体验、信息架构、数据模型、Tauri API、前端类型、迁移策略、Presets 集成、实现计划。

## 1. 核心结论

KeyDock 的 Secret 不应该是 AI Provider 专用表单，也不应该固定包含 `Default Model`、`Docs URL`、`Login URL`、`Dashboard URL` 这类字段。

更合适的模型是：

```text
Secret Item = 一个通用 API Key / Credential 条目
Custom Field = 该条目的任意字段
Preset = 从 Secret Field 映射出可激活的环境变量合集
```

也就是：

```text
Secrets 像 1Password 一样管理 API Keys
Presets 像可激活的 env collection 一样组合和使用这些字段
```

产品心智：

> KeyDock is a 1Password-like vault for developer API keys, with activatable env presets.

中文：

> KeyDock 是开发者 API Key 的 1Password，并支持一键激活环境变量 Presets。

## 2. 当前状态与问题

当前模型中，`Secret` 和 `Key` 大致是：

```text
Secret
  id
  name
  category
  baseUrl
  tags
  description
  dashboardUrl
  docsUrl
  loginUrl
  notes

Key
  id
  secretId
  name
  envName
  includeByDefault
  tags
  description
  preview
  expiresAt
```

当前问题：

| 问题 | 说明 |
| --- | --- |
| 固定字段偏场景化 | `baseUrl/docsUrl/loginUrl/dashboardUrl` 对部分服务有用，但不是所有 API key 都有 |
| Secret/Key 心智割裂 | 用户理解的是一个 1Password item，但当前 Secret 和 Key 分成两个层级，表单更像后台配置 |
| 表单不够通用 | AI provider、cloud token、database credential、webhook secret、license key 都需要不同字段 |
| Preset 映射不够自然 | Preset 应该映射任意字段，而不是只映射 Key |
| 缺少 1Password 式交互 | 应有 masked/reveal/copy、字段分组、inline edit、模板预填、自定义字段 |

## 3. 设计原则

### 3.1 Item-first

用户看到的是一个 Secret Item，而不是数据库对象。

```text
OpenAI
  API Key        ********
  Base URL       https://api.openai.com/v1
  Organization   org_...
  Notes          ...
```

### 3.2 All provider-specific data is custom field

除了极少数基础元信息外，所有服务差异都进入 Custom Fields。

固定保留：

```text
Secret
  name
  icon
  category
  tags
  favorite
  notes
  fields[]
```

不要固定：

```text
baseUrl
websiteUrl
loginUrl
docsUrl
defaultModel
accountId
zoneId
projectId
```

这些都应该是字段。

### 3.3 Templates are suggestions, not constraints

Template 只负责创建初始字段。

用户可以：

- 删除字段。
- 重命名字段。
- 改字段类型。
- 修改是否敏感。
- 修改 env var 名称。
- 增加任意字段。

### 3.4 Copy without reveal

复制 secret 不应该要求 reveal。

- Copy 记录 audit。
- Reveal 记录 audit。
- Copy 后不显示明文。

### 3.5 Preset maps fields, not hardcoded keys

Preset entry 应映射到：

```text
SecretField.id
```

而不是只映射到旧的 `Key.id`。

## 4. 推荐信息架构

## 4.1 Secret Item

```text
SecretItem
  Header
    Icon
    Name
    Category
    Favorite
    Tags

  Fields
    Custom field list

  Notes
    Markdown/plain text notes

  Metadata
    Created / updated
    Last copied / revealed
    Audit summary
```

## 4.2 Custom Field

字段是 Secret 的核心。

```text
CustomField
  label
  type
  value
  sensitive
  purpose
  envName
  copyTemplates
  section
```

字段类型建议：

| Type | 用途 | 默认 sensitive |
| --- | --- | --- |
| `secret` | API key、token、password、webhook secret | true |
| `text` | account id、project id、model、region | false |
| `url` | dashboard/docs/login/base URL | false |
| `email` | account email | false |
| `number` | numeric id / port | false |
| `json` | service account JSON、credentials JSON | true |
| `env` | 已格式化 env var line | true/false 由用户定 |
| `note` | 多行说明 | false |
| `file` | 后续附件/证书文件 | true |

字段 purpose 建议：

```text
credential
identifier
endpoint
metadata
note
```

purpose 用于 UI 图标/排序/搜索，不限制字段。

## 5. 1Password 式交互设计

## 5.1 查看态：Secret Detail

布局：

```text
┌────────────────────────────────────────────┐
│ [Icon] OpenAI                         Edit │
│ AI Provider · tags                         │
├────────────────────────────────────────────┤
│ API Key              ********      Copy ⋯  │
│ Base URL             https://...    Copy   │
│ Organization ID      org_...        Copy   │
├────────────────────────────────────────────┤
│ Notes                                      │
│ Used for production API access...          │
└────────────────────────────────────────────┘
```

交互：

- 默认 masked sensitive fields。
- 行级 Copy。
- 行级 Reveal。
- 行级 More menu：copy as env、copy as export、copy value、edit field。
- Edit 后进入编辑态，保持同一页面/弹窗上下文，不跳到完全不同表单。

## 5.2 编辑态：Item Editor

类似 1Password item editor：字段列表可直接编辑。

```text
OpenAI                                      Save
Category: AI Provider
Tags: ai, production

Fields
  [API Key        ] [secret ▼] [*************] [ENV OPENAI_API_KEY] [⋯]
  [Base URL       ] [url    ▼] [https://...]  [ENV OPENAI_BASE_URL] [⋯]
  [Organization ID] [text   ▼] [org_...]      [no env]              [⋯]

+ Add field
+ Add section

Notes
  [textarea]
```

关键交互：

- 字段 label inline edit。
- 字段 type 下拉选择。
- sensitive toggle。
- env mapping inline 设置。
- 拖拽排序。
- Add Field 是主要 CTA。
- Save/Cancel 固定在底部或 header。

## 5.3 创建态：Template-first but editable

创建 Secret 的第一步不是长表单，而是选择入口：

```text
Create Secret
  Search templates...

Popular
  OpenAI
  Anthropic
  Cloudflare
  Vercel
  Supabase
  Stripe

Or create custom secret
```

选择 Cloudflare 后进入 item editor：

```text
Cloudflare
  Account ID      text
  API Token       secret
  Zone ID         text optional
```

但这些字段都可以删改。

## 5.4 搜索体验

搜索应跨：

- Secret name。
- Field label。
- Env var name。
- Tags。
- Category。
- Preset name。

搜索结果示例：

```text
openai
  Secret: OpenAI
  Field: OPENAI_API_KEY
  Preset: ai-dev
```

## 5.5 Empty State

Secrets 空状态：

```text
Create your first API key item
Store tokens like OpenAI, Cloudflare, Vercel, Supabase, and Stripe in a 1Password-like vault.

[Create from template] [Create custom secret]
```

Fields 空状态：

```text
No fields yet
Add fields like API Token, Account ID, Base URL, or any custom metadata.

[Add field]
```

## 6. 数据模型方案

## 6.1 推荐新模型

### Secret

```rust
pub struct Secret {
    pub id: String,
    pub name: String,
    pub category: SecretCategory,
    pub icon: Option<String>,
    pub favorite: bool,
    pub tags: Vec<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}
```

说明：

- 移除或弱化 `base_url/dashboard_url/docs_url/login_url/description`。
- `notes` 保留为 item-level notes。
- `description` 可并入 notes 或作为非敏感 field。

### SecretField

```rust
pub struct SecretField {
    pub id: String,
    pub secret_id: String,
    pub label: String,
    pub field_type: SecretFieldType,
    pub encrypted_value: Option<String>,
    pub value_preview: Option<String>,
    pub sensitive: bool,
    pub env_name: Option<String>,
    pub purpose: Option<SecretFieldPurpose>,
    pub section: Option<String>,
    pub sort_order: i64,
    pub enabled: bool,
    pub expires_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}
```

### SecretFieldType

```rust
pub enum SecretFieldType {
    Secret,
    Text,
    Url,
    Email,
    Number,
    Json,
    Env,
    Note,
    File,
}
```

### SecretFieldInput

```rust
pub struct SecretFieldInput {
    pub label: String,
    pub field_type: SecretFieldType,
    pub value: Option<String>,
    pub sensitive: bool,
    pub env_name: Option<String>,
    pub purpose: Option<SecretFieldPurpose>,
    pub section: Option<String>,
    pub sort_order: Option<i64>,
    pub enabled: bool,
    pub expires_at: Option<String>,
}
```

## 6.2 数据库表建议

### secrets

```sql
CREATE TABLE secrets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  icon TEXT,
  favorite INTEGER NOT NULL DEFAULT 0,
  tags_json TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### secret_fields

```sql
CREATE TABLE secret_fields (
  id TEXT PRIMARY KEY,
  secret_id TEXT NOT NULL REFERENCES secrets(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL,
  encrypted_value TEXT,
  sensitive INTEGER NOT NULL DEFAULT 1,
  env_name TEXT,
  purpose TEXT,
  section TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

索引：

```sql
CREATE INDEX idx_secret_fields_secret_id ON secret_fields(secret_id);
CREATE INDEX idx_secret_fields_env_name ON secret_fields(env_name);
CREATE INDEX idx_secret_fields_enabled ON secret_fields(enabled);
```

## 6.3 旧 Key 模型迁移

当前 `keys` 表可迁移为 `secret_fields`：

| 旧字段 | 新字段 |
| --- | --- |
| `keys.id` | `secret_fields.id` |
| `keys.secret_id` | `secret_fields.secret_id` |
| `keys.name` | `secret_fields.label` |
| `keys.encrypted_value` | `secret_fields.encrypted_value` |
| `keys.env_name` | `secret_fields.env_name` |
| `keys.description` | 可作为 field note 或 section metadata |
| `keys.expires_at` | `secret_fields.expires_at` |
| `keys.include_by_default` | 可迁移为 `enabled` 或 Preset 默认候选 |
| `keys.tags_json` | 可暂时保留到 field metadata，或不迁移 |

旧 Secret 固定字段迁移：

| 旧字段 | 新字段 |
| --- | --- |
| `base_url` | field: `Base URL`, type `url`, sensitive false |
| `dashboard_url` | field: `Dashboard URL`, type `url`, sensitive false |
| `docs_url` | field: `Docs URL`, type `url`, sensitive false |
| `login_url` | field: `Login URL`, type `url`, sensitive false |
| `description` | notes 前缀或 field: `Description`, type `note` |

如果用户已明确“不需要兼容”，可以直接替换模型；但如果已有数据，仍建议提供一次性迁移以保护用户数据。

## 7. Tauri API / 数据接口方案

## 7.1 Secret Item API

```ts
listSecrets(query?: SecretQuery): Promise<SecretSummary[]>
getSecret(idOrName: string): Promise<SecretDetail>
createSecret(input: SecretInput): Promise<SecretDetail>
updateSecret(id: string, input: SecretInput): Promise<SecretDetail>
deleteSecret(id: string): Promise<void>
```

### SecretSummary

```ts
interface SecretSummary {
  id: string
  name: string
  category: SecretCategory
  icon?: string | null
  favorite: boolean
  tags: string[]
  fieldCount: number
  sensitiveFieldCount: number
  envFieldCount: number
  updatedAt: string
}
```

### SecretDetail

```ts
interface SecretDetail extends SecretSummary {
  notes?: string | null
  fields: SecretField[]
  createdAt: string
}
```

## 7.2 Field API

```ts
listSecretFields(secret: string): Promise<SecretField[]>
createSecretField(secret: string, input: SecretFieldInput): Promise<SecretField>
updateSecretField(field: string, input: SecretFieldInput): Promise<SecretField>
deleteSecretField(field: string): Promise<void>
reorderSecretFields(secret: string, fieldIds: string[]): Promise<SecretField[]>
revealSecretField(field: string): Promise<string>
copySecretField(field: string, format?: CopyFormat): Promise<string>
```

说明：

- `copySecretField` 如果只是返回字符串给前端复制，也要记录 audit。
- 更安全的做法是后端直接写 clipboard，并只返回 success；但当前 Tauri clipboard 已在前端/插件中使用时可按现有模式演进。

### SecretField

```ts
interface SecretField {
  id: string
  secretId: string
  label: string
  fieldType: SecretFieldType
  sensitive: boolean
  envName?: string | null
  purpose?: SecretFieldPurpose | null
  section?: string | null
  sortOrder: number
  enabled: boolean
  preview?: string | null
  expiresAt?: string | null
  createdAt: string
  updatedAt: string
}
```

### SecretFieldInput

```ts
interface SecretFieldInput {
  label: string
  fieldType: SecretFieldType
  value?: string | null
  sensitive: boolean
  envName?: string | null
  purpose?: SecretFieldPurpose | null
  section?: string | null
  sortOrder?: number | null
  enabled: boolean
  expiresAt?: string | null
}
```

## 7.3 Template API

```ts
listSecretTemplates(): Promise<SecretTemplate[]>
getSecretTemplate(id: string): Promise<SecretTemplate>
createSecretFromTemplate(templateId: string, input: CreateFromTemplateInput): Promise<SecretDetail>
```

### SecretTemplate

```ts
interface SecretTemplate {
  id: string
  name: string
  category: SecretCategory
  icon?: string | null
  description?: string | null
  fields: SecretTemplateField[]
}
```

### SecretTemplateField

```ts
interface SecretTemplateField {
  label: string
  fieldType: SecretFieldType
  sensitive: boolean
  envName?: string | null
  required: boolean
  purpose?: SecretFieldPurpose | null
  placeholder?: string | null
  helpText?: string | null
}
```

## 7.4 Preset 集成 API

Preset entry 应改为引用 `secretFieldId`：

```ts
interface PresetEntry {
  id: string
  presetId: string
  secretId: string
  secretName?: string | null
  fieldId: string
  fieldLabel: string
  envName: string
  enabled: boolean
  sortOrder: number
}
```

相关接口：

```ts
addFieldToPreset(preset: string, field: string, envName?: string | null): Promise<PresetEntry>
removePresetEntry(preset: string, envName: string): Promise<void>
listPresetEntries(preset: string): Promise<PresetEntry[]>
previewPreset(preset: string): Promise<PresetPreview>
activatePreset(preset: string): Promise<ActivePreset>
```

## 7.5 Audit API

新增/调整 audit event：

```text
secret_created
secret_updated
secret_deleted
field_created
field_updated
field_deleted
field_revealed
field_copied
field_copied_as_env
field_added_to_preset
preset_activated
preset_deactivated
```

Audit payload 不保存 secret values。

```ts
interface AuditEvent {
  id: string
  action: string
  secretId?: string | null
  fieldId?: string | null
  presetId?: string | null
  envName?: string | null
  createdAt: string
}
```

## 8. 前端组件方案

建议拆分组件：

```text
src/components/secrets/
  SecretList.tsx
  SecretDetail.tsx
  SecretItemHeader.tsx
  SecretFieldList.tsx
  SecretFieldRow.tsx
  SecretFieldEditor.tsx
  SecretTemplatePicker.tsx
  SecretNotesEditor.tsx
  SecretDangerZone.tsx
```

## 8.1 SecretDetail

职责：

- 查看态与编辑态切换。
- 加载 SecretDetail。
- 保存 item-level metadata。
- 展示字段列表和 notes。

## 8.2 SecretFieldRow

查看态行：

```text
[label] [masked/preview value] [copy] [reveal] [more]
```

## 8.3 SecretFieldEditor

编辑态行：

```text
[label input] [type select] [value input] [sensitive toggle] [env name input] [delete]
```

## 8.4 SecretTemplatePicker

创建入口：

- 搜索模板。
- 常用模板。
- 自定义 Secret。

## 9. 表单交互细节

### 9.1 Add Field

点击后新增一行，默认：

```text
label: "New Field"
fieldType: secret
sensitive: true
```

如果用户选择 URL/Text，则自动调整 sensitive false。

### 9.2 Env Name 自动建议

字段 label 输入 `API Token` 时，可建议：

```text
API_TOKEN
```

结合 Secret name：

```text
CLOUDFLARE_API_TOKEN
```

但必须允许用户修改。

### 9.3 Copy formats

字段行 More menu：

```text
Copy value
Copy as ENV line
Copy as export
Copy as header
```

示例：

```bash
OPENAI_API_KEY=sk-...
export OPENAI_API_KEY=sk-...
Authorization: Bearer sk-...
```

### 9.4 Sensitive field reveal

- reveal 后显示 30 秒再自动隐藏。
- 或鼠标按住显示，松开隐藏。
- reveal 进入 audit。
- 切换 item/关闭窗口自动隐藏。

### 9.5 Unsaved changes

- 编辑后离开显示确认。
- Save 成功后 toast。
- 删除字段可 undo。

## 10. Presets 页面联动

在 Secret Detail 的字段行中，提供：

```text
Add to Preset
```

点击后：

```text
Select Preset
Env name: [OPENAI_API_KEY]
[Add]
```

在 Preset 编辑页中，选择字段时：

```text
Search secrets and fields...
OpenAI / API Key / OPENAI_API_KEY
Cloudflare / API Token / CLOUDFLARE_API_TOKEN
```

## 11. 实现阶段

## Phase 1：数据模型与接口

- [ ] 新增 SecretField Rust model。
- [ ] 新增 `secret_fields` schema。
- [ ] 新增 field CRUD storage。
- [ ] 新增 reveal/copy field API。
- [ ] 前端 TS 类型同步。
- [ ] Tauri commands 暴露。

## Phase 2：Secret Detail / Editor

- [ ] 重构 SecretForm 为 SecretItemEditor。
- [ ] 新增 SecretFieldList/Row/Editor。
- [ ] 支持 add/delete/reorder fields。
- [ ] 支持 masked/reveal/copy。
- [ ] 支持 notes/tags/category。

## Phase 3：Templates

- [ ] 内置模板定义。
- [ ] Template picker。
- [ ] Create from template。
- [ ] 模板字段可编辑。

## Phase 4：Presets 集成

- [ ] Preset entries 指向 SecretField。
- [ ] Add field to preset。
- [ ] Preset preview 使用 field envName/value。
- [ ] Active preset export 使用 field values。

## Phase 5：Polish

- [ ] 搜索跨 secret/field/env/preset。
- [ ] audit 完善。
- [ ] 空状态。
- [ ] 快捷键。
- [ ] 动效与微交互。

## 12. 兼容与迁移策略

用户说可以不考虑旧 Preset 兼容，但 Secret/Key 数据仍建议谨慎迁移。

推荐：

1. `keys` 迁移为 `secret_fields`。
2. `Secret.baseUrl/dashboardUrl/docsUrl/loginUrl/description` 迁移为 custom fields。
3. UI 不再展示固定字段。
4. 旧 API 可删除或内部转发。

如果决定完全不兼容，则可：

- 删除旧固定字段。
- 删除旧 keys 表。
- 清空 dev 数据。

但 release 版本建议保留迁移，避免用户数据丢失。

## 13. 验收标准

### 产品验收

- [ ] 能创建通用 Secret，不依赖 AI provider 字段。
- [ ] 能从模板创建 Secret。
- [ ] 能添加任意字段。
- [ ] 能设置字段类型和 sensitive。
- [ ] 能 copy/reveal 单个字段。
- [ ] 能把字段加入 Preset。
- [ ] Preset 能激活并导出字段 env vars。

### 安全验收

- [ ] Secret values 默认 masked。
- [ ] Copy/reveal 记录 audit。
- [ ] Audit 不保存 secret values。
- [ ] Active preset 文件头提示 plaintext secrets。
- [ ] 删除 Secret 级联删除 fields 和 preset entries。

### 工程验收

- [ ] `bun run build` 通过。
- [ ] `cd web && bun run build` 通过。
- [ ] Rust tests 通过。
- [ ] 新增 storage migration tests。
- [ ] 新增 field CRUD tests。

## 14. 最终建议

KeyDock 的 Secret 体验应该从：

```text
服务表单 + 多个 Key
```

升级为：

```text
1Password-style API Key Item + Custom Fields
```

同时和 Presets 形成清晰闭环：

```text
Secret Item 保存真实凭据
Custom Field 表达任意服务字段
Preset 组合并激活这些字段为环境变量
```

这是比“AI Provider 表单”更通用、更有产品感、也更适合长期扩展的方向。
