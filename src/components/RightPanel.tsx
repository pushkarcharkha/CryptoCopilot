import React from 'react';
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { CryptoPrice, RightPanelView, WalletState, TransactionPreview, SwapPreview, AppTransaction, CoinGeckoCoin, NewsArticle, FearGreedData, FuturesPosition } from '../types';
import NewsSentimentPanel from './NewsSentimentPanel';
import FuturesPanel from './FuturesPanel';
import { TechnicalAnalysisChart } from './TechnicalAnalysisChart';

interface RightPanelProps {
  view: RightPanelView;
  prices: CryptoPrice[];
  pricesLoading: boolean;
  wallet: WalletState;
  transactionPreview?: TransactionPreview | null;
  swapPreview?: SwapPreview | null;
  contacts?: Record<string, string>;
  onContactSendClick?: (name: string) => void;
  onContactDeleteClick?: (name: string) => void;
  onConfirmTransactionClick?: () => void;
  onConfirmSwapClick?: () => void;
  onSwitchNetwork?: (targetChainId: number) => Promise<void>;
  history?: AppTransaction[];
  allCoins?: CoinGeckoCoin[];
  watchlistCoins?: CoinGeckoCoin[];
  onToggleWatchlist?: (coinId: string) => void;
  isInWatchlist?: (coinId: string) => boolean;
  watchlistLoading?: boolean;
  watchlistLastUpdated?: number;
  onCoinClick?: (coin: CoinGeckoCoin) => void;
  onBackToWatchlist?: () => void;
  activeCoin?: CoinGeckoCoin | null;
  onAnalysisComplete?: (stats: any) => void;
  newsData?: NewsArticle[];
  panicNewsData?: NewsArticle[];
  fearGreedData?: FearGreedData[];
  newsLoading?: boolean;
  newsError?: string | null;
  newsLastUpdated?: number | null;
  cryptoPanicToken?: string;
  futuresBalance?: number;
  futuresPositions?: FuturesPosition[];
  onCloseFuturesPosition?: (id: number, currentPrice: number) => void;
  futuresPrices?: Record<string, { usd: number }> | null;
}

function formatPrice(n: number | null | undefined) {
  if (n === null || n === undefined) return '$0.00';
  if (n >= 1000) return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

function formatChange(n: number | null | undefined) {
  if (n === null || n === undefined) return '0.00%';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  const width = 60;
  const height = 24;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d - min) / (range || 1)) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

