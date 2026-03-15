import { useState, useCallback } from 'react';
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
import type { RightPanelView, SidebarFeature, TraderSignal, TransactionPreview } from './types';
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

  const { wallet, connectWallet, switchNetwork, refreshBalances, getExplorerUrl, formatAddress } = useWallet();
  const { contacts, addContact, removeContact, getContact } = useContacts();

  // Define action handler for the AI
  const handleAIAction = useCallback((action: string, params: Record<string, string>) => {
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
    }
  }, [wallet.networkName]);

  const { messages, isLoading, sendMessage, addSystemMessage, clearMessages } = useGroqChat(apiKey, handleAIAction);
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
        sendMessage(message, { address: wallet.address, holdings: wallet.holdings, contacts });
      } else if (feature === 'wallet') {
        setRightPanelView('contacts');
        addSystemMessage("Here are your saved contacts. You can add someone by saying 'add [name] [wallet address]'.");
      } else if (feature === 'watchlist') {
        setRightPanelView('watchlist');
        sendMessage(message, { address: wallet.address, holdings: wallet.holdings, contacts });
      } else if (feature === 'chart') {
        setActiveCoinId('bitcoin');
        setRightPanelView('coin-chart');
        sendMessage(message, { address: wallet.address, holdings: wallet.holdings, contacts });
      } else {
        setRightPanelView('prices');
        sendMessage(message, { address: wallet.address, holdings: wallet.holdings, contacts });
      }
    },
    [sendMessage, addSystemMessage, wallet.address, wallet.holdings, contacts]
  );

  const handleConfirmTransaction = useCallback(async () => {
    if (!wallet.isConnected || !window.ethereum || !transactionPreview) {
      addSystemMessage("Please connect your wallet first to confirm this transaction.");
      return;
    }
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
      
      addSystemMessage(`✅ Transaction sent! [View on Explorer](${getExplorerUrl(chainId)}/tx/${tx.hash})`);
      setTransactionPreview(null);
      
      // Refresh balances after 2 seconds to allow chain indexing
      setTimeout(() => { refreshBalances(); }, 2000);
      
    } catch (err: any) {
      addSystemMessage(`❌ Transaction failed or rejected: ${err.message}`);
    }
  }, [wallet.isConnected, transactionPreview, addSystemMessage, wallet.holdings, wallet.networkName, refreshBalances, getExplorerUrl]);

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

      sendMessage(content, { address: wallet.address, holdings: wallet.holdings, contacts });
    },
    [sendMessage, addContact, contacts, getContact, removeContact, addSystemMessage, rightPanelView, transactionPreview, handleConfirmTransaction, wallet]
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

  // Save API key to localStorage
  const handleSaveApiKey = useCallback((key: string) => {
    setApiKey(key);
    localStorage.setItem('groq_api_key', key);
  }, []);

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
          onSwitchNetwork={switchNetwork}
        />
      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <SettingsModal
          apiKey={apiKey}
          onSave={handleSaveApiKey}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
