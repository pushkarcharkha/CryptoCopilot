import { useState, useEffect, useCallback } from 'react';
import type { CoinGeckoCoin } from '../types';

const COINGECKO_URL = '/api/coingecko/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=true&price_change_percentage=24h';

// Initial cache
let globalCache: { data: CoinGeckoCoin[] | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};

export const useWatchlist = () => {
  const [allCoins, setAllCoins] = useState<CoinGeckoCoin[]>(globalCache.data || []);
  const [loading, setLoading] = useState(!globalCache.data);
  const [lastUpdated, setLastUpdated] = useState<number>(globalCache.timestamp);
  const [error, setError] = useState<string | null>(null);
  const [watchlistIds, setWatchlistIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('watchlist');
    return saved ? JSON.parse(saved) : ['bitcoin', 'ethereum', 'solana', 'binancecoin', 'cardano'];
  });

  const fetchCoins = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && globalCache.data && (now - globalCache.timestamp) < 60000) {
      setAllCoins(globalCache.data);
      setLastUpdated(globalCache.timestamp);
      return;
    }

    try {
      const response = await fetch(COINGECKO_URL);
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Using cached data.');
        }
        throw new Error('Failed to fetch coin data.');
      }
      const data = await response.json();
      globalCache = { data, timestamp: now };
      setAllCoins(data);
      setLastUpdated(now);
      setError(null);
    } catch (err: any) {
      console.error('Watchlist fetch error:', err);
      setError(err.message);
      if (globalCache.data) {
        setAllCoins(globalCache.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoins();
    const interval = setInterval(() => fetchCoins(), 60000);
    return () => clearInterval(interval);
  }, [fetchCoins]);

  const toggleWatchlist = useCallback((coinId: string) => {
    setWatchlistIds(prev => {
      const isWatched = prev.includes(coinId);
      const next = isWatched ? prev.filter(id => id !== coinId) : [...prev, coinId];
      localStorage.setItem('watchlist', JSON.stringify(next));
      return next;
    });
  }, []);

  const isInWatchlist = useCallback((coinId: string) => {
    return watchlistIds.includes(coinId);
  }, [watchlistIds]);

  const getWatchlistCoins = useCallback(() => {
    return allCoins.filter(coin => watchlistIds.includes(coin.id));
  }, [allCoins, watchlistIds]);

  return {
    allCoins,
    watchlistCoins: getWatchlistCoins(),
    watchlistIds,
    loading,
    lastUpdated,
    error,
    toggleWatchlist,
    isInWatchlist,
    refresh: () => fetchCoins(true)
  };
};
