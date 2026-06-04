// @ts-nocheck
/* ──────────────────────────────────────────────────────────────────
   Hermione Control Center · Neural Graph
   Phase 1 + 2 — home screen with live state, KB constellation,
   strategies, story strand, connection rays, edge particles,
   camera focus on selection, and the ASK gateway.
   ────────────────────────────────────────────────────────────────── */

import React, { useState, useEffect, useMemo, useRef, useCallback, createContext, useContext } from 'react';
import type { ScannerEPosition } from './useLiveData';

// ─── geometry constants ───────────────────────────────────────────
const VW = 1600, VH = 1000;
const CX = VW / 2, CY = VH / 2 - 20;
const R_CORE = 88;
const R1 = 168;
const R2 = 282;
const R3 = 432;
const R4 = 540;

const LANE_ORDER = ['self', 'research', 'macro', 'voice', 'code', 'exec'];
const LANE_LABEL = {
  self: 'SELF', research: 'RESEARCH', macro: 'MACRO',
  voice: 'VOICE', code: 'CODE', exec: 'EXEC',
};
const LANE_COLOR_DEFAULT = {
  self: '#b87cff', research: '#00b8ff', macro: '#f0d75a',
  voice: '#ff3d5a', code: '#00f5c4',     exec: '#ffb454',
};
const LANE_COLOR_RAW = new Proxy({}, {
  get(_, k) {
    const override = window.LANE_COLOR_RAW_OVERRIDE;
    return (override && override[k]) || LANE_COLOR_DEFAULT[k];
  },
});

const TXT_DEFAULT = {
  primary: '#ecf6f8',
  muted:   '#7d9aa0',
  dim:     '#4a6770',
  inkOn:   '#040d0f',
};
const TXT = new Proxy({}, {
  get(_, k) {
    const o = window.TXT_RAW_OVERRIDE;
    return (o && o[k]) || TXT_DEFAULT[k];
  },
});
const HALO_COLOR = {
  winning: '#00f5c4', losing: '#ff3d5a',
  neutral: '#7d9aa0', dormant: '#4a6770', retired: '#4a6770',
};

// ─── AskContext — bridge between ControlCenter and AskGateway ────
export const AskContext = createContext({
  askState: 'idle', setAskState: (_v) => {},
  askResponse: null, setAskResponse: (_v) => {},
  selected: null, setSelected: (_v) => {},
});

