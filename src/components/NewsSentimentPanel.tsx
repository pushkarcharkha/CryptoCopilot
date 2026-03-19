import React from 'react';
import type { NewsArticle, FearGreedData } from '../types';

interface NewsSentimentPanelProps {
  fearGreed: FearGreedData[];
  coinGeckoNews: NewsArticle[];
  cryptoPanicNews: NewsArticle[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
  cryptoPanicToken: string;
}

const NewsSentimentPanel: React.FC<NewsSentimentPanelProps> = ({
  fearGreed,
  coinGeckoNews,
  cryptoPanicNews,
  isLoading,
  error,
  lastUpdated,
}) => {
  const latestFG = fearGreed[0];
  const yesterdayFG = fearGreed[1];
  const lastWeekFG = fearGreed[6];

  const getSentimentColor = (value: number) => {
    if (value <= 25) return '#ef4444';
    if (value <= 45) return '#f97316';
    if (value <= 55) return '#eab308';
    if (value <= 75) return '#84cc16';
    return '#22c55e';
  };

  const getSentimentEmoji = (classification: string) => {
    if (classification.includes('Extreme Fear')) return '😱';
    if (classification.includes('Fear')) return '😟';
    if (classification.includes('Neutral')) return '😐';
    if (classification.includes('Extreme Greed')) return '🤑';
    if (classification.includes('Greed')) return '😊';
    return '😶';
  };

  const timeAgo = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m";
    return Math.floor(seconds) + "s";
  };

  const NewsCard = ({ article }: { article: NewsArticle }) => {
    const isSignals = !!(article.votes);
    const borderLeftColor = isSignals 
      ? ((article.votes?.positive || 0) > (article.votes?.negative || 0) ? '#00ff88' : '#ff4444')
      : 'transparent';

    return (
      <div 
        className="news-card"
        style={{ 
          padding: '12px', 
          marginBottom: '10px', 
          display: 'flex', 
          gap: '12px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '12px',
          borderLeft: isSignals ? `4px solid ${borderLeftColor}` : 'none',
          pointerEvents: 'all',
          position: 'relative',
          zIndex: 101
        }}
      >
        <div style={{ flexShrink: 0 }}>
          { (article.thumb_2x || article.image) && (
            <img 
              src={article.thumb_2x || article.image} 
              alt="news" 
              style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} 
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ 
            fontSize: '13px', 
            fontWeight: 600, 
            lineHeight: 1.4, 
            margin: '0 0 4px 0',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            color: '#e2e8f0'
          }}>
            {article.title}
          </h4>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{article.source?.name || article.author || 'Crypto News'} · {timeAgo(article.created_at || article.published_at)}</span>
          </div>

          {article.url && (
            <button
              className="read-more-btn"
              onMouseDown={(e) => {
                e.stopPropagation()
                window.open(article.url, '_blank')
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#00d4ff',
                fontSize: '12px',
                cursor: 'pointer',
                padding: '4px 0 0 0',
                textDecoration: 'underline',
                pointerEvents: 'all',
                zIndex: 102,
                position: 'relative',
                display: 'inline-block'
              }}
            >
              Read More ↗
            </button>
          )}
        </div>
      </div>
    );
  };

  // Combine news for a single feed
  const allNews = [...coinGeckoNews, ...cryptoPanicNews].sort((a, b) => 
    new Date(b.created_at || b.published_at || 0).getTime() - new Date(a.created_at || a.published_at || 0).getTime()
  );

  return (
    <div className="news-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', pointerEvents: 'all', position: 'relative', zIndex: 100 }}>
      {/* CSS Overrides */}
      <style>{`
        .news-panel {
          pointer-events: all !important;
          position: relative;
          z-index: 100;
        }
        .news-card {
          pointer-events: all !important;
          position: relative;
          z-index: 101;
        }
        .read-more-btn {
          pointer-events: all !important;
          position: relative;
          z-index: 102;
          cursor: pointer !important;
        }
      `}</style>

      {/* Section 1: Fear & Greed Meter */}
      <div className="glass-card" style={{ padding: '16px', marginBottom: '16px', textAlign: 'center' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
          Market Sentiment
        </div>
        
        {latestFG ? (
          <>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>
               {getSentimentEmoji(latestFG.value_classification)} {latestFG.value_classification.toUpperCase()}
            </div>
            
            <div style={{ position: 'relative', height: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', margin: '15px 0', overflow: 'hidden' }}>
               <div 
                 style={{ 
                   position: 'absolute', 
                   left: 0, 
                   top: 0, 
                   bottom: 0, 
                   width: `${latestFG.value}%`, 
                   background: getSentimentColor(parseInt(latestFG.value)),
                   boxShadow: `0 0 15px ${getSentimentColor(parseInt(latestFG.value))}bb`,
                   transition: 'width 1s ease-out'
                 }} 
               />
               <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                  {latestFG.value}
               </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
               <span>Yesterday: {yesterdayFG?.value}</span>
               <span>Last Week: {lastWeekFG?.value}</span>
            </div>
          </>
        ) : (
          <div className="skeleton" style={{ height: '80px', borderRadius: '12px' }} />
        )}
      </div>

      {/* News Feed */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
        {isLoading && allNews.length === 0 ? (
          [1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: '100px', borderRadius: '12px', marginBottom: '10px' }} />
          ))
        ) : error ? (
           <div style={{ textAlign: 'center', padding: '20px', color: '#ef4444', fontSize: '13px' }}>
              ⚠️ {error}
           </div>
        ) : (
          allNews.length > 0 ? (
            allNews.map((article, idx) => (
              <NewsCard key={idx} article={article} />
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '13px' }}>
              No news available.
            </div>
          )
        )}
      </div>

      {/* Footer */}
      <div style={{ 
        fontSize: '10px', 
        color: 'var(--text-muted)', 
        marginTop: '16px', 
        textAlign: 'center', 
        opacity: 0.6,
        paddingTop: '8px',
        borderTop: '1px solid rgba(255,255,255,0.03)'
      }}>
        {lastUpdated ? (
          (() => {
            const diff = Math.floor((Date.now() - lastUpdated) / 60000);
            return `Last updated: ${diff === 0 ? 'Just now' : `${diff}m ago`}`;
          })()
        ) : 'Refreshing...'}
      </div>
    </div>
  );
};

export default NewsSentimentPanel;
