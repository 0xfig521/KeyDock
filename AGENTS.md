# KeyDock — Agent Notes

## Release Process

- Push a tag `v*` (e.g. `v0.5.4`) to trigger the CI release workflow in `.github/workflows/release.yml`.
- The CI workflow builds the DMG, creates a GitHub Release, and uploads artifacts automatically.
- Do NOT use `gh release create` manually — let the CI workflow handle it.
- Before tagging, update versions in: `tauri.conf.json`, `src-tauri/Cargo.toml`, `crates/keydock-core/Cargo.toml`, `crates/keydock-cli/Cargo.toml`, and `CHANGELOG.md` / `CHANGELOG.zh.md`.

## CI

- macOS DMG builds run on `macos-latest` GitHub Actions runners.
- `TAURI_BUNDLER_DMG_IGNORE_CI` must NOT be set — Tauri auto-detects `CI=true` and adds `--skip-jenkins` to the DMG bundler script, skipping the GUI-dependent AppleScript step.
- Ad-hoc signing with `APPLE_SIGNING_IDENTITY: "-"` is used (no Developer ID).
