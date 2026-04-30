// ── services/finnhub.js ──────────────────────────────────────
// Finnhub API — free tier (60 req/min)

const Finnhub = (() => {
  const BASE = 'https://finnhub.io/api/v1';
  const KEY  = 'FINNHUB_KEY_PLACEHOLDER';

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
    // Use quote history via basic financials — candle endpoint requires premium
    // Fall back to generating a simulated trend from current quote data
    try {
      const now  = Math.floor(Date.now() / 1000);
      const from = now - 60 * 60 * 24 * 10;
      const data = await get('/stock/candle', { symbol, resolution: 'D', from, to: now });
      if (data && data.s !== 'no_data' && data.c) return data;
      throw new Error('no data');
    } catch {
      // Fallback: use current quote to build a minimal chart
      const q = await get('/quote', { symbol });
      if (!q || !q.c) return { s: 'no_data' };
      const now = Math.floor(Date.now() / 1000);
      const day = 86400;
      return {
        s: 'ok',
        t: [now-6*day, now-5*day, now-4*day, now-3*day, now-2*day, now-day, now],
        c: [q.pc, q.pc, q.pc, q.pc, q.pc, q.pc, q.c],
        o: [q.o, q.o, q.o, q.o, q.o, q.o, q.o],
        h: [q.h, q.h, q.h, q.h, q.h, q.h, q.h],
        l: [q.l, q.l, q.l, q.l, q.l, q.l, q.l],
        v: [0, 0, 0, 0, 0, 0, 0],
      };
    }
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
