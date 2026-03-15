import type { WalletState, CryptoPrice } from '../types';

interface TopBarProps {
  activeTab: 'agent' | 'signals';
  onTabChange: (tab: 'agent' | 'signals') => void;
  wallet: WalletState;
  prices: CryptoPrice[];
  onConnectWallet: () => void;
  formatAddress: (addr: string) => string;
}

const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onTabChange,
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
          }}
        >
          🚀
        </div>
        <div>
          <div
            style={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontWeight: 700,
              fontSize: '18px',
              background: 'linear-gradient(90deg, #00d4ff, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1.2,
            }}
          >
            CryptoPilot AI
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Bloomberg × ChatGPT Terminal
          </div>
        </div>
      </div>

      {/* Center: Tabs */}
      <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '4px' }}>
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
          }}
        >
          🤖 AI Agent
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
          }}
        >
          📡 Signal Feed
        </button>
      </div>

      {/* Right: Wallet */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {wallet.isConnected && (
          <div
            className="fade-in"
            style={{
              padding: '6px 12px',
              background: 'rgba(0, 255, 136, 0.08)',
              border: '1px solid rgba(0, 255, 136, 0.2)',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#00ff88',
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 600,
            }}
          >
            ${totalUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#00ff88',
                  boxShadow: '0 0 8px #00ff88',
                }}
              />
              {formatAddress(wallet.address)}
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🦊</span> Connect Wallet
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
