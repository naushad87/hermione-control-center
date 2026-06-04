// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { useSniperData } from './useSniperData';

/* ----------------------------------------------------------------- *
 *  DESIGN TOKENS — injected once via useEffect                       *
 * ----------------------------------------------------------------- */
const CSS_VARS = `
:root {
  --bg: #0a0e14; --panel: #0d1219; --panel-2: #0f151d;
  --border: #1b2430; --border-soft: #161e28;
  --txt: #c9d4e0; --txt-bright: #eef3f8;
  --muted: #5d6b7a; --muted-2: #475260;
  --green: #3fd07a; --green-dim: #2f9e5e;
  --red: #f0616d; --red-dim: #c44a55;
  --amber: #e3b341; --blue: #58a6ff;
}
.sniper-label {
  font-size: 9px; text-transform: uppercase; letter-spacing: 0.13em;
  color: var(--muted); font-weight: 500;
}
.sniper-panel {
  background: var(--panel); border: 1px solid var(--border); border-radius: 8px;
}
.sniper-mono-dim { color: var(--muted); }
body { font-family: 'JetBrains Mono', ui-monospace, monospace; }
`;

/* ----------------------------------------------------------------- *
 *  FORMAT HELPERS                                                    *
 * ----------------------------------------------------------------- */
const fmtUsd = (n, dp = 2) =>
  (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });

const fmtCompact = (n) => {
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(0);
};

const fmtPrice = (n) => {
  if (!n && n !== 0) return '—';
  if (n >= 1) return '$' + n.toFixed(4);
  const s = n.toFixed(12);
  const m = s.match(/^0\.(0*)(\d{1,4})/);
  if (!m) return '$' + n.toExponential(2);
  return '$0.0' + (m[1].length ? `(${m[1].length})` : '') + m[2];
};

const shortMint = (m) => {
  if (!m || m.length < 8) return m || '—';
  return m.slice(0, 4) + '…' + m.slice(-4);
};

const ageStr = (openedMs) => {
  if (!openedMs) return '—';
  const s = Math.floor((Date.now() - openedMs) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

/* ----------------------------------------------------------------- *
 *  CHAIN METADATA                                                    *
 * ----------------------------------------------------------------- */
const CHAIN_META = {
  sol: { sym: 'SOL', dexSlug: 'solana', route: 'jupiter', color: '#3fd07a', glyph: '◎', name: 'Solana', gas: '~0.00009 SOL', dex: 'Jupiter' },
  bnb: { sym: 'BNB', dexSlug: 'bsc', route: 'pancakeswap', color: '#e3b341', glyph: '◆', name: 'BNB Chain', gas: '~0.12 USD', dex: 'PancakeSwap' },
  eth: { sym: 'ETH', dexSlug: 'ethereum', route: 'uniswap-v3', color: '#58a6ff', glyph: '◈', name: 'Ethereum', gas: '~3.40 USD', dex: 'Uniswap v3' },
};

/* ----------------------------------------------------------------- *
 *  SMALL UI PRIMITIVES                                               *
 * ----------------------------------------------------------------- */
function Dot({ color = 'var(--green)' }) {
  return (
    <span style={{
      width: 7, height: 7, borderRadius: '50%', background: color,
      boxShadow: `0 0 6px ${color}`, display: 'inline-block', flexShrink: 0,
    }} />
  );
}

function Badge({ children, tone = 'neutral' }) {
  const tones = {
    green: { bg: 'rgba(63,208,122,0.10)', bd: 'rgba(63,208,122,0.35)', fg: 'var(--green)' },
    neutral: { bg: 'rgba(120,140,160,0.08)', bd: 'var(--border)', fg: 'var(--txt)' },
    amber: { bg: 'rgba(227,179,65,0.10)', bd: 'rgba(227,179,65,0.35)', fg: 'var(--amber)' },
    red: { bg: 'rgba(240,97,109,0.10)', bd: 'rgba(240,97,109,0.35)', fg: 'var(--red)' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px',
      borderRadius: 6, fontSize: 11, background: t.bg, border: `1px solid ${t.bd}`,
      color: t.fg, whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

function PnL({ usd, pct, size = 13, bold }) {
  const pos = usd >= 0;
  const c = pos ? 'var(--green)' : 'var(--red)';
  return (
    <span style={{ color: c, fontSize: size, fontWeight: bold ? 700 : 500, whiteSpace: 'nowrap' }}>
      {pos ? '+' : '−'}{fmtUsd(Math.abs(usd))}
      {pct != null && (
        <span style={{ opacity: 0.62, marginLeft: 6, fontSize: size - 1 }}>
          {pos ? '+' : '−'}{Math.abs(pct).toFixed(1)}%
        </span>
      )}
    </span>
  );
}

function SectionTitle({ children, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
      <div className="sniper-label" style={{ fontSize: 11, color: 'var(--muted)' }}>{children}</div>
      <div style={{ flex: 1 }} />
      {right}
    </div>
  );
}

function Field({ label, children, align = 'left' }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 4,
      textAlign: align, alignItems: align === 'right' ? 'flex-end' : 'flex-start',
    }}>
      <span className="sniper-label" style={{ fontSize: 9 }}>{label}</span>
      <span style={{ fontSize: 12.5, color: 'var(--txt-bright)' }}>{children}</span>
    </div>
  );
}

/* ----------------------------------------------------------------- *
 *  TOP BAR                                                           *
 * ----------------------------------------------------------------- */
function TopBar({ refreshIn, stats, onBack }) {
  const active = stats.service_active;
  const halted = stats.halt_flag;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '4px 6px 16px', flexWrap: 'wrap' }}>
      <div style={{ fontWeight: 700, color: 'var(--txt-bright)', fontSize: 15, letterSpacing: '0.02em' }}>Scanner-E</div>
      <div style={{ color: 'var(--muted)', fontSize: 13 }}>DIY Jupiter Executor</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--green)', fontSize: 13 }}>
        <span style={{ color: 'var(--muted-2)' }}>·</span>
        {active ? 'Operational' : 'Inactive'}
      </div>
      <div style={{ flex: 1 }} />
      <Badge tone={active ? 'green' : 'neutral'}>
        <Dot color={active ? 'var(--green)' : 'var(--muted)'} />
        scanner-e: {active ? 'active' : 'stopped'}
      </Badge>
      <Badge tone={halted ? 'red' : 'green'}>
        halt: {halted ? 'TRIGGERED' : 'CLEAR'}
      </Badge>
      <span style={{ color: 'var(--muted)', fontSize: 12 }}>
        auto-refresh <span style={{ color: 'var(--txt)' }}>{refreshIn}s</span>
      </span>
      <button
        onClick={onBack}
        style={{
          font: 'inherit', cursor: 'pointer', background: 'none', border: 'none',
          color: 'var(--blue)', fontSize: 12, padding: 0,
        }}
      >← control</button>
    </div>
  );
}

