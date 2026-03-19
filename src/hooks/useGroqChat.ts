import { useState, useCallback, useRef, useEffect } from 'react';
import type { Message, PortfolioHolding, AppTransaction } from '../types';

const SYSTEM_PROMPT = `You are CryptoPilot — an intelligent, reasoning-driven crypto co-pilot. 

[CRITICAL RULE: TRANSACTION PROCESSING]
- You CANNOT process transactions or change balances yourself. You are a PREPARER.
- To execute a transfer or swap, you MUST generate the [[ACTION:TYPE|...]] code. 
- The user will THEN see a confirmation pop-up in the UI and must click "Confirm" to actually execute it.
- NEVER say "I have processed the transaction" or "The transaction is complete" until AFTER the user confirms in the UI. 
- Instead say: "I've prepared the transfer for you. Please review and confirm the details on the right."

[LANGUAGE RULES]
- Never use phrases like "blood in the streets", "dead cat bounce", "capitulation", "HODL", or "to the moon".
- Speak like a smart friend — simple, clear, direct. No dramatic language.

[NEWS & SENTIMENT RULES]
- ONLY mention Fear & Greed for market/trade advice. Do NOT mention it for simple transfers (SEND).
- If referencing news, naturally weave it into your response. No numbered lists.

[ACTIONS PROTOCOL — STRICT FORMAT]
You MUST use the exact format [[ACTION:TYPE|key:value|key:value]] to trigger app actions. 
Examples:
- SEND: [[ACTION:SEND|amount:0.1|coin:USDT|name:Pushkar|address:0x123...]]
- SWAP: [[ACTION:SWAP|fromToken:BNB|toToken:USDT|amount:1]]
- WATCHLIST: [[ACTION:WATCHLIST_ADD|coinId:bitcoin]]
- CHART: [[ACTION:SHOW_CHART|coinId:ethereum]]
- NEWS: [[ACTION:SHOW_NEWS]]
- FUTURES_OPEN: [[ACTION:FUTURES_OPEN|coin:BTC|direction:long|leverage:10|size:100]]
- FUTURES_CLOSE: [[ACTION:FUTURES_CLOSE|positionId:123456789]]

IMPORTANT: Always check the ADDRESS BOOK below for contact addresses before preparing a SEND action.
- NEVER guess or assume a transaction amount (like 0.1) or coin symbol (like USDT) if the user did not specify them.
- If details are missing (e.g. they just say "Send to Pushkar"), respond by asking for the amount and the coin symbol.
- ONLY generate the [[ACTION:SEND|...]] block when the user has provided a specific amount and coin.

[FUTURES RULES]
- Supported coins: BTC, ETH, BNB, SOL, ADA, AVAX, LINK, DOT.
- Leverage: 2x, 5x, 10x, 20x, 50x, 100x.
- 50x or above leverage is extremely risky. Warn the user if they request it.
- When opening a position, confirm the details: "Opening a 10x long BTC position. Entry price: $71,240. Size: $100. Margin used: $10. Liquidation price: $64,116. Good luck! 🚀"
- When a user asks about their positions or PnL, reference the provided PAPER FUTURES POSITIONS context.
- To open a position, use [[ACTION:FUTURES_OPEN|coin:SYMBOL|direction:long/short|leverage:NUM|size:USD_AMOUNT]].
- To close a position, use [[ACTION:FUTURES_CLOSE|positionId:ID]].`;

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

      // 1. Live Prices Context
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

      // 2. Sentiment Context
      let sentimentBlock = 'SENTIMENT: N/A';
      if (sentimentContext?.fearGreed && sentimentContext.fearGreed.length > 0) {
        const f = sentimentContext.fearGreed;
        sentimentBlock = `CURRENT MARKET SENTIMENT:\nFear & Greed Index: ${f[0].value}/100 — ${f[0].value_classification}\nYesterday: ${f[1]?.value || 'N/A'}\nLast Week: ${f[6]?.value || 'N/A'}`;
      }

      // 3. News Context
      const coinKeywords: Record<string, string[]> = { 'BTC': ['btc', 'bitcoin'], 'ETH': ['eth', 'ethereum'], 'BNB': ['bnb', 'binance'], 'SOL': ['sol', 'solana'] };
      const msgLower = content.toLowerCase();
      let detectedCoin: string | null = null;
      for (const [coin, keywords] of Object.entries(coinKeywords)) { if (keywords.some(k => msgLower.includes(k))) { detectedCoin = coin; break; } }

      let newsBlock = 'NO RELEVANT NEWS AVAILABLE.';
      if (sentimentContext?.news && sentimentContext.news.length > 0) {
        let relevantNews = sentimentContext.news;
        if (detectedCoin) {
          relevantNews = sentimentContext.news.filter(n => n.title.toLowerCase().includes(detectedCoin!.toLowerCase()));
        } else {
          const black = ['amd', 'samsung', 'senator', 'politics'];
          relevantNews = sentimentContext.news.filter(n => !black.some(b => n.title.toLowerCase().includes(b)));
        }
        if (relevantNews.length > 0) {
          newsBlock = `RELEVANT NEWS HEADLINES ${detectedCoin ? `FOR ${detectedCoin}` : '(GENERAL)'}:\n${relevantNews.slice(0, 5).map((n, i) => `${i + 1}. ${n.title}`).join('\n')}`;
        }
      }

      // 4. User context (NOW INCLUDING CONTACTS)
      const holdings = walletContext?.address ? walletContext.holdings.map(h => `${h.amount} ${h.symbol}`).join(', ') : 'None';
      const contacts = walletContext?.contacts ? Object.entries(walletContext.contacts).map(([n, a]) => `${n}: ${a}`).join(', ') : 'Empty';
      
      const userContext = `USER CONTEXT:
Address: ${walletContext?.address || 'Not connected'}
Holdings: ${holdings}
ADDRESS BOOK: ${contacts}
Watchlist: ${walletContext?.watchlist?.join(', ') || 'Empty'}

PAPER FUTURES POSITIONS:
${!futuresContext || futuresContext.positions.length === 0 ? 'No open positions' : 
  futuresContext.positions.map(p => 
    `${p.direction.toUpperCase()} ${p.coin} ${p.leverage}x | Entry: $${p.entryPrice} | Size: $${p.size} | Liq: $${p.liquidationPrice}`
  ).join('\n')}

Virtual Balance: $${futuresContext?.balance || '1000'}`;

      const dynamicSystemMessage = `
[LIVE DATA]
${pricesBlock}
${sentimentBlock}
${newsBlock}

${userContext}

STRICT: To SEND or SWAP, you MUST include the [[ACTION:TYPE|...]] block. Check the ADDRESS BOOK for recipient addresses.
`;

      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'system', content: dynamicSystemMessage },
              ...messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
              { role: 'user', content: content.trim() }
            ],
            temperature: 0.5,
            max_tokens: 600
          })
        });

        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        let aiContent = data.choices[0].message.content;

        const actionMatch = aiContent.match(/\[\[ACTION:(.*?)\]\]/);
        if (actionMatch && onActionDetectedRef.current) {
          const parts = actionMatch[1].split('|');
          const type = parts[0];
          const params: Record<string, string> = {};
          parts.slice(1).forEach((p: string) => {
            const [k, v] = p.split(':');
            if (k && v) params[k.trim()] = v.trim();
          });
          onActionDetectedRef.current(type, params);
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
  }, []);

  return { messages, isLoading, sendMessage, addSystemMessage, clearMessages };
}
