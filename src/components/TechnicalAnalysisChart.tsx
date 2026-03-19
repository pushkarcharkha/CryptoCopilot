import { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts';
import type { UTCTimestamp } from 'lightweight-charts';

// Global cache for OHLCV data to prevent rate limits
const ohlcvCache: Record<string, { timestamp: number; data: any[] }> = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface TAStats {
  support: number;
  resistance: number;
  midLevel: number;
  ema20: number;
  ema50: number;
  currentPrice: number;
  coinSymbol: string;
  buySignals: number;
  sellSignals: number;
  trendline?: number;
}

interface TechnicalAnalysisChartProps {
  coinId: string;
  coinSymbol: string;
  onAnalysisComplete?: (stats: TAStats) => void;
}

export const TechnicalAnalysisChart = ({ 
  coinId, 
  coinSymbol,
  onAnalysisComplete 
}: TechnicalAnalysisChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [timeframe, setTimeframe] = useState(30); // days
  const [isLoading, setIsLoading] = useState(false);
  
  // Use a ref for the callback to prevent the chart from re-initializing 
  // if App.tsx re-creates the handleAnalysisComplete function
  const onAnalysisCompleteRef = useRef(onAnalysisComplete);
  useEffect(() => {
    onAnalysisCompleteRef.current = onAnalysisComplete;
  }, [onAnalysisComplete]);

  const fetchOHLCV = async (cid: string, days: number): Promise<any[]> => {
    const cacheKey = `${cid}-${days}`;
    const cached = ohlcvCache[cacheKey];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    const response = await fetch(
      `/api/coingecko/coins/${cid}/ohlc?vs_currency=usd&days=${days}`
    );
    
    if (response.status === 429) {
      // If we're being rate limited, wait and try to return something useful or throw
      // For now, let's just wait 2 seconds if it fails
      await new Promise(resolve => setTimeout(resolve, 2000));
      return fetchOHLCV(cid, days);
    }

    if (!response.ok) throw new Error('Failed to fetch OHLCV');
    const data = await response.json();
    const formattedData = data.map((d: any) => ({
      time: (d[0] / 1000) as UTCTimestamp,
      open: d[1],
      high: d[2],
      low: d[3],
      close: d[4]
    }));

    ohlcvCache[cacheKey] = {
      timestamp: Date.now(),
      data: formattedData
    };

    return formattedData;
  };

  const calculateEMA = (data: number[], period: number) => {
    const k = 2 / (period + 1);
    const ema = [data[0]];
    for (let i = 1; i < data.length; i++) {
      ema.push(data[i] * k + ema[i - 1] * (1 - k));
    }
    return ema;
  };

  const findTrendlinePoints = (candles: any[], type: 'low' | 'high') => {
    const values = type === 'low' ? candles.map(c => c.low) : candles.map(c => c.high);
    const significantPoints = [];
    for (let i = 2; i < values.length - 2; i++) {
      if (type === 'low') {
        if (values[i] < values[i - 1] && values[i] < values[i - 2] && values[i] < values[i + 1] && values[i] < values[i + 2]) {
          significantPoints.push({ time: candles[i].time, value: values[i] });
        }
      } else {
        if (values[i] > values[i - 1] && values[i] > values[i - 2] && values[i] > values[i + 1] && values[i] > values[i + 2]) {
          significantPoints.push({ time: candles[i].time, value: values[i] });
        }
      }
    }
    return significantPoints.slice(-3);
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;
    
    const chart = createChart(container, {
      width: container.clientWidth,
      height: 400,
      layout: {
        background: { color: '#0a0a0f' },
        textColor: '#ffffff',
      },
      grid: {
        vertLines: { color: '#1a1a2e' },
        horzLines: { color: '#1a1a2e' },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: '#333' },
      timeScale: { borderColor: '#333', timeVisible: true }
    });

    chartRef.current = chart;

    const handleResize = () => {
      chart.applyOptions({ width: container.clientWidth });
    };

    window.addEventListener('resize', handleResize);

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#00ff88',
      downColor: '#ff4444',
      borderUpColor: '#00ff88',
      borderDownColor: '#ff4444',
      wickUpColor: '#00ff88',
      wickDownColor: '#ff4444'
    });

    setIsLoading(true);
    fetchOHLCV(coinId, timeframe).then(candles => {
      candleSeries.setData(candles);

      const closes = candles.map((c: any) => c.close);
      const highs = candles.map((c: any) => c.high);
      const lows = candles.map((c: any) => c.low);

      const resistanceValue = Math.max(...highs.slice(-20));
      const supportValue = Math.min(...lows.slice(-20));
      const midLevel = (resistanceValue + supportValue) / 2;

      const supportLine = chart.addSeries(LineSeries, {
        color: '#00ff88',
        lineWidth: 2,
        lineStyle: 2,
        title: `Sup $${supportValue.toFixed(0)}`
      });
      supportLine.setData([
        { time: candles[Math.max(0, candles.length - 20)].time, value: supportValue },
        { time: candles[candles.length - 1].time, value: supportValue }
      ]);

      const resistanceLine = chart.addSeries(LineSeries, {
        color: '#ff4444',
        lineWidth: 2,
        lineStyle: 2,
        title: `Res $${resistanceValue.toFixed(0)}`
      });
      resistanceLine.setData([
        { time: candles[Math.max(0, candles.length - 20)].time, value: resistanceValue },
        { time: candles[candles.length - 1].time, value: resistanceValue }
      ]);

      const ema20Data = calculateEMA(closes, 20);
      const ema20Series = chart.addSeries(LineSeries, {
        color: '#f0a500',
        lineWidth: 1,
        title: 'EMA 20'
      });
      ema20Series.setData(candles.slice(-20).map((c: any, i: number) => ({
        time: c.time,
        value: ema20Data[ema20Data.length - 20 + i]
      })));

      const ema50Data = calculateEMA(closes, 50);
      const ema50Series = chart.addSeries(LineSeries, {
        color: '#9c27b0',
        lineWidth: 1,
        title: 'EMA 50'
      });
      ema50Series.setData(candles.slice(-50).map((c: any, i: number) => ({
        time: c.time,
        value: ema50Data[ema50Data.length - 50 + i]
      })));

      const trendlinePoints = findTrendlinePoints(candles, 'low');
      let trendlineValue: number | undefined = undefined;
      if (trendlinePoints.length >= 2) {
        trendlineValue = trendlinePoints[trendlinePoints.length - 1].value;
        const trendline = chart.addSeries(LineSeries, {
          color: '#00d4ff',
          lineWidth: 2,
          title: 'Trendline'
        });
        trendline.setData(trendlinePoints);
      }

      const markers = [];
      let buyCount = 0;
      let sellCount = 0;
      for (let i = 1; i < 20; i++) {
        const idx = candles.length - 20 + i;
        if (idx < 1) continue;
        
        const prevEma20 = ema20Data[idx - 1];
        const prevEma50 = ema50Data[idx - 1];
        const currEma20 = ema20Data[idx];
        const currEma50 = ema50Data[idx];

        if (prevEma20 < prevEma50 && currEma20 > currEma50) {
          buyCount++;
          markers.push({
            time: candles[idx].time,
            position: 'belowBar' as const,
            color: '#00ff88',
            shape: 'arrowUp' as const,
            text: 'Buy'
          });
        }
        if (prevEma20 > prevEma50 && currEma20 < currEma50) {
          sellCount++;
          markers.push({
            time: candles[idx].time,
            position: 'aboveBar' as const,
            color: '#ff4444',
            shape: 'arrowDown' as const,
            text: 'Sell'
          });
        }
      }
      // In lightweight-charts v5, setMarkers moved to the chart instance
      if (markers.length > 0) {
        try {
          // v5 API: chart.setMarkers(series, markers)
          (chart as any).setMarkers(candleSeries, markers);
        } catch {
          // Fallback: try legacy API just in case
          try {
            (candleSeries as any).setMarkers(markers);
          } catch {
            console.warn('Markers not supported in this version of lightweight-charts');
          }
        }
      }

      if (onAnalysisCompleteRef.current) {
        onAnalysisCompleteRef.current({
          support: supportValue,
          resistance: resistanceValue,
          midLevel,
          ema20: ema20Data[ema20Data.length - 1],
          ema50: ema50Data[ema50Data.length - 1],
          currentPrice: closes[closes.length - 1],
          coinSymbol: coinSymbol.toUpperCase(),
          buySignals: buyCount,
          sellSignals: sellCount,
          trendline: trendlineValue
        });
      }

      setIsLoading(false);
    }).catch(err => {
      console.error(err);
      setIsLoading(false);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [coinId, timeframe, coinSymbol]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', gap: '8px', padding: '0 10px' }}>
        {[7, 14, 30, 90].map(d => (
          <button 
            key={d}
            onClick={() => setTimeframe(d)}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              background: timeframe === d ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)',
              border: 'none',
              color: timeframe === d ? '#000' : '#fff',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            {d === 7 ? '1W' : d === 14 ? '2W' : d === 30 ? '1M' : '3M'}
          </button>
        ))}
      </div>
      <div style={{ position: 'relative', width: '100%', height: '400px' }} ref={chartContainerRef}>
        {isLoading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', zIndex: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <div className="coin-loader" />
              <span style={{ fontSize: '12px', color: 'var(--accent-cyan)' }}>Analyzing Chart...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