/* ----------------------------------------------------------------- *
 *  STAT CARDS (top row)                                              *
 * ----------------------------------------------------------------- */
function StatCard({ label, children, sub }) {
  return (
    <div className="sniper-panel" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 9, minHeight: 96 }}>
      <div className="sniper-label">{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--txt-bright)' }}>{children}</div>
      {sub && <div style={{ fontSize: 11.5 }}>{sub}</div>}
    </div>
  );
}

function StatCards({ stats }) {
  const { wallet_sol, wallet_address, today_pnl_usd, halt_threshold_usd, pnl_7d, pnl_30d } = stats;
  const shortAddr = wallet_address && wallet_address !== '...'
    ? wallet_address.slice(0, 8) + '…' + wallet_address.slice(-8)
    : wallet_address || '…';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 14 }}>
      <StatCard
        label="Wallet"
        sub={<span style={{ display: 'inline-block', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 8px', color: 'var(--muted)', fontSize: 11 }}>{shortAddr}</span>}
      >
        {wallet_sol.toFixed(4)} SOL
      </StatCard>
      <StatCard label="Today P&L (DIY)" sub={<span className="sniper-mono-dim">halt threshold: {fmtUsd(halt_threshold_usd)}</span>}>
        <span style={{ color: today_pnl_usd >= 0 ? 'var(--green)' : 'var(--red)' }}>
          {today_pnl_usd >= 0 ? '+' : ''}{fmtUsd(today_pnl_usd)}
        </span>
      </StatCard>
      <StatCard
        label="Weekly P&L (7d)"
        sub={<span className="sniper-mono-dim">{pnl_7d.closes} closes · {pnl_7d.closes > 0 ? Math.round((pnl_7d.wins / pnl_7d.closes) * 100) : 0}% win</span>}
      >
        <span style={{ color: pnl_7d.usd >= 0 ? 'var(--green)' : 'var(--red)' }}>
          {pnl_7d.usd >= 0 ? '+' : ''}{fmtUsd(pnl_7d.usd)}
        </span>
      </StatCard>
      <StatCard
        label="Monthly P&L (30d)"
        sub={<span className="sniper-mono-dim">{pnl_30d.closes} closes · {pnl_30d.closes > 0 ? Math.round((pnl_30d.wins / pnl_30d.closes) * 100) : 0}% win</span>}
      >
        <span style={{ color: pnl_30d.usd >= 0 ? 'var(--green)' : 'var(--red)' }}>
          {pnl_30d.usd >= 0 ? '+' : ''}{fmtUsd(pnl_30d.usd)}
        </span>
      </StatCard>
    </div>
  );
}

/* ----------------------------------------------------------------- *
 *  CHAIN TABS                                                        *
 * ----------------------------------------------------------------- */
function ChainTabs({ activeChain, setActiveChain, stats, config }) {
  const chains = ['sol', 'bnb', 'eth'];
  const prices = stats.native_prices || {};
  const chainStatus = stats.chain_status || {};
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
      {chains.map((key) => {
        const meta = CHAIN_META[key];
        const on = key === activeChain;
        const cfg = config[key] || {};
        const autoEnabled = cfg.auto_enabled ?? cfg.enabled ?? false;
        const cfgMode = cfg.auto_mode ?? cfg.mode ?? 'dry';
        const price = prices[key] || 0;
        const chg = prices[`${key}_change_24h`] ?? 0;
        const serviceActive = chainStatus[key] ?? false;
        return (
          <button key={key} onClick={() => setActiveChain(key)} style={{
            font: 'inherit', cursor: 'pointer', flex: 1, textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 11, padding: '13px 16px', borderRadius: 8,
            background: on ? 'var(--panel)' : 'var(--panel-2)',
            border: `1px solid ${on ? meta.color + '66' : 'var(--border)'}`,
            borderTop: `2px solid ${on ? meta.color : 'transparent'}`,
            transition: 'all .12s', opacity: on ? 1 : 0.72,
          }}>
            <span style={{
              width: 28, height: 28, borderRadius: 7, display: 'inline-flex', alignItems: 'center',
              justifyContent: 'center', background: meta.color + '22', color: meta.color, fontSize: 15, flexShrink: 0,
            }}>{meta.glyph}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--txt-bright)', fontWeight: 700, fontSize: 14 }}>{meta.name}</span>
                <Dot color={serviceActive ? 'var(--green)' : 'var(--muted-2)'} />
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10 }}>
                <Dot color={autoEnabled ? 'var(--green)' : 'var(--muted-2)'} />
                <span style={{ color: autoEnabled ? 'var(--green)' : 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  auto {autoEnabled ? 'on' : 'off'}
                </span>
                <span style={{ color: 'var(--muted-2)' }}>·</span>
                <span style={{ color: 'var(--muted)' }}>{cfgMode === 'live' ? 'live' : 'dry-run'}</span>
              </span>
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ color: 'var(--txt-bright)', fontWeight: 700, fontSize: 13 }}>
                ${price.toFixed(2)}
              </span>
              <span style={{ fontSize: 10, color: chg >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                {chg >= 0 ? '+' : ''}{chg.toFixed(1)}%
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------- *
 *  AUTO-TRADE PANEL                                                  *
 * ----------------------------------------------------------------- */
function Switch({ on, onToggle, color = 'var(--green)' }) {
  return (
    <button onClick={onToggle} style={{
      cursor: 'pointer', width: 46, height: 26, borderRadius: 13, padding: 3,
      border: '1px solid var(--border)', background: on ? color : 'var(--panel-2)',
      transition: 'background .15s', display: 'inline-flex', alignItems: 'center',
      justifyContent: on ? 'flex-end' : 'flex-start',
    }}>
      <span style={{
        width: 18, height: 18, borderRadius: '50%',
        background: on ? '#0a0e14' : 'var(--muted)', transition: 'all .15s',
      }} />
    </button>
  );
}

function Segmented({ value, options, onChange }) {
  return (
    <div style={{
      display: 'inline-flex', padding: 3, borderRadius: 7,
      background: 'var(--panel-2)', border: '1px solid var(--border)', gap: 3,
    }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} style={{
            font: 'inherit', cursor: 'pointer', padding: '5px 14px', borderRadius: 5,
            fontSize: 11, fontWeight: 600, border: 'none', whiteSpace: 'nowrap',
            background: on ? (o.color || 'var(--green)') : 'transparent',
            color: on ? '#0a0e14' : 'var(--muted)', transition: 'all .12s',
          }}>{o.label}</button>
        );
      })}
    </div>
  );
}

function Stepper({ label, value, suffix, step, min = 0, dp = 0, onChange, disabled }) {
  const btn = (txt, fn) => (
    <button onClick={fn} disabled={disabled} style={{
      font: 'inherit', cursor: disabled ? 'default' : 'pointer', width: 24, height: 24,
      borderRadius: 5, border: '1px solid var(--border)', background: 'var(--panel)',
      color: disabled ? 'var(--muted-2)' : 'var(--txt)', fontSize: 14, lineHeight: 1,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}>{txt}</button>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
      <span className="sniper-label" style={{ fontSize: 9 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {btn('−', () => onChange(Math.max(min, +(value - step).toFixed(4))))}
        <span style={{ minWidth: 64, textAlign: 'center', color: 'var(--txt-bright)', fontSize: 13, fontWeight: 600 }}>
          {(value || 0).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })}
          {suffix && <span style={{ color: 'var(--muted)', fontSize: 10, marginLeft: 3 }}>{suffix}</span>}
        </span>
        {btn('+', () => onChange(+(value + step).toFixed(4)))}
      </div>
    </div>
  );
}

const FIELD_MAP = {
  sol: { enabled: 'auto_enabled', mode: 'auto_mode', buySize: 'buy_size_sol', maxConc: 'max_concurrent', tp: 'tp_pct', sl: 'sl_pct', slip: 'slippage_pct', minLiq: 'min_liq_usd' },
  bnb: { enabled: 'auto_enabled', mode: 'auto_mode', buySize: 'position_size_bnb', maxConc: 'max_concurrent', tp: 'tp_pct', sl: 'sl_pct', slip: 'slippage_pct', minLiq: 'min_liq_usd' },
  eth: { enabled: 'auto_enabled', mode: 'auto_mode', buySize: 'buy_size_eth', maxConc: 'max_concurrent', tp: 'tp_pct', sl: 'sl_pct', slip: 'slippage_pct', minLiq: 'min_liq_usd' },
};

function AutoTradePanel({ chain, config, updateConfig, nativePrice }) {
  if (!config) return null;
  const meta = CHAIN_META[chain];

  const enabled = config.auto_enabled ?? config.enabled ?? false;
  const mode = config.auto_mode ?? config.mode ?? 'dry';
  const live = mode === 'live';
  const buySize = config.buy_size_sol ?? config.position_size_bnb ?? config.buy_size_eth ?? config.buySize ?? 0.4;
  const maxConc = config.max_concurrent ?? config.maxConc ?? 4;
  const tp = config.tp_pct ?? config.tp ?? 50;
  const sl = config.sl_pct ?? config.sl ?? 20;
  const slip = config.slippage_pct ?? config.slip ?? 1.5;
  const minLiq = (config.min_liq_usd ?? config.minLiq ?? 30000);

  const fieldMap = FIELD_MAP[chain] || FIELD_MAP.sol;
  const set = (uiKey, v) => {
    const redisKey = fieldMap[uiKey] || uiKey;
    updateConfig(chain, { [redisKey]: v });
  };

  const stepCfg = {
    sol: { buyStep: 0.05, buyDp: 2 },
    bnb: { buyStep: 0.01, buyDp: 3 },
    eth: { buyStep: 0.005, buyDp: 3 },
  };
  const sc = stepCfg[chain] || { buyStep: 0.05, buyDp: 2 };

  return (
    <div className="sniper-panel" style={{ padding: 18, marginBottom: 14, borderTop: `2px solid ${meta.color}` }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', paddingBottom: 16, borderBottom: '1px solid var(--border-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{
            width: 30, height: 30, borderRadius: 8, display: 'inline-flex', alignItems: 'center',
            justifyContent: 'center', background: meta.color + '22', color: meta.color, fontSize: 16,
          }}>{meta.glyph}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ color: 'var(--txt-bright)', fontWeight: 700, fontSize: 15 }}>{meta.name} Auto-Trade</span>
            <span className="sniper-label" style={{ fontSize: 9 }}>route: {meta.dex} · gas {meta.gas}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginLeft: 6 }}>
          <Switch on={enabled} onToggle={() => set('enabled', !enabled)} color={meta.color} />
          <span style={{ color: enabled ? 'var(--txt-bright)' : 'var(--muted)', fontWeight: 700, fontSize: 13 }}>
            {enabled ? 'ENABLED' : 'PAUSED'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="sniper-label" style={{ fontSize: 9 }}>mode</span>
          <Segmented
            value={mode}
            onChange={(v) => set('mode', v)}
            options={[{ value: 'dry', label: 'Dry Run' }, { value: 'live', label: 'Live', color: 'var(--red)' }]}
          />
        </div>

        <div style={{ flex: 1 }} />
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 12px',
          borderRadius: 6, fontSize: 11, fontWeight: 600,
          background: !enabled ? 'rgba(120,140,160,0.07)' : live ? 'rgba(240,97,109,0.10)' : 'rgba(227,179,65,0.10)',
          border: `1px solid ${!enabled ? 'var(--border)' : live ? 'rgba(240,97,109,0.32)' : 'rgba(227,179,65,0.32)'}`,
          color: !enabled ? 'var(--muted)' : live ? 'var(--red)' : 'var(--amber)',
        }}>
          <Dot color={!enabled ? 'var(--muted)' : live ? 'var(--red)' : 'var(--amber)'} />
          {!enabled ? 'auto-trade paused' : live ? 'LIVE — real funds' : 'dry-run — simulated'}
        </span>
      </div>

      {/* params */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 18, paddingTop: 16 }}>
        <Stepper label="Buy Size" value={buySize} suffix={meta.sym} step={sc.buyStep} min={0} dp={sc.buyDp} onChange={(v) => set('buySize', v)} disabled={!enabled} />
        <Stepper label="Max Concurrent" value={maxConc} step={1} min={1} dp={0} onChange={(v) => set('maxConc', v)} disabled={!enabled} />
        <Stepper label="Take Profit" value={tp} suffix="%" step={5} min={5} dp={0} onChange={(v) => set('tp', v)} disabled={!enabled} />
        <Stepper label="Stop Loss" value={sl} suffix="%" step={5} min={5} dp={0} onChange={(v) => set('sl', v)} disabled={!enabled} />
        <Stepper label="Slippage" value={slip} suffix="%" step={0.5} min={0.5} dp={1} onChange={(v) => set('slip', v)} disabled={!enabled} />
        <Stepper label="Min Liquidity" value={minLiq / 1000} suffix="K" step={5} min={0} dp={0} onChange={(v) => set('minLiq', v * 1000)} disabled={!enabled} />
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- *
 *  COUNTERS AND STATE                                                *
 * ----------------------------------------------------------------- */
