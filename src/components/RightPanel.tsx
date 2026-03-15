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
import type { CryptoPrice, ChartDataPoint, RightPanelView, WalletState, TransactionPreview, SwapPreview, AppTransaction } from '../types';

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
}

function formatPrice(n: number) {
  if (n >= 1000) return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

function formatChange(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}



// Custom tooltip for chart
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: 'rgba(26,26,46,0.95)',
          border: '1px solid rgba(0,212,255,0.2)',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '12px',
          fontFamily: 'JetBrains Mono, monospace',
        }}
      >
        <div style={{ color: '#00d4ff', fontWeight: 600 }}>{formatPrice(payload[0].value)}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '2px' }}>{payload[0].payload.time}</div>
      </div>
    );
  }
  return null;
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
}) => {
  const [historyFilter, setHistoryFilter] = React.useState<'all' | 'send' | 'swap' | 'week' | 'month'>('all');

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
          {view === 'prices' && 'Live Market'}
          {view === 'portfolio' && 'Portfolio'}
          {view === 'coin-chart' && `${chartCoinName || 'Coin'} Chart`}
          {view === 'transaction' && 'Transaction'}
          {view === 'watchlist' && 'Watchlist'}
          {view === 'contacts' && 'Address Book'}
          {view === 'history' && 'Trade Journal'}
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

        {/* ===== COIN CHART VIEW ===== */}
        {view === 'coin-chart' && (
          <div className="panel-content fade-in">
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0' }}>{chartCoinName}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>7-Day Price Chart</div>
            </div>

            {chartLoading ? (
              <div className="skeleton" style={{ height: '180px', borderRadius: '10px' }} />
            ) : chartData.length ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                    fontSize: '12px',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>Low: {formatPrice(chartMin)}</span>
                  <span style={{ color: chartTrend ? '#00ff88' : '#ff4466' }}>
                    {chartTrend ? '▲' : '▼'} {chartTrend ? 'Uptrend' : 'Downtrend'}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>Hi: {formatPrice(chartMax)}</span>
                </div>

                <div style={{ height: '180px', minHeight: '180px' }}>
                  <ResponsiveContainer width="100%" height="100%" minHeight={180}>
                    <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="coinGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={chartTrend ? '#00ff88' : '#ff4466'} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={chartTrend ? '#00ff88' : '#ff4466'} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="time"
                        tick={{ fill: '#475569', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        domain={[chartMin, chartMax]}
                        tick={{ fill: '#475569', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => formatPrice(v)}
                        width={60}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke={chartTrend ? '#00ff88' : '#ff4466'}
                        strokeWidth={2}
                        fill="url(#coinGrad)"
                        animationDuration={500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Price stats */}
                <div
                  style={{
                    marginTop: '10px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                  }}
                >
                  {[
                    { label: '7D High', value: formatPrice(chartMax), color: '#00ff88' },
                    { label: '7D Low', value: formatPrice(chartMin), color: '#ff4466' },
                    { label: 'Current', value: formatPrice(chartData[chartData.length - 1]?.price || 0), color: '#00d4ff' },
                    { label: '7D Change', value: `${((chartData[chartData.length - 1]?.price - chartData[0]?.price) / chartData[0]?.price * 100).toFixed(2)}%`, color: chartTrend ? '#00ff88' : '#ff4466' },
                  ].map((s) => (
                    <div key={s.label} className="glass-card" style={{ padding: '10px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{s.label}</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>
                        {s.value}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>
                No chart data available
              </div>
            )}
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
          <div className="panel-content fade-in">
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Coin</span>
              <span>Price / 24h</span>
            </div>
            {pricesLoading
              ? [1, 2, 3, 4, 5].map((i) => (
                  <div key={i} style={{ marginBottom: '8px' }}>
                    <div className="skeleton" style={{ height: '52px', borderRadius: '10px' }} />
                  </div>
                ))
              : prices.slice(0, 5).map((coin) => (
                  <div key={coin.id} className="glass-card" style={{ padding: '10px 14px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        className="coin-icon"
                        style={{ width: '28px', height: '28px', background: `${coin.color}22`, color: coin.color, fontSize: '13px' }}
                      >
                        {coin.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 600, fontSize: '13px' }}>{coin.symbol}</span>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: '#e2e8f0' }}>
                            {formatPrice(coin.price)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                          <span
                            className={coin.change24h >= 0 ? 'positive' : 'negative'}
                            style={{ fontSize: '11px', fontWeight: 600 }}
                          >
                            {formatChange(coin.change24h)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
          </div>
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
