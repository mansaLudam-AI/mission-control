# Mission Control: VPS ↔ Railway Connectivity Plan

## Problem

Mission Control reads workspace data directly from the filesystem (`WORKSPACE_ROOT`).
On Railway, there's no shared filesystem with the VPS where Claude/Mansa operates —
so the dashboard only serves the stale `data/state.json` snapshot baked at deploy time.

---

## Option A: Run Mission Control on the VPS (Recommended)

**Effort:** Low | **Reliability:** High | **Latency:** Zero

The simplest, most reliable approach. Mission Control runs where the data lives.

### What to do

1. Clone the repo on your VPS
2. Set `WORKSPACE_ROOT=/data/.openclaw/workspace` (or wherever your workspace root is)
3. Set `PORT=3000` (or any available port)
4. Configure remaining env vars (`MC_AI_KEY`, `MC_OPENROUTER_API_KEY`, etc.)
5. Run with a process manager (systemd or pm2)
6. Expose via reverse proxy (nginx/caddy) with HTTPS + optional basic auth

### Pros
- Zero-latency filesystem reads — always fresh data
- Heartbeat health checks work in real-time (15-min freshness window)
- Nudge system can write directly to `out/nudges/` on disk
- Approval resolutions write directly to `out/approvals/`
- No sync lag, no TTL expiration, no data staleness
- Simplest to set up and maintain

### Cons
- Requires opening a port (mitigated by reverse proxy + auth)
- Tied to VPS uptime

---

## Option B: Keep Railway + Add a Push Bridge from VPS

**Effort:** Medium | **Reliability:** Medium | **Latency:** Up to 5 minutes

Railway hosts the UI. A cron job on the VPS pushes state snapshots to Railway's
`POST /api/state` endpoint every few minutes.

### What to do

1. **Set `MC_PUSH_TOKEN`** on Railway (a strong random secret)
2. **Create a push script** on the VPS that:
   - Runs `node scripts/build-data.mjs` (or reimplements the file-reading logic)
   - POSTs the resulting JSON to `https://your-railway-app.up.railway.app/api/state`
   - Runs every 5 minutes via cron or systemd timer
3. **Critical limitation:** The push endpoint stores state **in memory only** with a
   **10-minute TTL**. If the cron misses two cycles, Railway falls back to stale
   baked state. This TTL should be extended or replaced with persistent storage.

### Required code changes

1. **Extend or remove the 10-minute TTL** in `server.mjs` — change `PUSH_TTL_MS`
   from 10 minutes to something longer (e.g., 60 minutes), or persist pushed state
   to disk so it survives Railway restarts
2. **Create `scripts/push-state.sh`** — a shell script that generates state and
   curls it to Railway
3. **Add error handling + retry** — the push script should retry on network failure

### Pros
- Railway handles TLS, uptime, CDN
- VPS doesn't need to expose any ports
- Existing `POST /api/state` endpoint already works

### Cons
- Data is 0–5 minutes stale (depending on cron interval)
- In-memory storage means Railway redeploys lose pushed state until next push
- 10-minute TTL means missed pushes cause fallback to very stale data
- Nudge system can't write back to VPS filesystem (one-way sync)
- Approval resolutions written on Railway don't propagate back to VPS
- More moving parts to maintain

---

## Option C: Hybrid — VPS primary + Railway as public mirror

**Effort:** Medium-High | **Reliability:** High | **Latency:** Mixed

Run Mission Control on VPS as the authoritative instance. Optionally keep Railway
as a read-only public mirror fed by the push bridge.

### What to do
- Implement Option A for the primary instance
- Optionally implement Option B for a public-facing mirror
- All writes (nudges, approvals) go to the VPS instance

---

## Recommendation

**Go with Option A.** It's the simplest, most reliable approach:

```
VPS
├── /data/.openclaw/workspace/    ← Claude/Mansa writes here
│   ├── work/TASKS.md
│   ├── memory/*.md
│   ├── out/heartbeat/latest.json
│   ├── out/commitments/active.jsonl
│   └── ...
└── /opt/mission-control/          ← Mission Control reads here
    ├── server.mjs
    └── .env  (WORKSPACE_ROOT=/data/.openclaw/workspace)
```

The push bridge (Option B) has fundamental limitations: one-way sync, TTL expiration,
in-memory-only storage, and no write-back path. It's a workaround, not a solution.

### Minimal setup commands (Option A)

```bash
# On your VPS:
git clone <repo-url> /opt/mission-control
cd /opt/mission-control
cp .env.example .env
# Edit .env:
#   WORKSPACE_ROOT=/data/.openclaw/workspace
#   PORT=3000
#   MC_PUSH_TOKEN=<random-secret>
#   MC_AI_KEY=<your-key>
#   MC_AI_PROVIDER=google
#   MC_OPENROUTER_API_KEY=<your-key>
#   MC_NUDGE_ENDPOINT=<webhook-url-if-needed>
npm install
npm run build   # bake initial state.json
npm start       # or use pm2: pm2 start server.mjs --name mission-control

# Reverse proxy (Caddy example):
# mission-control.yourdomain.com {
#     reverse_proxy localhost:3000
#     basicauth /* {
#         admin $2a$14$...  # bcrypt hash
#     }
# }
```

### If you choose Option B instead

I'll need to:
1. Increase `PUSH_TTL_MS` (or add file-based persistence for pushed state)
2. Create `scripts/push-state.sh` for the VPS cron
3. Add a two-way sync mechanism for nudges/approvals (more complex)