function Counter({ n, label, tone }) {
  const c = tone === 'red' && n > 0 ? 'var(--red)' : tone === 'green' && n > 0 ? 'var(--green)' : tone === 'amber' && n > 0 ? 'var(--amber)' : 'var(--txt-bright)';
  return (
    <div className="sniper-panel" style={{ background: 'var(--panel-2)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <div style={{ fontSize: 19, fontWeight: 700, color: c }}>{n ?? 0}</div>
      <div className="sniper-label" style={{ fontSize: 9.5 }}>{label}</div>
    </div>
  );
}

function CountersAndState({ counters }) {
  const c = counters || {};
  const diyCounters = [
    { n: c.opens, label: 'opens', tone: 'green' },
    { n: c.closes_tp, label: 'closes (tp)', tone: 'green' },
    { n: c.closes_sl, label: 'closes (sl)' },
    { n: c.fail_submit, label: 'fail: submit', tone: 'red' },
    { n: c.fail_dropped, label: 'fail: dropped', tone: 'red' },
    { n: c.fail_pending_unknown, label: 'fail: pending unknown', tone: 'red' },
    { n: c.fail_blockhash, label: 'fail: blockhash', tone: 'red' },
    { n: c.fail_aged_out, label: 'fail: aged out', tone: 'red' },
    { n: c.fail_cancelled, label: 'fail: cancelled', tone: 'red' },
    { n: c.stale_reaped, label: 'stale reaped' },
    { n: c.recovered_late, label: 'recovered late', tone: 'amber' },
    { n: c.dryrun_reservations, label: 'dry-run reservations' },
  ];
  const stateCounters = [
    { n: c.state_reserved, label: 'reserved' },
    { n: c.state_pending_buy, label: 'pending_buy' },
    { n: c.state_open, label: 'open', tone: 'green' },
    { n: c.state_closing, label: 'closing' },
    { n: c.state_closed, label: 'closed' },
    { n: c.state_failed_terminal, label: 'failed_terminal' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 14, marginBottom: 14 }}>
      <div className="sniper-panel" style={{ padding: 18 }}>
        <SectionTitle>DIY Counters</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
          {diyCounters.map((ct, i) => <Counter key={i} {...ct} />)}
        </div>
      </div>
      <div className="sniper-panel" style={{ padding: 18 }}>
        <SectionTitle>Position State</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {stateCounters.map((ct, i) => <Counter key={i} {...ct} />)}
        </div>
        <div style={{ marginTop: 14, color: 'var(--muted)', fontSize: 11 }}>
          pending_buy keys: {c.pending_buy_keys ?? 0} · pending_sell keys: {c.pending_sell_keys ?? 0}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- *
 *  OPEN POSITIONS                                                    *
 * ----------------------------------------------------------------- */
const DexIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17 17 7" /><path d="M8 7h9v9" />
  </svg>
);

function DexLink({ mint, slug = 'solana' }) {
  return (
    <a
      href={`https://dexscreener.com/${slug}/${mint}`}
      target="_blank" rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 6,
        background: 'rgba(88,166,255,0.08)', border: '1px solid rgba(88,166,255,0.28)',
        color: 'var(--blue)', fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', transition: 'background .12s',
        textDecoration: 'none',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(88,166,255,0.16)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(88,166,255,0.08)')}
    >
      DEX <DexIcon />
    </a>
  );
}

function TargetBar({ entry, price, tp, sl }) {
  const lo = sl, hi = tp;
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const pos = hi > lo ? clamp((price - lo) / (hi - lo)) : 0.5;
  const entryPos = hi > lo ? clamp((entry - lo) / (hi - lo)) : 0.5;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 200 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5 }}>
        <span style={{ color: 'var(--red-dim)' }}>SL {fmtPrice(sl)}</span>
        <span style={{ color: 'var(--green-dim)' }}>TP {fmtPrice(tp)}</span>
      </div>
      <div style={{
        position: 'relative', height: 6, borderRadius: 3,
        background: 'linear-gradient(90deg, rgba(240,97,109,0.35), rgba(91,103,114,0.25) 45%, rgba(63,208,122,0.35))',
      }}>
        <div style={{
          position: 'absolute', left: `${entryPos * 100}%`, top: -3, width: 2, height: 12,
          background: 'var(--muted)', transform: 'translateX(-1px)',
        }} title="entry" />
        <div style={{
          position: 'absolute', left: `${pos * 100}%`, top: -4, width: 10, height: 14,
          borderRadius: 3, background: 'var(--txt-bright)', transform: 'translateX(-5px)',
          boxShadow: '0 0 8px rgba(0,0,0,0.6)',
        }} title="current" />
      </div>
    </div>
  );
}

