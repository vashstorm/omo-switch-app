# OMO Switch

A desktop app for managing [opencode](https://opencode.ai) configuration files with a visual UI.

## Features

- **Profile Management** — Browse, switch, and edit multiple opencode profiles from one place
- **Visual Config Editor** — Edit agent configs, categories, and model assignments without touching JSON
- **Sync Replace** — Change a model once, propagate it everywhere that model is used
- **Dual-Layer Config** — Baseline (read-only) + editable overlay, so your customizations never conflict with upstream updates

## Quick Start

```bash
# Install dependencies
make install

# Run in dev mode
bun run dev

# Build desktop app
make build-tauri

# Run tests
bun run test

# Full verification
make verify
```

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- [Rust](https://rustup.rs) (for Tauri builds)

## Project Structure

```
src/
├── server/      # Backend API (Hono)
├── web/         # Frontend UI (React + TailwindCSS + MUI)
├── shared/      # Shared types and config logic
└── components/ui/  # UI component library
src-tauri/       # Tauri desktop shell (Rust)
config/          # Global config and profile data
tests/           # Unit, integration, and E2E tests
```

## How It Works

Each opencode profile is split into two files:

- **`opencode.jsonc`** — read-only baseline (upstream defaults)
- **`oh-my-openagent.jsonc`** — your editable overrides

The app merges them automatically, so you only ever edit your own layer.
