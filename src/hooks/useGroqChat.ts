import { useState, useCallback, useRef, useEffect } from 'react';
import type { Message, PortfolioHolding, AppTransaction } from '../types';
import { detectAgent, detectFuturesIntent, buildAgentPrompt } from '../agents';
import type { AgentType, AgentContext } from '../agents';

export function useGroqChat(apiKey: string, onActionDetected?: (action: string, params: Record<string, string>) => void | Promise<void>) {
  const onActionDetectedRef = useRef(onActionDetected);
  
  useEffect(() => {
    onActionDetectedRef.current = onActionDetected;
  }, [onActionDetected]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      role: 'assistant',
      content: "Hey, I'm your crypto co-pilot. 🚀 Markets are moving fast — I've got the latest sentiment and news stats ready for you. Ask me anything!",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastAgent, setLastAgent] = useState<AgentType | null>(null);

  const sendMessage = useCallback(
    async (
      content: string, 
      walletContext?: { 
        address: string | null; 
        holdings: PortfolioHolding[]; 
        contacts?: Record<string, string>; 
        history?: AppTransaction[]; 
        watchlist?: string[] 
      },
      sentimentContext?: {
        fearGreed?: any[];
        news?: any[];
      },
      futuresContext?: {
        balance: number;
        positions: any[];
      },
      activeFeature?: string | null,
      chartAnalysisResults?: {
        coin: string;
        coinSymbol: string;
        currentPrice: number;
        support: number;
        resistance: number;
        ema20: number;
        ema50: number;
        trendline: number | null;
        buySignals: number;
        sellSignals: number;
      } | null,
      options?: {
        allowActions?: boolean;
      }
    ) => {
      if (!content.trim() || isLoading) return;

      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      if (!apiKey) {
        setMessages((prev) => [...prev, {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: '⚙️ Please add your **Groq API key** in settings to enable AI responses.',
          timestamp: new Date(),
        }]);
        setIsLoading(false);
        return;
      }

      // ── 1. Detect which agent should handle this ──────────────────────
      const agent = detectAgent(content, activeFeature || null);
      setLastAgent(agent);

      // Detect futures intent to prevent accidental position opening
      const futuresIntent = agent === 'FUTURES' ? detectFuturesIntent(content) : undefined;
      console.log(`🤖 Agent Router → Using agent: ${agent} (sidebar: ${activeFeature || 'none'})${futuresIntent ? ` [futures intent: ${futuresIntent}]` : ''}`);

      // ── 2. Build live prices context ──────────────────────────────────
      let pricesBlock = 'PRICES UNAVAILABLE';
      try {
        const coinIds = 'bitcoin,ethereum,solana,binancecoin,cardano,avalanche-2,chainlink,polkadot,tether,usd-coin,ripple';
        const priceRes = await fetch(`/api/coingecko/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true`);
        if (priceRes.ok) {
          const d = await priceRes.json().catch(() => ({}));
          const format = (id: string, name: string) => d[id] ? `${name}: $${d[id].usd} (${d[id].usd_24h_change?.toFixed(2)}%)` : `${name}: N/A`;
          pricesBlock = `LIVE MARKET PRICES:\n${format('bitcoin', 'BTC')}\n${format('ethereum', 'ETH')}\n${format('binancecoin', 'BNB')}\n${format('solana', 'SOL')}\n${format('ripple', 'XRP')}\n${format('cardano', 'ADA')}\n${format('chainlink', 'LINK')}`;
        }
      } catch (err) { console.error(err); }

      // ── 3. Build sentiment context ────────────────────────────────────
      let sentimentBlock = 'SENTIMENT: N/A';
      if (sentimentContext?.fearGreed && sentimentContext.fearGreed.length > 0) {
        const f = sentimentContext.fearGreed;
        sentimentBlock = `CURRENT MARKET SENTIMENT:\nFear & Greed Index: ${f[0].value}/100 — ${f[0].value_classification}\nYesterday: ${f[1]?.value || 'N/A'}\nLast Week: ${f[6]?.value || 'N/A'}`;
      }

      // ── 4. Build news context ─────────────────────────────────────────
      const coinKeywords: Record<string, string[]> = { 'BTC': ['btc', 'bitcoin'], 'ETH': ['eth', 'ethereum'], 'BNB': ['bnb', 'binance'], 'SOL': ['sol', 'solana'] };
      const msgLower = content.toLowerCase();
      let detectedCoin: string | null = null;
      for (const [coin, keywords] of Object.entries(coinKeywords)) { if (keywords.some(k => msgLower.includes(k))) { detectedCoin = coin; break; } }

      let newsBlock = 'NO RELEVANT NEWS AVAILABLE.';
      if (sentimentContext?.news && sentimentContext.news.length > 0) {
        let relevantNews = sentimentContext.news;
        if (detectedCoin) {
          relevantNews = sentimentContext.news.filter((n: any) => n.title.toLowerCase().includes(detectedCoin!.toLowerCase()) || n.description?.toLowerCase().includes(detectedCoin!.toLowerCase()));
        }

        if (relevantNews.length > 0) {
          const topNews = relevantNews.slice(0, 5).map((n: any, i: number) => `${i + 1}. ${n.title} (${n.source})`).join('\n');
          newsBlock = `LATEST CRYPTO NEWS ${detectedCoin ? `(FILTERED FOR ${detectedCoin})` : ''}:
${topNews}

Only reference these headlines when directly relevant to what the user asked.`;
        }
      }

      // ── 5. Build user context block ───────────────────────────────────
      const holdings = walletContext?.address ? walletContext.holdings.map(h => `${h.amount} ${h.symbol}`).join(', ') : 'None';
      const contactsStr = walletContext?.contacts ? Object.entries(walletContext.contacts).map(([n, a]) => `${n}: ${a}`).join(', ') : 'Empty';
      
      const userContextBlock = `USER CONTEXT:
Address: ${walletContext?.address || 'Not connected'}
Holdings: ${holdings}
ADDRESS BOOK: ${contactsStr}
Watchlist: ${walletContext?.watchlist?.join(', ') || 'Empty'}

PAPER FUTURES POSITIONS:
${!futuresContext || futuresContext.positions.length === 0 ? 'No open positions' : 
  futuresContext.positions.map((p: any) => 
    `${p.direction.toUpperCase()} ${p.coin} ${p.leverage}x | Entry: $${p.entryPrice} | Size: $${p.size} | Liq: $${p.liquidationPrice}`
  ).join('\n')}

Virtual Balance: $${futuresContext?.balance || '1000'}`;

      // ── 6. Build the agent-specific system prompt ─────────────────────
      const agentContext: AgentContext = {
        pricesBlock,
        sentimentBlock,
        newsBlock,
        userContextBlock,
        walletAddress: walletContext?.address,
        holdings,
        contacts: contactsStr,
        watchlistIds: walletContext?.watchlist,
        txHistory: walletContext?.history,
        futuresPositions: futuresContext?.positions,
        futuresBalance: futuresContext?.balance,
        chartAnalysisResults: chartAnalysisResults || null,
        futuresIntent,
      };

      const systemPrompt = buildAgentPrompt(agent, agentContext);

      // ── 7. Send to Groq ───────────────────────────────────────────────
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
              { role: 'user', content: content.trim() }
            ],
            temperature: agent === 'WALLET' || agent === 'FUTURES' ? 0.3 : 0.5,
            max_tokens: agent === 'CHART_ANALYSIS' || agent === 'PORTFOLIO' ? 800 : 600
          })
        });

        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        let aiContent = data.choices[0].message.content;

        const allowActions = options?.allowActions !== false;
        const actionMatch = aiContent.match(/\[\[ACTION:(.*?)\]\]/);
        if (allowActions && actionMatch && onActionDetectedRef.current) {
          const parts = actionMatch[1].split('|');
          const type = parts[0];
          const params: Record<string, string> = {};
          parts.slice(1).forEach((p: string) => {
            const [k, v] = p.split(':');
            if (k && v) params[k.trim()] = v.trim();
          });
          onActionDetectedRef.current(type, params);
          aiContent = aiContent.replace(/\[\[ACTION:.*?\]\]/g, '').trim();
        } else if (actionMatch) {
          aiContent = aiContent.replace(/\[\[ACTION:.*?\]\]/g, '').trim();
        }

        setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: aiContent, timestamp: new Date() }]);
      } catch (err: any) {
        setMessages(prev => [...prev, { id: `e-${Date.now()}`, role: 'assistant', content: `❌ Error: ${err.message}`, timestamp: new Date() }]);
      } finally {
        setIsLoading(false);
      }
    },
    [apiKey, messages, isLoading]
  );

  const addSystemMessage = useCallback((content: string) => {
    setMessages((prev) => [...prev, { id: `sys-${Date.now()}`, role: 'assistant', content, timestamp: new Date() }]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([{ id: 'reset', role: 'assistant', content: "Chat cleared. Ask me anything!", timestamp: new Date() }]);
    setLastAgent(null);
  }, []);

  return { messages, isLoading, sendMessage, addSystemMessage, clearMessages, lastAgent };
}
