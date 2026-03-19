/**
 * Agent Router — Detects which specialized AI agent should handle
 * a given user message based on sidebar context and message keywords.
 */

export type AgentType =
  | 'CHART_ANALYSIS'
  | 'FUTURES'
  | 'PORTFOLIO'
  | 'WALLET'
  | 'WATCHLIST'
  | 'NEWS_SENTIMENT'
  | 'TRADE_JOURNAL'
  | 'GENERAL';

/**
 * Maps the SidebarFeature type to agent-compatible section identifiers.
 */
const SIDEBAR_TO_SECTION: Record<string, string> = {
  'chart': 'chart-analysis',
  'futures': 'futures',
  'portfolio': 'portfolio',
  'wallet': 'wallet',
  'watchlist': 'watchlist',
  'news-sentiment': 'news-sentiment',
  'journal': 'trade-journal',
};

/**
 * Detects which agent should handle the user's message.
 * Priority: sidebar context first, then message keyword matching.
 */
export function detectAgent(
  userMessage: string,
  activeSidebarSection: string | null
): AgentType {
  const msg = userMessage.toLowerCase();
  const section = activeSidebarSection
    ? SIDEBAR_TO_SECTION[activeSidebarSection] || activeSidebarSection
    : null;

  // --- Chart Analysis Agent ---
  if (
    section === 'chart-analysis' ||
    msg.includes('chart') ||
    msg.includes('analyze') ||
    msg.includes('pattern') ||
    msg.includes('trendline') ||
    msg.includes('support') ||
    msg.includes('resistance') ||
    msg.includes('candlestick') ||
    msg.includes('ema') ||
    msg.includes('technical analysis')
  ) {
    return 'CHART_ANALYSIS';
  }

  // --- Futures Agent ---
  if (
    section === 'futures' ||
    msg.includes('long') ||
    msg.includes('short') ||
    msg.includes('leverage') ||
    msg.includes('futures') ||
    msg.includes('position') ||
    msg.includes('liquidat') ||
    msg.includes('margin')
  ) {
    return 'FUTURES';
  }

  // --- Portfolio Agent ---
  if (
    section === 'portfolio' ||
    msg.includes('portfolio') ||
    msg.includes('holdings') ||
    msg.includes('pnl') ||
    msg.includes('profit') ||
    msg.includes('loss') ||
    msg.includes('allocation') ||
    msg.includes('rebalance')
  ) {
    return 'PORTFOLIO';
  }

  // --- Wallet Agent ---
  if (
    section === 'wallet' ||
    msg.includes('send') ||
    msg.includes('transfer') ||
    msg.includes('contact') ||
    msg.includes('address') ||
    msg.includes('wallet') ||
    msg.includes('balance') ||
    msg.includes('swap')
  ) {
    return 'WALLET';
  }

  // --- Watchlist Agent ---
  if (
    section === 'watchlist' ||
    msg.includes('watchlist') ||
    msg.includes('add to watch') ||
    msg.includes('track') ||
    msg.includes('monitor')
  ) {
    return 'WATCHLIST';
  }

  // --- News & Sentiment Agent ---
  if (
    section === 'news-sentiment' ||
    msg.includes('news') ||
    msg.includes('sentiment') ||
    msg.includes('fear') ||
    msg.includes('greed') ||
    msg.includes('market feeling') ||
    msg.includes('what is happening')
  ) {
    return 'NEWS_SENTIMENT';
  }

  // --- Trade Journal Agent ---
  if (
    section === 'trade-journal' ||
    msg.includes('journal') ||
    msg.includes('history') ||
    msg.includes('past trade') ||
    msg.includes('what did i') ||
    msg.includes('review my trade') ||
    msg.includes('trading pattern')
  ) {
    return 'TRADE_JOURNAL';
  }

  return 'GENERAL';
}

// ── Futures Intent Detection ──────────────────────────────────────────────

export type FuturesIntent = 'ADVICE_ONLY' | 'POSITION_OPEN' | 'POSITION_CLOSE' | 'STATUS_CHECK' | 'GENERAL_FUTURES';

const ADVICE_KEYWORDS = [
  'is btc good', 'is eth good', 'is sol good', 'is bnb good',
  'is ada good', 'is avax good', 'is link good', 'is dot good',
  'should i', 'what do you think', 'is it good', 'is it a good',
  'advice', 'suggest', 'recommend', 'good time', 'worth it',
  'opinion', 'thoughts on', 'good for long', 'good for short',
  'should i long', 'should i short', 'do you think',
  'what about', 'how about', 'would you', 'is it safe',
  'risky to', 'smart to', 'wise to', 'make sense to',
];

const OPEN_KEYWORDS = [
  'open a long', 'open a short', 'open long', 'open short',
  'place a long', 'place a short', 'place long', 'place short',
  'enter long', 'enter short', 'enter a long', 'enter a short',
  'create position', 'create a position',
  'open a position', 'open position',
  'yes open', 'yes, open', 'confirm', 'go ahead',
  'yes do it', 'yes please', 'do it', 'proceed',
];

const CLOSE_KEYWORDS = [
  'close position', 'close my position', 'close the position',
  'exit position', 'exit my position',
];

const STATUS_KEYWORDS = [
  'my positions', 'my pnl', 'how are my', 'position status',
  'show positions', 'current positions', 'open positions',
];

/**
 * Detects the user's intent when they are in the futures context.
 * This prevents the AI from opening positions when the user is just asking for advice.
 */
export function detectFuturesIntent(userMessage: string): FuturesIntent {
  const msg = userMessage.toLowerCase();

  // Check for explicit open requests FIRST (higher priority than advice)
  if (OPEN_KEYWORDS.some(k => msg.includes(k))) {
    return 'POSITION_OPEN';
  }

  // Check for close requests
  if (CLOSE_KEYWORDS.some(k => msg.includes(k))) {
    return 'POSITION_CLOSE';
  }

  // Check for status/PnL checks
  if (STATUS_KEYWORDS.some(k => msg.includes(k))) {
    return 'STATUS_CHECK';
  }

  // Check for advice-seeking (this catches "is BTC good for long", "should I short ETH")
  if (ADVICE_KEYWORDS.some(k => msg.includes(k))) {
    return 'ADVICE_ONLY';
  }

  // Default — could be anything, let the AI decide but still don't auto-open
  return 'GENERAL_FUTURES';
}
