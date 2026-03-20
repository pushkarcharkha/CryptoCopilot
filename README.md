# 🚀 Cryptoguru AI - The Agentic Web3 OS

**Cryptoguru** is a high-performance, AI-driven DeFi terminal that merges natural language intelligence with deep blockchain execution. Designed for the next generation of traders, it provides a unified, HUD-style interface for managing assets, analyzing market sentiment, and executing complex trades across the BNB Smart Chain and beyond.

![Cryptoguru Interface](https://raw.githubusercontent.com/pushkarcharkha/CryptoCopilot/main/public/preview.png)

---

## ✨ Key Features

### 🤖 Agentic AI Terminal (Groq-Powered)
*   **Natural Language Interaction**: Execute sophisticated blockchain actions by simply talking. "Swap 0.1 BNB for USDT", "Analyze the SOL chart", or "Show me the top movers".
*   **Context-Aware Reasoning**: The AI maintains full context of your wallet balances, trading history, and real-time market sentiment to provide actionable advice.
*   **Automatic Tool Routing**: Intelligently switches between price fetching, chart drawing, news aggregation, and transaction preparation.

### 📈 Advanced Chart Analysis
*   **AI-Annotated Charts**: Integrated `lightweight-charts` with automated technical analysis.
*   **Auto-Detection**: The AI automatically identifies and draws:
    *   **Support & Resistance levels** (Green/Red zones).
    *   **EMA Crossovers** (20/50 period indicators).
    *   **Trendlines** and **Buy/Sell signals** based on price action.
*   **Professional Suite**: Expandable HUD-style chart interface with multi-timeframe support.

### 🗞️ News & Sentiment OS
*   **RSS Intelligence**: Real-time news feeds aggregated from **CoinDesk**, **CoinTelegraph**, and **Decrypt**.
*   **Fear & Greed Index**: Integrated market sentiment monitoring (Alternative.me API) to help gauge market psychology.
*   **Semantic Search**: AI-powered news relevance filtering (Top-notch news extraction).

### 🧪 Simulation & Execution
*   **Paper Futures**: Practice high-leverage trading with a $1,000 virtual balance. Test strategies with zero risk.
*   **Integrated DEX (PancakeSwap)**: Native, non-custodial swaps on the BNB Smart Chain using the PancakeSwap V2 Router.
*   **Wallet Hub**: Unified management for BSC, Ethereum, Polygon, and Sepolia with a built-in address book.

---

## 🛠️ Technology Stack

*   **Frontend**: React 18 + TypeScript + Vite
*   **Visuals**: Three.js (3D Globe/Hero), GSAP (Cinematic Animations), Locomotive Scroll
*   **Iconography**: Lucide React (Full vector icon system)
*   **Blockchain**: Ethers.js v6 + Web3 Browser Extensions
*   **AI Engine**: Groq LPU™ (Llama 3.3 70B) for sub-second inference
*   **Data Providers**:
    *   **CoinGecko**: Live price and OHLCV data
    *   **rss2json**: News feed transformation
    *   **Alternative.me**: Fear & Greed Index

---

## 🚀 Getting Started

### 1. Prerequisites
*   [Node.js](https://nodejs.org/) (v18+)
*   [MetaMask](https://metamask.io/) or any Web3 Browser Wallet

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/pushkarcharkha/CryptoCopilot.git

# Navigate to project
cd CryptoCopilot

# Install dependencies
npm install
```

### 3. AI Activation
To power the intelligence engine, you need a **Groq API Key**:
1. Obtain a free key at [console.groq.com](https://console.groq.com/).
2. Launch the app and click the **Settings** (Gear) icon in the sidebar.
3. Paste your key. (Stored locally in your browser's encrypted `localStorage`).

### 4. Run Development
```bash
npm run dev
```

---

## 🛡️ Security & Privacy
*   **Non-Custodial**: Cryptoguru never sees your private keys. All transaction signing happens via your wallet (MetaMask).
*   **Local-First Storage**: Your API keys and watchlists never leave your device.
*   **Privacy Centric**: Zero-tracking architecture. We don't log your prompts or your trades.

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.

---

*Designed and Built with ⚡ by Antigravity*
