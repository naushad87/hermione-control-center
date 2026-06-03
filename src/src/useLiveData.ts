// useLiveData.ts — polls /api/control/* endpoints and merges into HC shape
import { useState, useEffect, useRef } from 'react';
import HC from './data';

export interface ScannerEPosition {
  diy_pid: string;
  mint: string;
  ticker: string;
  entry_price_sol: number | null;
  spot_price_sol: number | null;
  pnl_pct: number | null;
  peak_price_sol: number | null;
  entry_mcap_usd: number | null;
  size_usd: number | null;
  ts_open: number | null;
  hold_minutes: number | null;
}

export interface ReversalPaperSummary {
  n_trades: number;
  net_pnl: number;
  gross_pnl: number;
  win_rate: number;
  wins?: number;
  losses?: number;
  avg_duration_min?: number;
  tp_maxloss_ratio?: number | null;
  by_exit_type: Record<string, number>;
  by_token: Record<string, { n_trades: number; net_pnl: number; win_rate: number }>;
  error?: string;
}

export interface ReversalPaperData {
  summary: ReversalPaperSummary;
  counters: Record<string, number>;
  recent: Record<string, unknown>[];
  ts: number;
}

export interface LiveData {
  status: typeof HC['status'];
  strategies: typeof HC['strategies'];
  kb_sources: typeof HC['kb_sources'];
  youtube_days: typeof HC['youtube_days'];
  oracle: typeof HC['oracle'];
  meta: typeof HC['meta'];
  scanner_e_positions: ScannerEPosition[];
  reversal_paper: ReversalPaperData | null;
}

interface UseLiveDataResult {
  data: LiveData;
  isLive: boolean;
  lastUpdated: Date | null;
  error: string | null;
}

const BASE = '';

async function fetchJSON(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

export function useLiveData(): UseLiveDataResult {
  const [data, setData] = useState<LiveData>({
    status: HC.status,
    strategies: HC.strategies,
    kb_sources: HC.kb_sources,
    youtube_days: HC.youtube_days,
    oracle: HC.oracle,
    meta: HC.meta,
    scanner_e_positions: [],
    reversal_paper: null,
  });
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // keep latest data in a ref so interval callbacks don't stale-close
  const liveRef = useRef(data);

  function mergeKey(key: keyof LiveData, value: unknown) {
    liveRef.current = { ...liveRef.current, [key]: value };
    setData({ ...liveRef.current });
    setIsLive(true);
    setLastUpdated(new Date());
    setError(null);
  }

  function handleErr(msg: string) {
    console.warn('[useLiveData]', msg);
    setError(msg);
    // fall back to mock only if we have never gone live
    if (!isLive) {
      setIsLive(false);
    }
  }

  async function fetchStatus() {
    try { mergeKey('status', await fetchJSON('/api/control/status')); }
    catch (e: unknown) { handleErr(String(e)); }
  }

  async function fetchStrategies() {
    try { mergeKey('strategies', await fetchJSON('/api/control/strategies')); }
    catch (e: unknown) { handleErr(String(e)); }
  }

  async function fetchKbSources() {
    try { mergeKey('kb_sources', await fetchJSON('/api/control/kb/sources')); }
    catch (e: unknown) { handleErr(String(e)); }
  }

  async function fetchYoutubeDays() {
    try { mergeKey('youtube_days', await fetchJSON('/api/control/youtube/days')); }
    catch (e: unknown) { handleErr(String(e)); }
  }

  async function fetchOracle() {
    try { mergeKey('oracle', await fetchJSON('/api/control/oracle')); }
    catch (e: unknown) { handleErr(String(e)); }
  }

  async function fetchScannerEPositions() {
    try {
      const posData = await fetchJSON('/api/control/scanner_e/positions') as { positions: ScannerEPosition[] };
      mergeKey('scanner_e_positions', posData.positions ?? []);
    } catch (e: unknown) { handleErr(`scanner_e_positions: ${String(e)}`); }
  }

  async function fetchReversalPaper() {
    try {
      const rpData = await fetchJSON('/api/control/reversal_paper') as ReversalPaperData;
      mergeKey('reversal_paper', rpData);
    } catch (e: unknown) { handleErr(`reversal_paper: ${String(e)}`); }
  }

  useEffect(() => {
    // Initial parallel fetch
    Promise.all([
      fetchStatus(),
      fetchStrategies(),
      fetchKbSources(),
      fetchYoutubeDays(),
      fetchOracle(),
      fetchScannerEPositions(),
      fetchReversalPaper(),
    ]).catch(() => {});

    // Individual polling intervals
    const t1 = setInterval(fetchStatus,             2_000);
    const t2 = setInterval(fetchStrategies,         5_000);
    const t3 = setInterval(fetchKbSources,         60_000);
    const t4 = setInterval(fetchYoutubeDays,      300_000);
    const t5 = setInterval(fetchOracle,            60_000);
    const t6 = setInterval(fetchScannerEPositions, 15_000);
    const t7 = setInterval(fetchReversalPaper,     30_000);

    return () => {
      clearInterval(t1);
      clearInterval(t2);
      clearInterval(t3);
      clearInterval(t4);
      clearInterval(t5);
      clearInterval(t6);
      clearInterval(t7);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, isLive, lastUpdated, error };
}
