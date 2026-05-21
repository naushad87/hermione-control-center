// Hermione Control Center — mock corpus
// Shapes match `api-contracts.md` exactly so swapping in ?live=1 is one fetch each.
// Status: /api/status   Strategies: /api/strategies   KB: /api/kb/sources   YT: /api/youtube/days

window.HC = {

  // ─── /api/status ──────────────────────────────────────────────
  status: {
    balance_usd: 686.07,
    balance_delta_24h_usd: -47.38,
    today_pnl_usd: -47.38,
    today_trades: { total: 27, wins: 1, losses: 26 },
    circuit_breaker: false,
    mood: "calm",
    heartbeat_hz: 11.4,
    deployment_day: 67,
    regime: "fear",
    fng: 23,
    positions: [
      { coin: "NEAR", side: "SHORT", entry_px: 1.57899, size: 158.30, uPnL: -55.24,  managed_by: "naushad" },
      { coin: "HYPE", side: "SHORT", entry_px: 42.996,  size: 6.04,   uPnL: -259.60, managed_by: "naushad" },
      { coin: "SOL",  side: "LONG",  entry_px: 142.10,  size: 1.92,   uPnL:  +18.42, managed_by: "council_paper" },
      { coin: "BTC",  side: "LONG",  entry_px: 71498.0, size: 0.0042, uPnL:  +9.18,  managed_by: "channel_scalp" },
    ],
    services: [
      { id: "hermione",            state: "active",  uptime_h: 67 * 24, role: "core loop · perps execution" },
      { id: "hermione-paper-s249", state: "active",  uptime_h: 47,      role: "S249 hypothesis paper-runner" },
      { id: "scanner-e",           state: "active",  uptime_h: 14 * 24, role: "alpha-wallet F-tier scanner" },
      { id: "council-paper",       state: "active",  uptime_h: 33 * 24, role: "5-agent council, paper only" },
      { id: "herd-fib-scalper",    state: "active",  uptime_h: 12 * 24, role: "BTC 1h fib swing paper" },
      { id: "hermione-dashboard",  state: "active",  uptime_h: 67 * 24, role: "mission-control + soul + this" },
      { id: "yt-discovery",        state: "active",  uptime_h:  8 * 24, role: "daily story video pipeline" },
      { id: "oracle-v4-retrain",   state: "idle",    uptime_h:  0,      role: "nightly @ 02:30 UTC" },
    ],
  },

  // ─── /api/strategies ──────────────────────────────────────────
  strategies: [
    { id: "channel_scalp",   name: "Channel Scalp",      mode: "live",  size_usd: 1000, positions_open: 1, today_trades: 2,  today_pnl:  +9.18,  win_rate_7d: 0.43, halo: "neutral", role: "primary · maker S/R" },
    { id: "council_paper",   name: "LLM Council",         mode: "paper", size_usd: 250,  positions_open: 3, today_trades: 12, today_pnl:  +18.42, win_rate_7d: 0.58, halo: "winning", role: "5-agent reasoning" },
    { id: "herd_fib_scalp",  name: "Herd Fib Scalper",    mode: "paper", size_usd: 250,  positions_open: 1, today_trades: 4,  today_pnl:  +5.10,  win_rate_7d: 0.61, halo: "winning", role: "BTC 1h swing" },
    { id: "scanner_e",       name: "Scanner E",           mode: "live",  size_usd: 100,  positions_open: 0, today_trades: 0,  today_pnl:  0,      win_rate_7d: null, halo: "neutral", role: "F-tier wallet sweep" },
    { id: "oanda_xauusd",    name: "OANDA · XAUUSD",      mode: "live",  size_usd: 200,  positions_open: 0, today_trades: 2,  today_pnl:  -4.75,  win_rate_7d: 0.0,  halo: "losing",  role: "gold scalper (hedge)" },
    { id: "breakout",        name: "Breakout Complement", mode: "live",  size_usd: 200,  positions_open: 0, today_trades: 0,  today_pnl:  0,      win_rate_7d: 0.54, halo: "neutral", role: "trend complement" },
    { id: "privacy_pair",    name: "Privacy Pair",        mode: "paper", size_usd: 200,  positions_open: 1, today_trades: 1,  today_pnl:  +0.85,  win_rate_7d: 0.58, halo: "neutral", role: "ZEC+DASH pair" },
    { id: "commodity_scalp", name: "Commodity Scalper",   mode: "paper", size_usd: 200,  positions_open: 0, today_trades: 0,  today_pnl:  0,      win_rate_7d: 0.61, halo: "neutral", role: "SPX/SILVER PF" },
    { id: "council_live",    name: "Council · Live",      mode: "dorm",  size_usd: 0,    positions_open: 0, today_trades: 0,  today_pnl:  0,      win_rate_7d: null, halo: "dormant", role: "sleeping since day 30" },
    { id: "avgdown_grid",    name: "Avg-Down Grid",       mode: "off",   size_usd: 0,    positions_open: 0, today_trades: 0,  today_pnl:  0,      win_rate_7d: null, halo: "retired", role: "disabled forever (ENA)" },
  ],

  // ─── /api/kb/sources ──── 21 sources, mirroring the live registry ─
  kb_sources: [
    { source_id: "arxiv",            score: 0.90, extract: true,  council: true,  enrichment: false, record_count: 1284, last_mtime: "2026-05-20T08:14Z", status: "ACTIVE",         lane: "research" },
    { source_id: "hf_papers",        score: 0.70, extract: false, council: true,  enrichment: true,  record_count: 312,  last_mtime: "2026-05-20T07:22Z", status: "ENRICHMENT",     lane: "research" },
    { source_id: "ssrn",             score: 0.75, extract: true,  council: true,  enrichment: false, record_count: 188,  last_mtime: "2026-05-19T22:10Z", status: "ACTIVE",         lane: "research" },
    { source_id: "openreview",       score: 0.62, extract: false, council: false, enrichment: true,  record_count: 41,   last_mtime: "2026-05-18T11:00Z", status: "ENRICHMENT",     lane: "research" },

    { source_id: "fred",             score: 0.75, extract: false, council: false, enrichment: false, record_count: 89,   last_mtime: "2026-05-20T09:25Z", status: "DETERMINISTIC",  lane: "macro" },
    { source_id: "bls",              score: 0.60, extract: false, council: false, enrichment: false, record_count: 22,   last_mtime: "2026-05-19T13:30Z", status: "DETERMINISTIC",  lane: "macro" },
    { source_id: "ecb",              score: 0.58, extract: false, council: false, enrichment: false, record_count: 14,   last_mtime: "2026-05-19T08:00Z", status: "DETERMINISTIC",  lane: "macro" },
    { source_id: "bea",              score: 0.55, extract: false, council: false, enrichment: false, record_count: 18,   last_mtime: "2026-05-18T15:00Z", status: "DETERMINISTIC",  lane: "macro" },

    { source_id: "youtube",          score: 0.82, extract: true,  council: true,  enrichment: false, record_count: 487,  last_mtime: "2026-05-20T09:52Z", status: "ACTIVE",         lane: "voice" },
    { source_id: "substack",         score: 0.72, extract: true,  council: true,  enrichment: false, record_count: 261,  last_mtime: "2026-05-20T06:11Z", status: "ACTIVE",         lane: "voice" },
    { source_id: "twitter_curated",  score: 0.55, extract: false, council: false, enrichment: true,  record_count: 902,  last_mtime: "2026-05-20T09:58Z", status: "ENRICHMENT",     lane: "voice" },
    { source_id: "podcast_otter",    score: 0.48, extract: true,  council: false, enrichment: true,  record_count: 78,   last_mtime: "2026-05-19T20:42Z", status: "ENRICHMENT",     lane: "voice" },

    { source_id: "github_trending",  score: 0.65, extract: false, council: false, enrichment: true,  record_count: 144,  last_mtime: "2026-05-20T08:00Z", status: "ENRICHMENT",     lane: "code" },
    { source_id: "github_personal",  score: 0.92, extract: true,  council: true,  enrichment: false, record_count: 612,  last_mtime: "2026-05-20T09:41Z", status: "ACTIVE",         lane: "code" },
    { source_id: "kernel_ml_blog",   score: 0.50, extract: false, council: false, enrichment: true,  record_count: 24,   last_mtime: "2026-05-17T12:00Z", status: "ENRICHMENT",     lane: "code" },

    { source_id: "memory_md",        score: 1.00, extract: true,  council: true,  enrichment: false, record_count: 9,    last_mtime: "2026-05-20T09:30Z", status: "CORE",           lane: "self" },
    { source_id: "lessons_learned",  score: 0.99, extract: true,  council: true,  enrichment: false, record_count: 47,   last_mtime: "2026-05-19T18:55Z", status: "CORE",           lane: "self" },
    { source_id: "changelog",        score: 0.96, extract: true,  council: true,  enrichment: false, record_count: 200,  last_mtime: "2026-05-20T09:48Z", status: "CORE",           lane: "self" },
    { source_id: "autopsy_log",      score: 0.98, extract: true,  council: true,  enrichment: false, record_count: 23,   last_mtime: "2026-05-20T03:11Z", status: "CORE",           lane: "self" },

    { source_id: "hyperliquid_fills",score: 0.94, extract: false, council: false, enrichment: false, record_count: 3745, last_mtime: "2026-05-20T09:59Z", status: "DETERMINISTIC",  lane: "exec" },
    { source_id: "oanda_fills",      score: 0.71, extract: false, council: false, enrichment: false, record_count: 142,  last_mtime: "2026-05-20T09:30Z", status: "DETERMINISTIC",  lane: "exec" },
  ],

  // ─── /api/youtube/days ── 60 days of story, recent first ────
  youtube_days: (function () {
    const titles = [
      "F-tier coverage gap → 2-stage architectural fix",
      "Bulk rerun ships: F-tier 91% → 60.5%",
      "Oracle v4 retrain — wf_auc 0.7973 → 0.8011",
      "Avellaneda 2024 §3 ingested. Wider-SL hypothesis lives.",
      "Sentiment Reversal retired. Don't resurrect for 90d.",
      "Silent SL cap killed every entry for 2.5 days",
      "/tmp wiped on reboot — 2h49m of calibration gone",
      "ENA disaster, one year on. Avg-down stays dead.",
      "ta library missing for 34 days — features were flat",
      "Kelly bug: full 2× sizing at 15% WR",
      "Below random — Oracle val_auc 0.361",
      "5 arguing AIs lose to a silent scalper",
      "First channel-scalper fill at maker price",
      "Hermione, day 1. The hardware is a laptop.",
    ];
    const today = new Date("2026-05-20T00:00:00Z");
    const out = [];
    for (let i = 0; i < 60; i++) {
      const d = new Date(today); d.setUTCDate(today.getUTCDate() - i);
      const day = 60 - i;
      const title = titles[i % titles.length];
      // Story beats: warnings on autopsy days, "shipped" on green days, otherwise neutral
      const kind = i === 0 ? "shipped"
                 : i % 11 === 0 ? "warning"
                 : i % 7 === 0  ? "lesson"
                 : i % 5 === 0  ? "shipped"
                 : "log";
      out.push({
        day, date: d.toISOString().slice(0, 10), title, kind,
        preview: i < 4 ? "18-hour day. Two refactors. One lesson kept." : "—",
      });
    }
    return out;
  })(),

  // ─── /api/oracle ──────────────────────────────────────────────
  oracle: {
    version: "v4",
    val_auc: 0.557,
    wf_auc: 0.8011,
    last_retrain: "2026-05-20T02:31:00Z",
    n_features: 27,
    status: "live",
    note: "rolling_wr_10 still the only live feature. SGKF(wallet) val_auc 0.6749.",
  },

  // ─── meta ─────────────────────────────────────────────────────
  meta: {
    name: "HERMIONE",
    codename: "HRMN-V5",
    version: "v5.9 · oracle v4",
    deployment_day: 67,
    session: 201,
    creator: "Naushad",
    north_star: "Aladdin for retail",
    last_evolved: "2026-05-20T02:31:00Z",
  },
};
