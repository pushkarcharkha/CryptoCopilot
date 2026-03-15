import { useState, useCallback, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import ChatPanel from './components/ChatPanel';
import RightPanel from './components/RightPanel';
import SignalFeed from './components/SignalFeed';
import SettingsModal from './components/SettingsModal';
import { useGroqChat } from './hooks/useGroqChat';
import { useWallet } from './hooks/useWallet';
import { useCryptoPrices, useCoinChart } from './hooks/useCrypto';
import { useContacts } from './hooks/useContacts';
import { usePancakeSwap, BNB_TOKENS } from './hooks/usePancakeSwap';
import { useTransactionHistory } from './hooks/useTransactionHistory';
import { useWatchlist } from './hooks/useWatchlist';
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
          addSystemMessageProxy(`📈 Opening **${coin.name}** chart...`);
        } else {
          addSystemMessageProxy(`❌ Sorry, I couldn't find a chart for **${coinId}**.`);
        }
      }
    } else if (action === 'NAVIGATE') {
      const { view } = params;
      if (view === 'watchlist') {
        setRightPanelView('watchlist');
        addSystemMessageProxy(`📋 Opening your watchlist.`);
      }
    }
  }, [wallet.networkName, wallet.address, getSwapQuote, addSystemMessageProxy, toggleWatchlist, allCoins]);

  const { messages, isLoading, sendMessage, addSystemMessage, clearMessages } = useGroqChat(apiKey, handleAIAction);
  
  useEffect(() => {
    addSystemMessageRef.current = addSystemMessage;
  }, [addSystemMessage]);

  const { prices, isLoading: pricesLoading } = useCryptoPrices(['bitcoin', 'ethereum', 'solana', 'cardano', 'chainlink', 'binancecoin', 'matic-network', 'avalanche-2', 'tether', 'usd-coin']);
  const { chartData, isLoading: chartLoading, coinName: chartCoinName } = useCoinChart(activeCoin?.id || null);

  // Handle sidebar feature click → preset message + panel update
  const handleFeatureClick = useCallback(
    (feature: SidebarFeature, message: string) => {
      setActiveFeature(feature);
      setActiveTab('agent');

      // Update right panel based on feature
      if (feature === 'portfolio') {
        setRightPanelView('portfolio');
        sendMessage(message, { address: wallet.address, holdings: wallet.holdings, contacts, history });
      } else if (feature === 'wallet') {
        setRightPanelView('contacts');
        addSystemMessage("Here are your saved contacts. You can add someone by saying 'add [name] [wallet address]'.");
      } else if (feature === 'watchlist') {
        setRightPanelView('watchlist');
        sendMessage(message, { address: wallet.address, holdings: wallet.holdings, contacts, history, watchlist: watchlistIds });
      } else if (feature === 'chart') {
        const btc = allCoins.find(c => c.symbol === 'btc') || allCoins[0];
        if (btc) setActiveCoin(btc);
        setRightPanelView('coin-chart');
        sendMessage(message, { address: wallet.address, holdings: wallet.holdings, contacts, history, watchlist: watchlistIds });
      } else if (feature === 'journal') {
        setRightPanelView('history');
        sendMessage(message, { address: wallet.address, holdings: wallet.holdings, contacts, history });
      } else {
        setRightPanelView('prices');
        sendMessage(message, { address: wallet.address, holdings: wallet.holdings, contacts, history });
      }
    },
    [sendMessage, addSystemMessage, wallet.address, wallet.holdings, contacts, history, watchlistIds, allCoins]
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
      
      const transaction = {
        to: preview.address,
        value: ethers.parseEther(preview.amount)
      };

      const response = await signer.sendTransaction(transaction);
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

      // Check for ETH (native)
      const isFromEth = swapPreview.fromToken === 'BNB'; 
      const isToEth = swapPreview.toToken === 'BNB';

      let tx: any;
      const PANCAKESWAP_ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
      const ROUTER_ABI = [
        "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
        "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
        "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)"
      ];

      const router = new ethers.Contract(PANCAKESWAP_ROUTER, ROUTER_ABI, signer);
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 mins
      const path = [swapPreview.fromTokenAddress, swapPreview.toTokenAddress];
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
      });
    },
    [sendMessage, addContact, removeContact, contacts, wallet.address, wallet.holdings, history, watchlistIds]
  );

  const handleConnectWallet = useCallback(() => {
    if (!wallet.isConnected) {
      connectWallet();
    } else {
      setRightPanelView('portfolio');
    }
  }, [wallet.isConnected, connectWallet]);

  const handleSaveSettings = (newKey: string) => {
    setApiKey(newKey);
    localStorage.setItem('groq_api_key', newKey);
    if (newKey) {
      addSystemMessageProxy('✅ API Key saved! I am now ready to chat.');
      addSystemMessageProxy('How can I help you with your crypto journey today?');
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
          chartData={chartData}
          chartLoading={chartLoading}
          chartCoinName={chartCoinName}
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
        />
      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <SettingsModal
          apiKey={apiKey}
          onSave={handleSaveSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
