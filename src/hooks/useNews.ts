import { useState, useEffect, useCallback, useRef } from 'react';
import type { NewsArticle, FearGreedData } from '../types';

export function useNews(cryptoPanicToken: string) {
  const [fearGreedData, setFearGreedData] = useState<FearGreedData[]>([]);
  const [generalNews, setGeneralNews] = useState<NewsArticle[]>([]);
  const [cryptoPanicNews, setCryptoPanicNews] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const newsCache = useRef<{ data: NewsArticle[], timestamp: number | null }>({
    data: [],
    timestamp: null
  });

  const fetchFearGreed = useCallback(async () => {
    try {
      const response = await fetch('https://api.alternative.me/fng/?limit=7');
      if (!response.ok) return;
      const data = await response.json();
      setFearGreedData(data.data || []);
    } catch (err) {
      console.error('Failed to fetch Fear & Greed Index:', err);
    }
  }, []);

  const filterCryptoOnly = (articles: any[]): any[] => {
    const cryptoKeywords = [
      'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'blockchain',
      'defi', 'nft', 'web3', 'solana', 'sol', 'bnb', 'binance',
      'coinbase', 'altcoin', 'token', 'wallet', 'exchange', 'stablecoin',
      'cardano', 'ada', 'ripple', 'xrp', 'polygon', 'matic', 'doge',
      'dogecoin', 'shiba', 'avalanche', 'avax', 'chainlink', 'link'
    ];

    return articles.filter(article => {
      const titleLower = (article.title || '').toLowerCase();
      const bodyLower = (article.body || article.description || '').toLowerCase();
      return cryptoKeywords.some(keyword => titleLower.includes(keyword) || bodyLower.includes(keyword));
    });
  };

  const normalizeNews = (articles: any[], source: 'cryptopanic' | 'coingecko' | 'cryptocompare'): NewsArticle[] => {
    const filtered = filterCryptoOnly(articles);
    
    if (source === 'cryptocompare') {
      return filtered.map(a => ({
        title: a.title,
        url: a.url,
        source: { name: a.source_info?.name || a.source },
        author: a.source_info?.name || a.source,
        image: a.imageurl,
        thumb_2x: a.imageurl,
        created_at: new Date(a.published_on * 1000).toISOString(),
        description: a.body
      }));
    }
    if (source === 'cryptopanic') {
      return filtered.map(a => ({
        title: a.title,
        url: a.url,
        source: { name: a.source?.title || 'CryptoPanic' },
        author: a.source?.title,
        created_at: a.published_at,
        votes: a.votes
      }));
    }
    return [];
  };

  const fetchAllNewsWaterfall = useCallback(async () => {
    const now = Date.now();
    const threeMinutes = 3 * 60 * 1000;
    
    if (newsCache.current.data.length > 0 && newsCache.current.timestamp && (now - newsCache.current.timestamp) < threeMinutes) {
      setGeneralNews(newsCache.current.data);
      return;
    }

    // 1. CryptoCompare (Most reliable free API)
    try {
      const response = await fetch('/api/cryptocompare/data/v2/news/?lang=EN&sortOrder=latest');
      if (response.ok) {
        const data = await response.json();
        if (data.Data && data.Data.length > 0) {
          const mapped = normalizeNews(data.Data, 'cryptocompare');
          setGeneralNews(mapped);
          newsCache.current = { data: mapped, timestamp: now };
          setLastUpdated(now);
          return;
        }
      }
    } catch (e) {
      console.warn('CryptoCompare waterfall failed');
    }

    // 2. CryptoPanic (Backup if token is present)
    if (cryptoPanicToken) {
      try {
        const response = await fetch(`/api/cryptopanic/developer/v2/posts/?auth_token=${cryptoPanicToken}&kind=news&public=true`);
        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            const mapped = normalizeNews(data.results, 'cryptopanic');
            setGeneralNews(mapped);
            newsCache.current = { data: mapped, timestamp: now };
            setLastUpdated(now);
            return;
          }
        }
      } catch (e) {
        console.warn('CryptoPanic waterfall failed');
      }
    }
  }, [cryptoPanicToken]);

  const fetchCryptoPanicSignals = useCallback(async () => {
    if (!cryptoPanicToken) return;
    try {
      const response = await fetch(`/api/cryptopanic/developer/v2/posts/?auth_token=${cryptoPanicToken}&kind=news&public=true`);
      if (response.ok) {
        const data = await response.json();
        setCryptoPanicNews(normalizeNews(data.results || [], 'cryptopanic'));
      }
    } catch (err) {
      console.error('Failed to fetch CryptoPanic Signals');
    }
  }, [cryptoPanicToken]);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.allSettled([
      fetchFearGreed(),
      fetchAllNewsWaterfall(),
      fetchCryptoPanicSignals()
    ]);
    setIsLoading(false);
  }, [fetchFearGreed, fetchAllNewsWaterfall, fetchCryptoPanicSignals]);

  useEffect(() => {
    refreshAll();
  }, [cryptoPanicToken, refreshAll]);

  useEffect(() => {
    const fngInterval = setInterval(fetchFearGreed, 15 * 60 * 1000);
    const newsInterval = setInterval(refreshAll, 3 * 60 * 1000);
    return () => {
      clearInterval(fngInterval);
      clearInterval(newsInterval);
    };
  }, [fetchFearGreed, refreshAll]);

  return {
    fearGreedData,
    coinGeckoNews: generalNews,
    cryptoPanicNews,
    fetchCryptoPanicNewsByCoin: fetchCryptoPanicSignals,
    isLoading,
    error,
    lastUpdated,
    refreshAll,
  };
}