function polar(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function arcPath(cx, cy, r, sd, ed) {
  const s = polar(cx, cy, r, sd), e = polar(cx, cy, r, ed);
  const large = ed - sd > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}
function mulberry32(seed) {
  let t = seed;
  return function () {
    t |= 0; t = (t + 0x6D2B79F5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function useAnimationFrame(cb) {
  useEffect(() => {
    let raf, last = performance.now();
    const loop = (t) => {
      const dt = (t - last) / 1000; last = t;
      cb(dt, t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [cb]);
}

function useClock(ms = 1000) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

// ─── compute live world positions of every node ───────────────────
function computePositions(data, rotate) {
  const pos = {};

  // ring I — services
  const nS = data.status.services.length;
  data.status.services.forEach((s, i) => {
    const deg = (i / nS) * 360 + rotate * 4;
    const p = polar(CX, CY, R1, deg);
    pos[`svc:${s.id}`] = { x: p.x, y: p.y, deg, kind: 'svc', data: s, r: R1 };
  });

  // ring II — KB sources grouped by lane
  const byLane = {};
  data.kb_sources.forEach(s => { (byLane[s.lane] = byLane[s.lane] || []).push(s); });
  const groups = LANE_ORDER.map(l => ({ lane: l, items: byLane[l] || [] }));
  const totalSlots = data.kb_sources.length + groups.length;
  const slotDeg = 360 / totalSlots;
  let cursor = 0;
  const laneArcs = [];
  const kbOffset = rotate * 1.8;
  groups.forEach(({ lane, items }) => {
    const startDeg = cursor + kbOffset;
    items.forEach((s) => {
      const baseDeg = cursor + slotDeg * 0.5;
      const deg = baseDeg + kbOffset;
      const p = polar(CX, CY, R2, deg);
      pos[`kb:${s.source_id}`] = { x: p.x, y: p.y, deg, kind: 'kb', data: s, lane, r: R2 };
      cursor += slotDeg;
    });
    laneArcs.push({ lane, startDeg, endDeg: cursor + kbOffset });
    cursor += slotDeg;
  });
  pos.__laneArcs = laneArcs;

  // ring III — strategies
  const nT = data.strategies.length;
  data.strategies.forEach((s, i) => {
    const deg = (i / nT) * 360 - rotate * 1.1;
    const p = polar(CX, CY, R3, deg);
    pos[`str:${s.id}`] = { x: p.x, y: p.y, deg, kind: 'str', data: s, r: R3 };
  });

  // strand IV — YouTube days
  const sorted = [...data.youtube_days].sort((a, b) => a.day - b.day);
  const start = 130, end = 410, span = end - start;
  sorted.forEach((d, i) => {
    const t = i / (sorted.length - 1);
    const baseDeg = start + span * t;
    const deg = baseDeg + rotate * 0.4;
    const rJ = R4 + Math.sin(t * Math.PI * 6) * 6;
    const p = polar(CX, CY, rJ, deg);
    pos[`yt:${d.day}`] = { x: p.x, y: p.y, deg, kind: 'yt', data: d, r: rJ };
  });
  pos.__ytSorted = sorted;

  return pos;
}

// ─── relations ────────────────────────────────────────────────────
// Async fetch from backend; results cached in a module-level Map.
const _relationsCache: Map<string, string[]> = new Map();
const _relationsInflight: Set<string> = new Set();

async function fetchRelatedNodes(nodeId: string): Promise<string[]> {
  if (_relationsCache.has(nodeId)) return _relationsCache.get(nodeId)!;
  if (_relationsInflight.has(nodeId)) return [];
  _relationsInflight.add(nodeId);
  try {
    const res = await fetch(`/api/control/relations/${encodeURIComponent(nodeId)}`, {
      credentials: 'same-origin',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const peers: string[] = data.peers || [];
    _relationsCache.set(nodeId, peers);
    return peers;
  } catch {
    _relationsCache.set(nodeId, []);
    return [];
  } finally {
    _relationsInflight.delete(nodeId);
  }
}

// Synchronous accessor — returns cached result or [] while fetch is in progress.
function relatedNodes(selKey: string | null, _data: any): string[] {
  if (!selKey) return [];
  return _relationsCache.get(selKey) || [];
}

// ─── Starfield ────────────────────────────────────────────────────
function Starfield({ count }) {
  const stars = useMemo(() => {
    if (!count) return [];
    const rng = mulberry32(7777);
    return Array.from({ length: count }, () => ({
      x: rng() * VW, y: rng() * VH,
      r: rng() * 0.9 + 0.2, o: rng() * 0.7 + 0.1,
    }));
  }, [count]);
  return (
    <g className="starfield">
      {stars.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} opacity={s.o} fill={TXT.muted} />)}
    </g>
  );
}

// ─── Hermione core ────────────────────────────────────────────────
function HermioneCore({ status, meta, onClick, selected }) {
  const [phase, setPhase] = useState(0);
  useAnimationFrame((dt) => setPhase((p) => p + dt * 0.18));
  const beat = 1 + Math.sin(phase * 6) * 0.04;
  const equityDelta = status.balance_delta_24h_usd;
  const deltaColor = equityDelta >= 0 ? '#00f5c4' : '#ff3d5a';

  return (
    <g transform={`translate(${CX} ${CY})`} onClick={onClick} style={{ cursor: 'pointer' }}>
      <defs>
        <radialGradient id="core-glow">
          <stop offset="0%"  stopColor="#00f5c4" stopOpacity="0.55" />
          <stop offset="45%" stopColor="#00f5c4" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#00f5c4" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="core-fill">
          <stop offset="0%"  stopColor="#0a1a1d" />
          <stop offset="100%" stopColor="#04181a" />
        </radialGradient>
      </defs>

      <circle r={R_CORE + 36} fill="none" stroke="rgba(0,245,196,0.06)" />
      <circle r={R_CORE + 22} fill="none" stroke="rgba(0,245,196,0.12)" strokeDasharray="1 6" />
      <circle r={R_CORE * 1.6} fill="url(#core-glow)" opacity={0.6} />
      <circle r={R_CORE * beat} fill="url(#core-fill)"
        stroke={selected ? '#00f5c4' : 'rgba(0,245,196,0.6)'} strokeWidth={selected ? 1.5 : 1} />

      <g opacity="0.5">
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          const r0 = R_CORE * 0.7;
          const r1 = R_CORE * (0.92 + Math.sin(phase * 2 + i) * 0.04);
          return (
            <line key={i}
              x1={Math.cos(a) * r0} y1={Math.sin(a) * r0}
              x2={Math.cos(a) * r1} y2={Math.sin(a) * r1}
              stroke="#00f5c4" strokeOpacity={0.2} strokeWidth="0.6" />
          );
        })}
      </g>
      <circle r="4" fill="#00f5c4" />
      <circle r="10" fill="none" stroke="#00f5c4" strokeOpacity="0.5" />
      <circle r="20" fill="none" stroke="#00f5c4" strokeOpacity="0.2" />

      <text className="core-label" textAnchor="middle" y={-44} fontSize="14" letterSpacing="0.22em">{meta.name}</text>
      <text className="core-label" textAnchor="middle" y={-28} fontSize="7.5" letterSpacing="0.28em" fill={TXT.muted}>{meta.codename}</text>
      <text textAnchor="middle" y={44} fontFamily="'JetBrains Mono', monospace" fontSize="18" fill={TXT.primary}>
        ${status.balance_usd.toFixed(2)}
      </text>
      <text textAnchor="middle" y={60} fontFamily="'Share Tech Mono', monospace" fontSize="9" letterSpacing="0.14em" fill={deltaColor}>
        {equityDelta >= 0 ? '+' : ''}{equityDelta.toFixed(2)} · 24H
      </text>
      <text textAnchor="middle" y={76} fontFamily="'Share Tech Mono', monospace" fontSize="8" letterSpacing="0.18em" fill={TXT.muted}>
        DAY {meta.deployment_day} · {status.mood.toUpperCase()}
      </text>
    </g>
  );
}

// ─── Ring labels ──────────────────────────────────────────────────
function RingLabel({ text, r, color }) {
  const id = useMemo(() => 'arc-' + Math.random().toString(36).slice(2, 8), []);
  const d = `M ${CX - r} ${CY} A ${r} ${r} 0 0 1 ${CX + r} ${CY}`;
  return (
    <g>
      <defs><path id={id} d={d} /></defs>
      <text className="ring-label" fill={color || undefined}>
        <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">{text}</textPath>
      </text>
    </g>
  );
}

// ─── Ring I · services ────────────────────────────────────────────
function ServicesRing({ services, positions, hovered, setHovered, selected, setSelected, highlights }) {
  return (
    <g>
      <circle cx={CX} cy={CY} r={R1} fill="none"
        stroke="rgba(0,245,196,0.16)" strokeDasharray="2 4" />
      {services.map((s) => {
        const p = positions[`svc:${s.id}`]; if (!p) return null;
        const key = `svc:${s.id}`;
        const isHot = hovered === key || (selected === key);
        const isHl = highlights.has(key);
        const active = s.state === 'active';
        const col = active ? 'var(--accent)' : TXT.muted;
        const lp = polar(CX, CY, R1 + 22, p.deg);
        return (
          <g key={key}
             onMouseEnter={() => setHovered(key)}
             onMouseLeave={() => setHovered(null)}
             onClick={(e) => { e.stopPropagation(); setSelected(key); }}
             style={{ cursor: 'pointer' }}>
            <circle cx={p.x} cy={p.y} r={isHot ? 9 : isHl ? 7 : 5.5}
                    fill={col} opacity={active ? 0.95 : 0.5} />
            {(active && (isHl || true)) && (
              <circle cx={p.x} cy={p.y} r="10" fill="none" stroke={col} strokeOpacity="0.4">
                <animate attributeName="r" values="6;14;6" dur={isHl ? '1.2s' : '2.6s'} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0;0.5" dur={isHl ? '1.2s' : '2.6s'} repeatCount="indefinite" />
              </circle>
            )}
            <text x={lp.x} y={lp.y + 3} textAnchor="middle"
                  className={isHot || isHl ? 'node-label node-label--accent' : 'node-label'}>
              {s.id.replace('hermione-', '').replace('hermione', 'core').slice(0, 12)}
            </text>
          </g>
        );
      })}
      <RingLabel text={`I · LIVE STATE · ${services.filter(s => s.state === 'active').length}/${services.length} ACTIVE`} r={R1 - 18} />
    </g>
  );
}

// ─── Ring II · KB ─────────────────────────────────────────────────
function KBRing({ sources, positions, hovered, setHovered, selected, setSelected, highlights }) {
  const laneArcs = positions.__laneArcs || [];
  return (
    <g>
      <circle cx={CX} cy={CY} r={R2} fill="none" stroke="rgba(255,255,255,0.04)" />

      {laneArcs.map(({ lane, startDeg, endDeg }) => (
        <path key={lane}
          d={arcPath(CX, CY, R2, startDeg, endDeg - 0.5)}
          fill="none" stroke={LANE_COLOR_RAW[lane]} strokeOpacity="0.45" strokeWidth="2" />
      ))}

      {laneArcs.map(({ lane, startDeg, endDeg }) => {
        const mid = (startDeg + endDeg) / 2;
        const p = polar(CX, CY, R2 - 22, mid);
        return (
          <text key={lane + '-l'} x={p.x} y={p.y + 3} textAnchor="middle"
            className="ring-label" fill={LANE_COLOR_RAW[lane]} opacity="0.7">
            {LANE_LABEL[lane]}
          </text>
        );
      })}

      {sources.map(s => {
        const p = positions[`kb:${s.source_id}`]; if (!p) return null;
        const key = `kb:${s.source_id}`;
        const isHot = hovered === key || selected === key;
        const isHl = highlights.has(key);
        const col = LANE_COLOR_RAW[s.lane];
        const r = 3.5 + s.score * 5;
        const lp = polar(CX, CY, R2 + 16, p.deg);
        return (
          <g key={key}
             onMouseEnter={() => setHovered(key)}
             onMouseLeave={() => setHovered(null)}
             onClick={(e) => { e.stopPropagation(); setSelected(key); }}
             style={{ cursor: 'pointer' }}>
            <line x1={CX} y1={CY} x2={p.x} y2={p.y}
                  stroke={col} strokeOpacity={isHot || isHl ? 0.4 : 0.05} strokeWidth="0.6" />
            <circle cx={p.x} cy={p.y} r={isHot ? r + 4 : isHl ? r + 2 : r}
                    fill={col} fillOpacity={s.status === 'ACTIVE' || s.status === 'CORE' ? 0.95 : 0.55}
                    stroke={col} strokeOpacity="0.4" strokeWidth="0.6" />
            {s.status === 'CORE' && (
              <circle cx={p.x} cy={p.y} r={r + 4} fill="none" stroke={col} strokeOpacity="0.5" strokeDasharray="1 2" />
            )}
            {isHl && (
              <circle cx={p.x} cy={p.y} r={r + 8} fill="none" stroke={col} strokeOpacity="0.8">
                <animate attributeName="r" values={`${r + 4};${r + 14};${r + 4}`} dur="1.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.9;0;0.9" dur="1.6s" repeatCount="indefinite" />
              </circle>
            )}
            <text x={lp.x} y={lp.y + 3} textAnchor="middle"
                  className={isHot || isHl ? 'node-label node-label--strong' : 'node-label'}>
              {s.source_id.replace(/_/g, ' ').slice(0, 14)}
            </text>
          </g>
        );
      })}

      <RingLabel text={`II · KNOWLEDGE · ${sources.length} CONNECTORS`} r={R2 - 50} />
    </g>
  );
}

// ─── Ring III · strategies ────────────────────────────────────────
function StrategiesRing({ strategies, positions, hovered, setHovered, selected, setSelected, highlights }) {
  return (
    <g>
      <circle cx={CX} cy={CY} r={R3} fill="none" stroke="rgba(255,255,255,0.04)" />
      {strategies.map((s) => {
        const p = positions[`str:${s.id}`]; if (!p) return null;
        const key = `str:${s.id}`;
        const isHot = hovered === key || selected === key;
        const isHl = highlights.has(key);
        const haloCol = HALO_COLOR[s.halo] || TXT.muted;
        const size = 7 + Math.log2(1 + s.size_usd / 50) * 1.4;
        const pts = Array.from({ length: 6 }).map((_, k) => {
          const a = (k / 6) * Math.PI * 2 - Math.PI / 2;
          return `${p.x + Math.cos(a) * size},${p.y + Math.sin(a) * size}`;
        }).join(' ');
        const active = s.mode === 'live' || s.mode === 'paper';
        // Place label strictly above or below node (not radially outward) so it never overlaps the ring or neighbors.
        const labelOffset = size * 2 + 18;
        const above = p.y < CY;
        const lp = { x: p.x, y: above ? p.y - labelOffset : p.y + labelOffset };
        return (
          <g key={key}
             onMouseEnter={() => setHovered(key)}
             onMouseLeave={() => setHovered(null)}
             onClick={(e) => { e.stopPropagation(); setSelected(key); }}
             style={{ cursor: 'pointer' }}>
            <circle cx={p.x} cy={p.y} r={isHot ? size * 3 : size * 2}
              fill="none" stroke={haloCol}
              strokeOpacity={s.halo === 'winning' ? 0.55 : s.halo === 'losing' ? 0.45 : 0.18} />
            <polygon points={pts}
              fill={active ? haloCol : 'transparent'}
              fillOpacity={s.mode === 'live' ? 0.85 : 0.5}
              stroke={haloCol} strokeWidth="1.2" />
            <text x={p.x} y={p.y + 3} textAnchor="middle"
                  fontFamily="'Share Tech Mono', monospace" fontSize="8"
                  fill={s.mode === 'live' ? TXT.inkOn : TXT.primary}>
              {s.mode === 'live' ? 'L' : s.mode === 'paper' ? 'P' : s.mode === 'dorm' ? '·' : '×'}
            </text>
            {isHl && (
              <circle cx={p.x} cy={p.y} r={size * 2}
                fill="none" stroke={haloCol}>
                <animate attributeName="r" values={`${size * 2};${size * 4};${size * 2}`} dur="1.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.9;0;0.9" dur="1.6s" repeatCount="indefinite" />
              </circle>
            )}
            <text x={lp.x} y={lp.y - 4} textAnchor="middle"
                  className={isHot || isHl ? 'node-label node-label--strong' : 'node-label'}>
              {s.name.toUpperCase()}
            </text>
            <text x={lp.x} y={lp.y + 8} textAnchor="middle"
                  fontFamily="'Share Tech Mono', monospace" fontSize="9"
                  fill={haloCol} opacity="0.85" letterSpacing="0.1em">
              {s.today_pnl >= 0 ? '+' : ''}{s.today_pnl.toFixed(2)}
            </text>
          </g>
        );
      })}
      <RingLabel text={`III · STRATEGIES · ${strategies.filter(s => s.mode === 'live' || s.mode === 'paper').length} ENGAGED`} r={R3 - 18} />
    </g>
  );
}

// ─── Strand IV · YouTube days ─────────────────────────────────────
function YouTubeStrand({ positions, hovered, setHovered, selected, setSelected, highlights }) {
  const sorted = positions.__ytSorted || [];
  return (
    <g>
      <path d={arcPath(CX, CY, R4, 130, 410)}
            fill="none" stroke="rgba(255, 61, 90, 0.18)" strokeDasharray="3 4" />

      {sorted.map((d) => {
        const p = positions[`yt:${d.day}`]; if (!p) return null;
        const key = `yt:${d.day}`;
        const isHot = hovered === key || selected === key;
        const isHl = highlights.has(key);
        const col = d.kind === 'warning' ? '#ff3d5a'
                  : d.kind === 'shipped' ? '#00f5c4'
                  : d.kind === 'lesson'  ? '#ffb454'
                                         : TXT.muted;
        return (
          <g key={key}
             onMouseEnter={() => setHovered(key)}
             onMouseLeave={() => setHovered(null)}
             onClick={(e) => { e.stopPropagation(); setSelected(key); }}
             style={{ cursor: 'pointer' }}>
            <circle cx={p.x} cy={p.y} r={isHot ? 5 : isHl ? 3.5 : 2.2}
                    fill={col} fillOpacity={isHot ? 1 : 0.75} />
            {(isHot || isHl) && (
              <circle cx={p.x} cy={p.y} r="10" fill="none" stroke={col} strokeOpacity="0.5" />
            )}
          </g>
        );
      })}

      {sorted.map((d) => {
        if (d.day % 10 !== 0) return null;
        const p = positions[`yt:${d.day}`]; if (!p) return null;
        const p1 = polar(CX, CY, p.r + 12, p.deg);
        const p2 = polar(CX, CY, p.r + 22, p.deg);
        return (
          <g key={`tick-${d.day}`}>
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={TXT.muted} strokeWidth="0.6" />
            <text x={p2.x} y={p2.y + 12} textAnchor="middle"
                  fontFamily="'Share Tech Mono', monospace" fontSize="9"
                  fill={TXT.muted} letterSpacing="0.12em">D{d.day}</text>
          </g>
        );
      })}

      <text x={CX} y={CY - R4 - 14} textAnchor="middle" className="ring-label" fill={TXT.muted}>
        IV · STORY · 60 DAYS BROADCAST
      </text>
    </g>
  );
}

// ─── Connection rays ──────────────────────────────────────────────
function Connections({ positions, selected, highlights, data }) {
  const rays = useMemo(() => {
    const out = [];
    if (selected) {
      const sel = positions[selected];
      if (sel) {
        const rel = relatedNodes(selected, data);
        rel.forEach(k => {
          const t = positions[k];
          if (t) out.push({ key: `s-${selected}-${k}`, x1: sel.x, y1: sel.y, x2: t.x, y2: t.y, strong: true });
        });
        out.push({ key: `s-${selected}-core`, x1: sel.x, y1: sel.y, x2: CX, y2: CY, strong: true });
      }
    }
    highlights.forEach(k => {
      if (k === selected) return;
      const t = positions[k];
      if (t) out.push({ key: `h-${k}`, x1: CX, y1: CY, x2: t.x, y2: t.y, strong: false });
    });
    return out;
  }, [positions, selected, highlights, data]);

  return (
    <g className="rays">
      {rays.map(r => (
        <line key={r.key}
              x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2}
              stroke="#00f5c4"
              strokeOpacity={r.strong ? 0.55 : 0.25}
              strokeWidth={r.strong ? 1.1 : 0.7}
              strokeDasharray={r.strong ? '0' : '2 5'} />
      ))}
    </g>
  );
}

// ─── Edge particles ───────────────────────────────────────────────
function ParticlesLayer({ data, positions, enabled }) {
  const partsRef = useRef([]);
  const lastEmitRef = useRef({});

  useAnimationFrame(useCallback((dt, now) => {
    if (!enabled) { partsRef.current = []; return; }
    data.strategies.forEach(s => {
      const trades = s.today_trades || 0;
      const active = (s.mode === 'live' || s.mode === 'paper') && trades > 0;
      if (!active) return;
      const cadenceMs = Math.max(900, 6000 / Math.max(1, trades));
      const last = lastEmitRef.current[s.id] || 0;
      if (now - last > cadenceMs) {
        partsRef.current.push({
          id: Math.random(),
          fromKey: `str:${s.id}`,
          t: 0,
          color: s.today_pnl >= 0 ? '#00f5c4' : '#ff3d5a',
        });
        lastEmitRef.current[s.id] = now;
      }
    });
    partsRef.current.forEach(p => { p.t += dt * 0.6; });
    partsRef.current = partsRef.current.filter(p => p.t < 1);
  }, [data, enabled]));

  const [, setTick] = useState(0);
  useAnimationFrame(useCallback(() => { setTick(t => (t + 1) % 100000); }, []));

  if (!enabled) return null;

  return (
    <g className="particles">
      {partsRef.current.map(p => {
        const from = positions[p.fromKey];
        if (!from) return null;
        const x = from.x + (CX - from.x) * p.t;
        const y = from.y + (CY - from.y) * p.t;
        const alpha = 1 - p.t;
        return (
          <circle key={p.id} cx={x} cy={y} r={2} fill={p.color} opacity={alpha} />
        );
      })}
    </g>
  );
}

// ─── Camera ───────────────────────────────────────────────────────
function useCamera(selected, positions) {
  const [cam, setCam] = useState({ x: CX, y: CY, s: 1 });
  const targetRef = useRef({ x: CX, y: CY, s: 1 });
  useEffect(() => {
    if (selected && positions[selected]) {
      const p = positions[selected];
      targetRef.current = { x: p.x, y: p.y, s: 1.32 };
    } else {
      targetRef.current = { x: CX, y: CY, s: 1 };
    }
  }, [selected, positions]);
  useAnimationFrame(useCallback((dt) => {
    setCam(prev => {
      const t = targetRef.current;
      const k = 1 - Math.exp(-dt * 4.2);
      return {
        x: prev.x + (t.x - prev.x) * k,
        y: prev.y + (t.y - prev.y) * k,
        s: prev.s + (t.s - prev.s) * k,
      };
    });
  }, []));
  return cam;
}

// ─── Top chrome ───────────────────────────────────────────────────
function TopChrome({ meta, status, oracle }) {
  const now = useClock(1000);
  const heartbeat = `${status.heartbeat_hz.toFixed(1)} Hz`;
  return (
    <header className="chrome-top">
      <div className="brand">
        <div className="brand__mark">H</div>
        <div className="brand__title">
          {meta.name} · CONTROL CENTER
          <small>{meta.codename} · {meta.version} · NEURAL GRAPH</small>
        </div>
      </div>
      <nav className="crumbs">
        <span className="crumb crumb--active">GRAPH</span>
        <span className="dot" />
        <span>JOURNAL</span>
        <span className="dot" />
        <span>KB</span>
        <span className="dot" />
        <span>SCALPERS</span>
        <span className="dot" />
        <span>AUTOPSY</span>
        <span className="dot" />
        <a href="#sniper" style={{ color: '#3fd07a', textDecoration: 'none', fontWeight: 600 }}>SNIPER ◎</a>
      </nav>
      <div className="top-meta">
        <div><span className="heartbeat-dot" /> HEARTBEAT <strong>{heartbeat}</strong></div>
        <div>ORACLE <strong>v{oracle.version.replace('v', '')}</strong> · wf_auc <strong>{oracle.wf_auc.toFixed(3)}</strong></div>
        <div>F&amp;G <strong style={{ color: status.fng < 30 ? '#ffb454' : TXT.primary }}>{status.fng}</strong> · REGIME <strong>{status.regime.toUpperCase()}</strong></div>
        <div>{now.toISOString().slice(11, 19)}Z</div>
      </div>
    </header>
  );
}

// ─── Left rail ────────────────────────────────────────────────────
// ─── Token Briefs Widget ──────────────────────────────────────────
const FLAG_COLOR = { long_bias: '#00f5c4', short_bias: '#ff3d5a', neutral: '#7d9aa0' };
const FLAG_LABEL = { long_bias: '▲ LONG', short_bias: '▼ SHORT', neutral: '─ NEUT' };

function TokenBriefsWidget() {
  const [briefs, setBriefs] = useState([]);
  const [lastFetch, setLastFetch] = useState(0);

  useEffect(() => {
    const load = () => {
      const now = Date.now();
      if (now - lastFetch < 60000) return; // 60s cache
      fetch('/api/control/token_briefs', { credentials: 'include' })
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setBriefs(data);
            setLastFetch(Date.now());
          }
        })
        .catch(() => {});
    };
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, [lastFetch]);

  if (!briefs.length) return null;

  // Sort: short_bias first (risk), then long_bias, then neutral
  const sorted = [...briefs].sort((a, b) => {
    const order = { short_bias: 0, long_bias: 1, neutral: 2 };
    return (order[a.momentum_flag] ?? 2) - (order[b.momentum_flag] ?? 2);
  });

  return (
    <section className="panel" style={{ marginTop: 8 }}>
      <header className="panel__head">
        <span>CATALYST BRIEFS</span>
        <span className="count">{briefs.length}</span>
      </header>
      <div className="panel__body" style={{ maxHeight: 280, overflowY: 'auto' }}>
        {sorted.map(b => {
          const flag = b.momentum_flag || 'neutral';
          const col = FLAG_COLOR[flag] || '#7d9aa0';
          const conv = Math.round((b.conviction || 0) * 100);
          const topCat = (b.catalysts || [])[0];
          return (
            <div key={b.token} style={{
              padding: '4px 0',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '36px 64px 1fr 28px',
                gap: 4,
                alignItems: 'center',
              }}>
                <span style={{ color: 'var(--text)', fontWeight: 700, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>
                  {b.token}
                </span>
                <span style={{ color: col, fontSize: 9.5, fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.05em' }}>
                  {FLAG_LABEL[flag]}
                </span>
                {/* conviction bar */}
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 2, height: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${conv}%`, height: '100%', background: col, opacity: 0.8 }} />
                </div>
                <span style={{ color: 'var(--text-3)', fontSize: 9, fontFamily: 'Share Tech Mono, monospace', textAlign: 'right' }}>
                  {conv}%
                </span>
              </div>
              {topCat && (
                <div style={{
                  fontSize: 9.5,
                  color: 'var(--text-2)',
                  marginTop: 2,
                  lineHeight: 1.4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                }} title={topCat.headline}>
                  {topCat.impact === 'structural-bullish' || topCat.impact === 'bullish' ? '↑' :
                   topCat.impact === 'structural-bearish' || topCat.impact === 'bearish' ? '↓' : '→'}{' '}
                  {topCat.headline}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function LeftRail({ rings, setRings, data }) {
  const counts = useMemo(() => {
    const c = {};
    data.kb_sources.forEach(s => { c[s.lane] = (c[s.lane] || 0) + 1; });
    return c;
  }, [data.kb_sources]);
  return (
    <div className="chrome-left">
      <section className="panel">
        <header className="panel__head">
          <span>RINGS</span>
          <span className="count">{Object.values(rings).filter(Boolean).length}/4</span>
        </header>
        <div className="panel__body">
          {[
            { k: 'r1', n: 'I',   l: 'Live state',   sub: 'services · positions' },
            { k: 'r2', n: 'II',  l: 'Knowledge',    sub: '21 connectors · 6 lanes' },
            { k: 'r3', n: 'III', l: 'Strategies',   sub: '10 candidates · 5 live' },
            { k: 'r4', n: 'IV',  l: 'Story strand', sub: '60 days of broadcast' },
          ].map(r => (
            <div key={r.k}
                 className={`ring-row ${rings[r.k] ? 'ring-row--on' : ''}`}
                 onClick={() => setRings({ ...rings, [r.k]: !rings[r.k] })}>
              <span className="ring-row__num">{r.n}</span>
              <span className="ring-row__label">{r.l}<span className="sub">{r.sub}</span></span>
              <span className="ring-row__toggle" />
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <header className="panel__head">
          <span>LANES · KB</span>
          <span className="count">{data.kb_sources.length}</span>
        </header>
        <div className="panel__body">
          {LANE_ORDER.map(l => (
            <div key={l} className="lane-row">
              <span className="swatch" style={{ background: LANE_COLOR_RAW[l], color: LANE_COLOR_RAW[l] }} />
              {LANE_LABEL[l]}<span className="count">{counts[l] || 0}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <header className="panel__head">
          <span>POSITIONS</span><span className="count">{data.status.positions.length}</span>
        </header>
        <div className="panel__body">
          {data.status.positions.map(p => (
            <div key={p.coin} style={{
              display: 'grid', gridTemplateColumns: '36px 18px 1fr auto',
              gap: 6, alignItems: 'center', padding: '3px 0',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5,
            }}>
              <span style={{ color: 'var(--text)', fontWeight: 600 }}>{p.coin}</span>
              <span style={{
                color: p.side === 'LONG' ? 'var(--mint)' : 'var(--red)',
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: 10, letterSpacing: '0.08em',
              }}>{p.side[0]}</span>
              <span style={{ color: 'var(--text-3)', fontFamily: 'Share Tech Mono, monospace', fontSize: 10 }}>
                {p.size}@{p.entry_px}
              </span>
              <span style={{
                color: p.uPnL >= 0 ? 'var(--mint)' : 'var(--red)',
                fontFamily: 'Share Tech Mono, monospace', fontSize: 10.5,
              }}>{p.uPnL >= 0 ? '+' : ''}{p.uPnL.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </section>

      <TokenBriefsWidget />
    </div>
  );
}

// ─── Detail rail ──────────────────────────────────────────────────
function Detail({ selected, setSelected, data }) {
  if (!selected) return <IdleHint />;
  const [kind, id] = selected.split(':');

  if (kind === 'svc') {
    const s = data.status.services.find(x => x.id === id);
    if (!s) return <IdleHint />;
    return (
      <DetailShell onClose={() => setSelected(null)}
        eyebrow="I · LIVE STATE / SERVICE" eyebrowColor="#00f5c4"
        title={s.id} sub={s.role}>
        <div className="metric-grid">
          <div><span className="k">State</span>
               <span className={`v ${s.state === 'active' ? 'pos' : 'mute'}`}>{s.state.toUpperCase()}</span></div>
          <div><span className="k">Uptime</span><span className="v">{s.uptime_h}h</span></div>
        </div>
        <div className="detail__note">systemd unit · auto-restart on failure · stdout → journald</div>
      </DetailShell>
    );
  }

  if (kind === 'kb') {
    const s = data.kb_sources.find(x => x.source_id === id);
    if (!s) return <IdleHint />;
    const last = s.last_mtime === 'never' ? 'never' : new Date(s.last_mtime).toISOString().slice(0, 16).replace('T', ' ');
    return (
      <DetailShell onClose={() => setSelected(null)}
        eyebrow={`II · KNOWLEDGE / ${LANE_LABEL[s.lane]}`}
        eyebrowColor={LANE_COLOR_RAW[s.lane]}
        title={s.source_id.replace(/_/g, ' ')}
        sub={`SCORE ${s.score.toFixed(2)} · ${s.status}`}>
        <div className="metric-grid">
          <div><span className="k">Records</span><span className="v">{s.record_count.toLocaleString()}</span></div>
          <div><span className="k">Last mtime</span><span className="v">{last}</span></div>
          <div><span className="k">Council</span>
               <span className={`v ${s.council ? 'pos' : 'mute'}`}>{s.council ? 'YES' : '—'}</span></div>
          <div><span className="k">Extract</span>
               <span className={`v ${s.extract ? 'pos' : 'mute'}`}>{s.extract ? 'YES' : '—'}</span></div>
        </div>
        <div className="detail__chips">
          <span className={`chip ${s.status === 'CORE' || s.status === 'ACTIVE' ? 'chip--pos' : 'chip--mute'}`}>
            <span className="chip__dot" />{s.status}
          </span>
          {s.enrichment && <span className="chip chip--warn"><span className="chip__dot" />ENRICHMENT</span>}
          <span className="chip chip--mute"><span className="chip__dot" />{s.lane.toUpperCase()}</span>
        </div>
        <div className="detail__note">
          {s.status === 'CORE'
            ? 'Identity-bearing source. Read directly by the council prompt.'
            : s.status === 'ACTIVE'
              ? 'Live connector. New records flow into /api/kb/search.'
              : s.status === 'DETERMINISTIC'
                ? 'Numeric feed. Joins via deterministic key, never via LLM.'
                : 'Enrichment-only — augments other sources, not standalone.'}
        </div>
      </DetailShell>
    );
  }

  if (kind === 'str') {
    const s = data.strategies.find(x => x.id === id);
    if (!s) return <IdleHint />;
    return (
      <DetailShell onClose={() => setSelected(null)}
        eyebrow={`III · STRATEGY / ${s.mode.toUpperCase()}`}
        eyebrowColor={HALO_COLOR[s.halo]}
        title={s.name} sub={s.role}>
        <div className="metric-grid">
          <div><span className="k">Today PnL</span>
            <span className={`v ${s.today_pnl > 0 ? 'pos' : s.today_pnl < 0 ? 'neg' : 'mute'}`}>
              {s.today_pnl >= 0 ? '+' : ''}${s.today_pnl.toFixed(2)}
            </span></div>
          <div><span className="k">Trades</span><span className="v">{s.today_trades}</span></div>
          <div><span className="k">Open</span><span className="v">{s.positions_open}</span></div>
          <div><span className="k">WR · 7d</span>
            <span className="v">{s.win_rate_7d == null ? '—' : (s.win_rate_7d * 100).toFixed(0) + '%'}</span></div>
          <div><span className="k">Allocation</span><span className="v">${s.size_usd.toLocaleString()}</span></div>
          <div><span className="k">Halo</span>
            <span className={`v ${s.halo === 'winning' ? 'pos' : s.halo === 'losing' ? 'neg' : 'mute'}`}>
              {s.halo.toUpperCase()}
            </span></div>
        </div>
      </DetailShell>
    );
  }

  if (kind === 'yt') {
    const d = data.youtube_days.find(x => x.day === Number(id));
    if (!d) return <IdleHint />;
    const col = d.kind === 'warning' ? '#ff3d5a' : d.kind === 'shipped' ? 'var(--accent)' : d.kind === 'lesson' ? '#ffb454' : TXT.muted;
    return (
      <DetailShell onClose={() => setSelected(null)}
        eyebrow={`IV · STORY / ${d.kind.toUpperCase()}`} eyebrowColor={col}
        title={`DAY ${d.day}`} sub={d.date}>
        <div className="detail__note" style={{ borderLeftColor: col }}>{d.title}</div>
        {d.preview !== '—' && (
          <p style={{ color: 'var(--text-2)', fontSize: 12.5, margin: 0, lineHeight: 1.55 }}>{d.preview}</p>
        )}
        <div className="detail__kv">
          <span className="k">Posted</span><span className="v">{d.date} 23:55 UTC</span>
          <span className="k">Channel</span><span className="v">@HermoineTrades</span>
          <span className="k">Format</span><span className="v">60s · vertical</span>
        </div>
      </DetailShell>
    );
  }

  return <IdleHint />;
}

function DetailShell({ onClose, eyebrow, eyebrowColor, title, sub, children }) {
  return (
    <aside className="detail">
      <button className="detail__close" onClick={onClose}>×</button>
      <header className="detail__head">
        <div className="detail__eyebrow" style={{ color: eyebrowColor }}>
          <span className="swatch" /><span>{eyebrow}</span>
        </div>
        <div className="detail__title">{title}</div>
        <div className="detail__sub">{sub}</div>
      </header>
      <div className="detail__body">{children}</div>
    </aside>
  );
}

function IdleHint() {
  return (
    <aside className="detail detail--idle">
      <header className="detail__head">
        <div className="detail__eyebrow" style={{ color: 'var(--text-3)' }}>
          <span className="swatch" /><span>READOUT</span>
        </div>
        <div className="detail__title" style={{ fontSize: 13, letterSpacing: '0.1em' }}>
          Hover, then click.
        </div>
      </header>
      <div className="detail__body">
        <p>
          Center is the model. Ring <span className="kbd">I</span> is what it's running.
          Ring <span className="kbd">II</span> is what it's read.
          Ring <span className="kbd">III</span> is how it acts. The strand on the outside
          is what it's told the world, one day at a time.
        </p>
        <p>
          <span className="kbd">/</span> ask · <span className="kbd">⌘K</span> jump ·
          <span className="kbd">G</span> graph · <span className="kbd">Esc</span> back.
        </p>
      </div>
    </aside>
  );
}

// ─── OpenPositionsPanel — SVG overlay for scanner-e open positions ───────────
function OpenPositionsPanel({ positions }: { positions: ScannerEPosition[] }) {
  if (!positions || positions.length === 0) return null;
  return (
    <g transform="translate(20, 20)">
      <text x="0" y="0" fill="#94a3b8" fontSize="11" fontFamily="monospace" fontWeight="600">
        {`SCANNER-E  ${positions.length} OPEN`}
      </text>
      {positions.map((pos, i) => {
        const pnlColor = pos.pnl_pct === null ? '#64748b'
          : pos.pnl_pct >= 0 ? '#22c55e' : '#ef4444';
        const pnlStr = pos.pnl_pct === null ? '  ...  '
          : `${pos.pnl_pct >= 0 ? '+' : ''}${pos.pnl_pct.toFixed(1)}%`;
        const holdStr = pos.hold_minutes != null ? `${Math.round(pos.hold_minutes)}m` : '';
        return (
          <g key={pos.diy_pid} transform={`translate(0, ${18 + i * 17})`}>
            <rect x="-3" y="-13" width="200" height="15" fill="#0f172a" rx="2" opacity="0.85" />
            <text x="0" y="0" fill="#cbd5e1" fontSize="10" fontFamily="monospace">{pos.ticker}</text>
            <text x="70" y="0" fill={pnlColor} fontSize="10" fontFamily="monospace" fontWeight="bold">{pnlStr}</text>
            <text x="128" y="0" fill="#475569" fontSize="9" fontFamily="monospace">{holdStr}</text>
          </g>
        );
      })}
    </g>
  );
}

// ─── Main ControlCenter component ────────────────────────────────
// ─── PositionAlertBanner — full-width amber banner for position alerts ────────
function PositionAlertBanner() {
  const [alerts, setAlerts] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [dismissing, setDismissing] = useState(null);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch('/api/control/position_alerts');
        const data = await res.json();
        if (alive) setAlerts((data.alerts || []).filter(a => a.unread && !a.dismissed));
      } catch (_) {}
    };
    poll();
    const id = setInterval(poll, 30000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const dismiss = async (token) => {
    setDismissing(token);
    try {
      await fetch(`/api/control/position_alerts/${token}/dismiss`, { method: 'POST' });
      setAlerts(prev => prev.filter(a => a.token !== token));
    } catch (_) {}
    setDismissing(null);
  };

  if (alerts.length === 0) return null;

  const sevColor = { high: '#ff3d5a', medium: '#f0a000', low: '#f0d75a' };

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
        background: 'linear-gradient(90deg, #7a4800 0%, #b06800 50%, #7a4800 100%)',
        borderBottom: '2px solid #f0a000',
        padding: '8px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        cursor: 'pointer',
      }} onClick={() => setPanelOpen(p => !p)}>
        <span style={{ fontSize: 18 }}>⚠</span>
        <span style={{ color: '#ffe0a0', fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>
          POSITION ALERT — {alerts.length} catalyst conflict{alerts.length > 1 ? 's' : ''}
        </span>
        <span style={{ color: '#ffcc66', fontSize: 12 }}>
          {alerts.map(a => `${a.token} ${a.direction} ← ${a.momentum_flag}`).join(' · ')}
        </span>
        <span style={{ marginLeft: 'auto', color: '#ffcc66', fontSize: 11 }}>
          {panelOpen ? '▲ hide' : '▼ details'}
        </span>
      </div>
      {panelOpen && (
        <div style={{
          position: 'fixed', top: 38, left: 0, right: 0, zIndex: 9998,
          background: '#0d1a1f', border: '1px solid #f0a000',
          padding: 16, maxHeight: '50vh', overflowY: 'auto',
        }}>
          {alerts.map(alert => (
            <div key={alert.token} style={{
              marginBottom: 16, padding: 12,
              background: '#111f25', borderRadius: 6,
              borderLeft: `4px solid ${sevColor[alert.severity] || '#f0a000'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#ffe0a0', fontWeight: 700, fontSize: 14 }}>
                  {alert.token} — {alert.direction} position vs {alert.momentum_flag}
                  {' '}
                  <span style={{ color: sevColor[alert.severity] || '#f0a000', fontSize: 11 }}>
                    [{alert.severity?.toUpperCase()}] conv={alert.conviction?.toFixed(2)}
                  </span>
                </span>
                <button
                  style={{
                    background: '#2a3a42', color: '#aac', border: 'none',
                    borderRadius: 4, padding: '3px 10px', cursor: 'pointer', fontSize: 11,
                  }}
                  onClick={e => { e.stopPropagation(); dismiss(alert.token); }}
                  disabled={dismissing === alert.token}
                >
                  {dismissing === alert.token ? 'dismissing…' : 'Dismiss'}
                </button>
              </div>
              {alert.ml_note && (
                <div style={{ color: '#99b8c0', fontSize: 12, marginTop: 4 }}>
                  {alert.ml_note}
                </div>
              )}
              {(alert.catalysts || []).slice(0, 3).map((cat, i) => (
                <div key={i} style={{
                  color: '#7d9aa0', fontSize: 11, marginTop: 4,
                  paddingLeft: 8, borderLeft: '2px solid #2a4a55',
                }}>
                  [{cat.date}] {cat.headline}
                  {cat.url && (
                    <a href={cat.url} target="_blank" rel="noreferrer"
                      style={{ color: '#4a9ab0', marginLeft: 6, fontSize: 10 }}
                      onClick={e => e.stopPropagation()}>
                      link
                    </a>
                  )}
                </div>
              ))}
              {alert.upnl !== undefined && (
                <div style={{
                  color: alert.upnl < 0 ? '#ff3d5a' : '#00f5c4',
                  fontSize: 11, marginTop: 4,
                }}>
                  Unrealized P&L: {alert.upnl >= 0 ? '+' : ''}{alert.upnl?.toFixed(2)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}


// ─── ReversalPaperPanel — bottom-right overlay for S288 paper grid ────────────
function ReversalPaperPanel({ data }: { data: any }) {
  const [open, setOpen] = React.useState(false);
  const rp = (data as any).reversal_paper;

  // Always render the panel once data has loaded (even if empty)
  const summary = rp?.summary ?? null;
  const counters = rp?.counters ?? {};
  const recent: any[] = rp?.recent ?? [];
  const loaded = rp !== null && rp !== undefined;

  const noTrades = !summary || summary.n_trades === 0;

  const netPnl = summary?.net_pnl ?? 0;
  const pnlColor = netPnl > 0 ? '#00f5c4' : netPnl < 0 ? '#ff3d5a' : '#7d9aa0';
  const winRatePct = summary ? Math.round((summary.win_rate ?? 0) * 100) : 0;

  const panelStyle: React.CSSProperties = {
    position: 'fixed', bottom: 16, right: 16, zIndex: 900,
    width: open ? 380 : 160,
    background: '#0d1a1f',
    border: '1px solid #1e3a45',
    borderRadius: 8,
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#94a3b8',
    boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
    transition: 'width 0.2s ease',
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '7px 10px',
    borderBottom: open ? '1px solid #1e3a45' : 'none',
    cursor: 'pointer',
    background: '#0a1318',
    borderRadius: open ? '8px 8px 0 0' : 8,
  };

  return (
    <div style={panelStyle}>
      <div style={headerStyle} onClick={() => setOpen(o => !o)}>
        <span style={{ color: '#00f5c4', fontWeight: 700, letterSpacing: 1, fontSize: 10 }}>
          PAPER · REV-GRID
        </span>
        {loaded && !noTrades && (
          <span style={{ color: pnlColor, fontWeight: 700, fontSize: 11 }}>
            {netPnl >= 0 ? '+' : ''}{netPnl.toFixed(2)}
          </span>
        )}
        {loaded && noTrades && (
          <span style={{ color: '#4a6770', fontSize: 10 }}>no trades</span>
        )}
        <span style={{ color: '#4a6770', fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ padding: '10px 12px', overflowY: 'auto', maxHeight: '70vh' }}>
          {/* Summary stats */}
          {noTrades ? (
            <div style={{ color: '#4a6770', padding: '8px 0' }}>
              No paper trades yet — waiting for first grid activation.
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 10 }}>
                <div style={{ color: '#7d9aa0', fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>SUMMARY</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
                  <div>Net P&L <span style={{ color: pnlColor, fontWeight: 700 }}>
                    {netPnl >= 0 ? '+' : ''}{netPnl.toFixed(4)}
                  </span></div>
                  <div>Trades <span style={{ color: '#ecf6f8' }}>{summary.n_trades}</span></div>
                  <div>Win rate <span style={{ color: winRatePct >= 50 ? '#00f5c4' : '#ff3d5a' }}>
                    {winRatePct}%
                  </span></div>
                  <div>W/L <span style={{ color: '#ecf6f8' }}>
                    {summary.wins ?? '-'}/{summary.losses ?? '-'}
                  </span></div>
                  {summary.avg_duration_min != null && (
                    <div>Avg hold <span style={{ color: '#ecf6f8' }}>{summary.avg_duration_min}m</span></div>
                  )}
                  {summary.tp_maxloss_ratio != null && (
                    <div>TP/MaxLoss <span style={{
                      color: summary.tp_maxloss_ratio >= 1.5 ? '#00f5c4' : '#f0d75a',
                    }}>{summary.tp_maxloss_ratio}x</span></div>
                  )}
                </div>
              </div>

              {/* Exit type distribution */}
              {Object.keys(summary.by_exit_type).length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ color: '#7d9aa0', fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>EXIT TYPES</div>
                  {Object.entries(summary.by_exit_type)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([et, cnt]) => (
                      <div key={et} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ color: '#94a3b8' }}>{et}</span>
                        <span style={{ color: '#ecf6f8' }}>{cnt as number}</span>
                      </div>
                    ))}
                </div>
              )}

              {/* Per-token breakdown */}
              {Object.keys(summary.by_token).length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ color: '#7d9aa0', fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>BY TOKEN</div>
                  {Object.entries(summary.by_token)
                    .sort(([, a], [, b]) => (b as any).net_pnl - (a as any).net_pnl)
                    .slice(0, 8)
                    .map(([coin, d]: any) => (
                      <div key={coin} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ color: '#94a3b8', width: 60 }}>{coin}</span>
                        <span style={{ color: '#7d9aa0' }}>n={d.n_trades}</span>
                        <span style={{ color: d.win_rate >= 0.5 ? '#00f5c4' : '#ff3d5a' }}>
                          {Math.round(d.win_rate * 100)}%WR
                        </span>
                        <span style={{ color: d.net_pnl >= 0 ? '#00f5c4' : '#ff3d5a', fontWeight: 700 }}>
                          {d.net_pnl >= 0 ? '+' : ''}{d.net_pnl.toFixed(4)}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}

          {/* Redis counters */}
          {Object.keys(counters).length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ color: '#7d9aa0', fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>REDIS COUNTERS</div>
              {Object.entries(counters).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ color: '#4a6770' }}>{k}</span>
                  <span style={{ color: '#ecf6f8' }}>{v as number}</span>
                </div>
              ))}
              {counters.orders_placed > 0 && (
                <div style={{ color: '#7d9aa0', marginTop: 4 }}>
                  fill rate: {((counters.fills ?? 0) / counters.orders_placed * 100).toFixed(1)}%
                </div>
              )}
            </div>
          )}

          {/* Recent trades table */}
          {recent.length > 0 && (
            <div>
              <div style={{ color: '#7d9aa0', fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>
                RECENT TRADES ({recent.length})
              </div>
              <div style={{
                overflowX: 'auto',
                borderTop: '1px solid #1e3a45',
                paddingTop: 6,
              }}>
                {recent.slice().reverse().slice(0, 20).map((t: any, i: number) => {
                  const tPnl = t.net_pnl ?? 0;
                  const tColor = tPnl >= 0 ? '#00f5c4' : '#ff3d5a';
                  return (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between',
                      marginBottom: 3, fontSize: 10,
                    }}>
                      <span style={{ color: '#94a3b8', width: 52 }}>{t.coin ?? '—'}</span>
                      <span style={{ color: '#4a6770', width: 68 }}>{t.exit_type ?? '—'}</span>
                      <span style={{ color: tColor, fontWeight: 700 }}>
                        {tPnl >= 0 ? '+' : ''}{tPnl.toFixed(4)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!loaded && (
            <div style={{ color: '#4a6770', padding: '8px 0' }}>Loading…</div>
          )}
        </div>
      )}
    </div>
  );
}


export default function ControlCenter({ data, tweaks: tweaksProp }) {
  const tweaks = tweaksProp || { motion: 'on', speed: 1.0, stars: true };
  const { askState, setAskState, askResponse, setAskResponse, selected, setSelected } = useContext(AskContext);

  const [hovered, setHovered] = useState(null);
  const [rings, setRings] = useState({ r1: true, r2: true, r3: true, r4: true });
  // Trigger re-render after relation fetch completes so rays appear.
  const [, setRelTick] = useState(0);
  useEffect(() => {
    if (!selected) return;
    if (_relationsCache.has(selected)) return;
    fetchRelatedNodes(selected).then(() => setRelTick(t => t + 1));
  }, [selected]);

  const [rotate, setRotate] = useState(0);
  useAnimationFrame(useCallback((dt) => {
    if (tweaks.motion === 'off') return;
    setRotate(r => r + dt * (tweaks.speed ?? 1.0));
  }, [tweaks.motion, tweaks.speed]));

  const positions = useMemo(() => computePositions(data, rotate), [data, rotate]);
  const scanner_e_positions = (data as any).scanner_e_positions ?? [];

  const highlights = useMemo(() => {
    const set = new Set();
    if (askResponse && askResponse.highlights) askResponse.highlights.forEach(k => set.add(k));
    return set;
  }, [askResponse]);

  const cam = useCamera(selected, positions);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        const inp = document.querySelector('.ask-her input');
        if (inp) inp.focus();
      } else if (e.key === 'Escape') {
        if (askState === 'answered' || askState === 'thinking') {
          setAskState('idle');
          setAskResponse(null);
        }
        setSelected(null);
      } else if (e.key === 'g' && document.activeElement.tagName !== 'INPUT') {
        setSelected(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [askState, setAskState, setAskResponse, setSelected]);

  const camTransform = `translate(${VW / 2} ${VH / 2}) scale(${cam.s}) translate(${-cam.x} ${-cam.y})`;

  return (
    <>
      <PositionAlertBanner />
      <div className="stage" onClick={() => setSelected(null)}>
        <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet">
          <Starfield count={tweaks.stars ? 110 : 0} />
          <OpenPositionsPanel positions={scanner_e_positions} />

          <g transform={camTransform}>
            {rings.r4 && (
              <YouTubeStrand positions={positions}
                hovered={hovered} setHovered={setHovered}
                selected={selected} setSelected={setSelected}
                highlights={highlights} />
            )}
            {rings.r3 && (
              <StrategiesRing strategies={data.strategies} positions={positions}
                hovered={hovered} setHovered={setHovered}
                selected={selected} setSelected={setSelected}
                highlights={highlights} />
            )}
            {rings.r2 && (
              <KBRing sources={data.kb_sources} positions={positions}
                hovered={hovered} setHovered={setHovered}
                selected={selected} setSelected={setSelected}
                highlights={highlights} />
            )}
            {rings.r1 && (
              <ServicesRing services={data.status.services} positions={positions}
                hovered={hovered} setHovered={setHovered}
                selected={selected} setSelected={setSelected}
                highlights={highlights} />
            )}

            <Connections positions={positions} selected={selected} highlights={highlights} data={data} />
            <ParticlesLayer data={data} positions={positions} enabled={tweaks.motion !== 'off'} />

            <HermioneCore status={data.status} meta={data.meta}
              onClick={(e) => { e.stopPropagation(); setSelected(null); }}
              selected={!selected} />
          </g>
        </svg>
      </div>

      <TopChrome meta={data.meta} status={data.status} oracle={data.oracle} />
      <LeftRail rings={rings} setRings={setRings} data={data} />
      <Detail selected={selected} setSelected={setSelected} data={data} />
      <ReversalPaperPanel data={data} />
    </>
  );
}
