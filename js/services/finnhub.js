// ── services/fmp.js ──────────────────────────────────────────
// Financial Modeling Prep (FMP) API — free tier compatible

const Finnhub = (() => {
  const BASE = 'https://financialmodelingprep.com/api/v3';
  const KEY  = 'loo4ETbZdvygbJ0whsNqVZX1uRFcMg11';

  async function get(path, params = {}) {
    const url = new URL(`${BASE}${path}`);
    url.searchParams.set('apikey', KEY);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`FMP ${path} → ${res.status}`);
    return res.json();
  }

  // Quote for a single symbol — uses /quote/:symbol
  async function quote(symbol) {
    const data = await get(`/quote/${symbol}`);
    const q = Array.isArray(data) ? data[0] : data;
    if (!q) throw new Error(`No quote data for ${symbol}`);
    return {
      c:  q.price              || 0,
      o:  q.open               || 0,
      h:  q.dayHigh            || 0,
      l:  q.dayLow             || 0,
      d:  q.change             || 0,
      dp: q.changesPercentage  || 0,
      v:  q.volume             || 0,
      symbol,
    };
  }

  // Batch quotes — FMP supports comma-separated symbols in one call
  async function batchQuotes(symbols) {
    const joined = symbols.join(',');
    const data = await get(`/quote/${joined}`);
    return (Array.isArray(data) ? data : []).map(q => ({
      symbol: q.symbol,
      c:  q.price             || 0,
      o:  q.open              || 0,
      h:  q.dayHigh           || 0,
      l:  q.dayLow            || 0,
      d:  q.change            || 0,
      dp: q.changesPercentage || 0,
      v:  q.volume            || 0,
    }));
  }

  // Top gainers/losers — batch fetch a watchlist, rank ourselves
  // Uses only 1 API call instead of 50
  const WATCHLIST = [
    'AAPL','MSFT','NVDA','AMZN','GOOGL','META','TSLA','JPM','V','UNH',
    'XOM','LLY','JNJ','PG','MA','HD','CVX','MRK','ABBV','AVGO',
    'COST','PEP','KO','AMD','NFLX','ORCL','CRM','BAC','WMT','DIS',
    'INTC','QCOM','GS','PYPL','SHOP','PLTR','SOFI','HOOD','RIVN','F',
    'GM','BA','GE','NIO','LCID','SQ','ACN','MS','TMO','BRK.B'
  ];

  async function topMovers() {
    const data = await batchQuotes(WATCHLIST);
    const valid = data.filter(q => q.dp !== null && q.dp !== undefined && q.c > 0);
    const sorted = [...valid].sort((a, b) => b.dp - a.dp);
    return {
      gainers: sorted.slice(0, 5),
      losers:  sorted.slice(-5).reverse(),
    };
  }

  // Weekly candles
  async function weeklyCandles(symbol) {
    const to   = new Date().toISOString().split('T')[0];
    const from = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const data = await get(`/historical-price-full/${symbol}`, { from, to });
    const hist = (data.historical || []).reverse();
    if (!hist.length) return { s: 'no_data' };
    return {
      s: 'ok',
      t: hist.map(d => Math.floor(new Date(d.date).getTime() / 1000)),
      c: hist.map(d => d.close),
      o: hist.map(d => d.open),
      h: hist.map(d => d.high),
      l: hist.map(d => d.low),
      v: hist.map(d => d.volume),
    };
  }

  // Company profile
  async function profile(symbol) {
    const data = await get(`/profile/${symbol}`);
    const p = Array.isArray(data) ? data[0] : data;
    if (!p) return { name: symbol };
    return {
      name:                 p.companyName       || symbol,
      finnhubIndustry:      p.industry          || '',
      exchange:             p.exchangeShortName  || '',
      marketCapitalization: p.mktCap ? p.mktCap / 1e6 : null,
      weburl:               p.website            || '',
      logo:                 p.image              || '',
      description:          p.description        || '',
    };
  }

  // News
  async function news(symbol) {
    const data = await get(`/stock_news`, { tickers: symbol, limit: 10 });
    return (Array.isArray(data) ? data : []).map(n => ({
      headline: n.title    || '',
      summary:  n.text     || '',
      url:      n.url      || '',
      source:   n.site     || '',
      datetime: n.publishedDate ? new Date(n.publishedDate).getTime() / 1000 : 0,
    }));
  }

  // Financials
  async function financials(symbol) {
    const [ratios, metrics] = await Promise.allSettled([
      get(`/ratios-ttm/${symbol}`),
      get(`/key-metrics-ttm/${symbol}`),
    ]);
    const r = Array.isArray(ratios.value)  ? ratios.value[0]  : {};
    const m = Array.isArray(metrics.value) ? metrics.value[0] : {};
    return {
      metric: {
        peBasicExclExtraTTM: r?.peRatioTTM          || null,
        '52WeekHigh':        null,
        '52WeekLow':         null,
        revenueGrowthTTMYoy: m?.revenueGrowthTTM    || null,
        netProfitMarginTTM:  r?.netProfitMarginTTM  || null,
      },
    };
  }

  // Analyst recommendations
  async function recommendations(symbol) {
    const data = await get(`/analyst-stock-recommendations/${symbol}`);
    if (!Array.isArray(data) || !data.length) return [];
    const counts = { strongBuy: 0, buy: 0, hold: 0, sell: 0, strongSell: 0 };
    data.slice(0, 5).forEach(d => {
      counts.strongBuy  += d.analystRatingsbuy         || 0;
      counts.buy        += d.analystRatingsOverweight   || 0;
      counts.hold       += d.analystRatingsHold         || 0;
      counts.sell       += d.analystRatingsUnderweight  || 0;
      counts.strongSell += d.analystRatingsSell         || 0;
    });
    return [counts];
  }

  // Insider transactions
  async function insiders(symbol) {
    const data = await get(`/insider-trading`, { symbol, limit: 5 });
    return {
      data: (Array.isArray(data) ? data : []).map(d => ({
        name:             d.reportingName,
        transactionCode:  d.transactionType,
        share:            d.securitiesTransacted,
        transactionPrice: d.price,
      })),
    };
  }

  // Earnings surprises
  async function earnings(symbol) {
    const data = await get(`/earnings-surprises/${symbol}`);
    return Array.isArray(data) ? data.slice(0, 4) : [];
  }

  // Sentiment — not on FMP free tier, Gemini handles it
  async function sentiment() {
    return { data: [] };
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
