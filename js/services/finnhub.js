// ── services/finnhub.js ──────────────────────────────────────
// Finnhub API — free tier (60 req/min)

const Finnhub = (() => {
  const BASE = 'https://finnhub.io/api/v1';
  const KEY  = 'd7pbbv9r01qlb0a9dr4gd7pbbv9r01qlb0a9dr50';

  async function get(path, params = {}) {
    const url = new URL(`${BASE}${path}`);
    url.searchParams.set('token', KEY);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Finnhub ${path} → ${res.status}`);
    return res.json();
  }

  async function quote(symbol) {
    const q = await get('/quote', { symbol });
    return {
      c:  q.c  || 0,
      o:  q.o  || 0,
      h:  q.h  || 0,
      l:  q.l  || 0,
      d:  q.d  || 0,
      dp: q.dp || 0,
      v:  q.v  || 0,
      symbol,
    };
  }

  const WATCHLIST = [
    'AAPL','MSFT','NVDA','AMZN','GOOGL','META','TSLA','JPM','V','UNH',
    'XOM','LLY','JNJ','PG','MA','HD','CVX','MRK','ABBV','AVGO',
    'COST','PEP','KO','AMD','NFLX','ORCL','CRM','BAC','WMT','DIS',
    'INTC','QCOM','GS','PYPL','SHOP','PLTR','SOFI','HOOD','RIVN','F',
    'GM','BA','GE','NIO','LCID','SQ','ACN','MS','TMO','BRK.B'
  ];

  async function topMovers() {
    const data = await Promise.all(WATCHLIST.map(s =>
      get('/quote', { symbol: s }).then(q => ({ symbol: s, ...q })).catch(() => null)
    ));
    const valid  = data.filter(q => q && q.dp !== null && q.c > 0);
    const sorted = [...valid].sort((a, b) => b.dp - a.dp);
    return {
      gainers: sorted.slice(0, 5),
      losers:  sorted.slice(-5).reverse(),
    };
  }

  async function weeklyCandles(symbol) {
    const now  = Math.floor(Date.now() / 1000);
    const from = now - 60 * 60 * 24 * 10;
    return get('/stock/candle', { symbol, resolution: 'D', from, to: now });
  }

  async function profile(symbol) {
    return get('/stock/profile2', { symbol });
  }

  async function news(symbol) {
    const to   = new Date().toISOString().split('T')[0];
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return get('/company-news', { symbol, from, to });
  }

  async function financials(symbol) {
    return get('/stock/metric', { symbol, metric: 'all' });
  }

  async function recommendations(symbol) {
    return get('/stock/recommendation', { symbol });
  }

  async function insiders(symbol) {
    return get('/stock/insider-transactions', { symbol });
  }

  async function earnings(symbol) {
    return get('/stock/earnings', { symbol });
  }

  async function sentiment(symbol) {
    return get('/stock/social-sentiment', { symbol });
  }

  return {
    quote,
    quotes: async (symbols) => Promise.all(symbols.map(s => quote(s))),
    weeklyCandles,
    profile,
    news,
    financials,
    recommendations,
    insiders,
    earnings,
    sentiment,
    topMovers,
  };
})();
