export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  icon: string;
  color: string;
}

export interface WalletState {
  address: string | null;
  ethBalance: string | null;
  networkName: string | null;
  holdings: PortfolioHolding[];
  isConnecting: boolean;
  isConnected: boolean;
}

export type RightPanelView =
  | 'prices'
  | 'portfolio'
  | 'coin-chart'
  | 'transaction'
  | 'swap'
  | 'watchlist'
  | 'contacts'
  | 'history';

export interface AppTransaction {
  id: string;
  type: 'send' | 'swap' | 'receive';
  fromToken: string;
  fromAmount: string;
  toToken?: string;
  toAmount?: string;
  toAddress?: string;
  contactName?: string;
  timestamp: number;
  status: 'pending' | 'success' | 'failed';
  hash: string;
  network: string;
}

export interface TransactionPreview {
  recipientName: string;
  address: string;
  amount: string;
  coin: string;
  estimatedGas: string;
  networkName?: string;
}

export interface SwapPreview {
  fromToken: string;
  fromTokenAddress: string;
  fromAmount: string;
  toToken: string;
  toTokenAddress: string;
  toAmount: string;
  rate: string;
  estimatedGas: string;
  slippage: number;
  rawSwapData?: any;
}

export interface ChartDataPoint {
  time: string;
  price: number;
}

export interface TraderSignal {
  id: string;
  name: string;
  avatar: string;
  signal: string;
  coin: string;
  direction: 'Long' | 'Short';
  entry: number;
  tp: number;
  winRate: number;
  totalSignals: number;
  verified: boolean;
}

export interface PortfolioHolding {
  symbol: string;
  name: string;
  amount: number;
  valueUsd: number;
  color: string;
}

export interface CoinGeckoCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_24h: number;
  sparkline_in_7d: {
    price: number[];
  };
}

export type SidebarFeature =
  | 'portfolio'
  | 'wallet'
  | 'watchlist'
  | 'chart'
  | 'morning'
  | 'debate'
  | 'journal';
