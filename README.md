# Hermione Control Center — Project Root

**The single canonical home for the unified Hermione interface.**

This is where Claude Design reads design briefs, outputs prototypes, and the implementation integrates back into the running Hermione stack.

## Folder Map

```
/home/ubuntu/hermione_control_center/
├── README.md                           ← you are here (project overview)
├── design/                             ← INPUT for Claude Design
│   ├── s258-hermione-control-center-design.md   (the design brief)
│   ├── api-contracts.md                (endpoints the SPA will consume)
│   ├── mock-data/                      (sample JSON for offline dev)
│   │   ├── status.json
│   │   ├── kb_sources.json
│   │   ├── strategies.json
│   │   ├── positions.json
│   │   ├── journal_today.json
│   │   └── youtube_days.json
│   └── references/                     (visual references, screenshots, palette swatches)
│
├── src/                                ← OUTPUT of Claude Design (the SPA source)
│   ├── index.html
│   ├── app.tsx (or .jsx / .svelte)
│   ├── components/
│   ├── styles/
│   └── package.json (if needed)
│
├── build/                              ← compiled bundle, served by FastAPI
│   ├── index.html
│   ├── app.bundle.js
│   └── assets/
│
├── backend-integration/                ← Hermione-side wiring
│   ├── routes.md                       (new FastAPI routes to add to dashboard_v2.py)
│   ├── api_ask.py                      (the /api/ask voice gateway impl, to be built)
│   └── static_mount.md                 (how dashboard_v2 serves the SPA)
│
├── iterations/                         ← snapshots from each Claude Design pass
│   └── v1-2026-05-20/                  (preserve the first cut before iterating)
│
└── notes/                              ← Naushad's session notes + tweaks
    ├── feedback.md
    └── next-steps.md
```

## How to use this with Claude Design

### Initial brief (first run)

Paste this entire prompt into Claude Design (claude.ai/design):

> Build the **Hermione Control Center** Neural Graph view per the design brief at this path: `/home/ubuntu/hermione_control_center/design/s258-hermione-control-center-design.md`
>
> Read the brief in full. Use the mock data files at `/home/ubuntu/hermione_control_center/design/mock-data/` for offline development. Output a single-page React + D3 app to `/home/ubuntu/hermione_control_center/src/`.
>
> Tech stack: React 19, D3 v7, Tailwind CSS, Vite bundler. Bundle target <500KB. Output `index.html` + `app.bundle.js` to `src/`.
>
> Build the Neural Graph view FIRST (the home screen with Hermione's core + 3 rings + outer YouTube strand). Mock data is JSON, no live API needed yet. Once the Neural Graph is solid, iterate on Operations / Story / Council modes.
>
> Identity anchor: this is not a dashboard, it's Hermione's mind. Read the brief's "Identity Anchor" section before touching any code.

### Iterating

When Claude Design outputs a new pass, snapshot it:

```bash
cp -r /home/ubuntu/hermione_control_center/src/* /home/ubuntu/hermione_control_center/iterations/v{N}-$(date +%Y-%m-%d)/
```

Then drop feedback into `notes/feedback.md` and paste back to Claude Design:

> Read `/home/ubuntu/hermione_control_center/notes/feedback.md` for the changes I want. Iterate on the existing `/home/ubuntu/hermione_control_center/src/` build.

### Backend integration (when ready to deploy)

1. Build production bundle: `cd src && npm run build && cp -r dist/* ../build/`
2. Add new routes to `/home/ubuntu/hermione_dashboard_v2.py` per `backend-integration/routes.md`
3. Mount `build/` as static dir at FastAPI's root path
4. Implement `/api/ask` from `backend-integration/api_ask.py`
5. `systemctl restart hermione-dashboard`
6. Open `http://hetzner:8000/` — Neural Graph is the new home

## Why this folder?

- **One canonical location** — design brief, mock data, prototype source, compiled bundle, integration code all live together
- **Survives Claude Design context loss** — every iteration is saved to disk
- **Snapshots in `iterations/`** — can rollback if a Claude Design pass regresses
- **Backend lives separately** — Hermione's daemon code at `/home/ubuntu/hermione_self/` is untouched until the integration step
- **Naushad-readable** — folder names match what's in his head, not a framework's

## The single path to paste into Claude Design

When starting a new Claude Design session, paste this:

```
/home/ubuntu/hermione_control_center/design/s258-hermione-control-center-design.md
```

That's the brief. Everything Claude Design needs is reachable from there + the mock data folder.
