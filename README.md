# Mission Control v5

Fast, file-backed operator console MVP.

## What changed in this pass
- Replaced most sample-only dashboard state with runtime-generated state from real workspace files
- Added a tiny Node server so Railway can boot the app directly
- Exposed `/api/state` and `/healthz` for deployment/runtime checks
- Kept a CLI build step to snapshot `data/state.json` when a static artifact is useful
- Removed fake approval/cost certainty where the workspace does not provide direct truth yet

## Data sources currently wired
- `work/TASKS.md`
- `memory/2026-03-18.md`
- `memory/2026-03-18-0925.md`
- `memory/2026-03-18-0955.md`
- `memory/2026-03-18-model-routing.md`
- `reference/mission-control-v2.1-spec.md`
- `.openclaw/workspace-state.json`
- `out/status/*.md`
- `out/usage/*`, `out/costs/*`, `data/usage/*` if/when those ledgers exist

## Run locally
### 1) Start the app
```bash
cd /data/.openclaw/workspace/mission-control
npm start
```

Then open:
- http://localhost:3000
- http://localhost:3000/api/state
- http://localhost:3000/healthz

### Optional: write a snapshot file
```bash
cd /data/.openclaw/workspace/mission-control
npm run build-data
```

That writes `data/state.json` using the same generator as the live API.

## Railway deployment
This folder is deployment-shaped for Railway now.

### Expected service settings
- Root directory: `mission-control`
- Start command: auto from `railway.json` / `npm start`
- Node version: `>=20` (`nixpacks.toml` pins Node 22)
- Required env: none for basic boot
- Port: Railway provides `PORT`; the app respects it automatically

### Smoke-check after deploy
- `/healthz` should return `{ "ok": true, ... }`
- `/api/state` should return live generated JSON
- `/` should render the dashboard shell

## Current truth level
- **Workspace-derived:** overview counts, tasks, events, many artifacts, session-memory-derived agent rows, source visibility
- **Explicitly unknown unless a ledger exists:** usage/cost
- **Task-derived, not workflow-native:** approvals
- **Workspace-derived, not live runtime subscriptions:** agent health/activity

That split is intentional. Mission Control should not pretend to know more than the workspace can prove.