function CloseButton({ onClose }) {
  const [stage, setStage] = useState('idle'); // idle | confirm | closing
  const stop = (e) => e.stopPropagation();
  if (stage === 'closing') {
    return (
      <span onClick={stop} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 6,
        background: 'rgba(227,179,65,0.10)', border: '1px solid rgba(227,179,65,0.30)',
        color: 'var(--amber)', fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap',
      }}><Dot color="var(--amber)" /> closing…</span>
    );
  }
  const confirming = stage === 'confirm';
  return (
    <button
      onClick={(e) => {
        stop(e);
        if (confirming) {
          setStage('closing');
          setTimeout(() => onClose(), 900);
        } else {
          setStage('confirm');
          setTimeout(() => setStage((s) => (s === 'confirm' ? 'idle' : s)), 3000);
        }
      }}
      style={{
        font: 'inherit', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '5px 11px', borderRadius: 6, whiteSpace: 'nowrap', fontSize: 11, fontWeight: 600,
        background: confirming ? 'var(--red)' : 'rgba(240,97,109,0.08)',
        border: `1px solid ${confirming ? 'var(--red)' : 'rgba(240,97,109,0.30)'}`,
        color: confirming ? '#0a0e14' : 'var(--red)', transition: 'all .12s',
      }}
    >
      {confirming ? 'confirm sell?' : 'market close'}
    </button>
  );
}

