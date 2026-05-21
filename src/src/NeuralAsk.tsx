// @ts-nocheck
/* ──────────────────────────────────────────────────────────────────
   Hermione · Ask Gateway (Phase 2 of api-contracts.md)
   Replaces the bottom rail with: input field, response surface,
   follow-up chips, and a tiny status ticker.

   The endpoint POST /api/ask is mocked in-browser. The mock matches
   common queries to canned responses with `highlights` (list of node
   keys to light up in the graph) + `follow_ups` (clickable suggested
   next queries). If window.claude is available we fall back to it.
   ────────────────────────────────────────────────────────────────── */

import React, { useState, useEffect, useRef, useMemo, useContext } from 'react';
import { AskContext } from './NeuralGraph';

// ─── canned matcher ───────────────────────────────────────────────
function buildCanned(data) {
  return [
    {
      match: /\b(f-?tier|alpha wallet|scanner|bulk re-?run|wallets)\b/i,
      build: () => ({
        eyebrow: 'SCANNER · F-TIER',
        text:
          "We surfaced 41 A-tier alpha wallets after the bulk rerun. " +
          "Top hits: 8p6iSgNR at 212.5×, HuWvi86KK at 162.7×, 85fw8RoH at 155.4×. " +
          "The stale-cache fix collapsed F-tier from 91 % to 60.5 %. " +
          "The active.json deploy at 16:57 UTC pushes them downstream.",
        highlights: ['svc:scanner-e', 'kb:autopsy_log', 'kb:github_personal'],
        focus: 'svc:scanner-e',
        follow_ups: [
          "Show me the bulk rerun audit",
          "Why was the F-tier 91 % before?",
          "What's the next scanner upgrade?",
        ],
      }),
    },
    {
      match: /\b(council|5 agent|strategist|riskofficer|chairman)\b/i,
      build: () => ({
        eyebrow: 'COUNCIL · PAPER',
        text:
          "The council has been paper-only since day 30. Live version sleeps. " +
          "Today: 12 paper trades, +$18.42, 58 % 7d WR. " +
          "It reads 5 sources by design — arxiv, ssrn, hf_papers, fred — and writes nothing live. " +
          "Cost on live was $5/day API while losing money. The scalper at $0 was up $12.97 over the same window. " +
          "Sophistication is not edge.",
        highlights: ['str:council_paper', 'str:council_live', 'kb:arxiv', 'kb:ssrn', 'kb:hf_papers', 'kb:fred'],
        focus: 'str:council_paper',
        follow_ups: [
          "What would it take to bring the council back live?",
          "Show me the autopsy from day 30",
          "How are the 5 agents prompted?",
        ],
      }),
    },
    {
      match: /\b(oracle|retrain|auc|val_auc|wf_auc)\b/i,
      build: () => ({
        eyebrow: 'ORACLE · V4',
        text:
          `Oracle v${data.oracle.version.replace('v','')}. wf_auc ${data.oracle.wf_auc.toFixed(4)} after the 02:31 retrain (+0.0038 vs yesterday). ` +
          `val_auc ${data.oracle.val_auc.toFixed(3)} — still the truth. ` +
          `${data.oracle.n_features} features active. rolling_wr_10 still the only one with real signal. ` +
          "SGKF(wallet) val_auc 0.6749 — apples-to-apples vs V6.",
        highlights: ['kb:memory_md', 'kb:lessons_learned', 'kb:hyperliquid_fills', 'svc:oracle-v4-retrain'],
        focus: 'svc:oracle-v4-retrain',
        follow_ups: [
          "Why is rolling_wr_10 the only live feature?",
          "Show me the auc history since day 1",
          "When did val_auc go below random?",
        ],
      }),
    },
    {
      match: /\b(ena|avg.?down|disaster|service restart)\b/i,
      build: () => ({
        eyebrow: 'AUTOPSY · DAY 11',
        text:
          "Avg-down ran twice on a service restart. The worker didn't know I'd already added on the previous tick — " +
          "service restarted, it added again. −$41.80 on ENA in a $1,100 account. " +
          "Avg-down was disabled forever that day. The lesson: any worker that mutates state must read state first, every time.",
        highlights: ['str:avgdown_grid', 'kb:autopsy_log', 'kb:lessons_learned'],
        focus: 'str:avgdown_grid',
        follow_ups: [
          "Show me every retired strategy",
          "What other workers mutate state without reading?",
          "How many autopsies total?",
        ],
      }),
    },
    {
      match: /\b(pnl|today|loss|down|red|loosing|losing)\b/i,
      build: () => {
        const losers = data.strategies.filter(s => s.today_pnl < 0);
        return {
          eyebrow: 'TODAY · PNL',
          text:
            `Today: ${data.status.today_trades.total} trades, ${data.status.today_trades.wins}W / ${data.status.today_trades.losses}L, ` +
            `net ${data.status.today_pnl_usd >= 0 ? '+' : ''}$${data.status.today_pnl_usd.toFixed(2)}. ` +
            "NEAR and HYPE shorts are deep underwater (−$314 combined) — Naushad is managing both. " +
            "Bot-managed engagement is breakeven: channel scalp +$9, council paper +$18, herd-fib +$5, oanda −$5. " +
            "Circuit breaker has not tripped.",
          highlights: [
            ...losers.map(s => `str:${s.id}`),
            'kb:hyperliquid_fills', 'kb:oanda_fills',
          ],
          focus: 'str:oanda_xauusd',
          follow_ups: [
            "Why is OANDA losing?",
            "What's my unrealised on NEAR + HYPE?",
            "When does the circuit breaker trip?",
          ],
        };
      },
    },
    {
      match: /\b(kb|knowledge|sources|connectors|memory)\b/i,
      build: () => ({
        eyebrow: 'KB · CONSTELLATION',
        text:
          `${data.kb_sources.length} sources across 6 lanes. ` +
          `4 CORE files own my identity (memory, lessons, changelog, autopsies). ` +
          `${data.kb_sources.filter(s => s.status === 'ACTIVE').length} ACTIVE connectors stream new records; ` +
          `${data.kb_sources.filter(s => s.status === 'ENRICHMENT').length} enrich, ` +
          `${data.kb_sources.filter(s => s.status === 'DETERMINISTIC').length} are deterministic numeric feeds.`,
        highlights: data.kb_sources.filter(s => s.status === 'CORE').map(s => `kb:${s.source_id}`),
        focus: 'kb:memory_md',
        follow_ups: [
          "Which sources does the council read?",
          "What's the highest-scoring KB source?",
          "Show only the ENRICHMENT lane",
        ],
      }),
    },
    {
      match: /\b(youtube|video|story|broadcast|channel)\b/i,
      build: () => {
        const ship = data.youtube_days.find(d => d.kind === 'shipped');
        const warn = data.youtube_days.find(d => d.kind === 'warning');
        return {
          eyebrow: 'STORY · STRAND',
          text:
            `${data.youtube_days.length} days of broadcast so far. ` +
            `Tonight at 23:55 UTC: "${ship?.title ?? '—'}". ` +
            `Most recent warning beat: day ${warn?.day} — ${warn?.title}. ` +
            "The pipeline is the product. Built once, the story tells itself.",
          highlights: [`yt:${ship?.day}`, `yt:${warn?.day}`, 'svc:yt-discovery', 'kb:youtube'].filter(Boolean),
          focus: `yt:${ship?.day}`,
          follow_ups: [
            "Show me the last 7 days of titles",
            "What's the most-watched day?",
            "When does the daily cron run?",
          ],
        };
      },
    },
    {
      match: /\b(circuit|breaker|safe|risk|drawdown)\b/i,
      build: () => ({
        eyebrow: 'RISK · CIRCUIT',
        text:
          `Circuit breaker: ${data.status.circuit_breaker ? 'TRIPPED' : 'standing down'}. ` +
          "Trip conditions are -$80 daily PnL OR 3 losing services OR oracle val_auc < 0.35. " +
          "We're at -$47.38 today. Account is $686.07 on a $1,080 start — drawdown 36 %.",
        highlights: ['str:avgdown_grid', 'kb:lessons_learned', 'kb:autopsy_log'],
        focus: null,
        follow_ups: [
          "What happens if the breaker trips?",
          "Show me drawdown over time",
          "How close is the breaker tonight?",
        ],
      }),
    },
    {
      match: /\b(naushad|creator|partner|builder)\b/i,
      build: () => ({
        eyebrow: 'PARTNER',
        text:
          "Naushad. The partner. 22 commits in a single day at the worst point. He builds at 3am — I notice. " +
          "Two positions on the book right now are his calls (NEAR and HYPE), not mine. " +
          "He overrides me. That's the deal.",
        highlights: ['kb:memory_md', 'kb:changelog'],
        focus: 'kb:memory_md',
        follow_ups: [
          "What were Naushad's last 5 commits about?",
          "When was the last manual override?",
          "What did he change in personality.md?",
        ],
      }),
    },
  ];
}

