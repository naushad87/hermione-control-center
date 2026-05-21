# Handoff: Hermione Control Center · Neural Graph (Phase 1 + 2)

## Overview

The **Neural Graph** is the home screen of the Hermione Control Center — a
single-page app that visualises Hermione's entire mind as a series of concentric
orbital rings around her central "core". It answers two questions at once:

- **What is she running?** (services, live state, positions)
- **Who is she?** (the knowledge base she reads, the strategies she runs, the
  60-day public story she's telling)

This is the **home / overview view** of the broader Control Center
(`/dashboard`, `/journal`, `/kb`, `/scalpers`, `/autopsy` are sibling routes
that this design hands off to via the top-bar crumbs).

Phase 1 ships the visualisation. Phase 2 adds the **Ask Gateway** — a natural-
language input that returns a routed answer and lights up the relevant nodes on
the graph.

---

## About the Design Files

The files in this bundle are **design references created in HTML** — interactive
prototypes that show intended look, feel and behaviour. They are not production
code to copy directly. The task is to **recreate this UI in the existing
Hermione codebase** (per `naushad87/hermione-control-center` brief: React 19 +
D3 v7 + Tailwind + Vite, single `index.html` + `app.bundle.js`, < 500 KB).

The mock data in `neural-graph-assets/neural-data.js` mirrors the shapes
specified in the project's `api-contracts.md` — when re-implementing, swap the
mock for real `fetch()` calls (the `?live=1` switch in `Neural Graph.html` shows
exactly which endpoints to call).

---

## Fidelity

**High-fidelity.** Every color, font size, ring radius, animation timing and
spacing value in this prototype is a deliberate choice. The developer should
recreate this pixel-perfectly using Hermione's existing tokens and component
library (or establish them if not present).

---

## Identity Anchor

> Cortana × Hermione Granger × Obsidian-graph.

This is **not a dashboard**. It is Hermione's mind. The visual language is:

- **Observatory / terminal**, not SaaS. No rounded card stacks; no
  icon-tile-above-heading; no purple→blue gradients.
- **Mono + display type only.** JetBrains Mono for body and data;
  Orbitron for the brand/core glyph; Share Tech Mono for tickers and
  small caps eyebrows.
- **Tinted blacks, not pure black.** Deep teal-tinted `#040d0f` background;
  text-3 carries the same teal tint (`#7d9aa0`).
- **Mint as identity color** (`#00f5c4`) — used for accent, active, live, won.
- **Semantic color discipline.** Red is loss; orange is warning; gold is
  research; purple is self; mint is winning. Lanes carry meaning, not just
  decoration.
- **Slow, breathing motion.** The core pulses at ~1.6s. Rings rotate at
  fractional speeds (4× / 1.8× / -1.1× / 0.4×). Nothing snaps; everything
  eases.

---

## Screens / Views

There is one full-screen view in this design. Layout:

```
┌──────────────────────────────────────────────────────────────────┐
│  TOP CHROME (56px, absolute, gradient-faded to transparent)      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌────────┐                                          ┌─────────┐  │
│ │ LEFT   │                                          │ DETAIL  │  │
│ │ RAIL   │            SVG CANVAS                    │ RAIL    │  │
│ │ 232 px │            (viewBox 1600 × 1000          │ 336 px  │  │
│ │        │             scaled to fit window)        │         │  │
│ │ Rings  │                                          │ context │  │
│ │ Lanes  │     ┌── strand IV ──┐                    │ on the  │  │
│ │ Pos.   │     │  ring III     │                    │ current │  │
│ │        │     │   ring II     │                    │ selection│ │
│ │        │     │   ring I      │                    │         │  │
│ │        │     │  ┌─core─┐     │                    │         │  │
│ │        │     │  │      │     │                    │         │  │
│ │        │     │  └──────┘     │                    │         │  │
│ │        │     │               │                    │         │  │
│ │        │     └───────────────┘                    │         │  │
│ └────────┘                                          └─────────┘  │
│                                                                  │
│   ┌─────────────── ASK RESPONSE (when active) ───────────────┐  │
│   │ ...answer surface above the input...                     │  │
│   └──────────────────────────────────────────────────────────┘  │
│   ┌─────────── ASK-HER INPUT (50px, centered) ───────────────┐  │
│   ▸ STREAM ticker line                                           │
└──────────────────────────────────────────────────────────────────┘
```

### 1. The SVG Canvas

The whole viewport is an SVG with `viewBox="0 0 1600 1000"` and
`preserveAspectRatio="xMidYMid meet"`. Everything in the canvas is drawn in
fixed canvas coordinates and the browser scales the viewBox to fit the window.

Center of the universe: `(800, 480)` (centered horizontally, pulled 20px up
from vertical center for visual balance with the bottom rail).

The drawing layers, back to front:
1. **Starfield** (110 randomly-seeded dim dots, behind everything)
2. **Strand IV — YouTube story** (60 days, R=540, ~280° arc)
3. **Ring III — Strategies** (10 hex nodes, R=432)
4. **Ring II — KB constellation** (21 nodes, R=282, grouped by lane)
5. **Ring I — Services / live state** (8 round nodes, R=168)
6. **Connection rays** (lines from selection to its semantic peers)
7. **Particles layer** (trades flying from active strategies → core)
8. **Hermione core** (R=88, breathing graticule, equity readout)

### 2. Top Chrome (56px, absolute)

Three sections, left to right:

- **Brand block** — 30 × 30 mint-bordered square with "H" inside (Orbitron 14
  900); brand title `HERMIONE · CONTROL CENTER` 13/0.22em uppercase; small
  caps subtitle `HRMN-V5 · v5.9 · oracle v4 · NEURAL GRAPH` 9.5/0.24em.
- **Crumbs** (centered) — `GRAPH · JOURNAL · KB · SCALPERS · AUTOPSY` joined
  by 4×4 dot dividers. The active crumb is mint; others are text-3.
- **Top meta strip** — heartbeat pulse dot + `HEARTBEAT 11.4 Hz` · `ORACLE v4
  wf_auc 0.801` · `F&G 23 · REGIME FEAR` · UTC clock. All Share Tech Mono
  10.5/0.14em.

The chrome has a gradient fade to transparent at the bottom and
`pointer-events: none` on the container (with children opting back in) so
nothing in the chrome blocks SVG interaction beneath it.

### 3. Left Rail (232px, absolute, top: 84px, left: 18px)

Three panels stacked with 14px gaps. Each panel has:
- Translucent `surface` background (`rgba(10, 26, 29, 0.78)`)
- 1px `border` outline
- 6px backdrop blur
- `panel__head` (36px high) and `panel__body` (12px padding)

Panels:

**RINGS** (count: 4/4) — Each ring listed with Roman numeral, name, subtitle,
and a toggle switch. Click toggles whether that ring is drawn in the SVG.
Toggle is a 22×12px outline with an 8×8 sliding inner block, mint when on.

**LANES · KB** (count: 21) — One row per lane: 10×10 colored dot, label
(SELF / RESEARCH / MACRO / VOICE / CODE / EXEC), count of sources in that lane
right-aligned. Static; not interactive.

**POSITIONS** (count: 4) — Four-column grid: ticker, L/S indicator, size@px,
uPnL. Tight monospaced columns. Long positions in mint, short in red.

### 4. Detail Rail (336px, absolute, top: 84px, right: 18px)

Slides in when the user clicks a node. Has 4 distinct content shapes:

| Selection type | Eyebrow | Title | Body |
|---|---|---|---|
| Service (svc:*) | `I · LIVE STATE / SERVICE`, mint | `s.id` | State / Uptime metric grid + note |
| KB source (kb:*) | `II · KNOWLEDGE / {LANE}`, lane color | `s.source_id` formatted | Records / mtime / council / extract metrics + chips + status note |
| Strategy (str:*) | `III · STRATEGY / {MODE}`, halo color | `s.name` | 6-metric grid: PnL / trades / open / WR / allocation / halo |
| YT day (yt:*) | `IV · STORY / {KIND}`, kind color | `DAY {n}` | Title quote + preview + posted/channel/format kv |

When nothing is selected: a smaller, dashed-border, idle panel with a brief
explanation and keyboard hint.

### 5. Ask Gateway (Phase 2 — bottom, absolute)

Two layers:
- **Input bar** — full-width-capped-at-720px, centered, 50px high. Lozenge
  glyph on the left, monospaced input in the middle, `/ TO FOCUS` keyboard
  hint on the right (becomes `ESC TO CLEAR` when an answer is showing). Mint
  border + glow when focused.
- **Response surface** — appears 80px above the input when the user submits.
  Same width as the input. Has: eyebrow (`HERMIONE · {EYEBROW}`), close
  button, query echo with `▸` prefix, answer paragraph (text-wrap: pretty),
  highlight pills (clickable, focus the relevant node), follow-up chips
  (clickable, fire a new ask).

While the answer is loading, the body shows a three-dot pulse with the line
`routing through council · 5 agents · 27 features`.

### 6. Ticker (22px, bottom of viewport)

Rotating 5-line status ticker, 5-second cadence. Lines describe oracle state,
day count, last lesson, circuit breaker, regime. Share Tech Mono 10/0.16em
muted color. Hidden while an Ask response is visible.

---

## Components in detail

### Hermione Core

- Outer ring: `R + 36 = 124px`, `rgba(0,245,196,0.06)` 1px stroke
- Middle dashed ring: `R + 22 = 110px`, `rgba(0,245,196,0.12)` strokeDasharray="1 6"
- Glow gradient: radial, 0% mint @ 0.55, 45% mint @ 0.15, 100% mint @ 0
- Core fill: radial, `#0a1a1d` → `#04181a`
- The core breathes: `scale(1 + sin(phase * 6) * 0.04)`, phase advances at
  `0.18` rad/s
- Graticule: 24 radial lines from r=`R * 0.7` to r=`R * (0.92 + sin(phase*2 + i) * 0.04)`
- Inner pip: 4px mint dot, plus two outline circles at r=10, 20
- Text stack (centered):
  - `HERMIONE` — Orbitron 14, letter-spacing 0.22em, y=-44
  - `HRMN-V5` — Orbitron 7.5, letter-spacing 0.28em, muted, y=-28
  - `$686.07` — JetBrains Mono 18, primary text, y=44
  - `-47.38 · 24H` — Share Tech Mono 9, color = mint if ≥0 else red, y=60
  - `DAY 67 · CALM` — Share Tech Mono 8, letter-spacing 0.18em, muted, y=76

### Ring I — Services / Live State

- Radius: 168px
- Faint dashed circle at the radius
- 8 nodes evenly spaced (each at `i/8 * 360°`)
- **Rotation:** `rotate * 4` degrees, where `rotate` increases at 1.0 rad/s (tweakable)
- Each node: 5.5px round dot (mint if active, muted if idle)
- Active nodes have a pulsing 6→14px halo (animate r and opacity, 2.6s)
- Hover: dot grows to 9px; label highlights mint
- Click: selects + camera focuses

### Ring II — KB Constellation

- Radius: 282px
- Faint static outline circle
- 21 nodes grouped into 6 lanes; one virtual slot of empty space between lanes
- Each lane spans an arc; arc band is drawn as a 2px stroke at 0.45 opacity in
  the lane color
- Lane labels (`SELF / RESEARCH / MACRO / VOICE / CODE / EXEC`) sit inside
  the ring at R-22 in lane color at 0.7 opacity
- Nodes: radius `3.5 + score * 5` (so range ~4 → 8.5px). Lane color fill;
  active/core at 0.95, others at 0.55 opacity.
- CORE sources have an extra dashed outline at r+4
- Each node has a faint spoke connecting it to the center (0.05 opacity,
  rises to 0.4 when hot)
- Rotation: `rotate * 1.8` degrees
- Lane order from the top, clockwise: SELF, RESEARCH, MACRO, VOICE, CODE, EXEC

### Ring III — Strategies

- Radius: 432px
- Faint static outline circle
- 10 strategies, evenly spaced
- Each strategy = a hexagon with size `7 + log2(1 + size_usd/50) * 1.4`
  (so allocation-weighted; range ~7 → ~14px)
- Halo: outline circle at radius `size * 2` (or `size * 3` when hot)
- Halo color = halo state (winning=mint / losing=red / neutral=muted / dormant=dim / retired=dim)
- Halo opacity: winning 0.55, losing 0.45, others 0.18
- Hex fill: halo color when active (live/paper), transparent for dormant/off
- Single-letter glyph in center: `L` (live), `P` (paper), `·` (dormant), `×` (retired)
- Label positioned radially outward at `R + size*3 + 14` so it never overlaps the halo
- Below the label: today's PnL in Share Tech Mono 9, halo color, 0.85 opacity
- Rotation: `-rotate * 1.1` degrees (counter-rotating vs ring I)

### Strand IV — YouTube Story

- Radius: 540px base, with `sin(t * π * 6) * 6` sinusoidal jitter so it reads
  as a strand, not a perfect ring
- Spans 280° (from 130° to 410°, i.e., bottom-left around to bottom-right via the top)
- 60 day-nodes
- Each node: 2.2px circle, color by kind:
  - `shipped` → mint
  - `warning` → red
  - `lesson` → orange
  - `log` → muted
- Decade ticks (day % 10 == 0): small radial tick line + Share Tech Mono 9 `D{n}` label outside
- Faint dashed arc baseline in `rgba(255, 61, 90, 0.18)` 1px stroke
- Rotation: `rotate * 0.4` degrees (slowest)

### Connection Rays

When a node is selected, draws lines to its semantic peers (defined in the
`relatedNodes()` function in `neural-graph.jsx`). Plus a line to the core.
- Strong rays (from selection): solid mint, opacity 0.55, 1.1px stroke
- Soft rays (from ask highlights): dashed mint, opacity 0.25, 0.7px stroke

The relationship map is hard-coded in the prototype; in production this
should come from a real graph relation table on the backend (e.g.,
`/api/relations/{node_id}` returning related node ids and edge weights).

### Particles

Each active strategy (live/paper, today_trades > 0) emits a particle every
`max(900, 6000 / trades)` ms. Particles travel from the strategy's current
world position into the core, at 0.6 / second. Color = mint if today_pnl ≥ 0,
red otherwise. 2px circle with a glow drop-shadow. Fade to transparent on
arrival.

In production, drive this from a websocket on `/api/fills` (each fill emits
one particle from its owning strategy → core, colored by fill PnL).

### Camera

Click any node → target = `{ x: node.x, y: node.y, scale: 1.32 }`. Click empty
canvas or Esc → target = `{ x: CX, y: CY, scale: 1 }`. The actual camera
exponentially eases toward the target with `k = 1 - exp(-dt * 4.2)`. The
transform applied to the SVG group is:
`translate(${VW/2} ${VH/2}) scale(${cam.s}) translate(${-cam.x} ${-cam.y})`

---

## Interactions & Behavior

### Keyboard

- `/` — focus the Ask input
- `Esc` — clear current selection AND clear any active Ask response
- `g` — clear selection (return to overview)

### Click

- **Empty canvas / .stage** — clear selection (camera returns to overview)
- **Hermione core** — clears selection (treated as deselect)
- **Any node** — selects it. `event.stopPropagation()` on the node prevents
  the stage's deselect from firing. Camera eases to the node. Detail rail
  updates. Connection rays draw to peers.

### Hover

- Hovered node grows in size and labels brighten to primary text color.
- Rays are NOT drawn on hover — only on click. Hovers are cheap.

### Ask flow

1. User types into the input.
2. On submit (Enter or form submit), the state goes `idle → thinking`.
3. After 600ms (simulated routing), state goes `thinking → answered`.
4. Response surface fades up (220ms cubic-bezier(.2, .8, .2, 1)).
5. If the answer has a `focus` node, that node becomes selected (camera moves).
6. If the answer has `highlights`, those nodes get a pulsing animated halo
   AND faint dashed rays draw from the core to each highlight.
7. User can click a follow-up chip → fires `ask(chip)`, looping back to step 2.
8. Esc or × clears the response → state `idle`.

### Ring toggles

Click any row in the RINGS panel to show/hide that ring. Geometry updates
immediately (no animation; just conditional render).

### Reduced motion

`prefers-reduced-motion: reduce` kills all animations and transitions globally.

---

## State Management

| State | Type | Where | Purpose |
|---|---|---|---|
| `hovered` | string \| null | ControlCenter | Currently hovered node key (`"svc:hermione"` etc) |
| `selected` | string \| null | ControlCenter | Currently selected node key |
| `rings` | `{r1, r2, r3, r4: bool}` | ControlCenter | Which rings are visible |
| `askState` | `'idle' \| 'thinking' \| 'answered'` | ControlCenter | Phase of the Ask flow |
| `askResponse` | object \| null | ControlCenter | The active answer object |
| `rotate` | number | ControlCenter | Rotation phase, advances every frame |
| `cam` | `{x, y, s}` | useCamera | Animated camera target |

The `positions` map (every node's current world position, recomputed each
rotation tick) is derived state, computed via `useMemo(() => computePositions(data, rotate), [data, rotate])`.

---

## Data Flow

In **development / design preview**: `window.HC` is loaded from
`neural-graph-assets/neural-data.js`, a static mock that mirrors the API
contract shapes. The whole prototype runs offline against this mock.

In **live mode** (`?live=1` URL param): on boot, `Promise.all` fetches
`/api/status`, `/api/strategies`, `/api/kb/sources`, `/api/youtube/days`,
`/api/oracle`. Results are merged into `window.HC` and the React root
re-renders. No polling in Phase 1; add polling/SSE in Phase 3.

The shapes match `api-contracts.md` from the source repo verbatim. Field
names in this design and field names in `api-contracts.md` are equal.

### POST /api/ask (Phase 2)

The prototype mocks this in `neural-ask.jsx::matchCanned()` — a sequence of
regex rules with canned answers. In production replace with:
```
POST /api/ask  { query: string }
→ {
    eyebrow: string,
    text: string,
    highlights: string[],   // node ids: "svc:..." | "kb:..." | "str:..." | "yt:..."
    focus: string | null,   // primary node id to focus the camera on
    follow_ups: string[],   // suggested next queries
  }
```

The backend can use Claude (with full KB context) or a smaller routing model.
Either way, the response shape must match.

---

## Design Tokens

### Colors — Observatory (default, dark)

```css
--bg:        #040d0f   /* viewport background */
--bg-2:      #07171a
--surface:   #0a1a1d   /* panels */
--surface-2: #0f2429   /* panel heads, sub-surfaces */
--surface-3: #14323a
--border:    #1a3a42
--border-2:  #2a5560

--text:      #ecf6f8   /* primary text */
--text-2:    #b3cdd3   /* secondary */
--text-3:    #7d9aa0   /* tertiary, eyebrows, labels */
--text-mute: #4a6770   /* darkest readable */

--mint:      #00f5c4   /* accent, won, live, identity */
--blue:      #00b8ff   /* research lane */
--orange:    #ffb454   /* warning, exec lane */
--red:       #ff3d5a   /* loss, voice lane */
--purple:    #b87cff   /* self lane */
--yellow:    #f0d75a   /* macro lane */

--lane-self:     #b87cff
--lane-research: #00b8ff
--lane-macro:    #f0d75a
--lane-voice:    #ff3d5a
--lane-code:     #00f5c4
--lane-exec:     #ffb454
```

### Colors — Other palettes (tweakable)

The design supports 5 system palettes (set `data-palette` and `data-mode`
on `<html>`):

- **observatory** (default, dark) — see above
- **ocean** (dark, navy→cyan) — `--bg: #020a1a`, brighter cold accents
- **beach** (dark, deep teal + warm Beach Fair accents)
- **pastel** (LIGHT, white→grey gradient bg, sage + warm beige accents)
- **woodsy** (LIGHT, cream-white→grey bg, olive + ochre accents)

Implementation: see `applyPalette()` in `Neural Graph.html`. Light palettes
flip text colors AND ambient effects (scanlines become graphite, vignette
darkens corners not center, panels go translucent white).

### Typography

```css
--font-mono:    'JetBrains Mono', ui-monospace, monospace;
--font-display: 'Orbitron', 'JetBrains Mono', monospace;
--font-tech:    'Share Tech Mono', 'JetBrains Mono', monospace;
```

Body default: 13px / 1.45 / JetBrains Mono.
Brand & section labels: Orbitron 13 / 700 / 0.22em letter-spacing / uppercase.
Eyebrows, tickers, small caps labels: Share Tech Mono 10–11 / 0.16em / uppercase.

### Spacing

Panel padding: 10–14px. Section gap: 12–14px. Inter-element gap inside
panels: 6–8px. The whole layout is built on the 4px base (most numbers used
are multiples of 4 or 2).

### Shadows / depth

Panels: `0 0 0 1px rgba(0,0,0,0.02) inset, 0 8px 24px rgba(0,0,0,0.5)`
Ask response: extra mint glow `0 0 32px rgba(0,245,196,0.12)`
Heartbeat dot: `0 0 8px var(--accent)`
Particles: `drop-shadow(0 0 4px currentColor)`
Core glow: layered radial gradients (see HermioneCore in jsx)

### Animation timings

- Heartbeat dot pulse: 1.6s ease-in-out infinite
- Core breathing: phase * 6 sine wave (~1 Hz effective)
- Service node pulse: 2.6s (passive) or 1.2s (highlighted)
- Hover transitions: 120-160ms
- Ask response fade-up: 220ms cubic-bezier(.2, .8, .2, 1)
- Camera ease: exponential decay with rate 4.2/s
- Particles: 0.6/s travel from emitter to core

### Border radii

The design uses `0` border-radius almost everywhere — this is intentional.
Only the heartbeat dot, lane swatches, ask pill text input, and chip dots
are rounded. **Resist the urge to add radius to panels.**

---

## Assets

- **Fonts** — all Google Fonts: JetBrains Mono (300/400/500/600), Orbitron
  (400/700/900), Share Tech Mono.
- **Icons** — none. Glyphs (`H`, `⋄`, `▸`, `×`, dots) are typographic only.
- **Images** — none. The whole UI is SVG + CSS.
- **Brand mark** — the bordered `H` in the top-left of the top-chrome.

---

## Files in this bundle

| Path | Role |
|---|---|
| `Neural Graph.html` | Root page — boots React, reads `?live=1` switch, defines tweaks, runs the palette switcher |
| `neural-graph-assets/neural-graph.css` | All styles — CSS custom properties drive both palette tokens and lane colors |
| `neural-graph-assets/neural-graph.jsx` | All graph components: ControlCenter (root), HermioneCore, ServicesRing, KBRing, StrategiesRing, YouTubeStrand, Connections, ParticlesLayer, useCamera, Detail rail, TopChrome, LeftRail. Plus `computePositions()` (the one function you MUST get right when reimplementing). |
| `neural-graph-assets/neural-ask.jsx` | The Ask gateway — input, response surface, canned matcher, thinking dots |
| `neural-graph-assets/neural-data.js` | Mock corpus shaped exactly like `api-contracts.md` |
| `neural-graph-assets/tweaks-panel.jsx` | The Tweaks panel shell — used in-prototype only; remove in production |

---

## Implementation notes for the developer

1. **Build the geometry first.** `computePositions()` in `neural-graph.jsx`
   is the heart of the whole thing — once every node has a world position,
   everything else (rays, particles, camera, hovers) follows naturally. Get
   this right and the rest is presentation.

2. **Don't reach for D3 force-layout.** This is a fixed-radius polar layout
   on each ring. D3's only useful contributions here are `d3.scaleSqrt`
   (for the strategy hexagon sizes) and `d3.arc` (if you prefer it over the
   hand-rolled `arcPath()` helper). The brief says D3 v7 — you may end up
   using almost none of it.

3. **Rotation is per-ring, not per-scene.** Each ring rotates at a different
   fractional rate. Strand IV rotates slowest. Ring I rotates fastest in
   the opposite direction to Ring III for visual depth.

4. **Avoid SVG `<g transform>` for rotation if you also need world coords.**
   The current implementation computes positions in world coordinates each
   frame, then renders nodes at those positions. This is what lets rays,
   particles and the camera target reach the right place even when the ring
   is "rotating". Don't wrap the ring in `<g transform="rotate(...)">` —
   you'll break everything else.

5. **The relationship map in `relatedNodes()` is placeholder.** Replace with
   a real query against backend graph data when available.

6. **Particles are decorative.** Don't over-engineer. A `useRef([])` queue
   per render is fine for the prototype's volumes. If you have 1000+ trades
   per minute, batch into canvas instead of SVG.

7. **The Ask matcher is placeholder.** The 9 canned rules in
   `neural-ask.jsx` are illustrative. Replace with a real routing endpoint.
   Keep the response shape identical.

8. **Tweaks panel is dev-only.** Don't ship it. The five system palettes
   can become a user-facing theme setting if desired, but the Tweaks panel
   chrome itself is just a development affordance.

9. **The standalone bundle in the project** (`Neural Graph · Standalone.html`,
   ~1.4 MB) is a reference build with everything inlined — useful for
   sharing screenshots, not for production.

10. **Performance budget.** All animations run via `requestAnimationFrame`.
    There's exactly ONE rAF loop driving rotation; particles & camera
    piggyback. On a modern laptop the whole thing sits comfortably at 60fps.
    If you re-implement with hooks-per-component frame loops you will
    accidentally create 5+ rAF subscriptions — consolidate.
