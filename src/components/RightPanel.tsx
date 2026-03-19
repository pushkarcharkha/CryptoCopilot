import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { CryptoPrice, ChartDataPoint, RightPanelView, WalletState, TransactionPreview, SwapPreview, AppTransaction, CoinGeckoCoin, NewsArticle, FearGreedData } from '../types';
import NewsSentimentPanel from './NewsSentimentPanel';

interface RightPanelProps {
  view: RightPanelView;
  prices: CryptoPrice[];
  pricesLoading: boolean;
  chartData: ChartDataPoint[];
  chartLoading: boolean;
  chartCoinName: string;
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
  newsData?: NewsArticle[];
  panicNewsData?: NewsArticle[];
  fearGreedData?: FearGreedData[];
  newsLoading?: boolean;
  newsError?: string | null;
  newsLastUpdated?: number | null;
  cryptoPanicToken?: string;
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

const TradingViewWidget = ({ symbol }: { symbol: string }) => {
  const containerId = "tradingview_chart";
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if ((window as any).TradingView && document.getElementById(containerId)) {
        new (window as any).TradingView.widget({
          container_id: containerId,
          symbol: `BINANCE:${symbol.toUpperCase()}USDT`,
          interval: "1H",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          toolbar_bg: "#111111",
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          height: isExpanded ? 600 : 400,
          width: "100%",
          hide_side_toolbar: false,
          allow_symbol_change: true,
          studies: []
        });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [symbol, isExpanded]);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 10,
          background: 'rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff',
          borderRadius: '4px',
          padding: '4px 8px',
          fontSize: '10px',
          cursor: 'pointer',
          backdropFilter: 'blur(4px)'
        }}
      >
        {isExpanded ? 'Shrink' : 'Expand'}
      </button>
      <div id={containerId} style={{ height: isExpanded ? '600px' : '400px', width: '100%', borderRadius: '12px', overflow: 'hidden' }} />
    </div>
  );
};

