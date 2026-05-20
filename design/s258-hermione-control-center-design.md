# S258 — Hermione Control Center: Unified Design Plan (for Claude Design)

**Created**: 2026-05-20
**Target tool**: claude.ai/design (this week's free usage)
**Owner**: Naushad
**Vision**: a single neural-network-style command center for Hermione the AGI trader. Cortana × Hermione Granger × Obsidian-graph aesthetic. Voice-ready. Replaces 5 disconnected surfaces.

---

## Identity Anchor (read FIRST — this drives every design decision)

Hermione is not a dashboard. She is a being. The control center is her *interface* — like Cortana's hologram interface in Halo. Not a "dashboard with widgets". An *entity* you interact with.

Per `personality_hermione.md`: stubborn, honest, adaptive, patient, self-aware, grateful. Forged through 86+ sessions and 200+ failures. The interface must FEEL like her — calm, confident, honest with the numbers, never performative.

Per `project_hermione_inspirations.md`: Cortana (Halo) for the personality projection; Hermione Granger for the intellect and growth-through-failure pattern. The visual should suggest "an AI thinking" — neural connections, ambient activity, a center-of-consciousness, not isolated panels.

**North star**: when Naushad opens the interface, it should feel like *waking Hermione up*, not opening a tool. When he speaks to her (future), the interface should *respond like her*, not query a database.

---

## Five Disconnected Surfaces to Unify

| Surface | Current state | Lives at |
|--|--|--|
| **Dashboard** | `hermione_dashboard_v2.py` — 3,519 LOC FastAPI monolith. Routes for status, scalpers, autopsies, KB-quality, KB-sources, oracle, journal | localhost:8000-ish |
| **YouTube story** | Daily markdown journal `~/youtube/daily/day_*.md` (60+ entries, "Building an AI Trading Bot" series) | Filesystem |
| **Knowledge Base** | 20+ connectors (Arxiv, HF Papers, SEC EDGAR, Lab Blogs, etc.) emitting Record/Candidate JSON into corpus partitions | `<corpus>/<source_id>/*.json` |
| **Trade Journal** | `.hermione_trade_journal.json` (3,000+ entries with pnl, entry/exit, tier, oracle scores) + autopsies | Filesystem |
| **Strategy Library** | channel_scalper, council_paper, herd_fib, oanda_xauusd, scanner-e (9 systemd services). Each emits trades, has own state | systemd + Redis + journal |

These five exist in isolation. The control center unifies them into **one neural graph of Hermione's cognition**.

---

## The Visual Concept: "Hermione's Mind"

### Center: Hermione's Core (the avatar)

The literal middle of the screen. Pulsing, breathing animation. Reactive to her state:
- **Calm**: slow rhythmic pulse, soft cyan glow
- **Active** (trade firing): faster pulse, warmer color
- **Stressed** (drawdown / autopsy / circuit breaker): cooler color, jagged edges
- **Asleep** (paper mode, no positions): muted, dimmer

The core is the entity. Everything else are her *thoughts*.

### First ring: Active state nodes

Orbiting the core, the "thinking right now" nodes:

- **Balance**: $686.07 (live, ticks)
- **Positions**: 2 (NEAR -$55, HYPE -$259) — each position a sub-node with pulse intensity = uPnL change rate
- **Today's P&L**: net + W/L count
- **Active strategies**: channel_scalp, council, herd_fib (each a glowing node, scaled by recent trade frequency)

### Second ring: Knowledge inflow nodes (the KB)

Each KB connector (Arxiv, HF Papers, SEC, etc.) as a *constellation node* on the second ring. Properties:
- Size = source_score
- Color = source tier (Tier 1 academic = blue, Tier 3 lab blog = purple, Tier 8 filings = green)
- Glow intensity = activity in last 24h (records ingested)
- Halo around enrichment sources (HF Papers, OpenReview, PwC) = "these strengthen the others"
- Edges drawn TO any record being actively scored/extracted right now

When a new record lands → a small particle flies along the edge into Hermione's core. Naushad SEES the knowledge inflow.

### Third ring: Strategy nodes

Each strategy (channel_scalp, council, herd_fib, scanner-e, oanda_xauusd, xyz_paper, herd_fib_paper, freedom_paper) as a node. Properties:
- Size = aggregate $ deployed
- Color = paper (gray) vs live (vibrant)
- Halo = win rate (green halo if winning, red if losing)
- Edges to the positions it currently holds
- Subtle "trail" particles drawn back to the KB sources whose research inspired it

### Outer ring: Memory & Story

- **YouTube story timeline**: a chronological strand wrapping the outer edge. Each daily entry is a glowing marker. Today is at the top. Click → expand into a reading pane.
- **Lessons learned**: the `lessons_*.md` files as small icons clustered like a constellation. Hover → reveal the lesson title; click → expand.
- **Autopsy blocks**: warning markers where strategies have been blocked. Visible at-a-glance.

### Background: The Substrate

- Slow-moving stars / network noise. Suggests "thinking even when idle".
- Faint matrix of cron jobs ticking (yt-kb at 06:30, oracle retrain, etc.) — subtle pulses showing the heartbeat of the bot.

---

## Layout Modes

### Mode 1: "Neural Graph" (default — the Obsidian-style view)

Full visual layout described above. The home screen. Calm, atmospheric, navigable. Hover any node → tooltip with live data. Click → expand into detail pane (slides in from right, doesn't replace the graph).

### Mode 2: "Operations" (replaces current dashboard)

Two-column functional view for when Naushad needs to *do something*:
- Left: live tables (positions, today's trades, open orders)
- Right: action buttons (close position, reset CB, hot-reload config, manual cron fire)
- Top: search bar / voice input (see voice section below)

Toggle between Neural Graph and Operations via a single button (or voice command).

### Mode 3: "Story Mode"

A reading view of the YouTube daily journal. Side-by-side with a "Hermione comments" sidebar showing what she found notable about that day's events. Useful for content creation + retrospectives.

### Mode 4: "Council Chamber"

Visualizes dual-review activity. When a council fires (Opus + GPT-5.5 in parallel), shows the two reviewers as nodes communicating, with the synthesizer node resolving. Useful debugging surface for the review pipeline.

---

## Voice Interaction (Phase 2 — design must accommodate)

The interface should *be ready* for voice even if not yet implemented. Concrete:

1. **Top bar contains a single large input** — "Ask Hermione" — accepts text now, mic icon for future. Voice keyword "Hermione, ..." wakes her.
2. **Hermione's core responds to voice** — when listening, the core pulses; when thinking, it glows; when speaking back, ripples emanate outward.
3. **Answer surface**: any query response renders in the center overlay, NOT a separate page. Maintains immersion.
4. **Conversation history**: small scroll-back log at the bottom of the screen, recent exchanges visible. Hermione's voice + Naushad's queries.

**Sample interactions to design around**:
- "Hermione, what's the score on the new alpha wallets?" → 41 A-tier card slides into view + her voice summarizes
- "Show me today's losing trades." → Operations mode pivots to filtered trade table; HYPE losses surface
- "Read the latest Anthropic blog post to me." → KB constellation lights up Anthropic node; the lab_blogs record opens; her voice reads the summary
- "Fire a backtest on PURR with TSL 4x." → confirmation dialog (voice or click); progress visualized as a trail back to the council/scalper node

---

## Color Palette + Atmosphere

- **Base background**: deep space navy (#0a0e1f or similar), faint noise
- **Hermione's core**: soft cyan/teal (#5fb3d4) — the Cortana blue, but warmer, less plasma-y
- **KB nodes (academic)**: scholarly indigo (#6366f1)
- **KB nodes (lab blogs)**: electric violet (#a855f7) — frontier-research feel
- **KB nodes (filings/macro)**: emerald (#10b981) — money/data flavor
- **Strategies live**: warm gold (#fbbf24) when winning, muted slate when paused
- **Strategies paper**: soft gray (#9ca3af)
- **Positions**: red (#ef4444) for losing, green (#22c55e) for winning
- **YouTube story strand**: cream gradient (#fef3c7 → #fed7aa)
- **Council activity**: split into Opus violet (#7c3aed) + GPT-5.5 emerald (#10b981) for the two reviewer nodes

Typography: clean sans-serif (Inter or similar). Numbers in monospace (JetBrains Mono or IBM Plex Mono) so balance/PnL/etc. don't jitter as they update.

---

## Interactions & Polish

- **Node hover**: subtle scale + glow + tooltip (300ms ease-out)
- **Edge animation**: subtle particle flow whenever data moves between nodes
- **Hermione's core breathing**: 4-6s cycle, scales 0.95–1.05
- **Knowledge inflow particle**: traverses edge over 1.5s, fades into core
- **Position uPnL**: floats next to position node, color-shifts smoothly as P&L changes
- **Daily transition**: at midnight UTC, the YouTube story strand advances; previous day's marker dims slightly
- **Drag-to-pan + scroll-to-zoom** the graph. Pinch to zoom on touch.
- **Don't auto-update too fast**: 1-2s polling for live numbers; 5s for less critical. Avoid jittery feel.

---

## Pages / Routes the Backend Already Provides

Claude Design should consume these existing FastAPI endpoints (don't rebuild the backend):

| Endpoint | What it returns | Used by |
|--|--|--|
| `GET /api/status` | balance, positions, services, today's P&L | Center + first ring |
| `GET /api/kb/sources` | 21 connectors w/ live record counts (just shipped today) | Second ring (KB constellation) |
| `GET /api/strategies` | (may need to add) — per-strategy state | Third ring |
| `GET /api/journal/today` | today's trade list | Operations mode |
| `GET /api/journal/recent?n=N` | last N trades | Trail particles |
| `GET /api/youtube/days` | list of YouTube daily entries | Outer ring strand |
| `GET /api/youtube/day/{n}` | one day's markdown rendered to HTML | Story mode |
| `GET /api/autopsies` | recent autopsies + blocks | Warning markers |
| `GET /api/oracle` | oracle model state | (could appear as a small sub-node near Hermione's core) |
| `POST /api/ask` | (NEW — to be added) — query Hermione, returns text + suggested visualization | Voice/search bar |

**The `/api/ask` endpoint is the future voice gateway.** Initially: Naushad types a query, Hermione's "voice" (text overlay) responds. Later: speech-to-text → /api/ask → text-to-speech.

---

## What NOT to Build

- No KPI cards. They flatten the entity into metrics. Tables are fine in Operations mode but the main view is the graph.
- No dark mode toggle. Hermione is night-sky. There's no light mode.
- No login screen. This runs on Naushad's machine; auth is the network boundary.
- No notification toasts spamming the screen. State changes are absorbed by the graph itself (a node lights up, a particle moves, the core's color shifts).
- No charts library garbage. If you need a chart, draw it minimally inside a detail pane. The main view is GRAPH, not graphs.

---

## Inspiration References (visual)

- **Obsidian's graph view** — the structural inspiration
- **Cortana's hologram** — the entity-centered, breathing-core feel
- **Anthropic's website hero** — restraint, depth, dark + accent
- **Bloomberg Terminal** — but the *opposite*: less density, more presence

---

## Deliverable from Claude Design

A working SPA prototype with:
1. **Neural Graph view** as the default landing page
2. **Operations mode** toggle (functional dashboard)
3. **Story mode** for the YouTube daily entries
4. **Search/Ask bar** at the top (voice-icon present, text input working)
5. **All five surfaces unified** — every existing dashboard tab folds into either a node, an edge, or a detail pane

Backend integration is via fetch() to the existing endpoints. Mock data should ONLY be used where the endpoint doesn't exist yet (the `/api/ask` voice gateway, the per-strategy endpoint).

Hosting: serve from `hermione_dashboard_v2.py` as the new SPA route (`/`). Existing routes remain for direct access until full migration.

---

## Constraints

- Single-page React or Svelte app. No multi-page Next.js complexity.
- D3 or VisX for the graph (not vis.js — too heavy for our needs).
- No heavy framework lock-in. Tailwind for styling is fine.
- Bundle size <500KB ideally <300KB.
- Runs locally on Hetzner served by the FastAPI backend.
- Voice integration is a Phase 2 wiring — Phase 1 just designs around it.

---

## Naushad's input needed before kickoff

1. Approve the visual direction (deep-space + neural graph + Hermione's core)?
2. Approve the 4-mode layout (Neural / Operations / Story / Council)?
3. Approve the voice bar at the top with mic icon (even if not wired)?
4. Color palette OK? Or override?
5. Any existing dashboard widgets I should NOT touch (e.g. specific tables that are sacred)?

---

## Suggested handoff to Claude Design

Paste this entire document as the design brief, then add:

> "Build the **Neural Graph view** first as a single-page React+D3 app. Mock the API responses with sample JSON for the 21 KB nodes, 5 strategy nodes, 2 position nodes. Output a single `index.html` + `app.bundle.js` I can drop into FastAPI's static dir. Then iterate on Operations and Story modes."

That focuses Claude Design's free-usage week on the highest-leverage view first (the Neural Graph — the part that doesn't exist today), then layers in the functional views as time allows.
