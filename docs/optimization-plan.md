# KeyDock 项目优化建议

> 本文档只覆盖除“活跃 workspace 会写出明文 env 文件”之外的优化项。明文 env 缓存问题单独处理。

## 优先级概览

| 优先级 | 方向 | 建议 |
| --- | --- | --- |
| P0 | 安全 | 避免 `list_keys()` 为列表展示解密所有 Key |
| P0 | 安全 | 修复短密钥 preview 原样显示问题 |
| P0 | 安全 | 为 Tauri 配置基础 CSP |
| P1 | 架构 | 拆分过大的 `storage.rs` |
| P1 | 数据 | 将破坏性迁移改成版本化迁移 |
| P1 | 性能 | 解锁后避免一次性加载全部业务数据 |
| P2 | 维护 | 删除旧命名占位文件 |
| P2 | 产品 | 统一 i18n 策略 |
| P2 | 质量 | 补充前端核心回归测试 |

## P0：安全优化

### 1. 避免列表页解密所有 Key

- 位置：`crates/keydock-core/src/storage.rs`
- 当前现象：`list_keys()` 查询 key 列表后，会遍历每个 key 并调用 `key_value()` 解密以生成 `preview`。
- 风险：
  - 解锁后普通列表刷新也会触碰明文 secret。
  - 明文暴露面扩大，且 key 数量增长后列表性能会下降。
- 建议：
  - 列表接口只返回元数据。
  - `preview` 改成固定掩码，例如 `••••••••`。
  - 只有用户明确点击 reveal/copy/run/export 时才解密。

### 2. 修复短密钥 preview 原样显示

- 位置：`crates/keydock-core/src/storage.rs`
- 当前现象：`mask_value()` 对长度小于等于 8 的值直接返回原文。
- 风险：短 token、PIN、测试密钥会在 UI 中完整展示。
- 建议：
  - 所有 secret 值都不应完整展示。
  - 短值统一显示为 `••••`。
  - 长值如需提示，可只显示极少量前缀或后缀，但不要让短值穿透。

### 3. 配置 Tauri CSP

- 位置：`src-tauri/tauri.conf.json`
- 当前现象：`app.security.csp` 为 `null`。
- 风险：本地 secret 管理器对注入/XSS 的容错空间应尽量小。
- 建议：
  - 配置最小可用 CSP。
  - 默认限制脚本、样式、图片和连接来源。
  - 后续如引入远程资源，再按需白名单化。

## P1：架构与数据优化

### 4. 拆分 `storage.rs`

- 位置：`crates/keydock-core/src/storage.rs`
- 当前现象：文件体量较大，混合了 schema、migration、secret CRUD、key CRUD、workspace、audit、shell integration、env formatting 等职责。
- 风险：
  - 改动容易误伤无关路径。
  - 安全逻辑、存储逻辑和 shell 逻辑混在一起，后续审计成本高。
- 建议拆分：
  - `schema.rs`：建表、索引、迁移。
  - `secrets.rs`：secret CRUD。
  - `keys.rs`：key CRUD、reveal。
  - `workspaces.rs`：workspace 与变量映射。
  - `audit.rs`：审计日志。
  - `shell.rs`：shell hook、env formatting、shell integration。

### 5. 将破坏性迁移改成版本化迁移

- 位置：`crates/keydock-core/src/storage.rs`
- 当前现象：部分 legacy schema 处理会 drop 表或清空 workspace mapping。
- 风险：
  - 用户数据可能在升级后不可逆丢失。
  - 迁移行为难以追踪和回滚。
- 建议：
  - 引入 `schema_migrations` 表记录版本。
  - 迁移前创建备份或导出恢复点。
  - 破坏性迁移需要显式标记，并尽量保留可恢复路径。

### 6. 解锁后避免一次性加载全部数据

- 位置：`src/App.tsx`
- 当前现象：vault ready 后同时刷新 secrets、keys、workspaces、audit。
- 风险：
  - 启动/解锁成本随数据量线性增长。
  - `keys.refresh()` 目前还会触发所有 key 的列表加载。
- 建议：
  - Dashboard 使用轻量 stats API。
  - Keys 按选中 secret 或 workspace 懒加载。
  - Audit 支持分页或仅加载最近 N 条。

## P2：维护、产品与测试

### 7. 删除旧命名占位文件

- 位置：
  - `src/hooks/useApiKeys.ts`
  - `src/components/secrets/ApiKeyCard.tsx`
  - `src/components/secrets/ApiKeyForm.tsx`
- 当前现象：文件内容只是 `// Moved to ...`。
- 风险：
  - 搜索结果噪音。
  - 后续维护者可能误以为旧 API 仍存在。
- 建议：确认无引用后删除。

### 8. 统一 i18n 策略

- 位置：`src/hooks/useI18n.tsx`、`src/i18n/`
- 当前现象：Settings 已接入翻译，但 Dashboard、Secrets、Workspaces 等区域仍有大量硬编码英文。
- 建议二选一：
  - MVP 阶段明确只支持英文，暂时移除未完成的语言切换。
  - 或系统性抽取 UI 文案，保证中英文切换完整。

### 9. 补充前端核心回归测试

- 当前现象：Rust core 有部分单元测试，前端暂无 test/spec 文件。
- 建议优先覆盖：
  - reveal 后自动隐藏明文。
  - lock 后清除 revealed plaintext。
  - workspace variable mapping 表单校验。
  - duplicate name validation。
  - 设置页 theme / language 持久化。

## 建议实施顺序

1. 先做 P0 安全项：列表不解密、短值不明文、CSP。
2. 再做 P1：拆分 storage 前先补 Rust storage 回归测试。
3. 最后做 P2：清理占位文件、统一文案、补前端测试。

