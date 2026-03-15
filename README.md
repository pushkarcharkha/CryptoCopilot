# 🚀 CryptoCopilot - Your Agentic Web3 Companion

**CryptoCopilot** is a next-generation decentralized finance (DeFi) dashboard that combines the power of AI with seamless blockchain integration. Built for traders and power users, it offers an agentic chat interface to manage your assets, monitor markets, and execute trades using natural language.

---

## ✨ Key Features

### 🤖 AI Crypto Co-pilot
*   **Natural Language Commands**: "Buy 0.1 BNB worth of USDT", "Show me the SOL chart", or "Send 0.05 ETH to Vitalik".
*   **Context-Aware Analysis**: The AI knows your live wallet balance, recent transactions, and current market prices.
*   **Intelligent Routing**: Automatically detects swap intents, fetches quotes from DEXs, and prepares transactions for your approval.

### 💼 Multi-Chain Wallet Management
*   **Unified Dashboard**: Support for Ethereum, BNB Smart Chain, Polygon, and Sepolia Testnet.
*   **Real-time Balances**: Instantly tracks native tokens and supported ERC-20 assets (USDT, USDC, LINK).
*   **Contact Book**: Save frequently used addresses by name for faster, human-readable transfers.

### 🔄 Integrated DEX Trading (PancakeSwap)
*   **Native Swaps**: Swap any supported tokens directly on the BNB Smart Chain using the PancakeSwap V2 Router.
*   **Zero Fees**: No platform fees—only standard network gas and DEX provider fees apply.
*   **Slippage Protection**: Intelligent quote management to ensure you get the best market rates.

### 📈 Advanced Market Monitoring
*   **Dynamic Watchlist**: Real-time data for the top 250+ cryptocurrencies via CoinGecko.
*   **Search & Discover**: Find any coin instantly and add it to your personal favorites.
*   **Professional Charts**: Fully integrated TradingView charts with:
    *   Candlestick & Line views.
    *   **Expandable Canvas** (400px to 600px).
    *   **Drawing Suite**: Trendlines, Fibonacci, and patterns for deep technical analysis.
    *   7-day Sparkline overviews for quick trend detection.

### 📜 Transaction Intelligence
*   **Live History**: Locally tracked history of all your sends, swaps, and receives.
*   **Direct Explorer Links**: Click any transaction to view it live on Etherscan, BscScan, or Polygonscan.

---

## 🛠️ Technology Stack

*   **Frontend**: React 18 + TypeScript + Vite
*   **Styling**: CSS Modules with Modern Glassmorphism & Dark Mode
*   **Blockchain**: Ethers.js v6 (MetaMask / Trust Wallet / Web3 Injection)
*   **AI Engine**: Groq LPU™ (LLaMA 3 / Mixtral) for instant responses
*   **Data APIs**:
    *   **CoinGecko**: Market prices and coin discovery
    *   **TradingView**: Advanced charting library
    *   **PancakeSwap V2**: On-chain swap routing

---

## 🚀 Getting Started

### 1. Prerequisites
*   [Node.js](https://nodejs.org/) (v18 or higher)
*   [MetaMask](https://metamask.io/) browser extension

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/cryptocopilot.git

# Navigate to project
cd cryptocopilot

# Install dependencies
npm install
```

### 3. API Setup
To use the AI chat features, you will need a **Groq API Key**:
1. Get a free key at [Groq Cloud Console](https://console.groq.com/).
2. Open the app, click the **Settings** icon (bottom left).
3. Paste your API key. (Key is stored securely in your browser's `localStorage`).

### 4. Run Development Server
```bash
npm run dev
```

---

## 🛡️ Security & Privacy
*   **Key Security**: Your Groq API key and Watchlist are stored strictly in your local browser storage.
*   **Non-Custodial**: CryptoCopilot never asks for your private keys or seed phrase. All transactions are signed via your connected Web3 wallet (e.g., MetaMask).
*   **CORS Protection**: Integrated local proxy to ensure secure data fetching from market providers.

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.

---

*Designed and Built with ⚡ by Antigravity*
