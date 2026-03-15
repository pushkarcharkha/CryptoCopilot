import { useState, useCallback } from 'react';
import type { AppTransaction } from '../types';

export const useTransactionHistory = () => {
  const [history, setHistory] = useState<AppTransaction[]>(() => {
    const saved = localStorage.getItem('txHistory');
    return saved ? JSON.parse(saved) : [];
  });

  const saveTransaction = useCallback((tx: Omit<AppTransaction, 'id' | 'timestamp'>) => {
    setHistory(prev => {
      // Check if transaction already exists (to update status)
      const existingIndex = prev.findIndex(item => item.hash === tx.hash);
      let newHistory;
      
      if (existingIndex > -1) {
        newHistory = [...prev];
        newHistory[existingIndex] = {
          ...newHistory[existingIndex],
          ...tx,
          timestamp: newHistory[existingIndex].timestamp // Keep original timestamp
        };
      } else {
        const newTx: AppTransaction = {
          ...tx,
          id: tx.hash,
          timestamp: Date.now()
        };
        newHistory = [newTx, ...prev];
      }
      
      localStorage.setItem('txHistory', JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  const getRecentHistory = useCallback((limit: number = 10) => {
    return history.slice(0, limit);
  }, [history]);

  return { history, saveTransaction, getRecentHistory };
};
