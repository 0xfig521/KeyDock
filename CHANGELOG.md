# Changelog

## 0.5.4 - 2026-06-06

### Fixes
- Fix DMG bundling failure in CI by removing TAURI_BUNDLER_DMG_IGNORE_CI env var

## 0.5.0 - 2026-06-04

### Features
- Key expiration support — set expiry dates on API keys and see expiring/expired keys on the dashboard
- In-app update checker — check for new versions and install updates from the Settings tab
- Dashboard expiring keys alert — highlights keys expiring within 7 days or already expired
- Secret metadata fields — add Dashboard URL, Docs URL, and Login URL to service groups
- Open external links — click URLs to open in your default browser

### Fixes
- Remove stale `modelName` field from secret model and presets

### Performance
- Storage refactor with transactional audit logging and N+1 query fixes

## 0.4.1 - 2026-06-03

### Fixes
- Fix TypeScript build errors: missing prop destructuring and undefined error handler in `DeleteWorkspaceButton`

## 0.4.0 - 2026-06-03

### Features
- Auto-create a "default" workspace for first-time users when setting up the vault
- New confirmation dialog when deleting an active workspace with extra warning

### Fixes
- Delete workspace now properly refreshes the workspace list and reactivates the selection after deletion
- Deleting the active workspace automatically deactivates the environment first

### Performance
- Remove redundant `dir` prop references from Input and Textarea components
