import { Bot, Radio, Wallet, ArrowRightLeft } from 'lucide-react';
import type { WalletState, CryptoPrice } from '../types';
import { AnimatedNumber } from './AnimatedNumber';
import appLogo from '../assets/cryptoguru.png';

interface TopBarProps {
  activeTab: 'agent' | 'signals';
  onTabChange: (tab: 'agent' | 'signals') => void;
  onOpenExchange: () => void;
  wallet: WalletState;
  prices: CryptoPrice[];
  onConnectWallet: () => void;
  formatAddress: (addr: string) => string;
}

const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onTabChange,
  onOpenExchange,
  wallet,
  prices,
  onConnectWallet,
  formatAddress,
}) => {
  // Calculate total USD balance
  const totalUsdValue = wallet.isConnected ? wallet.holdings.reduce((sum, h) => {
    const coinPrice = prices.find(p => p.symbol.toLowerCase() === h.symbol.toLowerCase());
    return sum + (coinPrice ? h.amount * coinPrice.price : 0);
  }, 0) : 0;
  return (
    <div
      style={{
        background: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px',
        flexShrink: 0,
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Left: Logo */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <img
          src={appLogo}
          alt="Cryptoguru"
          style={{
            height: '150px',
            width: 'auto',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </div>

      {/* Scrolling ticker */}
      <div style={{ flex: 1, overflow: 'hidden', margin: '0 20px', maskImage: 'linear-gradient(90deg, transparent, white 5%, white 95%, transparent)' }}>
        <div className="ticker-content" style={{ display: 'flex', gap: '24px', fontSize: '12px', whiteSpace: 'nowrap' }}>
          {prices && prices.map(p => (
            <span key={p.id}>
              <span style={{ color: 'var(--text-secondary)', marginRight: '6px' }}>{p.symbol}</span>
              <AnimatedNumber 
                value={p.price} 
                format={(n) => n < 1 ? `$${n.toFixed(4)}` : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                className={p.change24h >= 0 ? 'positive' : 'negative'}
              />
            </span>
          ))}
          {/* Duplicate for infinite effect */}
          {prices && prices.map(p => (
            <span key={`dup-${p.id}`}>
              <span style={{ color: 'var(--text-secondary)', marginRight: '6px' }}>{p.symbol}</span>
              <AnimatedNumber 
                value={p.price} 
                format={(n) => n < 1 ? `$${n.toFixed(4)}` : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                className={p.change24h >= 0 ? 'positive' : 'negative'}
              />
            </span>
          ))}
        </div>
      </div>

      {/* Center: Tabs */}
      <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '4px' }}>
        <button
          id="tab-exchange"
          onClick={onOpenExchange}
          style={{
            padding: '6px 18px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            fontSize: '13px',
            transition: 'all 0.2s ease',
            background: 'transparent',
            color: 'var(--text-secondary)',
            boxShadow: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <ArrowRightLeft size={16} /> Exchange
        </button>
        <button
          id="tab-agent"
          onClick={() => onTabChange('agent')}
          style={{
            padding: '6px 18px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            fontSize: '13px',
            transition: 'all 0.2s ease',
            background: activeTab === 'agent' ? 'linear-gradient(135deg, rgba(0,212,255,0.25), rgba(139,92,246,0.25))' : 'transparent',
          color: activeTab === 'agent' ? '#00d4ff' : 'var(--text-secondary)',
          boxShadow: activeTab === 'agent' ? '0 0 12px rgba(0,212,255,0.2)' : 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <Bot size={16} /> AI Agent
      </button>
        <button
          id="tab-signals"
          onClick={() => onTabChange('signals')}
          style={{
            padding: '6px 18px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            fontSize: '13px',
            transition: 'all 0.2s ease',
            background: activeTab === 'signals' ? 'linear-gradient(135deg, rgba(0,212,255,0.25), rgba(139,92,246,0.25))' : 'transparent',
          color: activeTab === 'signals' ? '#00d4ff' : 'var(--text-secondary)',
          boxShadow: activeTab === 'signals' ? '0 0 12px rgba(0,212,255,0.2)' : 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <Radio size={16} /> Signal Feed
      </button>
      </div>

      {/* Right: Wallet */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {wallet.isConnected && (
          <div
            className="fade-in mono"
            style={{
              padding: '6px 12px',
              background: 'rgba(0, 255, 136, 0.08)',
              border: '1px solid rgba(0, 255, 136, 0.2)',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#00ff88',
              fontWeight: 600,
            }}
          >
            <AnimatedNumber
              value={totalUsdValue}
              format={(n) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
          </div>
        )}
        <button
          id="connect-wallet-btn"
          className={`wallet-btn ${wallet.isConnected ? 'connected' : ''}`}
          onClick={onConnectWallet}
          disabled={wallet.isConnecting}
        >
          {wallet.isConnecting ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  border: '2px solid transparent',
                  borderTopColor: '#00d4ff',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  display: 'inline-block',
                }}
              />
              Connecting...
            </span>
          ) : wallet.isConnected && wallet.address ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="live-dot" />
              <span className="mono">{formatAddress(wallet.address)}</span>
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center' }}><Wallet size={16} /></span> Connect Wallet
            </span>
          )}
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default TopBar;
