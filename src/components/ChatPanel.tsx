import React, { useEffect, useRef, useState } from 'react';
import type { Message } from '../types';

interface ChatPanelProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (content: string) => void;
  onClearChat: () => void;
}

// Simple markdown renderer for bold and links
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  return lines.map((line, li) => {
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;

    // Combined regex for bold (**text**) and links ([text](url))
    // We'll process them in order of appearance
    while (remaining.length > 0) {
      const boldMatch = /\*\*([^*]+)\*\*/.exec(remaining);
      const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(remaining);

      const boldIndex = boldMatch ? boldMatch.index : Infinity;
      const linkIndex = linkMatch ? linkMatch.index : Infinity;

      if (!boldMatch && !linkMatch) {
         parts.push(<span key={key++}>{remaining}</span>);
         break;
      }

      if (boldIndex < linkIndex) {
        // Handle bold
        if (boldIndex > 0) parts.push(<span key={key++}>{remaining.slice(0, boldIndex)}</span>);
        parts.push(<strong key={key++} style={{ color: '#00d4ff' }}>{boldMatch![1]}</strong>);
        remaining = remaining.slice(boldIndex + boldMatch![0].length);
      } else {
        // Handle link
        if (linkIndex > 0) parts.push(<span key={key++}>{remaining.slice(0, linkIndex)}</span>);
        parts.push(
          <a 
            key={key++} 
            href={linkMatch![2]} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: '#00ff88', textDecoration: 'underline', cursor: 'pointer' }}
          >
            {linkMatch![1]}
          </a>
        );
        remaining = remaining.slice(linkIndex + linkMatch![0].length);
      }
    }

    return (
      <React.Fragment key={li}>
        {li > 0 && <br />}
        {parts}
      </React.Fragment>
    );
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, isLoading, onSendMessage, onClearChat }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const QUICK_ACTIONS = [
    { label: '📊 BTC Analysis', msg: 'Give me a quick BTC analysis — current trend, support/resistance, and what to watch.' },
    { label: '🔥 Top Movers', msg: 'What are the top crypto movers today and should I be paying attention to any of them?' },
    { label: '⚠️ Risk Check', msg: 'What are the biggest risks in the crypto market right now I should know about?' },
    { label: '💡 Opportunity', msg: 'What\'s the best risk/reward opportunity in crypto right now?' },
  ];

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-primary)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Chat Header */}
      <div
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#00ff88',
              boxShadow: '0 0 10px #00ff88',
            }}
          />
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
            CryptoPilot AI — llama-3.3-70b-versatile
          </span>
        </div>
        <button
          id="clear-chat-btn"
          onClick={onClearChat}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            fontSize: '12px',
            padding: '4px 8px',
            borderRadius: '6px',
            transition: 'all 0.2s',
            fontFamily: 'Inter, sans-serif',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ff4466';
            e.currentTarget.style.background = 'rgba(255,68,102,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.background = 'none';
          }}
        >
          🗑 Clear
        </button>
      </div>

      {/* Messages */}
      <div
        id="chat-messages"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="fade-in"
            style={{
              display: 'flex',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              gap: '10px',
              alignItems: 'flex-start',
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                flexShrink: 0,
                background:
                  msg.role === 'assistant'
                    ? 'linear-gradient(135deg, rgba(0,212,255,0.3), rgba(139,92,246,0.3))'
                    : 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,255,136,0.2))',
                border: `1px solid ${msg.role === 'assistant' ? 'rgba(0,212,255,0.3)' : 'rgba(0,212,255,0.2)'}`,
              }}
            >
              {msg.role === 'assistant' ? '🤖' : '👤'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '82%' }}>
              <div className={msg.role === 'assistant' ? 'msg-ai' : 'msg-user'}>
                {renderMarkdown(msg.content)}
              </div>
              <div
                style={{
                  fontSize: '10px',
                  color: 'var(--text-muted)',
                  textAlign: msg.role === 'user' ? 'right' : 'left',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                {formatTime(msg.timestamp)}
              </div>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isLoading && (
          <div className="fade-in" style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                flexShrink: 0,
                background: 'linear-gradient(135deg, rgba(0,212,255,0.3), rgba(139,92,246,0.3))',
                border: '1px solid rgba(0,212,255,0.3)',
              }}
            >
              🤖
            </div>
            <div
              className="msg-ai"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '14px 16px' }}
            >
              <div className="dot-pulse" style={{ display: 'flex', gap: '4px' }}>
                <span />
                <span />
                <span />
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                Analyzing...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 2 && (
        <div
          className="fade-in"
          style={{
            padding: '0 20px 12px',
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          {QUICK_ACTIONS.map((qa) => (
            <button
              key={qa.label}
              onClick={() => onSendMessage(qa.msg)}
              style={{
                background: 'rgba(0,212,255,0.06)',
                border: '1px solid rgba(0,212,255,0.15)',
                borderRadius: '20px',
                padding: '6px 14px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'Inter, sans-serif',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0,212,255,0.15)';
                e.currentTarget.style.color = '#00d4ff';
                e.currentTarget.style.borderColor = 'rgba(0,212,255,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0,212,255,0.06)';
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.borderColor = 'rgba(0,212,255,0.15)';
              }}
            >
              {qa.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            id="chat-input"
            className="chat-input"
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about crypto, request a chart analysis, or describe a trade..."
            rows={1}
            style={{ flex: 1, minHeight: '44px' }}
            disabled={isLoading}
          />
          <button
            id="send-btn"
            className="send-btn"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            style={{ height: '44px', width: '46px', flexShrink: 0 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
          Press <kbd style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '3px', padding: '1px 5px', fontSize: '10px' }}>Enter</kbd> to send
          &nbsp;·&nbsp;
          <kbd style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '3px', padding: '1px 5px', fontSize: '10px' }}>Shift+Enter</kbd> for new line
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
