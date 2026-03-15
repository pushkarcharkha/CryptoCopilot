import React, { useState } from 'react';

interface SettingsModalProps {
  apiKey: string;
  onSave: (key: string) => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ apiKey, onSave, onClose }) => {
  const [keyInput, setKeyInput] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);

  const handleSave = () => {
    onSave(keyInput.trim());
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        className="fade-in"
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
          padding: '28px',
          width: '440px',
          maxWidth: '90vw',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(139,92,246,0.2))',
              border: '1px solid rgba(0,212,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}
          >
            ⚙️
          </div>
          <div>
            <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '18px', color: '#e2e8f0' }}>
              Settings
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Configure CryptoPilot AI
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: '20px',
              lineHeight: 1,
              padding: '4px',
            }}
          >
            ×
          </button>
        </div>

        {/* API Key Section */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
            🔑 Groq API Key
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="api-key-input"
              type={showKey ? 'text' : 'password'}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="gsk_..."
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '12px 44px 12px 14px',
                color: '#e2e8f0',
                fontSize: '13px',
                fontFamily: 'JetBrains Mono, monospace',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(0,212,255,0.4)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border-subtle)')}
            />
            <button
              onClick={() => setShowKey(!showKey)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: '16px',
              }}
            >
              {showKey ? '🙈' : '👁️'}
            </button>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Get a free API key at{' '}
            <a
              href="https://console.groq.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#00d4ff', textDecoration: 'none' }}
            >
              console.groq.com
            </a>
            . The key is stored locally in your browser only.
          </p>
        </div>

        {/* Model Info */}
        <div
          style={{
            padding: '12px 14px',
            background: 'rgba(0,212,255,0.04)',
            border: '1px solid rgba(0,212,255,0.1)',
            borderRadius: '10px',
            marginBottom: '24px',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
            🤖 AI MODEL
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: '#e2e8f0' }}>llama-3.3-70b-versatile</span>
            <span style={{ color: '#00ff88', fontSize: '11px', fontWeight: 600 }}>FREE</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            via Groq · Ultra-fast inference
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '11px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              color: 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
          >
            Cancel
          </button>
          <button
            id="save-settings-btn"
            onClick={handleSave}
            style={{
              flex: 2,
              padding: '11px',
              background: 'linear-gradient(135deg, rgba(0,212,255,0.3), rgba(139,92,246,0.3))',
              border: '1px solid rgba(0,212,255,0.4)',
              borderRadius: '10px',
              color: '#00d4ff',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 20px rgba(0,212,255,0.25)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
          >
            Save & Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
