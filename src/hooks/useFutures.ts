import { useState, useEffect, useCallback } from 'react';
import type { FuturesPosition } from '../types';

const INITIAL_BALANCE = 1000;
const STORAGE_KEY_POSITIONS = 'futuresPositions';
const STORAGE_KEY_BALANCE = 'futuresBalance';

export const SUPPORTED_FUTURES_COINS: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'BNB': 'binancecoin',
  'SOL': 'solana',
  'ADA': 'cardano',
  'AVAX': 'avalanche-2',
  'LINK': 'chainlink',
  'DOT': 'polkadot'
};

export function useFutures(prices: Record<string, { usd: number }> | null) {
  const [positions, setPositions] = useState<FuturesPosition[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_POSITIONS);
    return saved ? JSON.parse(saved) : [];
  });

  const [balance, setBalance] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_BALANCE);
    if (!saved) {
      localStorage.setItem(STORAGE_KEY_BALANCE, INITIAL_BALANCE.toString());
      return INITIAL_BALANCE;
    }
    return parseFloat(saved);
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_POSITIONS, JSON.stringify(positions));
  }, [positions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_BALANCE, balance.toString());
  }, [balance]);

  const calculateLiquidationPrice = (direction: 'long' | 'short', entryPrice: number, leverage: number) => {
    const liquidationThreshold = 1 / leverage;
    if (direction === 'long') {
      return entryPrice * (1 - liquidationThreshold);
    } else {
      return entryPrice * (1 + liquidationThreshold);
    }
  };

  const checkLiquidations = useCallback((currentPrices: Record<string, { usd: number }>) => {
    setPositions((prev: FuturesPosition[]) => prev.map((position: FuturesPosition) => {
      if (position.status !== 'open') return position;

      const currentPrice = currentPrices[position.coinId]?.usd;
      if (!currentPrice) return position;

      const isLiquidatedLong = position.direction === 'long' && currentPrice <= position.liquidationPrice;
      const isLiquidatedShort = position.direction === 'short' && currentPrice >= position.liquidationPrice;

      if (isLiquidatedLong || isLiquidatedShort) {
        return {
          ...position,
          status: 'liquidated',
          closedAt: Date.now(),
          exitPrice: currentPrice,
          pnl: -position.margin,
          pnlPercent: -100
        };
      }

      return position;
    }));
  }, []);

  // Periodically check liquidations if prices are available
  useEffect(() => {
    if (!prices) return;
    const interval = setInterval(() => {
      checkLiquidations(prices);
    }, 30000);
    return () => clearInterval(interval);
  }, [prices, checkLiquidations]);

  const openPosition = useCallback((
    coin: string,
    direction: 'long' | 'short',
    leverage: number,
    size: number,
    currentPrice: number
  ) => {
    const coinId = SUPPORTED_FUTURES_COINS[coin.toUpperCase()];
    if (!coinId) throw new Error(`Coin ${coin} is not supported for futures.`);

    const margin = size / leverage;
    if (margin > balance) throw new Error(`Insufficient balance for ${leverage}x margin. Required: $${margin.toFixed(2)}, Available: $${balance.toFixed(2)}`);

    const liqPrice = calculateLiquidationPrice(direction, currentPrice, leverage);

    const newPosition: FuturesPosition = {
      id: Date.now(),
      coin: coin.toUpperCase(),
      coinId,
      direction,
      leverage,
      entryPrice: currentPrice,
      size,
      margin,
      liquidationPrice: liqPrice,
      openedAt: Date.now(),
      status: 'open'
    };

    setPositions((prev: FuturesPosition[]) => [...prev, newPosition]);
    setBalance((prev: number) => prev - margin);
    return newPosition;
  }, [balance]);

  const closePosition = useCallback((positionId: number, currentPrice: number) => {
    setPositions((prev: FuturesPosition[]) => prev.map(p => {
      if (p.id === positionId && p.status === 'open') {
        const priceChange = currentPrice - p.entryPrice;
        const priceChangePercent = priceChange / p.entryPrice;
        
        let pnl;
        if (p.direction === 'long') {
          pnl = p.size * priceChangePercent * p.leverage;
        } else {
          pnl = p.size * (-priceChangePercent) * p.leverage;
        }

        const pnlPercent = (pnl / p.margin) * 100;
        const returnAmount = p.margin + pnl;

        setBalance((prevBalance: number) => prevBalance + returnAmount);

        return {
          ...p,
          status: 'closed',
          closedAt: Date.now(),
          exitPrice: currentPrice,
          pnl,
          pnlPercent
        };
      }
      return p;
    }));
  }, []);

  const getLivePnL = useCallback((position: FuturesPosition, currentPrice: number) => {
    const priceChange = currentPrice - position.entryPrice;
    const priceChangePercent = priceChange / position.entryPrice;

    let pnl;
    if (position.direction === 'long') {
      pnl = position.size * priceChangePercent * position.leverage;
    } else {
      pnl = position.size * (-priceChangePercent) * position.leverage;
    }

    const pnlPercent = (pnl / position.margin) * 100;

    return { pnl, pnlPercent };
  }, []);

  return {
    positions,
    balance,
    openPosition,
    closePosition,
    checkLiquidations,
    getLivePnL,
    SUPPORTED_FUTURES_COINS
  };
}
