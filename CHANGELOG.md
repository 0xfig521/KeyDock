# Changelog

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
