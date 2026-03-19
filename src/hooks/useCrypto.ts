import { useState, useEffect, useRef, useCallback } from 'react';
import type { CryptoPrice, ChartDataPoint } from '../types';

const COIN_META: Record<string, { symbol: string; name: string; icon: string; color: string }> = {
  bitcoin: { symbol: 'BTC', name: 'Bitcoin', icon: '₿', color: '#f7931a' },
  ethereum: { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ', color: '#627eea' },
  solana: { symbol: 'SOL', name: 'Solana', icon: '◎', color: '#9945ff' },
  cardano: { symbol: 'ADA', name: 'Cardano', icon: '₳', color: '#0033ad' },
  chainlink: { symbol: 'LINK', name: 'Chainlink', icon: '⬡', color: '#2a5ada' },
  binancecoin: { symbol: 'BNB', name: 'BNB', icon: 'BNB', color: '#f3ba2f' },
  'matic-network': { symbol: 'MATIC', name: 'Polygon', icon: 'M', color: '#8247e5' },
  'avalanche-2': { symbol: 'AVAX', name: 'Avalanche', icon: 'A', color: '#e84142' },
  tether: { symbol: 'USDT', name: 'Tether', icon: '₮', color: '#26a17b' },
  'usd-coin': { symbol: 'USDC', name: 'USD Coin', icon: '$', color: '#2775ca' },
  ripple: { symbol: 'XRP', name: 'Ripple', icon: '✕', color: '#23292f' },
  polkadot: { symbol: 'DOT', name: 'Polkadot', icon: 'P', color: '#e6007a' }
};

export function useCryptoPrices(coinIds: string[] = ['bitcoin', 'ethereum', 'solana']) {
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevPricesRef = useRef<Record<string, number>>({});

  const idsStr = coinIds.join(',');

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/coingecko/simple/price?ids=${idsStr}&vs_currencies=usd&include_24hr_change=true`
      );
      if (!res.ok) throw new Error('CoinGecko API error');
      const data = await res.json();

      const newPrices: CryptoPrice[] = idsStr.split(',').map((id) => {
        const meta = COIN_META[id] || { symbol: id.toUpperCase(), name: id, icon: '○', color: '#ffffff' };
        return {
          id,
          symbol: meta.symbol,
          name: meta.name,
          price: data[id]?.usd ?? 0,
          change24h: data[id]?.usd_24h_change ?? 0,
          icon: meta.icon,
          color: meta.color,
        };
      });

      prevPricesRef.current = Object.fromEntries(newPrices.map((p) => [p.id, p.price]));
      setPrices(newPrices);
      setIsLoading(false);
      setError(null);
    } catch (e) {
      setError('Failed to fetch prices');
      setIsLoading(false);
    }
  }, [idsStr]);

  useEffect(() => {
    fetchPrices();
    
    // Connect to Binance WebSocket for live prices
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr');
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (Array.isArray(data)) {
          setPrices(prevPrices => {
            if (prevPrices.length === 0) return prevPrices;
            
            let updated = false;
            const updatedPrices = prevPrices.map(p => {
              // Stablecoins
              if (p.symbol === 'USDT' || p.symbol === 'USDC') return p;
              
              const ticker = data.find(t => t.s === `${p.symbol}USDT`);
              if (ticker) {
                const newPrice = parseFloat(ticker.c);
                const openPrice = parseFloat(ticker.o);
                const change24h = openPrice > 0 ? ((newPrice - openPrice) / openPrice) * 100 : p.change24h;
                
                if (p.price !== newPrice) {
                  updated = true;
                  return { ...p, price: newPrice, change24h };
                }
              }
              return p;
            });
            
            return updated ? updatedPrices : prevPrices;
          });
        }
      } catch (e) {
        console.warn('Binance WS parse error', e);
      }
    };

    ws.onerror = () => {
      console.warn('Binance WebSocket error');
    };

    return () => {
      ws.close();
    };
  }, [fetchPrices]);

  return { prices, isLoading, error, refetch: fetchPrices };
}

export function useCoinChart(coinId: string | null, days = 7) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [coinName, setCoinName] = useState('');

  useEffect(() => {
    if (!coinId) return;
    setIsLoading(true);
    const meta = COIN_META[coinId];
    if (meta) setCoinName(meta.name);

    fetch(`/api/coingecko/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`)
      .then((r) => r.json())
      .then((data) => {
        const points: ChartDataPoint[] = (data.prices || []).map(([ts, price]: [number, number]) => ({
          time: new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          price: Math.round(price * 100) / 100,
        }));
        // Downsample to ~50 points for performance
        const step = Math.max(1, Math.floor(points.length / 50));
        setChartData(points.filter((_, i) => i % step === 0));
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [coinId, days]);

  return { chartData, isLoading, coinName };
}

export const COIN_NAME_TO_ID: Record<string, string> = {
  btc: 'bitcoin', bitcoin: 'bitcoin',
  eth: 'ethereum', ethereum: 'ethereum', ether: 'ethereum',
  sol: 'solana', solana: 'solana',
  ada: 'cardano', cardano: 'cardano',
  link: 'chainlink', chainlink: 'chainlink',
};

export function detectCoinInMessage(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [keyword, id] of Object.entries(COIN_NAME_TO_ID)) {
    if (lower.includes(keyword)) return id;
  }
  return null;
}
