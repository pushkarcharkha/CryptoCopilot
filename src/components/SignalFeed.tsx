import React from 'react';
import type { TraderSignal } from '../types';

interface SignalFeedProps {
  onSignalClick: (signal: TraderSignal) => void;
}

const MOCK_TRADERS: TraderSignal[] = [
  {
    id: '1',
    name: 'AlphaWolf',
    avatar: '🐺',
    signal: '🚀 Long SOL at $142 — TP1: $165, TP2: $195, SL: $128',
    coin: 'SOL',
    direction: 'Long',
    entry: 142,
    tp: 165,
    winRate: 74,
    totalSignals: 312,
    verified: true,
  },
  {
    id: '2',
    name: 'CryptoSage',
    avatar: '🧙',
    signal: '📈 Long ETH at $2,180 — TP: $2,650, SL: $1,980. ETH/BTC ratio breakout.',
    coin: 'ETH',
    direction: 'Long',
    entry: 2180,
    tp: 2650,
    winRate: 68,
    totalSignals: 487,
    verified: true,
  },
  {
    id: '3',
    name: 'WhaleTracks',
    avatar: '🐋',
    signal: '⚡ Short BTC at $94,500 — TP: $88,000, SL: $97,200. Bearish divergence on 4H.',
    coin: 'BTC',
    direction: 'Short',
    entry: 94500,
    tp: 88000,
    winRate: 61,
    totalSignals: 195,
    verified: true,
  },
  {
    id: '4',
    name: 'DeFiDragon',
    avatar: '🐉',
    signal: '🔥 Long LINK at $14.2 — TP: $18.5. Chainlink oracle expansion catalyst.',
    coin: 'LINK',
    direction: 'Long',
    entry: 14.2,
    tp: 18.5,
    winRate: 71,
    totalSignals: 256,
    verified: true,
  },
];

const SignalFeed: React.FC<SignalFeedProps> = ({ onSignalClick }) => {
  return (
    <div
      style={{
        flex: 1,
        background: 'var(--bg-primary)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div>
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '18px', color: '#e2e8f0' }}>
            📡 Verified Trader Signals
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            AI-verified signals from top traders · Updated in real-time
          </p>
        </div>
        <div
          style={{
            padding: '6px 12px',
            background: 'rgba(0,255,136,0.1)',
            border: '1px solid rgba(0,255,136,0.25)',
            borderRadius: '20px',
            fontSize: '11px',
            color: '#00ff88',
            fontWeight: 600,
          }}
        >
          ● LIVE
        </div>
      </div>

      {/* Signals Grid */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '16px',
          alignContent: 'start',
        }}
      >
        {MOCK_TRADERS.map((trader) => (
          <div
            key={trader.id}
            className="glass-card"
            style={{ padding: '20px', cursor: 'pointer' }}
            onClick={() => onSignalClick(trader)}
          >
            {/* Trader header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(139,92,246,0.2))',
                  border: '1px solid rgba(0,212,255,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  flexShrink: 0,
                }}
              >
                {trader.avatar}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px', color: '#e2e8f0' }}>{trader.name}</span>
                  {trader.verified && (
                    <span className="badge badge-verified" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      ✓ AI Verified
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '3px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Win Rate: <strong style={{ color: '#00d4ff' }}>{trader.winRate}%</strong>
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Signals: <strong style={{ color: '#e2e8f0' }}>{trader.totalSignals}</strong>
                  </span>
                </div>
              </div>
              <span
                className={trader.direction === 'Long' ? 'badge badge-buy' : 'badge badge-sell'}
                style={{ fontSize: '11px', padding: '4px 10px' }}
              >
                {trader.direction === 'Long' ? '▲ LONG' : '▼ SHORT'}
              </span>
            </div>

            {/* Signal text */}
            <div
              style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '13px',
                color: '#cbd5e1',
                lineHeight: 1.5,
                marginBottom: '14px',
              }}
            >
              {trader.signal}
            </div>

            {/* Trade details */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              {[
                { label: 'Entry', value: `$${trader.entry.toLocaleString()}`, color: '#00d4ff' },
                { label: 'Target', value: `$${trader.tp.toLocaleString()}`, color: '#00ff88' },
                { label: 'R/R', value: `${(Math.abs(trader.tp - trader.entry) / (trader.entry * 0.05)).toFixed(1)}x`, color: '#8b5cf6' },
              ].map((d) => (
                <div
                  key={d.label}
                  style={{
                    flex: 1,
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '8px',
                    padding: '8px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px' }}>{d.label}</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: d.color, fontFamily: 'JetBrains Mono, monospace' }}>
                    {d.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Analyze button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSignalClick(trader);
              }}
              style={{
                width: '100%',
                padding: '10px',
                background: 'linear-gradient(135deg, rgba(0,212,255,0.1), rgba(139,92,246,0.1))',
                border: '1px solid rgba(0,212,255,0.2)',
                borderRadius: '8px',
                color: '#00d4ff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'Inter, sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(139,92,246,0.2))';
                e.currentTarget.style.borderColor = 'rgba(0,212,255,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,212,255,0.1), rgba(139,92,246,0.1))';
                e.currentTarget.style.borderColor = 'rgba(0,212,255,0.2)';
              }}
            >
              🤖 Analyze This Signal with AI →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SignalFeed;
