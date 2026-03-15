import { useState, useCallback, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import ChatPanel from './components/ChatPanel';
import RightPanel from './components/RightPanel';
import SignalFeed from './components/SignalFeed';
import SettingsModal from './components/SettingsModal';
import { useGroqChat } from './hooks/useGroqChat';
import { useWallet, TOKEN_ADDRESSES, ERC20_ABI } from './hooks/useWallet';
import { useCryptoPrices, useCoinChart, detectCoinInMessage } from './hooks/useCrypto';
import { useContacts } from './hooks/useContacts';
import { usePancakeSwap, BNB_TOKENS } from './hooks/usePancakeSwap';
import { useTransactionHistory } from './hooks/useTransactionHistory';
import type { RightPanelView, SidebarFeature, TraderSignal, TransactionPreview, SwapPreview } from './types';
import { ethers } from 'ethers';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'agent' | 'signals'>('agent');
  const [rightPanelView, setRightPanelView] = useState<RightPanelView>('prices');
  const [activeFeature, setActiveFeature] = useState<SidebarFeature | null>(null);
  const [activeCoinId, setActiveCoinId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('groq_api_key') || '');
  const [transactionPreview, setTransactionPreview] = useState<TransactionPreview | null>(null);
  const [swapPreview, setSwapPreview] = useState<SwapPreview | null>(null);
  
  // Use ref to break circular dependency with useGroqChat
  const addSystemMessageRef = useRef<((content: string) => void) | null>(null);
  const addSystemMessageProxy = useCallback((content: string) => {
    addSystemMessageRef.current?.(content);
  }, []);



  const { wallet, connectWallet, switchNetwork, refreshBalances, getExplorerUrl, formatAddress } = useWallet();
  const { contacts, addContact, removeContact, getContact } = useContacts();
  const { history, saveTransaction } = useTransactionHistory();
  const { getSwapQuote, approveToken } = usePancakeSwap();

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
    }
  }, [wallet.networkName, wallet.address, getSwapQuote, addSystemMessageProxy]);

  const { messages, isLoading, sendMessage, addSystemMessage, clearMessages } = useGroqChat(apiKey, handleAIAction);
  
  useEffect(() => {
    addSystemMessageRef.current = addSystemMessage;
  }, [addSystemMessage]);

  const { prices, isLoading: pricesLoading } = useCryptoPrices(['bitcoin', 'ethereum', 'solana', 'cardano', 'chainlink', 'binancecoin', 'matic-network', 'avalanche-2', 'tether', 'usd-coin']);
  const { chartData, isLoading: chartLoading, coinName: chartCoinName } = useCoinChart(activeCoinId);

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
        sendMessage(message, { address: wallet.address, holdings: wallet.holdings, contacts, history });
      } else if (feature === 'chart') {
        setActiveCoinId('bitcoin');
        setRightPanelView('coin-chart');
        sendMessage(message, { address: wallet.address, holdings: wallet.holdings, contacts, history });
      } else if (feature === 'journal') {
        setRightPanelView('history');
        sendMessage(message, { address: wallet.address, holdings: wallet.holdings, contacts, history });
      } else {
        setRightPanelView('prices');
        sendMessage(message, { address: wallet.address, holdings: wallet.holdings, contacts, history });
      }
    },
    [sendMessage, addSystemMessage, wallet.address, wallet.holdings, contacts, history]
  );

  const handleConfirmTransaction = useCallback(async () => {
    if (!wallet.isConnected || !window.ethereum || !transactionPreview) {
      addSystemMessage("Please connect your wallet first to confirm this transaction.");
      return;
    }
    
    let txHash = "";
    try {
      addSystemMessage(`⏳ Requesting signature for **${transactionPreview.amount} ${transactionPreview.coin}**...`);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      const nativeSymbol = wallet.holdings[0]?.symbol || 'ETH';
      
      let tx;
      if (transactionPreview.coin.toUpperCase() === nativeSymbol.toUpperCase()) {
        // Native transfer (ETH, BNB, MATIC, etc.)
        tx = await signer.sendTransaction({
          to: transactionPreview.address,
          value: ethers.parseEther(transactionPreview.amount),
        });
      } else {
        // ERC-20 transfer
        const tokenAddress = TOKEN_ADDRESSES[chainId]?.[transactionPreview.coin.toUpperCase()];
        
        if (!tokenAddress) {
          throw new Error(`Contract address for ${transactionPreview.coin} not found on this chain.`);
        }

        const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
        
        // Fetch decimals for precise transfer
        const decimals = await contract.decimals().catch(() => 18);
        const amountWei = ethers.parseUnits(transactionPreview.amount, decimals);
        
        tx = await contract.transfer(transactionPreview.address, amountWei);
      }
      
      txHash = tx.hash;

      // Save Pending
      saveTransaction({
        type: 'send',
        fromToken: transactionPreview.coin,
        fromAmount: transactionPreview.amount,
        toAddress: transactionPreview.address,
        contactName: transactionPreview.recipientName,
        hash: tx.hash,
        status: 'pending',
        network: wallet.networkName || 'Unknown Network'
      });

      addSystemMessage(`✅ Transaction sent! [View on Explorer](${getExplorerUrl(chainId)}/tx/${tx.hash})`);
      setTransactionPreview(null);
      
      // Wait for confirmation
      await tx.wait();
      
      // Update to Success
      saveTransaction({
        type: 'send',
        fromToken: transactionPreview.coin,
        fromAmount: transactionPreview.amount,
        toAddress: transactionPreview.address,
        contactName: transactionPreview.recipientName,
        hash: tx.hash,
        status: 'success',
        network: wallet.networkName || 'Unknown Network'
      });

      // Refresh balances after 2 seconds to allow chain indexing
      setTimeout(() => { refreshBalances(); }, 2000);
      
    } catch (err: any) {
      addSystemMessage(`❌ Transaction failed or rejected: ${err.message}`);
      if (txHash && transactionPreview) {
        saveTransaction({
          type: 'send',
          fromToken: transactionPreview.coin,
          fromAmount: transactionPreview.amount,
          toAddress: transactionPreview.address,
          contactName: transactionPreview.recipientName,
          hash: txHash,
          status: 'failed',
          network: wallet.networkName || 'Unknown Network'
        });
      }
    }
  }, [wallet.isConnected, transactionPreview, addSystemMessage, wallet.holdings, wallet.networkName, refreshBalances, getExplorerUrl, saveTransaction]);

  const handleConfirmSwap = useCallback(async () => {
    if (!wallet.isConnected || !window.ethereum || !swapPreview) return;
    let txHash = "";
    try {
      addSystemMessageProxy(`⏳ Processing swap: **${swapPreview.fromAmount} ${swapPreview.fromToken}** → **${swapPreview.toToken}**...`);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // PancakeSwap Router ABI
      const ROUTER_ABI = [
        "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
        "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
        "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)"
      ];
      const PANCAKESWAP_ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
      const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
      
      const router = new ethers.Contract(PANCAKESWAP_ROUTER, ROUTER_ABI, signer);
      
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 mins
      const amountIn = BigInt(swapPreview.rawSwapData.amountWei);
      const amountOutMin = BigInt(swapPreview.rawSwapData.estimatedOutputWei) * BigInt(99) / BigInt(100); // 1% slippage
      
      let tx;

      // 1. Check Approval for ERC20
      const BNB_ADDR = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
      if (swapPreview.fromTokenAddress.toLowerCase() !== BNB_ADDR.toLowerCase()) {
        addSystemMessageProxy("🔓 Approving tokens...");
        await approveToken(swapPreview.fromTokenAddress, amountIn.toString());
      }

      addSystemMessageProxy("🚀 Executing swap on PancakeSwap...");
      
      if (swapPreview.fromTokenAddress.toLowerCase() === BNB_ADDR.toLowerCase()) {
        // BNB → Token
        tx = await router.swapExactETHForTokens(
          amountOutMin,
          [WBNB, swapPreview.toTokenAddress],
          wallet.address,
          deadline,
          { value: amountIn }
        );
      } else if (swapPreview.toTokenAddress.toLowerCase() === BNB_ADDR.toLowerCase()) {
        // Token → BNB
        tx = await router.swapExactTokensForETH(
          amountIn,
          amountOutMin,
          [swapPreview.fromTokenAddress, WBNB],
          wallet.address,
          deadline
        );
      } else {
        // Token → Token
        tx = await router.swapExactTokensForTokens(
          amountIn,
          amountOutMin,
          [swapPreview.fromTokenAddress, WBNB, swapPreview.toTokenAddress],
          wallet.address,
          deadline
        );
      }

      txHash = tx.hash;

      // Save Pending
      saveTransaction({
        type: 'swap',
        fromToken: swapPreview.fromToken,
        toToken: swapPreview.toToken,
        fromAmount: swapPreview.fromAmount,
        toAmount: swapPreview.toAmount,
        hash: tx.hash,
        status: 'pending',
        network: 'BNB Smart Chain'
      });

      addSystemMessageProxy(`✅ Swap submitted! [View on Explorer](${getExplorerUrl(56)}/tx/${tx.hash})`);
      setSwapPreview(null);
      setRightPanelView('portfolio');

      // Wait for confirmation
      await tx.wait();

      // Update to Success
      saveTransaction({
        type: 'swap',
        fromToken: swapPreview.fromToken,
        toToken: swapPreview.toToken,
        fromAmount: swapPreview.fromAmount,
        toAmount: swapPreview.toAmount,
        hash: tx.hash,
        status: 'success',
        network: 'BNB Smart Chain'
      });

      setTimeout(() => { refreshBalances(); }, 2000);
    } catch (err: any) {
      addSystemMessageProxy(`❌ Swap failed: ${err.message}`);
      if (txHash && swapPreview) {
        saveTransaction({
          type: 'swap',
          fromToken: swapPreview.fromToken,
          toToken: swapPreview.toToken,
          fromAmount: swapPreview.fromAmount,
          toAmount: swapPreview.toAmount,
          hash: txHash,
          status: 'failed',
          network: 'BNB Smart Chain'
        });
      }
    }
  }, [wallet.isConnected, wallet.address, swapPreview, addSystemMessageProxy, approveToken, getExplorerUrl, refreshBalances, saveTransaction]);

  // Detect coin mentioned in messages → update right panel
  const handleSendMessage = useCallback(
    (content: string) => {
      const lowerContent = content.toLowerCase();

      // Interceptor: Adding contact
      const addContactMatch = content.match(/(?:add|save|remember)\s+([a-zA-Z0-9_-]+)(?:'s address as|\s+as)?\s+(0x[a-fA-F0-9]{40})/i);
      if (addContactMatch) {
        const name = addContactMatch[1];
        const address = addContactMatch[2];
        addContact(name, address);
        addSystemMessage(`Got it. Saved ${name} as ${address}. You can now send funds to ${name} directly by name.`);
        setRightPanelView('contacts');
        return;
      }

      // Interceptor: Viewing contacts
      if (/(?:show my contacts|who have i saved|show address book)/i.test(content)) {
        setRightPanelView('contacts');
        const names = Object.keys(contacts);
        if (names.length) {
          addSystemMessage(`Here are your saved contacts: ${names.join(', ')}.`);
        } else {
          addSystemMessage("You don't have any contacts saved yet. You can add someone by saying 'add [name] [wallet address]'.");
        }
        return;
      }

      // Interceptor: Removing contact
      const removeContactMatch = content.match(/(?:remove|delete)\s+([a-zA-Z0-9_-]+)(?:\s+from\s+contacts)?/i);
      if (removeContactMatch) {
        const name = removeContactMatch[1];
        if (getContact(name)) {
          removeContact(name);
          addSystemMessage(`Removed ${name} from your contacts.`);
        } else {
          addSystemMessage(`I couldn't find ${name} in your contacts.`);
        }
        setRightPanelView('contacts');
        return;
      }

      // Interceptor: Sending funds (FIX 3: Balance Checks)
      const sendMatch = content.match(/(?:send|transfer)\s+([0-9.]+)\s*(?:([a-zA-Z]+)\s+)?to\s+([a-zA-Z0-9_-]+)/i);
      if (sendMatch) {
        if (!wallet.isConnected) {
          addSystemMessage("Please connect your wallet first to perform transactions.");
          return;
        }

        const amount = parseFloat(sendMatch[1]);
        const nativeSymbol = wallet.holdings[0]?.symbol || 'ETH';
        const coinSymbol = (sendMatch[2] || nativeSymbol).toUpperCase();
        const name = sendMatch[3];
        const address = getContact(name);

        if (address) {
          // Find holding
          const holding = wallet.holdings.find(h => h.symbol.toUpperCase() === coinSymbol);

          // Check 1: Do they hold the coin?
          if (!holding || holding.amount <= 0) {
            addSystemMessage(`❌ You don't have any **${coinSymbol}** in your wallet. You can't send what you don't have.`);
            return;
          }

          // Check 2: Insufficient balance?
          if (amount > holding.amount) {
            addSystemMessage(`❌ You only have **${holding.amount.toFixed(4)} ${coinSymbol}** in your wallet. You can't send **${amount} ${coinSymbol}**.`);
            return;
          }

          // Check 3: Gas fee check (estimate ~$2.40 or roughly 0.001 ETH)
          const nativeSymbol = wallet.holdings[0]?.symbol || 'ETH';
          const nativeHolding = wallet.holdings.find(h => h.symbol === nativeSymbol);
          const minGasBuffer = 0.002; // Safety buffer
          
          if (coinSymbol === nativeSymbol) {
            if (amount + minGasBuffer > (nativeHolding?.amount || 0)) {
              addSystemMessage(`❌ You have enough ${nativeSymbol}, but you need a bit more to cover gas fees. Try sending a slightly smaller amount.`);
              return;
            }
          } else {
            if ((nativeHolding?.amount || 0) < minGasBuffer) {
              addSystemMessage(`❌ You have enough ${coinSymbol} but your ${nativeSymbol} balance is too low to cover gas fees. Add some ${nativeSymbol} first.`);
              return;
            }
          }

          const gasMap: Record<string, string> = {
            'BNB Smart Chain': '< $0.05',
            'Polygon Mainnet': '< $0.05',
            'Ethereum Mainnet': '$2 - $10'
          };
          const estGas = gasMap[wallet.networkName || ''] || 'Low';

          setTransactionPreview({
            recipientName: name,
            address,
            amount: amount.toString(),
            coin: coinSymbol,
            estimatedGas: estGas,
            networkName: wallet.networkName || 'Unknown Network'
          });
          setRightPanelView('transaction');
          addSystemMessage(`✅ Balance verification passed! Found ${name} at ${address}. You're about to send ${amount} ${coinSymbol}. Confirm?`);
        } else {
          addSystemMessage(`I don't have ${name}'s address saved. Reply with their wallet address and I'll save it.`);
        }
        return;
      }

      // Interceptor: Confirm transaction
      const confirmMatch = content.match(/^(?:confirm|yes|do it|send it|y)$/i);
      if (confirmMatch && rightPanelView === 'transaction' && transactionPreview) {
        handleConfirmTransaction();
        return;
      }

      // Default contextual panel updates
      const coinId = detectCoinInMessage(content);
      if (coinId) {
        setActiveCoinId(coinId);
        setRightPanelView('coin-chart');
      } else if (lowerContent.includes('portfolio') || lowerContent.includes('holding')) {
        setRightPanelView('portfolio');
      } else if (lowerContent.includes('watchlist') || lowerContent.includes('watch')) {
        setRightPanelView('watchlist');
      }

      // Interceptor: Confirm swap
      const confirmSwapMatch = content.match(/^(?:confirm swap|yes swap|swap now)$/i);
      if (confirmSwapMatch && rightPanelView === 'swap' && swapPreview) {
        handleConfirmSwap();
        return;
      }

      // Interceptor: View history
      if (/(?:show my history|what did i do recently|show transactions|what did i send last week|trade journal)/i.test(content)) {
        setRightPanelView('history');
        sendMessage(content, { address: wallet.address, holdings: wallet.holdings, contacts, history });
        return;
      }

      sendMessage(content, { address: wallet.address, holdings: wallet.holdings, contacts, history });
    },
    [sendMessage, addContact, contacts, getContact, removeContact, addSystemMessage, rightPanelView, transactionPreview, handleConfirmTransaction, wallet, history]
  );

  // Wallet connection
  const handleConnectWallet = useCallback(async () => {
    if (wallet.isConnected) return;
    const result = await connectWallet();
    if (result) {
      setRightPanelView('portfolio');
      
      // Calculate total USD value
      const totalValue = result.holdings.reduce((sum: number, h: any) => {
        const coinPrice = prices.find((p: any) => p.symbol.toLowerCase() === h.symbol.toLowerCase());
        return sum + (coinPrice ? h.amount * coinPrice.price : 0);
      }, 0);

      addSystemMessage(
        `✅ Connected! Your wallet (**${result.address.slice(0, 6)}...${result.address.slice(-4)}**) is ready. Your combined portfolio balance is **$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** on **${result.networkName}**.`
      );
    }
  }, [wallet.isConnected, connectWallet, addSystemMessage, prices]);

  // Signal feed → AI analysis
  const handleSignalClick = useCallback(
    (signal: TraderSignal) => {
      setActiveTab('agent');
      const msg = `Analyze this ${signal.coin} signal from trader "${signal.name}" and tell me if it fits my portfolio and risk level:\n\n${signal.signal}\n\nEntry: $${signal.entry}, Target: $${signal.tp}. Their win rate is ${signal.winRate}% over ${signal.totalSignals} signals.`;
      sendMessage(msg, { address: wallet.address, holdings: wallet.holdings, contacts });
    },
    [sendMessage, wallet.address, wallet.holdings, contacts]
  );

  // Save Settings
  const handleSaveSettings = useCallback((groqKey: string) => {
    setApiKey(groqKey);
    localStorage.setItem('groq_api_key', groqKey);
    addSystemMessageProxy("✅ Settings saved successfully.");
  }, [addSystemMessageProxy]);

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-primary)',
        overflow: 'hidden',
      }}
    >
      {/* Top Bar */}
      <TopBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        wallet={wallet}
        prices={prices}
        onConnectWallet={handleConnectWallet}
        formatAddress={formatAddress}
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
