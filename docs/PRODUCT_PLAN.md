# KeyDock Product Plan

## Positioning

KeyDock is a local-first developer Secret manager and launcher. It helps developers maintain flexible Secret groups, add multiple entries under each group, then map any entry into project/customer/environment workspaces for launch-time injection.

## MVP

- Local encrypted Secret groups.
- Multiple entries per Secret: API keys, tokens, URLs, account IDs, JSON, certificates, and custom values.
- Workspace model that maps env names to Secret entries.
- CLI-first workflow for environment injection.
- Tauri desktop UI for CRUD, mapping, reveal, and quick-copy.
- Audit log for sensitive operations without storing secret values.

## Explicitly deferred

- Local HTTP API.
- Provider health checks.
- Cloud sync.
- Team sharing and RBAC.
- Provider/launcher plugin systems.
- Automatic workspace switching on directory change.

## Primary workflow

```bash
keydock secret create openrouter --type ai
keydock entry add openrouter api-key --env OPENAI_API_KEY --value sk-or-...
keydock entry add openrouter base-url --kind url --env OPENAI_BASE_URL --value https://openrouter.ai/api/v1 --plain
keydock workspace create startup
keydock workspace add-secret startup openrouter
keydock run --workspace startup -- bun dev
```

## Product principle

KeyDock should not become a generic password manager. The primary value is managing developer secrets as composable entries; the secondary value is workspace-aware launching.
