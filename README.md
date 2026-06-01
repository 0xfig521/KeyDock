# KeyDock

Developer Secret Workspace for the AI era.

KeyDock MVP is a local-first secret manager with workspace-based environment injection for developer workflows.

## MVP scope

- Local encrypted Secret groups
- Multiple entries per Secret: API keys, tokens, URLs, account IDs, JSON, certificates, and custom values
- Sensitive and non-sensitive entries
- Workspace-to-env variable mapping
- CLI env injection: `keydock run <workspace> -- <command...>`
- Basic Tauri desktop UI
- Quick copy formats

Deferred: Local HTTP API, health checks, cloud sync, team sharing, RBAC, plugins, and automatic workspace switching.

## Development

```bash
bun install
cargo test
cargo run -p keydock-cli -- --help
bun run tauri dev
```

## CLI examples

```bash
cargo run -p keydock-cli -- vault init --password "correct horse battery staple"
export KEYDOCK_MASTER_PASSWORD="correct horse battery staple"
cargo run -p keydock-cli -- secret create openrouter --type ai --tag llm
cargo run -p keydock-cli -- entry add openrouter api-key --label "Client A Key" --env OPENAI_API_KEY --value sk-or-...
cargo run -p keydock-cli -- entry add openrouter base-url --kind url --env OPENAI_BASE_URL --value https://openrouter.ai/api/v1 --plain
cargo run -p keydock-cli -- workspace create startup
cargo run -p keydock-cli -- workspace add-secret startup openrouter
cargo run -p keydock-cli -- export workspace startup
cargo run -p keydock-cli -- run --workspace startup -- bun dev
cargo run -p keydock-cli -- run --entry openrouter/api-key -- bun dev
```

## Security model

KeyDock uses a master password by default. The password derives a key with Argon2id, decrypts a local data-encryption key, and keeps that key only in app memory while KeyDock is unlocked. Touch ID/passkey support is planned as a future convenience unlock path, not as the only root secret.