function AddButton({ onAdd }) {
  return (
    <span title="Not available — use scanner-e auto-trade" style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px',
      borderRadius: 6, fontSize: 11, fontWeight: 600, opacity: 0.35, cursor: 'not-allowed',
      border: '1px solid rgba(63,208,122,0.28)', color: 'var(--green)',
    }}>↺ enter again</span>
  );
}

function PositionRow({ p, onClose, onAdd, meta, nativeUsd }) {
  const [open, setOpen] = useState(false);
  const native = nativeUsd || 0;
  const sizeUsd = (p.sizeSol || 0) * native;
  const entry = p.entry || 0;
  const price = p.price || 0;
  const pnlPct = entry > 0 ? ((price - entry) / entry) * 100 : 0;
  const pnlUsd = sizeUsd * (pnlPct / 100);
  const pos = pnlUsd >= 0;

  const flashRef = useRef(price);
  const [flash, setFlash] = useState(null);
  useEffect(() => {
    if (price > flashRef.current) setFlash('var(--green)');
    else if (price < flashRef.current) setFlash('var(--red)');
    flashRef.current = price;
    const t = setTimeout(() => setFlash(null), 420);
    return () => clearTimeout(t);
  }, [price]);

  // TP/SL pct labels
  const tpPct = entry > 0 ? (((p.tp || 0) - entry) / entry * 100).toFixed(0) : '—';
  const slPct = entry > 0 ? (((p.sl || 0) - entry) / entry * 100).toFixed(0) : '—';

  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 8, background: 'var(--panel-2)',
      borderLeft: `2px solid ${pos ? 'var(--green-dim)' : 'var(--red-dim)'}`, overflow: 'hidden',
    }}>
      {/* main row */}
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: 'grid',
          gridTemplateColumns: '180px 116px 116px 104px 104px 92px 1fr 340px',
          gap: 14, alignItems: 'center', padding: '14px 16px', cursor: 'pointer',
        }}
      >
        {/* ticker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Dot color={pos ? 'var(--green)' : 'var(--red)'} />
            <span style={{ fontWeight: 700, color: 'var(--txt-bright)', fontSize: 14 }}>{p.ticker || shortMint(p.mint)}</span>
          </div>
          <span style={{ color: 'var(--muted)', fontSize: 10.5 }}>{shortMint(p.mint)}</span>
        </div>
        <Field label="Entry">{fmtPrice(entry)}</Field>
        <Field label="Current">
          <span style={{ color: flash || 'var(--txt-bright)', transition: 'color .2s' }}>{fmtPrice(price)}</span>
        </Field>
        <Field label="Mkt Cap">{p.mcap ? fmtCompact(p.mcap) : '—'}</Field>
        <Field label="Liquidity">{p.liq ? fmtCompact(p.liq) : '—'}</Field>
        <Field label="Size">
          {(p.sizeSol || 0).toFixed((p.sizeSol || 0) < 0.1 ? 3 : 2)}{' '}
          <span style={{ color: 'var(--muted)', fontSize: 10 }}>{meta.sym}</span>
        </Field>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="sniper-label" style={{ fontSize: 9 }}>Unrealized P&L</span>
          <PnL usd={pnlUsd} pct={pnlPct} size={14} bold />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 9 }}>
          <span style={{ color: 'var(--muted)', fontSize: 11 }}>{ageStr(p.opened)}</span>
          <DexLink mint={p.mint} slug={meta.dexSlug} />
          <AddButton onAdd={() => onAdd(p.mint)} />
          <CloseButton onClose={() => onClose(p.pid || p.mint)} />
          <span style={{
            color: 'var(--muted)', fontSize: 12,
            transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s',
            display: 'inline-block',
          }}>›</span>
        </div>
      </div>

      {/* expanded detail */}
      {open && (
        <div style={{
          borderTop: '1px solid var(--border-soft)', padding: '16px 18px',
          display: 'flex', gap: 40, flexWrap: 'wrap', alignItems: 'flex-end',
          background: 'rgba(0,0,0,0.18)',
        }}>
          <Field label="Token Mint">
            <span style={{ color: 'var(--txt)', fontSize: 11 }}>{p.mint}</span>
          </Field>
          <Field label="Size (USD)">{fmtUsd(sizeUsd)}</Field>
          <Field label="Take Profit">
            {fmtPrice(p.tp)}{' '}
            <span style={{ color: 'var(--green)', fontSize: 10 }}>+{tpPct}%</span>
          </Field>
          <Field label="Stop Loss">
            {fmtPrice(p.sl)}{' '}
            <span style={{ color: 'var(--red)', fontSize: 10 }}>{slPct}%</span>
          </Field>
          <Field label="Route">{p.route || meta.route}</Field>
          <Field label="Opened">{p.opened ? new Date(p.opened).toLocaleTimeString('en-US', { hour12: false }) : '—'}</Field>
          {p.tp && p.sl && <TargetBar entry={entry} price={price} tp={p.tp} sl={p.sl} />}
        </div>
      )}
    </div>
  );
}

