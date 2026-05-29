# CLAUDE.md — hermione_control_center

Structural context only. Behavioral rules defer to
`~/.claude/projects/-home-ubuntu/memory/MEMORY.md`. For wider host context
see `/home/ubuntu/CLAUDE.md`.

---

## PURPOSE

Vite + React SPA ("Neural Graph Control Center") served at
`hermione.trade/control`. Real-time visibility into trading status,
positions, journal, knowledge-base sources, and YouTube story days.

Backend lives in the main hermione repo (`hermione_dashboard_v2.py`
endpoints `/api/control/*` around lines 1297+; the SPA bundle is mounted
at `/control` near line 891).

---

## REPO LAYOUT (slight gotcha)

The Vite project root is `src/`, **not** the repo root.

| location | contents |
|---|---|
| `src/package.json` | dependencies + npm scripts |
| `src/vite.config.ts` | Vite config (base path matters — `/control/`) |
| `src/index.html` | Vite entry HTML |
| `src/<components>` | React TypeScript source |
| `src/dist/` | **Compiled bundle** — the dashboard serves from here |
| `design/s258-hermione-control-center-design.md` | Original design brief |
| `design/api-contracts.md` | `/api/control/*` endpoint contracts |

---

## BUILD / SERVE

```bash
# Build the SPA from the Vite project root
cd /home/ubuntu/hermione_control_center/src
npm install          # if node_modules missing
npm run build        # outputs to src/dist/

# Dashboard auto-serves from src/dist on startup — rebuild then restart
systemctl restart hermione-dashboard.service

# Live dashboard at hermione.trade/control (nginx → 127.0.0.1:7477)
```

---

## NO LIVE-TRADING HAZARD

This repo contains only frontend code. It is read-only vis-à-vis trading.
The backend endpoints it calls (`/api/control/*`) are read-only. No
credentials, keys, or trade-execution code live here.

---

## CONVENTIONS

- TypeScript + React + Vite. Node modules in `src/node_modules/`.
- `src/dist/` is compiled output — **do not hand-edit dist files.**
  Always rebuild from source.
- Vite `base` path must stay `/control/` so the bundle resolves assets
  under the `hermione.trade/control` prefix (S259 gotcha — see memory).
- Backend wiring lives in `/home/ubuntu/hermione_dashboard_v2.py`:
  - Mount: line ~891 (`_CC_DIST`)
  - API routes: lines 1297+ (`/api/control/*`)

---

## LOGS

```bash
journalctl -u hermione-dashboard -f   # dashboard serves the SPA
```

---

## MEMORY POINTERS

- `memory/lessons_s259_neural_graph_live.md` — ship notes (Vite base-path
  gotcha, unified journal-ts helper, KB corpus HOME mismatch)
- `memory/reference_dashboard_kb_corpus_env.md` —
  `HERMIONE_KB_CORPUS_ROOT` env var must stay set in `.trading.env`
