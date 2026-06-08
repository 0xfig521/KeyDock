# KeyDock Web

Marketing landing page for [KeyDock](https://github.com/0xfig-labs/KeyDock), built with Vite, React, TypeScript, and Tailwind CSS.

KeyDock is positioned as a **local encrypted API key vault with reusable env presets**: store developer secrets locally, compose presets, activate trusted shell environments, and inject scoped variables into commands or AI agents.

## Local development

```bash
bun install
bun run dev
```

The Vite dev server serves the landing page locally.

## Build

```bash
bun run build
```

The production output is written to `dist/`.

## Preview

```bash
bun run preview
```

## Deploy

Deployment is handled by `.github/workflows/deploy-web.yml`.

- Trigger: push to `main` with changes under `web/**`, or `workflow_dispatch`.
- Host: Cloudflare Pages project `keydock`.
- Required repository secrets:
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`

## Content priorities

Keep the landing page focused on the sharpest differentiator:

1. Replace scattered `.env` files with one local encrypted vault.
2. Explain reusable secret fields and preset mappings clearly.
3. Highlight preset composition from templates (OpenAI, Anthropic, Cloudflare, Vercel, etc.).
4. Show two execution paths: activate for new shells, or `keydock run` for command-scoped injection.
5. Use local auditability and no-cloud/no-telemetry as trust signals.
6. Link downloads to the latest GitHub Release.

## Useful scripts

```bash
bun run lint
bun run build
```