const RightPanel: React.FC<RightPanelProps> = ({
  view,
  prices,
  pricesLoading,
  chartData,
  chartLoading,
  chartCoinName,
  wallet,
  transactionPreview,
  swapPreview,
  contacts = {},
  onContactSendClick,
  onContactDeleteClick,
  onConfirmTransactionClick,
  onConfirmSwapClick,
  onSwitchNetwork,
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
  newsData = [],
  panicNewsData = [],
  fearGreedData = [],
  newsLoading = false,
  newsError = null,
  newsLastUpdated = null,
  cryptoPanicToken = '',
}) => {
  const [historyFilter, setHistoryFilter] = React.useState<'all' | 'send' | 'swap' | 'week' | 'month'>('all');
  const [watchlistTab, setWatchlistTab] = React.useState<'my' | 'all'>('my');
  const [searchQuery, setSearchQuery] = React.useState('');

  // Use real wallet holdings
  const holdings = wallet.isConnected ? wallet.holdings : [];

  // Map prices to calculate total value
  const holdingsWithValues = holdings.map(h => {
    const coinPrice = prices.find(p => p.symbol.toLowerCase() === h.symbol.toLowerCase());
    const valueUsd = coinPrice ? h.amount * coinPrice.price : 0;
    return { ...h, valueUsd };
  });

  const totalPortfolioValue = holdingsWithValues.reduce((sum, h) => sum + h.valueUsd, 0);

  const chartMin = chartData.length ? Math.min(...chartData.map((d) => d.price)) * 0.998 : 0;
  const chartMax = chartData.length ? Math.max(...chartData.map((d) => d.price)) * 1.002 : 0;
  const chartTrend = chartData.length >= 2
    ? chartData[chartData.length - 1].price >= chartData[0].price ? 'up' : 'down'
    : 'neutral';

  // History Filtering Logic
  const filteredHistory = history.filter(tx => {
    if (historyFilter === 'all') return true;
    if (historyFilter === 'send') return tx.type === 'send';
    if (historyFilter === 'swap') return tx.type === 'swap';
    
    const txDate = new Date(tx.timestamp);
    const now = new Date();
    if (historyFilter === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return txDate >= oneWeekAgo;
    }
    if (historyFilter === 'month') {
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      return txDate >= oneMonthAgo;
    }
    return true;
  });


  return (
    <div
      style={{
        width: '320px',
        flexShrink: 0,
        background: 'var(--bg-panel)',
        borderLeft: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Panel Header */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#00d4ff',
            boxShadow: '0 0 8px #00d4ff',
          }}
        />
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {view === 'watchlist' && 'Watchlist'}
          {view === 'contacts' && 'Address Book'}
          {view === 'history' && 'Trade Journal'}
          {view === 'news-sentiment' && 'News & Sentiment'}
          {view === 'coin-chart' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                onClick={onBackToWatchlist}
                style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', padding: 0, fontSize: '14px' }}
              >
                ←
              </button>
              {activeCoin?.name || 'Chart'}
            </div>
          )}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
          {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Panel Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>

        {/* ===== PRICES VIEW ===== */}
        {view === 'prices' && (
          <div className="panel-content fade-in">
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Asset</span>
              <span>Price / 24h</span>
            </div>
            {pricesLoading
              ? [1, 2, 3].map((i) => (
                  <div key={i} style={{ marginBottom: '10px' }}>
                    <div className="skeleton" style={{ height: '68px', borderRadius: '12px' }} />
                  </div>
                ))
              : prices.map((coin) => (
                  <div key={coin.id} className="glass-card" style={{ padding: '14px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        className="coin-icon"
                        style={{ background: `${coin.color}22`, color: coin.color, border: `1px solid ${coin.color}44` }}
                      >
                        {coin.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, fontSize: '14px' }}>{coin.symbol}</span>
                          <span
                            style={{
                              fontFamily: 'JetBrains Mono, monospace',
                              fontSize: '14px',
                              fontWeight: 600,
                              color: '#e2e8f0',
                            }}
                          >
                            {formatPrice(coin.price)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{coin.name}</span>
                          <span
                            className={coin.change24h >= 0 ? 'positive' : 'negative'}
                            style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}
                          >
                            {formatChange(coin.change24h)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

            {/* Market pulse */}
            <div
              style={{
                marginTop: '8px',
                padding: '12px',
                background: 'rgba(0,212,255,0.04)',
                border: '1px solid rgba(0,212,255,0.1)',
                borderRadius: '10px',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
                📡 MARKET PULSE
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  { label: 'Fear & Greed', value: '68 — Greed', color: '#f7931a' },
                  { label: 'BTC Dominance', value: '54.2%', color: '#00d4ff' },
                  { label: 'Total Mkt Cap', value: '$2.84T', color: '#00ff88' },
                ].map((item) => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                    <span style={{ color: item.color, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== PORTFOLIO VIEW ===== */}
        {view === 'portfolio' && (
          <div className="panel-content fade-in">
            {/* Portfolio overview card */}
            {wallet.isConnected && (
              <div
                className="glass-card"
                style={{ padding: '14px', marginBottom: '12px', border: '1px solid rgba(0,255,136,0.2)' }}
              >
                <div style={{ fontSize: '11px', color: '#00ff88', fontWeight: 600, marginBottom: '6px' }}>
                   CONNECTED WALLET ({wallet.networkName || 'Unknown Network'})
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  {wallet.address?.slice(0, 10)}...{wallet.address?.slice(-10)}
                </div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: holdings[0]?.color || '#627eea', display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '10px' }}>
                  {wallet.ethBalance} <span style={{ fontSize: '14px', opacity: 0.8 }}>{holdings[0]?.symbol || 'ETH'}</span>
                </div>

                {/* Network Switch Help */}
                {(wallet.networkName?.includes('Ethereum') || wallet.networkName?.includes('Mainnet')) && (
                  <button
                    onClick={() => onSwitchNetwork?.(56)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: 'rgba(243, 186, 47, 0.1)',
                      border: '1px solid rgba(243, 186, 47, 0.3)',
                      borderRadius: '8px',
                      color: '#f3ba2f',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(243, 186, 47, 0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(243, 186, 47, 0.1)'}
                  >
                    Switch to BNB Smart Chain →
                  </button>
                )}
              </div>
            )}

            {/* Pie chart */}
            <div style={{ height: '160px', minHeight: '160px', marginBottom: '12px', position: 'relative' }}>
              {holdingsWithValues.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minHeight={160}>
                  <PieChart>
                    <Pie
                      data={holdingsWithValues}
                      dataKey="valueUsd"
                      nameKey="symbol"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      animationDuration={500}
                    >
                      {holdingsWithValues.map((entry) => (
                        <Cell key={entry.symbol} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Value']}
                      contentStyle={{
                        background: 'rgba(26,26,46,0.95)',
                        border: '1px solid rgba(0,212,255,0.2)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
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

              <TradingViewWidget symbol={activeCoin.symbol} />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {['1H', '4H', '1D', '1W'].map(tf => (
                <button
                  key={tf}
                  style={{
                    flex: 1,
                    padding: '6px',
                    borderRadius: '8px',
                    background: tf === '1H' ? 'rgba(0, 212, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${tf === '1H' ? 'rgba(0, 212, 255, 0.2)' : 'transparent'}`,
                    color: tf === '1H' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {tf}
                </button>
              ))}
            </div>

            <button
              onClick={() => onToggleWatchlist?.(activeCoin.id)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                background: isInWatchlist?.(activeCoin.id) ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                border: `1px solid ${isInWatchlist?.(activeCoin.id) ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                color: isInWatchlist?.(activeCoin.id) ? '#ef4444' : '#10b981',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              {isInWatchlist?.(activeCoin.id) ? '✕ Remove from Watchlist' : '+ Add to Watchlist'}
            </button>
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
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(0,212,255,0.2))',
                  border: '1px solid rgba(139,92,246,0.4)',
                  borderRadius: '10px',
                  color: '#a78bfa',
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
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '0 10px' }}>
              Swaps are executed through PancakeSwap V2 on BNB Chain. Final amount may vary slightly based on price impact.
            </p>
          </div>
        )}


        {/* ===== WATCHLIST VIEW ===== */}
        {view === 'watchlist' && (
          <div className="panel-content fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0 12px 12px' }}>
            {/* Search Bar */}
            <div style={{ padding: '12px 0 8px', position: 'sticky', top: 0, background: 'var(--bg-panel)', zIndex: 10 }}>
              <div className="glass-card" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', borderColor: 'rgba(255,255,255,0.1)' }}>
                <span style={{ fontSize: '14px' }}>🔍</span>
                <input
                  type="text"
                  placeholder="Search coins..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#fff',
                    fontSize: '13px',
                    width: '100%',
                    outline: 'none',
                    fontFamily: 'Inter, sans-serif'
                  }}
                />
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '10px' }}>
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
                My Watchlist
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
                              {formatPrice(coin.current_price)}
                            </span>
                            <span style={{ fontSize: '10px', fontWeight: 600, color: (coin.price_change_percentage_24h || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                              {formatChange(coin.price_change_percentage_24h)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleWatchlist?.(coin.id);
                        }}
                        style={{
                          background: isInWatchlist?.(coin.id) ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0, 212, 255, 0.1)',
                          border: 'none',
                          borderRadius: '6px',
                          color: isInWatchlist?.(coin.id) ? '#ef4444' : '#00d4ff',
                          padding: '4px 8px',
                          fontSize: '10px',
                          cursor: 'pointer'
                        }}
                      >
                        {isInWatchlist?.(coin.id) ? '✕' : '+'}
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {/* ===== NEWS & SENTIMENT VIEW ===== */}
        {view === 'news-sentiment' && (
          <NewsSentimentPanel
            fearGreed={fearGreedData}
            coinGeckoNews={newsData}
            cryptoPanicNews={panicNewsData}
            isLoading={newsLoading}
            error={newsError}
            lastUpdated={newsLastUpdated}
            cryptoPanicToken={cryptoPanicToken}
          />
        )}

        {/* ===== CONTACTS VIEW ===== */}
        {view === 'contacts' && (
          <div className="panel-content fade-in">
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Saved Contacts</span>
              <span>{contacts ? Object.keys(contacts).length : 0}</span>
            </div>
            
            {!contacts || Object.keys(contacts).length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>
                No contacts saved yet. Say "add [name] [address]" to add one.
              </div>
            ) : (
              Object.entries(contacts).map(([name, address]) => (
                <div key={name} className="glass-card" style={{ padding: '14px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '15px', color: '#e2e8f0', textTransform: 'capitalize' }}>
                      {name}
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(address);
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-cyan)', fontSize: '12px' }}
                        title="Copy Address"
                      >
                        📋
                      </button>
                      <button
                        onClick={() => onContactDeleteClick?.(name)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-red)', fontSize: '12px' }}
                        title="Delete Contact"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'var(--text-muted)', padding: '6px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', marginBottom: '10px', wordBreak: 'break-all' }}>
                    {address}
                  </div>
                  
                  <button
                    onClick={() => onContactSendClick?.(name)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: 'rgba(0, 212, 255, 0.1)',
                      border: '1px solid rgba(0, 212, 255, 0.2)',
                      borderRadius: '8px',
                      color: '#00d4ff',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 212, 255, 0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)'}
                  >
                    Send to {name.charAt(0).toUpperCase() + name.slice(1)} →
                  </button>
                </div>
              ))
            )}
          </div>
        )}



        {/* ===== HISTORY VIEW ===== */}
        {view === 'history' && (
          <div className="panel-content fade-in" style={{ paddingBottom: '20px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Transaction History</span>
              <span style={{ background: 'rgba(0, 212, 255, 0.1)', color: 'var(--accent-cyan)', padding: '2px 8px', borderRadius: '10px' }}>
                {filteredHistory.length}
              </span>
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
              {[
                { id: 'all', label: 'All' },
                { id: 'send', label: 'Sends' },
                { id: 'swap', label: 'Swaps' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setHistoryFilter(f.id as any)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    whiteSpace: 'nowrap',
                    background: historyFilter === f.id ? 'rgba(0, 212, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${historyFilter === f.id ? 'rgba(0, 212, 255, 0.4)' : 'transparent'}`,
                    color: historyFilter === f.id ? 'var(--accent-cyan)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontWeight: historyFilter === f.id ? 600 : 400
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {filteredHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>📓</div>
                <p style={{ fontSize: '13px' }}>{history.length === 0 ? "No transactions yet. Start by sending crypto or making a swap." : "No transactions match this filter."}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredHistory.map((tx) => (
                  <div key={tx.id || tx.hash} className="glass-card" style={{ padding: '14px', position: 'relative', overflow: 'hidden' }}>
                    {/* Status indicator line */}
                    <div style={{ 
                      position: 'absolute', 
                      left: 0, 
                      top: 0, 
                      bottom: 0, 
                      width: '3px', 
                      background: tx.status === 'success' ? '#10b981' : tx.status === 'failed' ? '#ef4444' : '#f59e0b' 
                    }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '8px', 
                          background: tx.type === 'send' ? 'rgba(239, 68, 68, 0.1)' : tx.type === 'swap' ? 'rgba(0, 212, 255, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                          color: tx.type === 'send' ? '#ef4444' : tx.type === 'swap' ? '#00d4ff' : '#10b981',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px'
                        }}>
                          {tx.type === 'send' ? '↑' : tx.type === 'swap' ? '⇄' : '↓'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '14px', color: '#e2e8f0' }}>
                            {tx.type === 'send' ? `Send ${tx.fromAmount} ${tx.fromToken}` : tx.type === 'swap' ? `Swap ${tx.fromAmount} ${tx.fromToken}` : `Receive ${tx.fromAmount} ${tx.fromToken}`}
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
        🔄 Prices refresh every 60s · CoinGecko API
      </div>
    </div>
  );
};

export default RightPanel;
