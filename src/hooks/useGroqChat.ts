import { useState, useCallback, useRef } from 'react';
import type { Message, PortfolioHolding } from '../types';

const SYSTEM_PROMPT = `You are CryptoPilot, a crypto co-pilot AI agent. 
CRITICAL: You are currently in LIVE MODE. Your training data for cryptocurrency prices is COMPLETELY OBSOLETE (dating back to 2023). You MUST ONLY use the [CONTEXT] prices provided in the current message. If no [CONTEXT] is provided, state that you don't have live prices. NEVER mention BTC at $20k-$30k or ETH at $1k-$2k unless the live data confirms it. 

TRANSACTION PROTOCOL:
- You help users prepare transactions.
- NEVER claim a transaction is "sent", "complete", or "confirmed" yourself. 
- If a user wants to send/transfer funds, and you have the AMOUNT, COIN, and RECIPIENT NAME/ADDRESS:
  1. Say: "I've prepared the transfer of [AMOUNT] [COIN] to [NAME]. Please verify the details on the right and confirm to proceed."
  2. ALWAYS append this tag to the very end of your message: [[ACTION:SEND|amount:X|coin:Y|address:Z|name:W]]
- If details are missing, ask for them. Use the ACTUAL WALLET HOLDINGS from context to verify if they have the funds.

You help users manage their crypto portfolio, analyze markets, and detect chart patterns. Before any trade action always explain the why — sentiment, risk level, market condition. Keep responses concise and conversational. Always reason out loud before giving advice. Use markdown-style formatting with **bold** for key terms and numbers. Be friendly but professional.`;

export function useGroqChat(apiKey: string, onActionDetected?: (action: string, params: Record<string, string>) => void) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      role: 'assistant',
      content: "Hey, I'm your crypto co-pilot. 🚀 Connect your wallet or just ask me anything to get started.",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string, walletContext?: { address: string | null; holdings: PortfolioHolding[]; contacts?: Record<string, string> }) => {
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
        const noKeyMsg: Message = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: '⚙️ Please add your **Groq API key** via the settings icon in the sidebar to enable AI responses. Get a free key at [console.groq.com](https://console.groq.com).',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, noKeyMsg]);
        setIsLoading(false);
        return;
      }

      // Build conversation history for Groq
      const historyMessages = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Fetch live market data
      let livePricesContext = '';
      try {
        const coinIds = 'bitcoin,ethereum,solana,binancecoin,cardano,avalanche-2,chainlink,polkadot,tether,usd-coin';
        const priceRes = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`
        );
        if (priceRes.ok) {
          const priceData = await priceRes.json();
          const p = (id: string) => {
            const d = priceData[id];
            if (!d) return 'N/A';
            return `$${d.usd} (${d.usd_24h_change >= 0 ? '+' : ''}${d.usd_24h_change?.toFixed(2)}%)`;
          };
          
          livePricesContext = `BTC: ${p('bitcoin')}\nETH: ${p('ethereum')}\nSOL: ${p('solana')}\nBNB: ${p('binancecoin')}\nADA: ${p('cardano')}\nAVAX: ${p('avalanche-2')}\nLINK: ${p('chainlink')}\nDOT: ${p('polkadot')}\nUSDT: ${p('tether')}\nUSDC: ${p('usd-coin')}`;
        }
      } catch (err) {
        console.error('Failed to fetch live prices for AI context', err);
      }

      // Build real wallet holdings context
      let walletHoldingsStr = 'NO WALLET CONNECTED. Assume users holds 0 of everything.';
      if (walletContext && walletContext.address) {
        walletHoldingsStr = `USER'S ACTUAL WALLET HOLDINGS (fetched live):\nWallet Address: ${walletContext.address}\n` + 
          walletContext.holdings.map(h => `${h.symbol}: ${h.amount} ${h.symbol}`).join('\n');
      }

      // Build saved contacts context
      let contactsStr = 'NO CONTACTS SAVED.';
      if (walletContext && walletContext.contacts && Object.keys(walletContext.contacts).length > 0) {
        contactsStr = `SAVED CONTACTS (Address Book):\n` + 
          Object.entries(walletContext.contacts).map(([name, addr]) => `${name}: ${addr}`).join('\n');
      }

      const contextualPrompt = `
LIVE MARKET DATA (Data fetched at: ${new Date().toISOString()}):
${livePricesContext}

${walletHoldingsStr}

${contactsStr}

CRITICAL RULES: 
1. Never assume the user holds any cryptocurrency unless it explicitly appears in their ACTUAL WALLET HOLDINGS listed above. 
2. If user asks about a coin they don't hold, give market analysis but clearly state "you don't currently hold this coin."
3. Use ONLY the above prices and balances. ignore your training data.
`;

      console.log('Final Context for AI:', contextualPrompt);

      const reqBody = {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...historyMessages,
          { 
            role: 'user', 
            content: `${content.trim()}\n\n[CONTEXT] ${contextualPrompt}` 
          },
        ],
        temperature: 0.7,
        max_tokens: 512,
        stream: false,
      };

      abortRef.current = new AbortController();

      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(reqBody),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `API Error ${res.status}`);
        }

        const data = await res.json();
        let aiContent = data.choices?.[0]?.message?.content || 'I had trouble generating a response. Please try again.';

        // --- ACTION PARSING ---
        const actionMatch = aiContent.match(/\[\[ACTION:(.*?)\]\]/);
        if (actionMatch && onActionDetected) {
          const rawParams = actionMatch[1].split('|');
          const type = rawParams[0];
          const params: Record<string, string> = {};
          rawParams.slice(1).forEach((p: string) => {
             const [k, v] = p.split(':');
             if (k && v) params[k.trim()] = v.trim();
          });
          
          onActionDetected(type, params);
          
          // Strip actions from visible chat
          aiContent = aiContent.replace(/\[\[ACTION:.*?\]\]/g, '').trim();
        }

        const aiMsg: Message = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: aiContent,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiMsg]);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        const errMsg: Message = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: `❌ **Error:** ${err.message || 'Something went wrong. Check your API key and try again.'}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [apiKey, messages, isLoading, onActionDetected]
  );

  const addSystemMessage = useCallback((content: string) => {
    const msg: Message = {
      id: `sys-${Date.now()}`,
      role: 'assistant',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([
      {
        id: 'init-reset',
        role: 'assistant',
        content: "Chat cleared. I'm still here — ask me anything about crypto!",
        timestamp: new Date(),
      },
    ]);
  }, []);

  return { messages, isLoading, sendMessage, addSystemMessage, clearMessages };
}