const RightPanel: React.FC<RightPanelProps> = ({
  view,
  prices,
  pricesLoading,
  wallet,
  transactionPreview,
  swapPreview,
  contacts = {},
  onContactSendClick,
  onContactDeleteClick,
  onConfirmTransactionClick,
  onConfirmSwapClick,
  history = [],
  allCoins = [],
  watchlistCoins = [],
  onToggleWatchlist,
  isInWatchlist,
  watchlistLoading,
  watchlistLastUpdated,
  onCoinClick,
  onBackToWatchlist,
  activeCoin,
  onAnalysisComplete,
  newsData = [],
  panicNewsData = [],
  fearGreedData = [],
  newsLoading,
  futuresBalance,
  futuresPositions,
  onCloseFuturesPosition,
  futuresPrices,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [watchlistTab, setWatchlistTab] = React.useState<'my' | 'all'>('my');

  const holdingsWithValues = (wallet.holdings || []).map((h) => {
    const priceObj = prices.find((p) => p.symbol.toLowerCase() === h.symbol.toLowerCase());
    const val = priceObj ? h.amount * priceObj.price : 0;
    return { ...h, valueUsd: val };
  });

  const totalPortfolioValue = holdingsWithValues.reduce((sum, h) => sum + h.valueUsd, 0);

  // History Filtering Logic
  const filteredHistory = history.filter(tx => {
    if (searchQuery === '') return true;
    const q = searchQuery.toLowerCase();
    return (
      tx.fromToken.toLowerCase().includes(q) ||
      (tx.toToken && tx.toToken.toLowerCase().includes(q)) ||
      (tx.contactName && tx.contactName.toLowerCase().includes(q)) ||
      (tx.toAddress && tx.toAddress.toLowerCase().includes(q))
    );
  });

  return (
    <div
      className="right-panel-container"
      style={{
        width: '400px',
        background: 'var(--bg-panel)',
        borderLeft: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 5,
      }}
    >
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* ===== PRICES VIEW ===== */}
        {view === 'prices' && (
          <div className="panel-content fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>Markets</h2>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px' }}>
                LIVE
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pricesLoading && prices.length === 0 ? (
                [1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="skeleton" style={{ height: '64px', borderRadius: '12px' }} />
                ))
              ) : (
                prices.map((coin) => (
                  <div key={coin.id} className="glass-card market-row" style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '20px' }}>{coin.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 600, fontSize: '14px' }}>{coin.symbol}</span>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', color: '#00d4ff' }}>
                            {formatPrice(coin.price)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{coin.name}</span>
                          <span style={{ 
                            fontSize: '11px', 
                            fontWeight: 600,
                            color: coin.change24h >= 0 ? '#10b981' : '#ef4444' 
                          }}>
                            {formatChange(coin.change24h)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ===== PORTFOLIO VIEW ===== */}
        {view === 'portfolio' && (
          <div className="panel-content fade-in">
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', marginBottom: '20px' }}>Portfolio</h2>
            
            <div style={{ height: '220px', position: 'relative', marginBottom: '20px' }}>
              {holdingsWithValues.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={holdingsWithValues}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="valueUsd"
                    >
                      {holdingsWithValues.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ background: '#1a1a2e', border: '1px solid var(--border-subtle)', borderRadius: '8px', fontSize: '12px' }} 
                      itemStyle={{ color: '#fff' }}
                      formatter={(val: any) => `$${Number(val).toLocaleString()}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No assets to display
                </div>
              )}
            </div>

            {/* Total */}
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Value</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#00d4ff', fontFamily: 'JetBrains Mono, monospace' }}>
                ${totalPortfolioValue.toLocaleString()}
              </div>
            </div>

            {/* Holdings */}
            {wallet.isConnected ? (
              holdingsWithValues.length > 0 ? (
                holdingsWithValues.map((h) => (
                  <div key={h.symbol} className="glass-card" style={{ padding: '10px 14px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: h.color, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 600, fontSize: '13px' }}>{h.symbol}</span>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: '#00d4ff' }}>
                            ${h.valueUsd.toLocaleString()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{h.amount.toFixed(4)} {h.symbol}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {totalPortfolioValue > 0 ? ((h.valueUsd / totalPortfolioValue) * 100).toFixed(1) : '0'}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0' }}>
                  No holdings found in this wallet.
                </div>
              )
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0' }}>
                Connect your wallet to see your portfolio.
              </div>
            )}
          </div>
        )}

        {/* ===== COIN CHART VIEW (TRADINGVIEW) ===== */}
        {view === 'coin-chart' && activeCoin && (
          <div className="panel-content fade-in">
            <div className="glass-card" style={{ padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <img src={activeCoin.image} alt={activeCoin.name} style={{ width: '32px', height: '32px' }} />
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0' }}>{activeCoin.name} ({activeCoin.symbol.toUpperCase()})</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#00d4ff' }}>{formatPrice(activeCoin.current_price)}</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: (activeCoin.price_change_percentage_24h || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                      {formatChange(activeCoin.price_change_percentage_24h)}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ height: '420px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '16px' }}>
                <TechnicalAnalysisChart 
                  coinId={activeCoin.id} 
                  coinSymbol={activeCoin.symbol}
                  onAnalysisComplete={onAnalysisComplete}
                />
              </div>

              <button 
                onClick={onBackToWatchlist}
                className="btn-secondary"
                style={{ width: '100%', marginBottom: '12px' }}
              >
                ← Back to Watchlist
              </button>

              <button
                onClick={() => onToggleWatchlist?.(activeCoin.id)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  background: (activeCoin && isInWatchlist?.(activeCoin.id)) ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                  border: `1px solid ${(activeCoin && isInWatchlist?.(activeCoin.id)) ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                  color: (activeCoin && isInWatchlist?.(activeCoin.id)) ? '#ef4444' : '#10b981',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                {(activeCoin && isInWatchlist?.(activeCoin.id)) ? '✕ Remove from Watchlist' : '+ Add to Watchlist'}
              </button>
            </div>
          </div>
        )}

        {/* ===== TRANSACTION VIEW ===== */}
        {view === 'transaction' && (
          <div className="panel-content fade-in">
            <div className="glass-card" style={{ padding: '16px', marginBottom: '12px', borderColor: 'rgba(0,212,255,0.2)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 600 }}>
                💸 SEND PREVIEW
              </div>
              {[
                { label: 'From', value: wallet.isConnected && wallet.address ? wallet.address : 'Not connected' },
                { label: 'To', value: transactionPreview ? transactionPreview.address : 'N/A' },
                { label: 'Recipient', value: transactionPreview ? transactionPreview.recipientName : 'N/A' },
                { label: 'Amount', value: transactionPreview ? `${transactionPreview.amount} ${transactionPreview.coin}` : '0.00' },
                { label: 'Gas (est.)', value: transactionPreview ? transactionPreview.estimatedGas : 'Low' },
                { label: 'Network', value: transactionPreview?.networkName || wallet.networkName || 'Ethereum' },
              ].map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: 'flex',
                    flexDirection: row.label === 'To' || row.label === 'From' ? 'column' : 'row',
                    justifyContent: 'space-between',
                    alignItems: row.label === 'To' || row.label === 'From' ? 'flex-start' : 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid var(--border-subtle)',
                    fontSize: '13px',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)', marginBottom: row.label === 'To' || row.label === 'From' ? '4px' : '0' }}>{row.label}</span>
                  <span style={{ 
                    color: '#e2e8f0', 
                    fontFamily: 'JetBrains Mono, monospace', 
                    fontSize: '12px',
                    wordBreak: 'break-all',
                    textAlign: row.label === 'To' || row.label === 'From' ? 'left' : 'right',
                    width: row.label === 'To' || row.label === 'From' ? '100%' : 'auto'
                  }}>{row.value}</span>
                </div>
              ))}
              <button
                onClick={onConfirmTransactionClick}
                style={{
                  marginTop: '12px',
                  width: '100%',
                  padding: '10px',
                  background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(139,92,246,0.2))',
                  border: '1px solid rgba(0,212,255,0.3)',
                  borderRadius: '10px',
                  color: '#00d4ff',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 15px rgba(0,212,255,0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
              >
                Confirm Transaction →
              </button>
            </div>

            <div
              style={{
                padding: '12px',
                background: 'rgba(255,68,102,0.05)',
                border: '1px solid rgba(255,68,102,0.15)',
                borderRadius: '10px',
                fontSize: '12px',
                color: '#ff4466',
              }}
            >
              ⚠️ Always verify the recipient address before confirming any transaction.
            </div>
          </div>
        )}

        {/* ===== SWAP VIEW ===== */}
        {view === 'swap' && (
          <div className="panel-content fade-in">
            <div className="glass-card" style={{ padding: '16px', marginBottom: '12px', borderColor: 'rgba(139,92,246,0.2)' }}>
              <div style={{ fontSize: '11px', color: '#8b5cf6', marginBottom: '10px', fontWeight: 600 }}>
                🥞 PANCAKESWAP PREVIEW
              </div>
              {[
                { label: 'From', value: swapPreview ? `${swapPreview.fromAmount} ${swapPreview.fromToken}` : 'N/A' },
                { label: 'To (est.)', value: swapPreview ? `${parseFloat(swapPreview.toAmount).toFixed(6)} ${swapPreview.toToken}` : 'N/A' },
                { label: 'Rate', value: swapPreview ? swapPreview.rate : 'N/A' },
                { label: 'Slippage', value: '1%' },
                { label: 'Gas (est.)', value: swapPreview ? swapPreview.estimatedGas : 'Low' },
                { label: 'Network', value: 'BNB Smart Chain' },
              ].map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid var(--border-subtle)',
                    fontSize: '13px',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                  <span style={{ color: '#e2e8f0', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}>{row.value}</span>
                </div>
              ))}
              <button
                onClick={onConfirmSwapClick}
                style={{
                  marginTop: '12px',
                  width: '100%',
                  padding: '10px',
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(0,212,255,0.2))',
                  border: '1px solid rgba(139,92,246,0.3)',
                  borderRadius: '10px',
                  color: '#8b5cf6',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 15px rgba(139,92,246,0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
              >
                Confirm Swap →
              </button>
            </div>
            <div
              style={{
                padding: '12px',
                background: 'rgba(139,92,246,0.05)',
                border: '1px solid rgba(139,92,246,0.15)',
                borderRadius: '10px',
                fontSize: '12px',
                color: '#8b5cf6',
              }}
            >
              ⚠️ Swaps are executed via PancakeSwap v3 on BNB Smart Chain.
            </div>
          </div>
        )}

        {/* ===== CONTACTS VIEW ===== */}
        {view === 'contacts' && (
          <div className="panel-content fade-in">
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', marginBottom: '16px' }}>Address Book</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.keys(contacts).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>👤</div>
                  <div style={{ fontSize: '14px' }}>No contacts saved yet.</div>
                  <div style={{ fontSize: '11px', marginTop: '4px' }}>Say "add [name] [address]" to save one.</div>
                </div>
              ) : (
                Object.entries(contacts).map(([name, address]) => (
                  <div key={address} className="glass-card" style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: '#e2e8f0' }}>{name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: '2px' }}>
                          {address.slice(0, 10)}...{address.slice(-8)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => onContactSendClick?.(name)}
                          style={{ padding: '6px', borderRadius: '6px', background: 'rgba(0,212,255,0.1)', border: 'none', cursor: 'pointer', color: 'var(--accent-cyan)' }}
                          title="Send to this contact"
                        >
                          💸
                        </button>
                        <button 
                          onClick={() => onContactDeleteClick?.(name)}
                          style={{ padding: '6px', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                          title="Delete contact"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ===== WATCHLIST VIEW ===== */}
        {view === 'watchlist' && (
          <div className="panel-content fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', marginBottom: '16px' }}>Watchlist</h2>
            
            <div style={{ marginBottom: '16px', position: 'relative' }}>
              <input 
                type="text" 
                placeholder="Search assets..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-subtle)',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>🔍</span>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <button
                onClick={() => setWatchlistTab('my')}
                style={{
                  flex: 1,
                  padding: '6px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: watchlistTab === 'my' ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
                  border: 'none',
                  color: watchlistTab === 'my' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
              >
                My Portfolio
              </button>
              <button
                onClick={() => setWatchlistTab('all')}
                style={{
                  flex: 1,
                  padding: '6px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: watchlistTab === 'all' ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
                  border: 'none',
                  color: watchlistTab === 'all' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
              >
                All Coins
              </button>
            </div>

            {/* Last Updated */}
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '12px', textAlign: 'right', fontFamily: 'JetBrains Mono' }}>
              {watchlistLastUpdated ? `Last updated: ${Math.floor((Date.now() - watchlistLastUpdated) / 1000)}s ago` : 'Refreshing...'}
            </div>

            {/* Coin List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {watchlistLoading && allCoins.length === 0 ? (
                [1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="skeleton" style={{ height: '60px', borderRadius: '12px' }} />
                ))
              ) : (
                (watchlistTab === 'my' ? watchlistCoins : allCoins)
                  .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.symbol.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((coin) => (
                    <div 
                      key={coin.id} 
                      className="glass-card" 
                      style={{ 
                        padding: '12px', 
                        cursor: 'pointer', 
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}
                      onClick={() => onCoinClick?.(coin)}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                    >
                      <img src={coin.image} alt={coin.name} style={{ width: '28px', height: '28px' }} />
                      
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, fontSize: '13px', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {coin.name}
                          </span>
                          <Sparkline 
                            data={coin.sparkline_in_7d?.price || []} 
                            color={(coin.price_change_percentage_24h || 0) >= 0 ? '#10b981' : '#ef4444'} 
                          />
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            {coin.symbol}
                          </span>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: '#e2e8f0' }}>
                              ${coin.current_price.toLocaleString()}
                            </span>
                            <span style={{ 
                              fontSize: '10px', 
                              fontWeight: 700,
                              color: coin.price_change_percentage_24h >= 0 ? '#10b981' : '#ef4444'
                            }}>
                              {formatChange(coin.price_change_percentage_24h)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {/* ===== NEWS VIEW ===== */}
        {view === 'news-sentiment' && (
          <NewsSentimentPanel 
            newsData={newsData} 
            panicNewsData={panicNewsData}
            fearGreedData={fearGreedData}
            isLoading={newsLoading}
          />
        )}

        {/* ===== HISTORY VIEW ===== */}
        {view === 'history' && (
          <div className="panel-content fade-in">
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', marginBottom: '16px' }}>Journal</h2>
            
            <div style={{ marginBottom: '16px', position: 'relative' }}>
              <input 
                type="text" 
                placeholder="Search history..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-subtle)',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>🔍</span>
            </div>

            {filteredHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>📖</div>
                <div style={{ fontSize: '14px' }}>No trades recorded.</div>
                <div style={{ fontSize: '11px', marginTop: '4px' }}>Every transfer or swap will appear here.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredHistory.sort((a, b) => b.timestamp - a.timestamp).map((tx) => (
                  <div key={tx.id || tx.hash} className="glass-card" style={{ padding: '12px', borderLeft: `3px solid ${tx.status === 'success' ? '#10b981' : tx.status === 'failed' ? '#ef4444' : '#f59e0b'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '8px', 
                          background: tx.type === 'send' ? 'rgba(0, 212, 255, 0.1)' : tx.type === 'swap' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px'
                        }}>
                          {tx.type === 'send' ? '💸' : tx.type === 'swap' ? '🔄' : '💰'}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>
                            {tx.type === 'send' ? 'Sent Funds' : tx.type === 'swap' ? 'Swapped Assets' : 'Received Funds'}
                          </div>
                          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                            {tx.fromAmount} {tx.fromToken}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {tx.type === 'send' ? `To: ${tx.contactName || tx.toAddress?.slice(0, 6) + '...' + tx.toAddress?.slice(-4)}` : tx.type === 'swap' ? `For: ${tx.toAmount} ${tx.toToken}` : `From: ${tx.toAddress?.slice(0, 6) + '...' + tx.toAddress?.slice(-4)}`}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ 
                          fontSize: '10px', 
                          fontWeight: 700,
                          color: tx.status === 'success' ? '#10b981' : tx.status === 'failed' ? '#ef4444' : '#f59e0b',
                          textTransform: 'uppercase'
                        }}>
                          {tx.status === 'success' ? '✅ Success' : tx.status === 'failed' ? '❌ Failed' : '⏳ Pending'}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {new Date(tx.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', marginTop: '8px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{tx.network || 'BNB Smart Chain'}</span>
                      <a 
                        href={`https://bscscan.com/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '10px', color: 'var(--accent-cyan)', textDecoration: 'none', fontWeight: 600 }}
                      >
                        View on Explorer ↗
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== FUTURES VIEW ===== */}
        {view === 'futures' && (
          <FuturesPanel 
            balance={futuresBalance || 1000} 
            positions={futuresPositions || []} 
            onClosePosition={onCloseFuturesPosition || (() => {})} 
            prices={futuresPrices || {}}
          />
        )}
      </div>

      {/* Refresh indicator */}
      <div
        style={{
          padding: '8px 12px',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '10px',
          color: 'var(--text-muted)',
          textAlign: 'center',
          flexShrink: 0,
          fontFamily: 'JetBrains Mono, monospace',
        }}
      >
        🟢 Live Prices · Binance WS & CoinGecko
      </div>
    </div>
  );
};

export default RightPanel;
