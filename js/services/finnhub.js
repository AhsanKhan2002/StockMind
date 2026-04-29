// ── services/finnhub.js ──────────────────────────────────────
// All Finnhub API calls live here. Key is read from config.js.

const Finnhub = (() => {
  const BASE = 'https://finnhub.io/api/v1';

  function key() {
    return '9277f093069c5419989db20e4a0a0628';
  }

  async function get(path, params = {}) {
    const url = new URL(`${BASE}${path}`);
    url.searchParams.set('token', key());
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Finnhub ${path} → ${res.status}`);
    return res.json();
  }

  // Quote for a single symbol
  async function quote(symbol) {
    return get('/quote', { symbol });
  }

  // Batch quotes for multiple symbols
  async function quotes(symbols) {
    return Promise.all(symbols.map(s => quote(s).then(q => ({ symbol: s, ...q }))));
  }

  // Weekly candles (last 7 trading days)
  async function weeklyCandles(symbol) {
    const now = Math.floor(Date.now() / 1000);
    const from = now - 60 * 60 * 24 * 10; // 10 days back to ensure 5 trading days
    return get('/stock/candle', { symbol, resolution: 'D', from, to: now });
  }

  // Company profile
  async function profile(symbol) {
    return get('/stock/profile2', { symbol });
  }

  // Recent news for a symbol
  async function news(symbol) {
    const to = new Date().toISOString().split('T')[0];
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return get('/company-news', { symbol, from, to });
  }

  // Basic financials
  async function financials(symbol) {
    return get('/stock/metric', { symbol, metric: 'all' });
  }

  // Recommendation trends
  async function recommendations(symbol) {
    return get('/stock/recommendation', { symbol });
  }

  // Insider transactions
  async function insiders(symbol) {
    return get('/stock/insider-transactions', { symbol });
  }

  // Earnings surprises
  async function earnings(symbol) {
    return get('/stock/earnings', { symbol });
  }

  // Social sentiment
  async function sentiment(symbol) {
    return get('/stock/social-sentiment', { symbol });
  }

  // Top gainers/losers — Finnhub doesn't have a native endpoint,
  // so we fetch quotes for a broad watchlist and rank ourselves.
  const WATCHLIST = [
    'AAPL','MSFT','NVDA','AMZN','GOOGL','META','TSLA','BRK.B','JPM','V',
    'UNH','XOM','LLY','JNJ','PG','MA','HD','CVX','MRK','ABBV',
    'AVGO','COST','PEP','KO','AMD','NFLX','TMO','ORCL','CRM','ACN',
    'BAC','WMT','DIS','INTC','QCOM','GS','MS','PYPL','SHOP','SQ',
    'PLTR','SOFI','HOOD','RIVN','LCID','NIO','F','GM','BA','GE'
  ];

  async function topMovers() {
    const data = await quotes(WATCHLIST);
    const valid = data.filter(q => q.dp !== null && q.dp !== undefined && q.c > 0);
    const sorted = [...valid].sort((a, b) => b.dp - a.dp);
    return {
      gainers: sorted.slice(0, 5),
      losers:  sorted.slice(-5).reverse(),
    };
  }

  return { quote, quotes, weeklyCandles, profile, news, financials, recommendations, insiders, earnings, sentiment, topMovers };
})();
