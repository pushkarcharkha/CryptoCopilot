import { useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import type { WalletState, PortfolioHolding } from '../types';

declare global {
  interface Window {
    ethereum?: any;
  }
}

const SEP_USDT = '0xafa17d4d00aa4d33ebac92400b8e9749c9ad1d0b';
const SEP_LINK = '0x779877A7B0D9E8603169DdbD7836e478b4624789';
const SEP_USDC = '0x94a9D9AC8a22534E3FaCa9F4e79395b685D39736';

export const TOKEN_ADDRESSES: Record<number, Record<string, string>> = {
  1: { // Mainnet
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    LINK: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
  },
  56: { // BNB Chain
    USDT: '0x55d398326f99059fF775485246999027B3197955',
    USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  },
  137: { // Polygon
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // New USDC
  },
  11155111: { // Sepolia
    USDT: SEP_USDT,
    LINK: SEP_LINK,
    USDC: SEP_USDC
  }
};

const SUPPORTED_TOKENS_META = [
  { symbol: 'USDT', name: 'Tether', color: '#26a17b' },
  { symbol: 'LINK', name: 'Chainlink', color: '#2a5ada' },
  { symbol: 'USDC', name: 'USD Coin', color: '#2775ca' },
];

export const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    ethBalance: null,
    networkName: null,
    holdings: [],
    isConnecting: false,
    isConnected: false,
  });

  const connectingRef = useRef(false);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      alert('MetaMask or Trust Wallet is not installed. Please install a Web3 wallet to connect.');
      return null;
    }

    if (connectingRef.current) return null;
    connectingRef.current = true;

    setWallet((prev) => ({ ...prev, isConnecting: true }));

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      
      if (!accounts[0]) {
         connectingRef.current = false;
         setWallet(prev => ({ ...prev, isConnecting: false }));
         return null;
      }
      
      const address = accounts[0];
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      
      let networkName = network.name || `Chain ${chainId}`;
      let nativeSymbol = 'ETH';
      let nativeName = 'Ethereum';
      let nativeColor = '#627eea';

      if (chainId === 1) {
        networkName = 'Ethereum Mainnet';
      } else if (chainId === 11155111) {
        networkName = 'Sepolia Testnet';
      } else if (chainId === 56 || chainId === 97) {
        networkName = chainId === 56 ? 'BNB Smart Chain' : 'BNB Testnet';
        nativeSymbol = 'BNB';
        nativeName = 'BNB';
        nativeColor = '#f3ba2f';
      } else if (chainId === 137 || chainId === 80001) {
        networkName = chainId === 137 ? 'Polygon Mainnet' : 'Polygon Mumbai';
        nativeSymbol = 'MATIC';
        nativeName = 'Polygon';
        nativeColor = '#8247e5';
      } else if (chainId === 43114 || chainId === 43113) {
        networkName = chainId === 43114 ? 'Avalanche C-Chain' : 'Avalanche Fuji';
        nativeSymbol = 'AVAX';
        nativeName = 'Avalanche';
        nativeColor = '#e84142';
      }
      
      console.log(`[DEBUG] Detected Chain ID: ${chainId} (${networkName})`);
      
      const nativeBalanceWei = await provider.getBalance(address);
      const nativeBalance = ethers.formatEther(nativeBalanceWei);
      
      const tokenHoldings: PortfolioHolding[] = [];
      tokenHoldings.push({
        symbol: nativeSymbol,
        name: nativeName,
        amount: parseFloat(nativeBalance),
        valueUsd: 0, 
        color: nativeColor
      });

      const networkTokens = TOKEN_ADDRESSES[chainId] || {};
      const tokenPromises = SUPPORTED_TOKENS_META.map(async (meta) => {
        const tokenAddress = networkTokens[meta.symbol];
        if (!tokenAddress) return null;
        try {
          const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
          const [balance, decimals] = await Promise.all([
             contract.balanceOf(address),
             contract.decimals().catch(() => 18)
          ]);
          const formattedBalance = ethers.formatUnits(balance, decimals);
          if (parseFloat(formattedBalance) > 0) {
            return {
              symbol: meta.symbol,
              name: meta.name,
              amount: parseFloat(formattedBalance),
              valueUsd: 0, 
              color: meta.color
            };
          }
        } catch (e) {}
        return null;
      });

      const results = await Promise.all(tokenPromises);
      results.forEach((res) => { if (res) tokenHoldings.push(res); });

      setWallet({
        address,
        ethBalance: parseFloat(nativeBalance).toFixed(4),
        networkName,
        holdings: tokenHoldings,
        isConnecting: false,
        isConnected: true,
      });

      connectingRef.current = false;
      return { address, balance: parseFloat(nativeBalance).toFixed(4), networkName, holdings: tokenHoldings };
    } catch (err: any) {
      connectingRef.current = false;
      setWallet((prev) => ({ ...prev, isConnecting: false, holdings: [] }));
      return null;
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setWallet({
      address: null,
      ethBalance: null,
      networkName: null,
      holdings: [],
      isConnecting: false,
      isConnected: false,
    });
  }, []);

  // Sync state to ref for listener access
  const stateRef = useRef(wallet);
  useEffect(() => {
    stateRef.current = wallet;
  }, [wallet]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    const handleAccounts = (accounts: string[]) => {
      const current = stateRef.current;
      console.log("Wallet Event: accountsChanged", accounts, "Status:", { isConnected: current.isConnected, isConnecting: connectingRef.current });
      
      if (accounts.length === 0) {
        if (current.isConnected) disconnectWallet();
      } else {
        const newAddr = accounts[0].toLowerCase();
        const oldAddr = current.address?.toLowerCase();
        
        if ((!current.isConnected || newAddr !== oldAddr) && !connectingRef.current) {
          console.log("Triggering connectWallet from accountsChanged...");
          connectWallet();
        }
      }
    };

    const handleChain = (chainIdHex: string) => { 
      console.log("Wallet Event: chainChanged", chainIdHex);
      // Only reload if this isn't just a spurious event
      // Sometimes providers fire this during handshake
      const currentChainId = window.ethereum.chainId;
      if (currentChainId && chainIdHex !== currentChainId) {
         window.location.reload(); 
      }
    };

    window.ethereum.on('accountsChanged', handleAccounts);
    window.ethereum.on('chainChanged', handleChain);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccounts);
      window.ethereum.removeListener('chainChanged', handleChain);
    };
  }, [connectWallet, disconnectWallet]);

  const switchNetwork = useCallback(async (targetChainId: number) => {
    if (!window.ethereum) return;
    const chainIdHex = `0x${targetChainId.toString(16)}`;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
    } catch (err: any) {
      // If chain not added, try adding it (for BNB/Polygon)
      if (err.code === 4902) {
        const chainParams: Record<number, any> = {
          56: {
            chainId: '0x38',
            chainName: 'BNB Smart Chain',
            nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
            rpcUrls: ['https://bsc-dataseed.binance.org/'],
            blockExplorerUrls: ['https://bscscan.com/'],
          },
          137: {
            chainId: '0x89',
            chainName: 'Polygon Mainnet',
            nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
            rpcUrls: ['https://polygon-rpc.com'],
            blockExplorerUrls: ['https://polygonscan.com/'],
          }
        };
        if (chainParams[targetChainId]) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [chainParams[targetChainId]],
          });
        }
      }
    }
  }, []);

  const formatAddress = (address: string) =>
    `${address.slice(0, 5)}...${address.slice(-4)}`;

  const getExplorerUrl = useCallback((hash?: string) => {
    const network = wallet.networkName;
    let base = 'https://etherscan.io';
    if (network?.includes('BNB')) base = 'https://bscscan.com';
    else if (network?.includes('Polygon')) base = 'https://polygonscan.com';
    else if (network?.includes('Sepolia')) base = 'https://sepolia.etherscan.io';
    else if (network?.includes('Avalanche')) base = 'https://snowtrace.io';
    
    return hash ? `${base}/tx/${hash}` : base;
  }, [wallet.networkName]);

  return { 
    wallet, 
    connectWallet, 
    disconnectWallet, 
    switchNetwork, 
    formatAddress,
    refreshBalances: connectWallet,
    getExplorerUrl
  };
}