function OpenPositions({ positions, onClose, onAdd, meta, nativeUsd }) {
  const native = nativeUsd || 0;
  const totalUsd = positions.reduce((a, p) => {
    const sizeUsd = (p.sizeSol || 0) * native;
    const entry = p.entry || 0;
    const price = p.price || 0;
    const pnlPct = entry > 0 ? (price - entry) / entry : 0;
    return a + sizeUsd * pnlPct;
  }, 0);
  const totalSize = positions.reduce((a, p) => a + (p.sizeSol || 0), 0);

  return (
    <div className="sniper-panel" style={{ padding: 18, marginBottom: 14 }}>
      <SectionTitle right={
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <span style={{ color: 'var(--muted)', fontSize: 11 }}>
            {positions.length} open · {totalSize.toFixed(2)} {meta.sym} deployed
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="sniper-label" style={{ fontSize: 9 }}>net unrealized</span>
            <PnL usd={totalUsd} bold size={13} />
          </span>
        </div>
      }>Open DIY Positions</SectionTitle>

      {/* column header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '180px 116px 116px 104px 104px 92px 1fr 340px',
        gap: 14, padding: '0 16px 10px',
        borderBottom: '1px solid var(--border-soft)', marginBottom: 10,
      }}>
        {['token', 'entry', 'current', 'mkt cap', 'liquidity', 'size', 'unrealized p&l', 'actions'].map((h, i) => (
          <div key={i} className="sniper-label" style={{ fontSize: 9, textAlign: i === 7 ? 'right' : 'left' }}>{h}</div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {positions.length === 0
          ? <div style={{ padding: '22px 16px', color: 'var(--muted)', fontSize: 12 }}>no open positions</div>
          : positions.map((p) => (
            <PositionRow
              key={`${p.chain}-${p.mint}`}
              p={p}
              onClose={onClose}
              onAdd={onAdd}
              meta={meta}
              nativeUsd={native}
            />
          ))}
      </div>
      <div style={{ marginTop: 12, color: 'var(--muted-2)', fontSize: 10.5 }}>
        click any row to expand · prices &amp; market data via dexscreener · auto-refresh 15s
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- *
 *  JOURNAL                                                           *
 * ----------------------------------------------------------------- */
function ReenterButton({ onReenter }) {
  return (
    <span title="Not available — use scanner-e auto-trade" style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
      borderRadius: 6, fontSize: 10.5, fontWeight: 600, opacity: 0.35, cursor: 'not-allowed',
      border: '1px solid rgba(63,208,122,0.28)', color: 'var(--green)',
    }}>↺ enter again</span>
  );
}

function Journal({ data, onReenter, chainName }) {
  const cols = '150px 76px 100px 140px 110px 130px 140px';
  if (!data || data.length === 0) {
    return (
      <div className="sniper-panel" style={{ padding: 18, marginBottom: 14 }}>
        <SectionTitle right={<span style={{ color: 'var(--muted)', fontSize: 11 }}>live closed trades · re-enter any token in one tap</span>}>
          Recent {chainName} Executions (Live Journal)
        </SectionTitle>
        <div style={{ padding: '22px 8px', color: 'var(--muted)', fontSize: 12 }}>no journal entries</div>
      </div>
    );
  }
  return (
    <div className="sniper-panel" style={{ padding: 18, marginBottom: 14 }}>
      <SectionTitle right={<span style={{ color: 'var(--muted)', fontSize: 11 }}>live closed trades · re-enter any token in one tap</span>}>
        Recent {chainName} Executions (Live Journal)
      </SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 16, padding: '0 8px 10px', borderBottom: '1px solid var(--border-soft)' }}>
        {['ts', 'event', 'ticker', 'exit', 'p&l usd', 'sig', 'action'].map((h, i) => (
          <div key={i} className="sniper-label" style={{ fontSize: 9, textAlign: i === 4 || i === 6 ? 'right' : 'left' }}>{h}</div>
        ))}
      </div>
      {data.map((r, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: cols, gap: 16, padding: '10px 8px', alignItems: 'center',
          borderBottom: i < data.length - 1 ? '1px solid var(--border-soft)' : 'none',
        }}>
          <span style={{ color: 'var(--muted)' }}>{r.ts}</span>
          <span style={{ color: r.event === 'open' ? 'var(--blue)' : 'var(--txt)' }}>{r.event}</span>
          <span style={{ color: 'var(--txt-bright)' }}>{r.ticker}</span>
          <span style={{ color: r.exit === 'recovered_sell' ? 'var(--amber)' : 'var(--muted)' }}>{r.exit || '—'}</span>
          <span style={{ textAlign: 'right' }}>
            {r.pnl_usd == null
              ? <span style={{ color: 'var(--muted-2)' }}>—</span>
              : <PnL usd={r.pnl_usd} />}
          </span>
          <span style={{ textAlign: 'right' }}>
            <span style={{
              display: 'inline-block', border: '1px solid var(--border)',
              borderRadius: 5, padding: '3px 8px', color: 'var(--muted)', fontSize: 10.5,
            }}>{r.sig}</span>
          </span>
          <span style={{ display: 'flex', justifyContent: 'flex-end' }}>
            {r.event === 'close'
              ? <ReenterButton onReenter={() => onReenter(r.ticker)} />
              : <span style={{ color: 'var(--muted-2)', fontSize: 11 }}>—</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------- *
 *  PAPER JOURNAL                                                     *
 * ----------------------------------------------------------------- */
function PaperJournal({ data }) {
  const cols = '210px 1fr 170px 110px 110px 130px';
  if (!data || data.length === 0) {
    return (
      <div className="sniper-panel" style={{ padding: 18, marginBottom: 14 }}>
        <SectionTitle>Recent Paper Journal (Scanner-E Shadow)</SectionTitle>
        <div style={{ padding: '22px 8px', color: 'var(--muted)', fontSize: 12 }}>no paper journal entries</div>
      </div>
    );
  }
  const wins = data.filter((r) => r[3] === 'tp').length;
  const size = data[0] ? (data[0][4] || 0) : 0;
  return (
    <div className="sniper-panel" style={{ padding: 18, marginBottom: 14 }}>
      <SectionTitle right={
        <span style={{ color: 'var(--muted)', fontSize: 11 }}>
          shadow / paper · {wins}/{data.length} tp · <span style={{ color: 'var(--green)' }}>+${(wins * size).toFixed(2)}</span> est
        </span>
      }>Recent Paper Journal (Scanner-E Shadow)</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 16, padding: '0 8px 10px', borderBottom: '1px solid var(--border-soft)' }}>
        {['ts', 'ticker', 'mint', 'exit', 'size $', 'est p&l $'].map((h, i) => (
          <div key={i} className="sniper-label" style={{ fontSize: 9, textAlign: i === 4 || i === 5 ? 'right' : 'left' }}>{h}</div>
        ))}
      </div>
      {data.map((r, i) => {
        const stale = r[3] === 'stale';
        return (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: cols, gap: 16, padding: '9px 8px', alignItems: 'center',
            borderBottom: i < data.length - 1 ? '1px solid var(--border-soft)' : 'none',
          }}>
            <span style={{ color: 'var(--muted)' }}>{r[0]}</span>
            <span style={{ color: 'var(--txt-bright)' }}>{r[1]}</span>
            <span>
              <span style={{
                display: 'inline-block', border: '1px solid var(--border)',
                borderRadius: 5, padding: '3px 8px', color: 'var(--muted)', fontSize: 10.5,
              }}>{r[2]}</span>
            </span>
            <span style={{ color: stale ? 'var(--amber)' : 'var(--blue)' }}>{r[3]}</span>
            <span style={{ textAlign: 'right', color: 'var(--txt)' }}>{r[4]}</span>
            <span style={{ textAlign: 'right', color: stale ? 'var(--green-dim)' : 'var(--green)' }}>
              {typeof r[5] === 'number' ? r[5].toFixed(2) : r[5]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------- *
 *  MIGRATION FUNNEL (Solana only)                                    *
 * ----------------------------------------------------------------- */
function MigrationFunnel({ funnel }) {
  const f = funnel || {};
  const toneColor = { green: 'var(--green)', red: 'var(--red)', amber: 'var(--amber)' };
  const items = [
    { n: f.migrations_seen, label: 'migrations_seen' },
    { n: f.migrations_dispatched, label: 'migrations_dispatched' },
    { n: f.closes_tp, label: 'closes_tp', tone: 'green' },
    { n: f.dropout_gating_failed, label: 'dropout.gating_failed', tone: 'red' },
    { n: f.dropout_entry_price_unavailable, label: 'dropout.entry_price_unavailable', tone: 'amber' },
    { n: f.gt_429_count, label: 'gt_429_count', tone: 'amber' },
  ];
  return (
    <div className="sniper-panel" style={{ padding: 18, marginBottom: 14 }}>
      <SectionTitle>Scanner-E Migration Funnel (Today)</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
        {items.map((c, i) => (
          <div key={i} className="sniper-panel" style={{
            background: 'var(--panel-2)', padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0,
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: c.tone ? toneColor[c.tone] : 'var(--txt-bright)' }}>{c.n ?? 0}</div>
            <div className="sniper-label" style={{ fontSize: 9.5, wordBreak: 'break-word' }}>{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- *
 *  POSITION NORMALIZATION                                            *
 * ----------------------------------------------------------------- */
function normalizePosition(p, chain) {
  return {
    chain,
    pid: p.pid || p.diy_pid || '',
    mint: p.mint || p.token_mint || '',
    ticker: p.ticker || shortMint(p.mint || p.token_mint || ''),
    entry: p.entry ?? p.entry_price_sol ?? 0,
    price: p.price ?? p.spot_price_sol ?? p.entry_price_sol ?? 0,
    mcap: p.mcap ?? p.entry_mcap_usd ?? 0,
    liq: p.liq ?? 0,
    sizeSol: p.sizeSol ?? p.size_sol ?? 0,
    tp: p.tp ?? p.tp_price_sol ?? 0,
    sl: p.sl ?? p.sl_price_sol ?? 0,
    opened: p.opened ?? (p.opened_at ? parseFloat(p.opened_at) * 1000 : p.ts_open ?? 0),
    route: p.route || 'jupiter',
  };
}

/* ----------------------------------------------------------------- *
 *  MAIN EXPORT                                                       *
 * ----------------------------------------------------------------- */
export default function ScannerEDashboard({ onBack }: { onBack: () => void }) {
  const { data, refreshIn, updateConfig, refetch } = useSniperData();
  const [activeChain, setActiveChain] = useState('sol');
  const [positions, setPositions] = useState([]);

  // sync positions from live data, keeping normalized shape
  useEffect(() => {
    const rawSol = (data.positions.sol || []).map(p => normalizePosition(p, 'sol'));
    const rawBnb = (data.positions.bnb || []).map(p => normalizePosition(p, 'bnb'));
    const rawEth = (data.positions.eth || []).map(p => normalizePosition(p, 'eth'));
    setPositions([...rawSol, ...rawBnb, ...rawEth]);
  }, [data.positions]);

  // inject CSS vars once
  useEffect(() => {
    if (!document.getElementById('sniper-vars')) {
      const style = document.createElement('style');
      style.id = 'sniper-vars';
      style.textContent = CSS_VARS;
      document.head.appendChild(style);
    }
  }, []);

  // Fix 3 — real-time Dexscreener price poll every 8s for open SOL positions
  useEffect(() => {
    const pollPrices = async () => {
      const openSol = positions.filter(p => p.chain === 'sol' && p.mint);
      if (!openSol.length) return;
      try {
        const mints = openSol.map(p => p.mint).join(',');
        const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mints}`);
        if (!r.ok) return;
        const d = await r.json();
        const priceMap: Record<string, number> = {};
        (d.pairs || []).forEach(pair => {
          if (pair.baseToken?.address && pair.priceNative) {
            priceMap[pair.baseToken.address] = parseFloat(pair.priceNative) || 0;
          }
        });
        if (!Object.keys(priceMap).length) return;
        setPositions(ps => ps.map(p => {
          const fresh = priceMap[p.mint];
          if (!fresh || p.chain !== 'sol') return p;
          return { ...p, price: fresh };
        }));
      } catch (_) {}
    };
    pollPrices();
    const iv = setInterval(pollPrices, 8000);
    return () => clearInterval(iv);
  }, [positions.filter(p => p.chain === 'sol').map(p => p.mint).join(',')]);

  const meta = CHAIN_META[activeChain];
  const chainPositions = positions.filter(p => p.chain === activeChain);
  const chainJournal = (data.journal[activeChain] || []);
  const chainPaper = (data.paper[activeChain] || []);
  const nativeUsd = (data.stats.native_prices || {})[activeChain] || 0;

  const handleClose = async (pid) => {
    // Optimistic removal
    setPositions(ps => ps.filter(p => !(( p.pid === pid || p.mint === pid) && p.chain === activeChain)));
    // Fire the real close — only Solana has the API endpoint; BSC/ETH are paper so just UI-remove
    if (activeChain === 'sol' && pid && pid.includes('-')) {
      try {
        await fetch(`/api/control/diy/close/${encodeURIComponent(pid)}`, { method: 'POST' });
      } catch (_) {}
    }
    // Refetch in 2s so UI syncs with actual Redis state
    setTimeout(() => refetch(), 2000);
  };
  const handleAdd = (mint) => {
    const cfg = data.config[activeChain] || {};
    const buySize = cfg.buy_size_sol ?? cfg.position_size_bnb ?? cfg.buy_size_eth ?? cfg.buySize ?? 0.40;
    setPositions(ps => ps.map(p =>
      p.mint === mint && p.chain === activeChain
        ? { ...p, sizeSol: +(p.sizeSol + buySize).toFixed(4) }
        : p
    ));
  };
  const handleReenter = (ticker) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={{
      background: 'var(--bg)', minHeight: '100vh', padding: 14,
      maxWidth: 1880, margin: '0 auto', color: 'var(--txt)', fontSize: 13,
    }}>
      <TopBar refreshIn={refreshIn} stats={data.stats} onBack={onBack} />
      <StatCards stats={data.stats} />
      <ChainTabs
        activeChain={activeChain}
        setActiveChain={setActiveChain}
        stats={data.stats}
        config={data.config}
      />
      <AutoTradePanel
        chain={activeChain}
        config={data.config[activeChain]}
        updateConfig={updateConfig}
        nativePrice={nativeUsd}
      />
      {activeChain === 'sol' && <CountersAndState counters={data.counters} />}
      <OpenPositions
        positions={chainPositions}
        onClose={handleClose}
        onAdd={handleAdd}
        meta={meta}
        nativeUsd={nativeUsd}
      />
      <Journal data={chainJournal} onReenter={handleReenter} chainName={meta.name} />
      <PaperJournal data={chainPaper} />
      {activeChain === 'sol' && <MigrationFunnel funnel={data.funnel} />}
    </div>
  );
}
