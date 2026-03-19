import { useState, useCallback, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import ChatPanel from './components/ChatPanel';
import RightPanel from './components/RightPanel';
import SignalFeed from './components/SignalFeed';
import SettingsModal from './components/SettingsModal';
import { useGroqChat } from './hooks/useGroqChat';
import { useWallet, TOKEN_ADDRESSES } from './hooks/useWallet';
import { useCryptoPrices } from './hooks/useCrypto';
import { useContacts } from './hooks/useContacts';
import { usePancakeSwap, BNB_TOKENS, WBNB } from './hooks/usePancakeSwap';
import { useTransactionHistory } from './hooks/useTransactionHistory';
import { useWatchlist } from './hooks/useWatchlist';
import { useNews } from './hooks/useNews';
import { useFutures, SUPPORTED_FUTURES_COINS } from './hooks/useFutures';
import type { RightPanelView, SidebarFeature, TraderSignal, TransactionPreview, SwapPreview, CoinGeckoCoin } from './types';
import { ethers } from 'ethers';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'agent' | 'signals'>('agent');
  const [rightPanelView, setRightPanelView] = useState<RightPanelView>('prices');
  const [activeFeature, setActiveFeature] = useState<SidebarFeature | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('groq_api_key') || '');
  const [activeCoin, setActiveCoin] = useState<CoinGeckoCoin | null>(null);
  const [transactionPreview, setTransactionPreview] = useState<TransactionPreview | null>(null);
  const [swapPreview, setSwapPreview] = useState<SwapPreview | null>(null);
  const [cryptoPanicToken, setCryptoPanicToken] = useState<string>(() => localStorage.getItem('cryptopanic_token') || '');
  const [manualPanelOverride, setManualPanelOverride] = useState<RightPanelView | null>(null);
  
  // Use ref to break circular dependency with useGroqChat
  const addSystemMessageRef = useRef<((content: string) => void) | null>(null);
  const addSystemMessageProxy = useCallback((content: string) => {
    addSystemMessageRef.current?.(content);
  }, []);

  const { wallet, connectWallet, switchNetwork, refreshBalances, getExplorerUrl, formatAddress } = useWallet();
  const { contacts, addContact, removeContact } = useContacts();
  const { history, saveTransaction } = useTransactionHistory();
  const { getSwapQuote, approveToken } = usePancakeSwap();
  const { allCoins, watchlistCoins, watchlistIds, loading: watchlistLoading, lastUpdated: watchlistLastUpdated, toggleWatchlist, isInWatchlist } = useWatchlist();
  
  const { 
    coinGeckoNews: newsData, 
    cryptoPanicNews: panicNewsData, 
    fearGreedData, 
    isLoading: newsLoading, 
    error: newsError, 
    lastUpdated: newsLastUpdated 
  } = useNews(cryptoPanicToken);

  const { prices, isLoading: pricesLoading } = useCryptoPrices(['bitcoin', 'ethereum', 'solana', 'cardano', 'chainlink', 'binancecoin', 'matic-network', 'avalanche-2', 'tether', 'usd-coin', 'ripple', 'polkadot']);
  
  const futuresPricesMap = prices ? Object.fromEntries(prices.map(p => [p.id, { usd: p.price }])) : null;
  const { positions: futuresPositions, balance: futuresBalance, openPosition, closePosition, getLivePnL } = useFutures(futuresPricesMap);

  // Helper for auto-switching panels that respects manual overrides
  const setPanelSafe = useCallback((panel: RightPanelView) => {
    if (manualPanelOverride) return;
    setRightPanelView(panel);
  }, [manualPanelOverride]);

  // Define action handler for the AI
  const handleAIAction = useCallback(async (action: string, params: Record<string, string>) => {
    if (action === 'SEND') {
      const { amount, coin, address, name } = params;
      if (amount && coin && address && name) {
        const gasMap: Record<string, string> = {
          'BNB Smart Chain': '< $0.05',
          'Polygon Mainnet': '< $0.05',
          'Ethereum Mainnet': '$2 - $10'
        };
        const estGas = gasMap[wallet.networkName || ''] || 'Low';

        setTransactionPreview({
          recipientName: name,
          address,
          amount,
          coin: coin.toUpperCase(),
          estimatedGas: estGas,
          networkName: wallet.networkName || 'Unknown Network'
        });
        setRightPanelView('transaction');
        setManualPanelOverride('transaction');
      }
    } else if (action === 'SWAP') {
      const { fromToken, toToken, amount } = params;
      if (fromToken && toToken && amount && wallet.address) {
        try {
          const fromAddr = BNB_TOKENS[fromToken.toUpperCase()] || fromToken;
          const toAddr = BNB_TOKENS[toToken.toUpperCase()] || toToken;
          
          addSystemMessageProxy(`🔍 Fetching PancakeSwap quote for **${amount} ${fromToken}**...`);

          const decimals = 18; 
          const amountWei = ethers.parseUnits(amount, decimals).toString();

          const estimatedOutputWei = await getSwapQuote(fromAddr, toAddr, amountWei);
          const estimatedOutput = ethers.formatUnits(estimatedOutputWei, decimals);
          
          setSwapPreview({
            fromToken: fromToken.toUpperCase(),
            fromTokenAddress: fromAddr,
            fromAmount: amount,
            toToken: toToken.toUpperCase(),
            toTokenAddress: toAddr,
            toAmount: estimatedOutput,
            rate: `1 ${fromToken.toUpperCase()} = ${(parseFloat(estimatedOutput) / parseFloat(amount)).toFixed(6)} ${toToken.toUpperCase()}`,
            estimatedGas: `< $0.15`, 
            slippage: 1,
            rawSwapData: { amountWei, estimatedOutputWei: estimatedOutputWei.toString() }
          });
          setRightPanelView('swap');
          setManualPanelOverride('swap');
          addSystemMessageProxy(`✅ Quote received! You'll get approx **${parseFloat(estimatedOutput).toFixed(4)} ${toToken.toUpperCase()}**. Review and confirm on the right.`);
        } catch (err: any) {
          addSystemMessageProxy(`❌ Swap Error: ${err.message}`);
        }
      }
    } else if (action === 'WATCHLIST_ADD') {
      const { coinId } = params;
      if (coinId) {
        toggleWatchlist(coinId);
        addSystemMessageProxy(`✅ Added **${coinId}** to your watchlist.`);
      }
    } else if (action === 'WATCHLIST_REMOVE') {
      const { coinId } = params;
      if (coinId) {
        toggleWatchlist(coinId);
        addSystemMessageProxy(`🗑️ Removed **${coinId}** from your watchlist.`);
      }
    } else if (action === 'SHOW_CHART') {
      const { coinId } = params;
      if (coinId) {
        const coin = allCoins.find(c => c.id === coinId || c.symbol === coinId.toLowerCase());
        if (coin) {
          setActiveCoin(coin);
          setRightPanelView('coin-chart');
          setManualPanelOverride('coin-chart');
          addSystemMessageProxy(`📈 Opening **${coin.name}** chart...`);
        } else {
          addSystemMessageProxy(`❌ Sorry, I couldn't find a chart for **${coinId}**.`);
        }
      }
    } else if (action === 'NAVIGATE') {
      const { view } = params;
      if (view === 'watchlist') {
        setPanelSafe('watchlist');
        addSystemMessageProxy(`📋 Opening your watchlist.`);
      }
    } else if (action === 'SHOW_NEWS') {
      setRightPanelView('news-sentiment');
      setManualPanelOverride('news-sentiment'); // Hard override when showing news
      addSystemMessageProxy(`📊 Opening Market News & Sentiment...`);
    } else if (action === 'FUTURES_OPEN') {
      const { coin, direction, leverage, size } = params;
      if (coin && direction && leverage && size && prices) {
        try {
          const coinId = SUPPORTED_FUTURES_COINS[coin.toUpperCase()];
          const currentPrice = prices.find(p => p.id === coinId)?.price || 0;
          if (currentPrice === 0) throw new Error(`Price for ${coin} not available.`);
          
          const lev = parseInt(leverage);
          if (lev >= 50) {
            addSystemMessageProxy(`⚠️ **Warning**: ${lev}x leverage is extremely risky. A small price move against you will liquidate the position.`);
          }

          const pos = openPosition(coin, direction as 'long' | 'short', lev, parseFloat(size), currentPrice);
          setRightPanelView('futures');
          setManualPanelOverride('futures');
          addSystemMessageProxy(`🚀 **Position Opened**\n${pos.direction.toUpperCase()} ${pos.coin} ${pos.leverage}x\nEntry: $${pos.entryPrice.toLocaleString()}\nSize: $${pos.size}\nMargin: $${pos.margin.toFixed(2)}\nLiq Price: $${pos.liquidationPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
        } catch (err: any) {
          addSystemMessageProxy(`❌ Failed to open position: ${err.message}`);
        }
      }
    } else if (action === 'FUTURES_CLOSE') {
      const { positionId } = params;
      if (positionId && prices) {
        const id = parseInt(positionId);
        const pos = futuresPositions.find(p => p.id === id);
        if (pos) {
          const coinId = SUPPORTED_FUTURES_COINS[pos.coin.toUpperCase()];
          const currentPrice = prices.find(p => p.id === coinId)?.price || 0;
          closePosition(id, currentPrice);
          
          const { pnl, pnlPercent } = getLivePnL(pos, currentPrice);
          addSystemMessageProxy(`✅ **Position Closed**\n${pos.coin} ${pos.direction.toUpperCase()} closed at $${currentPrice.toLocaleString()}\nPnL: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)`);
        }
      }
    }
  }, [wallet.networkName, wallet.address, getSwapQuote, addSystemMessageProxy, toggleWatchlist, allCoins, manualPanelOverride, setPanelSafe, prices, openPosition, closePosition, futuresPositions, getLivePnL]);

  const { messages, isLoading, sendMessage, addSystemMessage, clearMessages } = useGroqChat(apiKey, handleAIAction);
  
  useEffect(() => {
    addSystemMessageRef.current = addSystemMessage;
  }, [addSystemMessage]);

  // Handle sidebar feature click → preset message + panel update
  const handleFeatureClick = useCallback(
    (feature: SidebarFeature, message: string) => {
      setActiveFeature(feature);
      setActiveTab('agent');

      const walletCtx = { 
        address: wallet.address, 
        holdings: wallet.holdings, 
        contacts, 
        history, 
        watchlist: watchlistIds 
      };
      const sentimentCtx = { 
        fearGreed: fearGreedData, 
        news: newsData 
      };
      const futuresCtx = {
        balance: futuresBalance,
        positions: futuresPositions
      };

      // Update right panel based on feature
      if (feature === 'portfolio') {
        setRightPanelView('portfolio');
        setManualPanelOverride('portfolio');
        sendMessage(message, walletCtx, sentimentCtx, futuresCtx);
      } else if (feature === 'wallet') {
        setRightPanelView('contacts');
        setManualPanelOverride('contacts');
        addSystemMessage("Here are your saved contacts. You can add someone by saying 'add [name] [wallet address]'.");
      } else if (feature === 'watchlist') {
        setRightPanelView('watchlist');
        setManualPanelOverride('watchlist');
        sendMessage(message, walletCtx, sentimentCtx, futuresCtx);
      } else if (feature === 'chart') {
        const btc = allCoins.find(c => c.symbol === 'btc') || allCoins[0];
        if (btc) setActiveCoin(btc);
        setRightPanelView('coin-chart');
        setManualPanelOverride('coin-chart');
        sendMessage(message, walletCtx, sentimentCtx, futuresCtx);
      } else if (feature === 'journal') {
        setRightPanelView('history');
        setManualPanelOverride('history');
        sendMessage(message, walletCtx, sentimentCtx, futuresCtx);
      } else if (feature === 'news-sentiment') {
        setRightPanelView('news-sentiment');
        setManualPanelOverride('news-sentiment');
        // Silent - Do not sendMessage
      } else if (feature === 'futures') {
        setRightPanelView('futures');
        setManualPanelOverride('futures');
        addSystemMessage("You're in paper futures mode. You can open long or short positions with leverage. Try saying 'open a long BTC position with 10x leverage for $100'");
      } else {
        setRightPanelView('prices');
        setManualPanelOverride('prices');
        sendMessage(message, walletCtx, sentimentCtx, futuresCtx);
      }
    },
    [sendMessage, addSystemMessage, wallet.address, wallet.holdings, contacts, history, watchlistIds, allCoins, fearGreedData, newsData, futuresBalance, futuresPositions]
  );

  const handleConfirmTransaction = useCallback(async () => {
    const preview = transactionPreview;
    if (!wallet.isConnected || !window.ethereum || !preview) {
      addSystemMessage("Please connect your wallet first to confirm this transaction.");
      return;
    }
    
    let txHash = "";
    try {
      addSystemMessage(`⏳ Requesting signature for **${preview.amount} ${preview.coin}**...`);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      
      let response;
      const coinUpper = preview.coin.toUpperCase();
      const isNative = ['BNB', 'ETH', 'MATIC', 'AVAX'].includes(coinUpper);
      
      if (isNative) {
        response = await signer.sendTransaction({
          to: preview.address,
          value: ethers.parseEther(preview.amount)
        });
      } else {
        // Token transfer logic
        const chainTokens = TOKEN_ADDRESSES[chainId] || {};
        const tokenAddr = chainTokens[coinUpper];
        
        if (!tokenAddr) throw new Error(`Contract address for ${coinUpper} not found on this network.`);
        
        const tokenContract = new ethers.Contract(tokenAddr, [
          "function transfer(address to, uint256 amount) returns (bool)",
          "function decimals() view returns (uint8)"
        ], signer);
        
        const decimals = await tokenContract.decimals().catch(() => 18);
        const amountWei = ethers.parseUnits(preview.amount, decimals);
        
        response = await tokenContract.transfer(preview.address, amountWei);
      }
      
      txHash = response.hash;
      
      addSystemMessageProxy(`📡 Transaction broadcasted! **Hash**: ${txHash.slice(0, 10)}... (Status: **Pending**)`);
      
      saveTransaction({
        type: 'send',
        fromToken: preview.coin,
        fromAmount: preview.amount,
        toAddress: preview.address,
        contactName: preview.recipientName,
        status: 'pending',
        hash: txHash,
        network: wallet.networkName || 'Ethereum Mainnet'
      });

      const { amount, coin, recipientName, address: toAddress } = preview;
      setTransactionPreview(null);
      
      await response.wait();
      addSystemMessageProxy(`✅ Transaction confirmed! You sent **${amount} ${coin}** to **${recipientName}**. [View on Explorer](${getExplorerUrl(txHash)})`);
      
      saveTransaction({
        type: 'send',
        fromToken: coin,
        fromAmount: amount,
        toAddress: toAddress,
        contactName: recipientName,
        status: 'success',
        hash: txHash,
        network: wallet.networkName || 'Ethereum Mainnet'
      });

      refreshBalances();

    } catch (err: any) {
      console.error('Transaction Error:', err);
      addSystemMessage(`❌ Error: ${err.message || 'Transaction failed'}`);
      
      if (txHash && preview) {
        saveTransaction({
          type: 'send',
          fromToken: preview.coin,
          fromAmount: preview.amount,
          toAddress: preview.address,
          contactName: preview.recipientName,
          status: 'failed',
          hash: txHash,
          network: wallet.networkName || 'Ethereum Mainnet'
        });
      }
    }
  }, [wallet.isConnected, wallet.networkName, transactionPreview, addSystemMessage, addSystemMessageProxy, getExplorerUrl, refreshBalances, saveTransaction]);

  const handleConfirmSwap = useCallback(async () => {
    if (!wallet.isConnected || !window.ethereum || !swapPreview) {
      addSystemMessageProxy("Please connect your wallet first.");
      return;
    }

    try {
      addSystemMessageProxy(`⏳ Preparing swap of **${swapPreview.fromAmount} ${swapPreview.fromToken}** for **${swapPreview.toToken}**...`);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Check for native BNB
      const isFromEth = swapPreview.fromTokenAddress === BNB_TOKENS.BNB; 
      const isToEth = swapPreview.toTokenAddress === BNB_TOKENS.BNB;
      
      const pFrom = isFromEth ? WBNB : swapPreview.fromTokenAddress;
      const pTo = isToEth ? WBNB : swapPreview.toTokenAddress;
      const path = [pFrom, pTo];
      
      let tx: any;
      const PANCAKESWAP_ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
      const ROUTER_ABI = [
        "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
        "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
        "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)"
      ];

      const router = new ethers.Contract(PANCAKESWAP_ROUTER, ROUTER_ABI, signer);
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 mins
      const amountIn = swapPreview.rawSwapData.amountWei;
      const minAmountOut = 0; // In production, use slippage

      if (!isFromEth) {
        addSystemMessageProxy(`🔐 Checking allowance for **${swapPreview.fromToken}**...`);
        await approveToken(swapPreview.fromTokenAddress, amountIn);
        addSystemMessageProxy(`✅ Token approved! Please sign the swap transaction...`);
      }

      if (isFromEth) {
        tx = await router.swapExactETHForTokens(minAmountOut, path, wallet.address, deadline, { value: amountIn });
      } else if (isToEth) {
        tx = await router.swapExactTokensForETH(amountIn, minAmountOut, path, wallet.address, deadline);
      } else {
        tx = await router.swapExactTokensForTokens(amountIn, minAmountOut, path, wallet.address, deadline);
      }

      const txHash = tx.hash;
      addSystemMessageProxy(`📡 Swap broadcasted! **Hash**: ${txHash.slice(0, 10)}... (Status: **Pending**)`);

      saveTransaction({
        type: 'swap',
        fromToken: swapPreview.fromToken,
        fromAmount: swapPreview.fromAmount,
        toToken: swapPreview.toToken,
        toAmount: swapPreview.toAmount,
        status: 'pending',
        hash: txHash,
        network: 'BNB Smart Chain'
      });

      await tx.wait();
      addSystemMessageProxy(`✅ Swap successful! You received **${parseFloat(swapPreview.toAmount).toFixed(4)} ${swapPreview.toToken}**. [View on Explorer](${getExplorerUrl(txHash)})`);
      
      saveTransaction({
        type: 'swap',
        fromToken: swapPreview.fromToken,
        fromAmount: swapPreview.fromAmount,
        toToken: swapPreview.toToken,
        toAmount: swapPreview.toAmount,
        status: 'success',
        hash: txHash,
        network: 'BNB Smart Chain'
      });

      setSwapPreview(null);
      setRightPanelView('history');
      refreshBalances();

    } catch (err: any) {
      console.error('Swap Error:', err);
      addSystemMessageProxy(`❌ Swap failed: ${err.message}`);
      
      saveTransaction({
        type: 'swap',
        fromToken: swapPreview?.fromToken || '?',
        fromAmount: swapPreview?.fromAmount || '0',
        toToken: swapPreview?.toToken || '?',
        toAmount: swapPreview?.toAmount || '0',
        status: 'failed',
        hash: '',
        network: 'BNB Smart Chain'
      });
    }
  }, [wallet.isConnected, wallet.address, swapPreview, addSystemMessageProxy, approveToken, getExplorerUrl, refreshBalances, saveTransaction]);

  const handleSendMessage = useCallback(
    (content: string) => {
      // Intercept contacts commands
      if (content.toLowerCase().startsWith('add ') && content.split(' ').length >= 3) {
        const parts = content.split(' ');
        const name = parts[1];
        const addr = parts[2];
        if (ethers.isAddress(addr)) {
          addContact(name, addr);
          addSystemMessage(`✅ Saved **${name}** as ${addr.slice(0, 6)}...${addr.slice(-4)}. You can now send funds to ${name} directly by name.`);
          setRightPanelView('contacts');
          return;
        }
      }

      if (content.toLowerCase().startsWith('delete contact ')) {
        const name = content.replace(/delete contact /i, '').trim();
        if (contacts[name]) {
          removeContact(name);
          addSystemMessage(`🗑️ Removed **${name}** from your address book.`);
          setRightPanelView('contacts');
          return;
        }
      }

      // Default AI message
      sendMessage(content, { 
        address: wallet.address, 
        holdings: wallet.holdings, 
        contacts, 
        history, 
        watchlist: watchlistIds 
      }, {
        fearGreed: fearGreedData,
        news: newsData
      }, {
        balance: futuresBalance,
        positions: futuresPositions
      });
    },
    [sendMessage, addContact, removeContact, contacts, wallet.address, wallet.holdings, history, watchlistIds, fearGreedData, newsData, futuresBalance, futuresPositions]
  );

  const handleConnectWallet = useCallback(() => {
    if (!wallet.isConnected) {
      connectWallet();
    } else {
      setRightPanelView('portfolio');
    }
  }, [wallet.isConnected, connectWallet]);

  const handleSaveSettings = (newKey: string, newToken: string) => {
    setApiKey(newKey);
    setCryptoPanicToken(newToken);
    localStorage.setItem('groq_api_key', newKey);
    localStorage.setItem('cryptopanic_token', newToken);
    if (newKey || newToken) {
      addSystemMessageProxy('✅ Settings saved! I am now ready to chat and fetch news.');
    }
  };

  const handleSignalClick = (signal: TraderSignal) => {
    setActiveTab('agent');
    sendMessage(`Analyze the ${signal.coin} ${signal.direction} signal from ${signal.name}. Is it a good entry?`, { 
      address: wallet.address, 
      holdings: wallet.holdings, 
      contacts, 
      history, 
      watchlist: watchlistIds 
    }, {
      fearGreed: fearGreedData,
      news: newsData
    }, {
      balance: futuresBalance,
      positions: futuresPositions
    });
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-main)',
        color: 'var(--text-main)',
        overflow: 'hidden',
      }}
    >
      <TopBar
        wallet={wallet}
        prices={prices}
        onConnectWallet={handleConnectWallet}
        formatAddress={formatAddress}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen((v) => !v)}
          activeFeature={activeFeature}
          onFeatureClick={handleFeatureClick}
          onSettingsClick={() => setSettingsOpen(true)}
        />

        {/* Center Panel */}
        {activeTab === 'agent' ? (
          <ChatPanel
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            onClearChat={clearMessages}
          />
        ) : (
          <SignalFeed onSignalClick={handleSignalClick} />
        )}

        {/* Right Panel */}
        <RightPanel
          view={rightPanelView}
          prices={prices}
          pricesLoading={pricesLoading}
          wallet={wallet}
          transactionPreview={transactionPreview}
          contacts={contacts}
          onContactSendClick={(name) => handleSendMessage(`Send to ${name}`)}
          onContactDeleteClick={(name) => handleSendMessage(`Delete contact ${name}`)}
          onConfirmTransactionClick={handleConfirmTransaction}
          onConfirmSwapClick={handleConfirmSwap}
          swapPreview={swapPreview}
          history={history}
          onSwitchNetwork={switchNetwork}
          allCoins={allCoins}
          watchlistCoins={watchlistCoins}
          onToggleWatchlist={toggleWatchlist}
          isInWatchlist={isInWatchlist}
          watchlistLoading={watchlistLoading}
          watchlistLastUpdated={watchlistLastUpdated}
          onCoinClick={(coin) => {
            setActiveCoin(coin);
            setRightPanelView('coin-chart');
          }}
          onBackToWatchlist={() => setRightPanelView('watchlist')}
          activeCoin={activeCoin}
          newsData={newsData}
          panicNewsData={panicNewsData}
          fearGreedData={fearGreedData}
          newsLoading={newsLoading}
          newsError={newsError}
          newsLastUpdated={newsLastUpdated}
          cryptoPanicToken={cryptoPanicToken}
          futuresBalance={futuresBalance}
          futuresPositions={futuresPositions}
          onCloseFuturesPosition={(id) => {
            const pos = futuresPositions.find(p => p.id === id);
            if (pos) {
              const currentPrice = prices.find(p => p.id === pos.coinId)?.price || 0;
              closePosition(id, currentPrice);
            }
          }}
          futuresPrices={futuresPricesMap}
        />
      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <SettingsModal
          apiKey={apiKey}
          cryptoPanicToken={cryptoPanicToken}
          onSave={handleSaveSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
