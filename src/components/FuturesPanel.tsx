import React from 'react';
import type { FuturesPosition } from '../types';

interface FuturesPanelProps {
  balance: number;
  positions: FuturesPosition[];
  prices: Record<string, { usd: number }> | null;
  onClosePosition: (positionId: number, currentPrice: number) => void;
}

const FuturesPanel: React.FC<FuturesPanelProps> = ({
  balance,
  positions,
  prices,
  onClosePosition,
}) => {
  const openPositions = positions.filter(p => p.status === 'open');
  const closedPositions = positions.filter(p => p.status !== 'open').sort((a, b) => (b.closedAt || 0) - (a.closedAt || 0));

  const marginUsed = openPositions.reduce((sum, p) => sum + p.margin, 0);
  
  // Calculate total PnL
  const totalPnL = positions.reduce((sum, p) => {
    if (p.status === 'open') {
      const currentPrice = prices?.[p.coinId]?.usd || p.entryPrice;
      const priceChange = currentPrice - p.entryPrice;
      const priceChangePercent = priceChange / p.entryPrice;
      let pnl;
      if (p.direction === 'long') {
        pnl = p.size * priceChangePercent * p.leverage;
      } else {
        pnl = p.size * (-priceChangePercent) * p.leverage;
      }
      return sum + pnl;
    } else {
      return sum + (p.pnl || 0);
    }
  }, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Account Summary */}
      <div className="glass-card" style={{ padding: '16px', border: '1px solid rgba(0, 212, 255, 0.2)' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>
          Paper Futures Account
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Balance</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0' }}>${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Total PnL</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: totalPnL >= 0 ? '#10b981' : '#ef4444' }}>
              {totalPnL >= 0 ? '+' : '-'}${Math.abs(totalPnL).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Margin Used</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>${marginUsed.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Available</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#00d4ff' }}>${(balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      </div>

      {/* Open Positions */}
      <div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
          <span>Open Positions</span>
          <span style={{ color: 'var(--text-muted)' }}>{openPositions.length}</span>
        </div>
        {openPositions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
            No open positions. Try "long BTC 10x $100"
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {openPositions.map(pos => {
              const currentPrice = prices?.[pos.coinId]?.usd || pos.entryPrice;
              const priceChange = currentPrice - pos.entryPrice;
              const priceChangePercent = priceChange / pos.entryPrice;
              let pnl;
              if (pos.direction === 'long') {
                pnl = pos.size * priceChangePercent * pos.leverage;
              } else {
                pnl = pos.size * (-priceChangePercent) * pos.leverage;
              }
              const pnlPercent = (pnl / pos.margin) * 100;
              const isCloseToLiq = pos.direction === 'long' 
                ? (currentPrice - pos.liquidationPrice) / pos.entryPrice < 0.05
                : (pos.liquidationPrice - currentPrice) / pos.entryPrice < 0.05;

              return (
                <div key={pos.id} className="glass-card" style={{ 
                  padding: '12px', 
                  borderLeft: `3px solid ${pos.direction === 'long' ? '#10b981' : '#ef4444'}`,
                  position: 'relative'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ 
                        fontSize: '11px', 
                        fontWeight: 700, 
                        color: pos.direction === 'long' ? '#10b981' : '#ef4444',
                        background: pos.direction === 'long' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>
                        {pos.direction.toUpperCase()} {pos.leverage}x
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '14px' }}>{pos.coin}</span>
                      {isCloseToLiq && <span title="Close to liquidation!" style={{ fontSize: '14px' }}>⚠️</span>}
                    </div>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: 700, 
                      color: pnl >= 0 ? '#10b981' : '#ef4444',
                      fontFamily: 'JetBrains Mono'
                    }}>
                      {pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <div>
                      Entry: <span style={{ color: '#e2e8f0' }}>${pos.entryPrice.toLocaleString()}</span>
                    </div>
                    <div>
                      Current: <span style={{ color: '#e2e8f0' }}>${currentPrice.toLocaleString()}</span>
                    </div>
                    <div>
                      Liq Price: <span style={{ color: pos.direction === 'long' ? '#ef4444' : '#10b981' }}>${pos.liquidationPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div>
                      PnL: <span style={{ color: pnl >= 0 ? '#10b981' : '#ef4444' }}>{pnl >= 0 ? '+' : '-'}${Math.abs(pnl).toFixed(2)}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => onClosePosition(pos.id, currentPrice)}
                    style={{ 
                      width: '100%', 
                      marginTop: '10px', 
                      padding: '6px', 
                      background: 'rgba(255,255,255,0.05)', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '6px',
                      color: '#e2e8f0',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Close Position
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* History */}
      <div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
          History
        </div>
        {closedPositions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '11px' }}>
            No history yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {closedPositions.slice(0, 5).map(pos => (
              <div key={pos.id} style={{ 
                padding: '10px', 
                background: 'rgba(255,255,255,0.02)', 
                borderRadius: '8px',
                fontSize: '11px',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>{pos.direction.toUpperCase()} {pos.coin} {pos.leverage}x</span>
                  <span style={{ color: (pos.pnl || 0) >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                    {(pos.pnl || 0) >= 0 ? '+' : ''}${(pos.pnl || 0).toFixed(2)}
                  </span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                  {pos.status === 'liquidated' ? 'Liquidated' : 'Closed'} at ${pos.exitPrice?.toLocaleString()} · {new Date(pos.closedAt || 0).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FuturesPanel;
