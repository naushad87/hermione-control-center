# API Contracts — endpoints the Control Center SPA consumes

**Backend**: `hermione_dashboard_v2.py` (FastAPI, single file, port 8000)

**Status of each endpoint**:
- ✅ **LIVE** — exists today, can call directly
- 🟡 **PARTIAL** — exists but may need adapter
- 🆕 **TO BUILD** — Claude Design should mock this; backend implementer adds it later

---

## Core State Endpoints

### `GET /api/status` ✅ LIVE
Returns the high-level operational state for the center + first ring.
```json
{
  "balance_usd": 686.07,
  "balance_delta_24h_usd": -47.38,
  "positions": [
    {"coin": "NEAR", "side": "SHORT", "entry_px": 1.57899, "size": 158.30, "uPnL": -55.24, "managed_by": "naushad"},
    {"coin": "HYPE", "side": "SHORT", "entry_px": 42.996, "size": 6.04, "uPnL": -259.60, "managed_by": "naushad"}
  ],
  "today_pnl_usd": -47.38,
  "today_trades": {"total": 27, "wins": 1, "losses": 26},
  "services": {
    "hermione": "active",
    "hermione-paper-s249": "active",
    "scanner-e": "active",
    "council-paper": "active",
    "herd-fib-scalper": "active",
    "hermione-dashboard": "active",
    "yt-discovery": "active"
  },
  "circuit_breaker": false,
  "mood": "calm"
}
```
Polling interval: 2s.

### `GET /api/strategies` 🆕 TO BUILD
Returns per-strategy live state. Used by Third Ring.
```json
[
  {"id": "channel_scalp", "mode": "live", "size_usd": 1000, "positions_open": 0, "today_trades": 0, "today_pnl": 0, "win_rate_7d": 0.43, "halo": "neutral"},
  {"id": "council_paper", "mode": "paper", "size_usd": 250, "positions_open": 3, "today_trades": 12, "today_pnl": 18.42, "win_rate_7d": 0.58, "halo": "winning"},
  {"id": "herd_fib_scalp", "mode": "paper", "size_usd": 250, "positions_open": 1, "today_trades": 4, "today_pnl": 5.10, "win_rate_7d": 0.61, "halo": "winning"},
  {"id": "scanner_e", "mode": "live", "size_usd": 100, "positions_open": 0, "today_trades": 0, "today_pnl": 0, "win_rate_7d": null, "halo": "neutral"},
  {"id": "oanda_xauusd", "mode": "live", "size_usd": 200, "positions_open": 0, "today_trades": 2, "today_pnl": -4.75, "win_rate_7d": 0.0, "halo": "losing"}
]
```
Polling interval: 5s.

---

## Knowledge Base Endpoints

### `GET /api/kb/sources` ✅ LIVE (shipped 2026-05-20)
Returns all registered KnowledgeSource connectors with live record counts.
```json
[
  {"source_id": "arxiv", "score": 0.9, "extract": true, "council": true, "enrichment": false, "record_count": 0, "last_mtime": "never", "status": "ACTIVE"},
  {"source_id": "hf_papers", "score": 0.7, "extract": false, "council": true, "enrichment": true, "record_count": 0, "last_mtime": "never", "status": "ENRICHMENT"},
  {"source_id": "fred", "score": 0.75, "extract": false, "council": false, "enrichment": false, "record_count": 89, "last_mtime": "2026-05-20T09:25:00Z", "status": "DETERMINISTIC"}
  // ...21 total
]
```
Polling interval: 30s (KB doesn't change fast).
Endpoint also exists as HTML at `/kb/sources`.

### `GET /api/kb/source/{source_id}/recent` 🆕 TO BUILD
Returns recent records from a single connector. Used when zooming into a KB node.
```json
{
  "source_id": "arxiv",
  "records": [
    {"id": "2401.12345", "title": "Foo Bar", "authors": ["..."], "published_at": "2026-05-19", "extracted_kind": "strategy", "score": 0.78}
  ]
}
```

---

## Journal Endpoints

### `GET /api/journal/today` 🟡 PARTIAL (`/api/journal` exists; need today filter)
```json
{
  "date": "2026-05-20",
  "trades": [
    {"ts": "2026-05-20T10:14:23Z", "coin": "NEAR", "side": "SHORT", "entry": 1.579, "exit": 1.622, "pnl": -55.24, "tier": "T2", "source": "bot"}
  ],
  "summary": {"count": 27, "net_pnl": -47.38, "wins": 1, "losses": 26}
}
```

### `GET /api/journal/recent?n=50` 🟡 PARTIAL
Returns last N trades across all dates. Used by edge particles (recent winners trail back to the strategy that produced them).

### `GET /api/autopsies?limit=20` ✅ LIVE
Returns recent autopsy entries with blocks. Used as warning markers in the outer ring.

---

## YouTube Story Endpoints

### `GET /api/youtube/days` 🆕 TO BUILD
Lists all daily entries.
```json
[
  {"day": 60, "date": "2026-05-19", "title": "F-tier coverage gap → 2-stage architectural fix", "preview": "18-hour day..."}
]
```

### `GET /api/youtube/day/{n}` 🆕 TO BUILD
Returns a single day's markdown rendered to HTML.
```json
{"day": 60, "date": "2026-05-19", "markdown": "...", "html": "<h1>...</h1>"}
```

---

## Oracle Endpoint

### `GET /api/oracle` ✅ LIVE
```json
{"version": "v2", "val_auc": 0.557, "last_retrain": "2026-05-19T02:30:00Z", "n_features": 27, "status": "live"}
```

---

## Voice / Ask Endpoint (Phase 2)

### `POST /api/ask` 🆕 TO BUILD — the future voice gateway
Request:
```json
{"query": "What's the score on the new alpha wallets?"}
```
Response:
```json
{
  "text": "We surfaced 41 A-tier alpha wallets today after the bulk rerun. Top hits: 8p6iSgNR at 212.5x, HuWvi86KK at 162.7x, 85fw8RoH at 155.4x. The stale-cache fix collapsed F-tier from 91% to 60.5%. The active.json deploy at 16:57 UTC pushes them to downstream scanners.",
  "visualization": "highlight_a_tier_wallets",
  "data": {
    "a_tier_count": 41,
    "top_wallets": [{"wallet": "8p6iSgNR54ux", "mult": 212.5}, ...]
  },
  "follow_up_suggestions": ["Show me the bulk rerun audit", "Why was the F-tier 91% before?"]
}
```

Implementation note: `POST /api/ask` accepts a text query, optionally returns a `visualization` hint that the SPA uses to drive node highlighting / camera focus. For Phase 2, the same endpoint will accept audio + return audio.

---

## Mounting the SPA

Add to `hermione_dashboard_v2.py`:

```python
from fastapi.staticfiles import StaticFiles
app.mount("/static", StaticFiles(directory="/home/ubuntu/hermione_control_center/build"), name="control_center")

@app.get("/")
def serve_control_center():
    return FileResponse("/home/ubuntu/hermione_control_center/build/index.html")
```

Existing routes (`/kb`, `/scalpers`, etc.) remain as deep links / fallbacks.

---

## CORS

Local-only deployment. No CORS needed.

## Auth

None — network boundary is the auth (Hetzner firewall + tailscale or similar).

## WebSocket option (future)

For sub-second-latency feel, consider upgrading `/api/status` to a WS push. Phase 3.
