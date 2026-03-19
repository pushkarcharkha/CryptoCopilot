import React, { useState, useEffect } from 'react';
import type { CoinGeckoCoin } from '../types';

const TradingViewWidgetModal = ({ symbol }: { symbol: string }) => {
  const containerId = "tradingview_chart_modal_" + symbol.replace(/[^a-zA-Z0-9]/g, '');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if ((window as any).TradingView && document.getElementById(containerId)) {
        new (window as any).TradingView.widget({
          autosize: true,
          symbol,
          interval: "D",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          container_id: containerId,
          backgroundColor: "#0a0a0f",
          gridColor: "#1a1a2e",
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          hide_side_toolbar: false,
          allow_symbol_change: false,
        });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [symbol, containerId]);

  return <div id={containerId} style={{ width: '100%', height: '100%' }} />;
};

export const ChartModal = ({ coin, onClose }: { coin: CoinGeckoCoin; onClose: () => void }) => {
  const [height, setHeight] = useState(500);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight > 200 && newHeight < window.innerHeight - 100) {
        setHeight(newHeight);
      }
    };
    
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: '220px',        // matched to sidebar expanded width, adjusting roughly
        right: '400px',       // right panel width offset
        height: `${height}px`,
        background: '#1a1a2e',
        borderTop: '2px solid #00d4ff',
        borderRadius: '12px 12px 0 0',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.5)'
      }}
    >
      {/* Drag handle at top */}
      <div
        onMouseDown={() => setIsDragging(true)}
        style={{
          height: '20px',
          cursor: 'ns-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0f',
          borderRadius: '12px 12px 0 0'
        }}
      >
        <div style={{ width: '40px', height: '4px', background: '#444', borderRadius: '2px' }} />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', alignItems: 'center' }}>
        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '16px' }}>
          {coin.symbol.toUpperCase()}/USDT
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: '18px', cursor: 'pointer' }}>✕</button>
      </div>

      {/* TradingView Widget fills remaining space */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <TradingViewWidgetModal symbol={`BINANCE:${coin.symbol.toUpperCase()}USDT`} />
      </div>
    </div>
  );
};

export default ChartModal;