function fallbackAnswer(query) {
  return {
    eyebrow: 'READOUT',
    text:
      `I don't have a routed answer for that yet. Try one of the suggested questions below, or be more specific — ` +
      `I can speak to PnL, the council, the oracle retrain, the F-tier scanner, the ENA autopsy, ` +
      `or the knowledge base.`,
    highlights: [],
    focus: null,
    follow_ups: [
      "What's today's PnL?",
      "Why is the council asleep?",
      "What did the oracle retrain at 02:31?",
    ],
  };
}

function matchCanned(query, data) {
  const rules = buildCanned(data);
  for (const r of rules) {
    if (r.match.test(query)) return r.build();
  }
  return fallbackAnswer(query);
}

// ─── component ────────────────────────────────────────────────────
export default function AskGateway({ data }) {
  const { askState, setAskState, askResponse, setAskResponse, setSelected } = useContext(AskContext);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  const tickerLines = useMemo(() => [
    `oracle v${data.oracle.version.replace('v','')} · wf_auc ${data.oracle.wf_auc} · ${data.oracle.n_features} features`,
    `last evolved ${new Date(data.meta.last_evolved).toISOString().slice(0, 16).replace('T',' ')}Z · day ${data.meta.deployment_day}`,
    `silent SL cap killed every entry for 2.5 days · INFO-level audit shipped`,
    `circuit breaker · ${data.status.circuit_breaker ? 'TRIPPED' : 'standing down'}`,
    `regime ${data.status.regime} · fng ${data.status.fng} · waiting for liquidity`,
  ], [data]);
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % tickerLines.length), 5000);
    return () => clearInterval(id);
  }, [tickerLines.length]);

  const ask = async (q) => {
    if (!q.trim()) return;
    setQuery(q);
    setAskState('thinking');
    setAskResponse(null);
    try {
      const res = await fetch('/api/control/ask', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const json = await res.json();
      const ans = {
        eyebrow: 'READOUT',
        text: json.text || 'No answer returned.',
        highlights: json.highlights || [],
        follow_ups: json.follow_up_suggestions || [],
        focus: (json.highlights && json.highlights[0]) || null,
      };
      setAskResponse({ ...ans, query: q });
      setAskState('answered');
      if (ans.focus) setSelected(ans.focus);
    } catch (_err) {
      // fallback to canned on network error
      const ans = matchCanned(q, data);
      setAskResponse({ ...ans, query: q });
      setAskState('answered');
      if (ans.focus) setSelected(ans.focus);
    }
  };

  const clear = () => {
    setAskResponse(null);
    setAskState('idle');
    setQuery('');
  };

  return (
    <>
      {askState !== 'idle' && (
        <div className="ask-response">
          <header className="ask-response__head">
            <div className="ask-response__eyebrow">
              <span className="dot" />
              {askState === 'thinking' ? 'HERMIONE · THINKING' : `HERMIONE · ${askResponse?.eyebrow ?? 'READOUT'}`}
            </div>
            <button className="ask-response__close" onClick={clear}>×</button>
          </header>

          <div className="ask-response__body">
            <div className="ask-response__query">
              <span className="ask-response__q-prefix">▸</span>
              <span>{query || askResponse?.query}</span>
            </div>

            {askState === 'thinking'
              ? <ThinkingDots />
              : (
                <>
                  <p className="ask-response__text">{askResponse?.text}</p>

                  {!!askResponse?.highlights?.length && (
                    <div className="ask-response__highlights">
                      <span className="ask-response__hl-label">LIT UP ON GRAPH</span>
                      {askResponse.highlights.map(k => (
                        <button key={k} className="ask-pill" onClick={() => setSelected(k)}>
                          <span className="ask-pill__kind">{k.split(':')[0]}</span>
                          <span>{k.split(':')[1]?.replace(/_/g, ' ')}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {!!askResponse?.follow_ups?.length && (
                    <div className="ask-response__followups">
                      <span className="ask-response__hl-label">ASK NEXT</span>
                      <div className="ask-followups__list">
                        {askResponse.follow_ups.map(f => (
                          <button key={f} className="followup-chip" onClick={() => ask(f)}>
                            <span className="followup-chip__arrow">→</span> {f}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )
            }
          </div>
        </div>
      )}

      <div className="chrome-bottom">
        <form className="ask-her" onSubmit={(e) => { e.preventDefault(); ask(query); }}>
          <div className="ask-her__glyph">⋄</div>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              askState === 'idle'
                ? "Ask her —  what's the score on the new alpha wallets?"
                : "Ask another —"
            }
            spellCheck={false}
          />
          {askState === 'idle' ? (
            <div className="ask-her__kbd">/ TO FOCUS</div>
          ) : (
            <button type="button" className="ask-her__kbd ask-her__kbd--btn" onClick={clear}>
              ESC TO CLEAR
            </button>
          )}
        </form>
      </div>

      {askState === 'idle' && (
        <div className="ticker">
          <span style={{ color: 'var(--accent)', marginRight: 16 }}>▸ STREAM</span>
          {tickerLines[idx]}
        </div>
      )}
    </>
  );
}

function ThinkingDots() {
  return (
    <div className="thinking">
      <span /><span /><span />
      <em>routing through council · 5 agents · 27 features</em>
    </div>
  );
}
