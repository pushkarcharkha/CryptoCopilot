import React from 'react';
import type { TraderSignal } from '../types';
import { useCryptoPrices } from '../hooks/useCrypto';

interface SignalFeedProps {
    onSignalClick: (signal: TraderSignal) => void;
    onAnalyzeClick: (signal: TraderSignal) => void;
}

const MOCK_TRADERS: TraderSignal[] = [
    {
        id: '1',
        name: 'AlphaWolf',
        avatar: '🐺',
        signal: '🚀 Long SOL',
        coin: 'SOL',
        direction: 'Long',
        entry: 92,
        tp: 105,
        winRate: 74,
        totalSignals: 312,
        verified: true,
    },
    {
        id: '2',
        name: 'CryptoSage',
        avatar: '🧙',
        signal: '📈 Long ETH ',
        coin: 'ETH',
        direction: 'Long',
        entry: 2160,
        tp: 2650,
        winRate: 68,
        totalSignals: 487,
        verified: true,
    },
    {
        id: '3',
        name: 'WhaleTracks',
        avatar: '🐋',
        signal: '⚡ Short BTC ',
        coin: 'BTC',
        direction: 'Short',
        entry: 70500,
        tp: 68000,
        winRate: 61,
        totalSignals: 195,
        verified: true,
    },
    {
        id: '4',
        name: 'DeFiDragon',
        avatar: '🐉',
        signal: '🔥 Long LINK',
        coin: 'LINK',
        direction: 'Long',
        entry: 9.5,
        tp: 18.5,
        winRate: 71,
        totalSignals: 256,
        verified: true,
    },
    {
        id: '5',
        name: 'MoonRider',
        avatar: '🚀',
        signal: '🟢 Long ADA ',
        coin: 'ADA',
        direction: 'Long',
        entry: 0.38,
        tp: 1.1,
        winRate: 66,
        totalSignals: 354,
        verified: true,
    },
    {
        id: '6',
        name: 'VoltaEdge',
        avatar: '⚡',
        signal: '🔴 Short AVAX ',
        coin: 'AVAX',
        direction: 'Short',
        entry: 10.2,
        tp: 6.8,
        winRate: 70,
        totalSignals: 280,
        verified: false,
    },
    {
        id: '7',
        name: 'ChainMaster',
        avatar: '🔗',
        signal: '🟢 Long LINK ',
        coin: 'LINK',
        direction: 'Long',
        entry: 13.8,
        tp: 17.5,
        winRate: 74,
        totalSignals: 621,
        verified: true,
    },
    {
        id: '8',
        name: 'FuturePulse',
        avatar: '📈',
        signal: '⚠️ Short DOT ',
        coin: 'DOT',
        direction: 'Short',
        entry: 5.75,
        tp: 4.9,
        winRate: 63,
        totalSignals: 190,
        verified: true,
    },
];

const SYMBOL_TO_ID: Record<string, string> = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    SOL: 'solana',
    ADA: 'cardano',
    LINK: 'chainlink',
    AVAX: 'avalanche-2',
    DOT: 'polkadot',
    BNB: 'binancecoin',
};

const SignalFeed: React.FC<SignalFeedProps> = ({ onSignalClick, onAnalyzeClick }) => {
    const { prices, isLoading } = useCryptoPrices(Object.values(SYMBOL_TO_ID));

    const enrichedSignals = MOCK_TRADERS.map((trader) => {
        const signalSymbol = trader.coin.toUpperCase();
        const priceObj = prices.find((p) => p.symbol.toUpperCase() === signalSymbol);
        return {
            ...trader,
            currentPrice: priceObj?.price ?? trader.entry,
            change24h: priceObj?.change24h ?? 0,
        };
    });

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
                    WebkitOverflowScrolling: 'touch',
                    scrollBehavior: 'smooth',
                    overscrollBehaviorY: 'contain',
                    touchAction: 'pan-y',
                    willChange: 'transform',
                    padding: '20px 24px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                    gap: '16px',
                    alignContent: 'start',
                }}
            >
                {isLoading && (
                    <div style={{ gridColumn: '1 / -1', color: 'var(--text-muted)', marginBottom: '12px' }}>
                        Fetching live prices...
                    </div>
                )}
                {enrichedSignals.map((trader) => {
                    const isLong = trader.direction === 'Long';
                    return (
                        <div
                            key={trader.id}
                            className={`glass-card signal-card ${isLong ? 'long' : 'short'}`}
                            style={{
                                padding: '20px',
                                cursor: 'pointer',
                            }}
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

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <div>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginRight: '6px' }}>Current</span>
                                    <strong style={{ color: '#e2e8f0' }}>${trader.currentPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                </div>
                                <span
                                    style={{
                                        borderRadius: '999px',
                                        padding: '4px 8px',
                                        background: trader.change24h && trader.change24h >= 0 ? 'rgba(0,255,136,0.14)' : 'rgba(255,51,102,0.15)',
                                        color: trader.change24h && trader.change24h >= 0 ? '#00ff88' : '#ff3366',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                    }}
                                >
                                    {trader.change24h !== undefined
                                        ? `${trader.change24h >= 0 ? '▲' : '▼'} ${Math.abs(trader.change24h).toFixed(2)}%`
                                        : '--'}
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
                                    display : "flex",
                                    alignItems : "center",
                                    justifyContent : "center",
                                    textAlign : "center",
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
                                    onAnalyzeClick(trader);
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
                    );
                })}
            </div>
        </div>
    );
};

export default SignalFeed;
