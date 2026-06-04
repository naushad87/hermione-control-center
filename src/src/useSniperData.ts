// @ts-nocheck
import { useState, useEffect } from 'react';

const POLL_INTERVAL = 15000; // 15s

const EMPTY_DATA = {
  stats: {
    wallet_sol: 0, wallet_address: '...', today_pnl_usd: 0,
    halt_flag: false, halt_threshold_usd: -50.0, service_active: false,
    pnl_7d: { usd: 0, closes: 0, wins: 0 },
    pnl_30d: { usd: 0, closes: 0, wins: 0 },
    native_prices: { sol: 168.4, bnb: 612.3, base: 1800.0, sol_change_24h: 0, bnb_change_24h: 0, base_change_24h: 0 },
    chain_status: { sol: false, bnb: false, base: false },
  },
  counters: {
    opens: 0, closes_tp: 0, closes_sl: 0,
    fail_submit: 0, fail_dropped: 0, fail_pending_unknown: 0,
    fail_blockhash: 0, fail_aged_out: 0, fail_cancelled: 0,
    stale_reaped: 0, recovered_late: 0, dryrun_reservations: 0,
    state_reserved: 0, state_pending_buy: 0, state_open: 0,
    state_closing: 0, state_closed: 0, state_failed_terminal: 0,
    pending_buy_keys: 0, pending_sell_keys: 0,
  },
  funnel: {
    migrations_seen: 0, migrations_dispatched: 0, closes_tp: 0,
    dropout_gating_failed: 0, dropout_entry_price_unavailable: 0, gt_429_count: 0,
  },
  positions: { sol: [], bnb: [], base: [] },
  journal: { sol: [], bnb: [], base: [] },
  paper: { sol: [], bnb: [], base: [] },
  config: {
    sol: { enabled: true, mode: 'live', buySize: 0.40, maxConc: 4, tp: 50, sl: 20, slip: 1.5, minLiq: 30000 },
    bnb: { enabled: false, mode: 'dry', buySize: 0.05, maxConc: 3, tp: 40, sl: 18, slip: 2.0, minLiq: 25000 },
    base: { enabled: false, mode: 'dry', buySize: 0.005, maxConc: 2, tp: 35, sl: 15, slip: 1.0, minLiq: 50000 },
  },
};

export function useSniperData() {
  const [data, setData] = useState(EMPTY_DATA);
  const [refreshIn, setRefreshIn] = useState(15);
  const [lastFetch, setLastFetch] = useState(0);

  const fetch_data = async () => {
    try {
      const r = await fetch('/api/control/sniper', { cache: 'no-store' });
      if (r.ok) {
        const d = await r.json();
        const merged = { ...d };
        merged.config = {};
        const chains = ['sol', 'bnb', 'base'];
        chains.forEach(c => {
          merged.config[c] = { ...EMPTY_DATA.config[c], ...(d.config?.[c] || {}) };
        });
        setData(merged);
        setLastFetch(Date.now());
      }
    } catch (_) {}
    setRefreshIn(15);
  };

  useEffect(() => {
    fetch_data();
    const poll = setInterval(fetch_data, POLL_INTERVAL);
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setRefreshIn(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(tick);
  }, []);

  const updateConfig = async (chain: string, patch: object) => {
    await fetch(`/api/control/config/${chain}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    await fetch_data();
  };

  return { data, refreshIn, updateConfig, refetch: fetch_data };
}
