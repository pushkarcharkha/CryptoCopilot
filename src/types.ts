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
  | 'history'
  | 'history'
  | 'news-sentiment'
  | 'futures';

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

export interface FuturesPosition {
  id: number;
  coin: string;
  coinId: string;
  direction: 'long' | 'short';
  leverage: number;
  entryPrice: number;
  size: number;
  margin: number;
  liquidationPrice: number;
  openedAt: number;
  closedAt?: number;
  status: 'open' | 'closed' | 'liquidated';
  exitPrice?: number;
  pnl?: number;
  pnlPercent?: number;
}

export type SidebarFeature =
  | 'portfolio'
  | 'wallet'
  | 'watchlist'
  | 'chart'
  | 'morning'
  | 'debate'
  | 'journal'
  | 'news-sentiment'
  | 'futures';

export interface NewsArticle {
  title: string;
  description?: string;
  url: string;
  thumb_2x?: string;
  image?: string;
  created_at?: string;
  published_at?: string;
  author?: string;
  source?: {
    name: string;
    domain?: string;
  };
  votes?: {
    negative: number;
    positive: number;
    important: number;
    liked: number;
    disliked: number;
    saved: number;
    comments: number;
  };
  currencies?: {
    code: string;
    title: string;
    slug: string;
    url: string;
  }[];
}

export interface FearGreedData {
  value: string;
  value_classification: string;
  timestamp: string;
  time_until_update?: string;
}
