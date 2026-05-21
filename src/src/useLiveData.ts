// useLiveData.ts — polls /api/control/* endpoints and merges into HC shape
import { useState, useEffect, useRef } from 'react';
import HC from './data';

export interface LiveData {
  status: typeof HC['status'];
  strategies: typeof HC['strategies'];
  kb_sources: typeof HC['kb_sources'];
  youtube_days: typeof HC['youtube_days'];
  oracle: typeof HC['oracle'];
  meta: typeof HC['meta'];
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

  useEffect(() => {
    // Initial parallel fetch
    Promise.all([
      fetchStatus(),
      fetchStrategies(),
      fetchKbSources(),
      fetchYoutubeDays(),
      fetchOracle(),
    ]).catch(() => {});

    // Individual polling intervals
    const t1 = setInterval(fetchStatus,      2_000);
    const t2 = setInterval(fetchStrategies,  5_000);
    const t3 = setInterval(fetchKbSources,  60_000);
    const t4 = setInterval(fetchYoutubeDays,300_000);
    const t5 = setInterval(fetchOracle,      60_000);

    return () => {
      clearInterval(t1);
      clearInterval(t2);
      clearInterval(t3);
      clearInterval(t4);
      clearInterval(t5);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, isLive, lastUpdated, error };
}
