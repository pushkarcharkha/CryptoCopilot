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
  | 'watchlist'
  | 'contacts';

export interface TransactionPreview {
  recipientName: string;
  address: string;
  amount: string;
  coin: string;
  estimatedGas: string;
  networkName?: string;
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

export type SidebarFeature =
  | 'portfolio'
  | 'wallet'
  | 'watchlist'
  | 'chart'
  | 'morning'
  | 'debate'
  | 'journal';
