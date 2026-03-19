import React from 'react';
import type { SidebarFeature } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  activeFeature: SidebarFeature | null;
  onFeatureClick: (feature: SidebarFeature, message: string) => void;
  onSettingsClick: () => void;
}

const FEATURES: {
  id: SidebarFeature;
  icon: string;
  label: string;
  message: string;
}[] = [
  {
    id: 'portfolio',
    icon: '💼',
    label: 'Portfolio',
    message: 'Give me a complete portfolio health check. What should I be holding right now based on current market conditions?',
  },
  {
    id: 'wallet',
    icon: '👛',
    label: 'Wallet & Contacts',
    message: 'Show me my wallet overview and help me understand my on-chain activity. What are the risks with my current holdings?',
  },
  {
    id: 'watchlist',
    icon: '📈',
    label: 'Watchlist',
    message: 'Show my watchlist with current prices. Which coins on my radar have the best setup right now?',
  },
  {
    id: 'chart',
    icon: '🕯️',
    label: 'Chart Analysis',
    message: 'Analyze the current Bitcoin chart for me. What patterns do you see and what is the likely next move?',
  },
  {
    id: 'news-sentiment',
    icon: '📊',
    label: 'News & Sentiment',
    message: 'What is the current market sentiment? Show me the Fear & Greed index and the latest top news.',
  },
  {
    id: 'futures',
    icon: '📊',
    label: 'Futures',
    message: 'You\'re in paper futures mode. You can open long or short positions with leverage. This is simulated — no real money involved. Try saying \'open a long BTC position with 10x leverage for $100\'',
  },
  {
    id: 'debate',
    icon: '⚔️',
    label: 'Debate Mode',
    message: 'Let\'s debate: Is Bitcoin still the ultimate store of value or is Ethereum a better long-term bet? Give me both sides.',
  },
  {
    id: 'journal',
    icon: '📓',
    label: 'Trade Journal',
    message: 'Help me review my recent trading decisions. What patterns do you notice and how can I improve my strategy?',
  },
];

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  activeFeature,
  onFeatureClick,
  onSettingsClick,
}) => {
  return (
    <div
      style={{
        width: isOpen ? '220px' : '60px',
        background: 'var(--bg-panel)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Logo + Toggle */}
      <div
        style={{
          padding: '16px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          borderBottom: '1px solid var(--border-subtle)',
          minHeight: '64px',
        }}
      >
        <button
          id="sidebar-toggle-btn"
          onClick={onToggle}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-cyan-dim)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            {isOpen ? (
              <path d="M4 6h16M4 12h16M4 18h16" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M4 6h16M4 12h10M4 18h16" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </button>
        {isOpen && (
          <div className="fade-in" style={{ overflow: 'hidden' }}>
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '16px', color: '#00d4ff', whiteSpace: 'nowrap' }}>
              CryptoPilot
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              AI Agent
            </div>
          </div>
        )}
      </div>

      {/* Features */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
        {FEATURES.map((f) => (
          <button
            key={f.id}
            id={`sidebar-${f.id}`}
            onClick={() => onFeatureClick(f.id, f.message)}
            className={`sidebar-item ${activeFeature === f.id ? 'active' : ''}`}
            style={{ width: '100%', background: 'none', border: activeFeature === f.id ? undefined : 'none', textAlign: 'left', cursor: 'pointer' }}
            title={f.label}
          >
            <span style={{ fontSize: '18px', flexShrink: 0, lineHeight: 1 }}>{f.icon}</span>
            {isOpen && (
              <span className="fade-in" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {f.label}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Settings */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border-subtle)' }}>
        <button
          id="settings-btn"
          onClick={onSettingsClick}
          className="sidebar-item"
          style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
          title="Settings & API Key"
        >
          <span style={{ fontSize: '18px', flexShrink: 0 }}>⚙️</span>
          {isOpen && <span className="fade-in">Settings</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
