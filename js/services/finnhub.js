// ── services/twelvedata.js ────────────────────────────────────
// Twelve Data API — free tier compatible (800 req/day, 8/min)

const Finnhub = (() => {
  const BASE = 'https://api.twelvedata.com';
  const KEY  = '6c698bee81bb410c86ce080d7247668b'; // ← paste your key here

  async function get(path, params = {}) {
    const url = new URL(`${BASE}${path}`);
    url.searchParams.set('apikey', KEY);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`TwelveData ${path} → ${res.status}`);
    const data = await res.json();
    if (data.status === 'error') throw new Error(`TwelveData: ${data.message}`);
    return data;
  }

  // Single quote
  async function quote(symbol) {
    const q = await get('/quote', { symbol });
    return {
      c:  parseFloat(q.close)          || 0,
      o:  parseFloat(q.open)           || 0,
      h:  parseFloat(q.high)           || 0,
      l:  parseFloat(q.low)            || 0,
      d:  parseFloat(q.change)         || 0,
      dp: parseFloat(q.percent_change) || 0,
      v:  parseFloat(q.volume)         || 0,
      symbol,
    };
  }

  // Watchlist for gainers/losers calculation
  // Exactly 8 symbols — matches Twelve Data free tier (8 credits/min)
  const WATCHLIST = ['AAPL','MSFT','NVDA','TSLA','AMZN','META','GOOGL','AMD'];

  async function topMovers() {
    // Fetch all quotes in one call using comma-separated symbols
    const data = await get('/quote', { symbol: WATCHLIST.join(',') });

    // Twelve Data returns an object keyed by symbol when multiple requested
    const results = Object.entries(data).map(([symbol, q]) => ({
      symbol,
      c:  parseFloat(q.close)          || 0,
      o:  parseFloat(q.open)           || 0,
      h:  parseFloat(q.high)           || 0,
      l:  parseFloat(q.low)            || 0,
      d:  parseFloat(q.change)         || 0,
      dp: parseFloat(q.percent_change) || 0,
      v:  parseFloat(q.volume)         || 0,
    })).filter(q => q.c > 0);

    const sorted = [...results].sort((a, b) => b.dp - a.dp);
    return {
      gainers: sorted.slice(0, 5),
      losers:  sorted.slice(-5).reverse(),
    };
  }

  // Weekly candles
  async function weeklyCandles(symbol) {
    const data = await get('/time_series', {
      symbol,
      interval:    '1day',
      outputsize:  10,
      order:       'ASC',
    });

    const values = data.values || [];
    if (!values.length) return { s: 'no_data' };

    return {
      s: 'ok',
      t: values.map(d => Math.floor(new Date(d.datetime).getTime() / 1000)),
      c: values.map(d => parseFloat(d.close)),
      o: values.map(d => parseFloat(d.open)),
      h: values.map(d => parseFloat(d.high)),
      l: values.map(d => parseFloat(d.low)),
      v: values.map(d => parseFloat(d.volume)),
    };
  }

  // Company profile — Twelve Data has a profile endpoint
  async function profile(symbol) {
    try {
      const data = await get('/profile', { symbol });
      return {
        name:                 data.name            || symbol,
        finnhubIndustry:      data.sector          || '',
        exchange:             data.exchange         || '',
        marketCapitalization: data.market_cap ? parseFloat(data.market_cap) / 1e6 : null,
        weburl:               data.website          || '',
        logo:                 data.logo             || '',
        description:          data.description      || '',
      };
    } catch {
      return { name: symbol };
    }
  }

  // News — Twelve Data has a news endpoint
  async function news(symbol) {
    try {
      const data = await get('/news', { symbol, outputsize: 10 });
      return (data.data || []).map(n => ({
        headline: n.title       || '',
        summary:  n.description || '',
        url:      n.url         || '',
        source:   n.source      || '',
        datetime: n.datetime ? new Date(n.datetime).getTime() / 1000 : 0,
      }));
    } catch {
      return [];
    }
  }

  // Financials — Twelve Data has statistics endpoint
  async function financials(symbol) {
    try {
      const data = await get('/statistics', { symbol });
      const v = data.statistics?.valuations_metrics || {};
      const s = data.statistics?.stock_price_summary || {};
      return {
        metric: {
          peBasicExclExtraTTM: parseFloat(v.trailing_pe)    || null,
          '52WeekHigh':        parseFloat(s['52_week_high']) || null,
          '52WeekLow':         parseFloat(s['52_week_low'])  || null,
          revenueGrowthTTMYoy: null,
          netProfitMarginTTM:  null,
        },
      };
    } catch {
      return { metric: {} };
    }
  }

  // Analyst recommendations — not on Twelve Data free tier, Gemini handles
  async function recommendations() { return []; }

  // Insider transactions — not on Twelve Data free tier
  async function insiders() { return { data: [] }; }

  // Earnings — not on Twelve Data free tier
  async function earnings() { return []; }

  // Sentiment — Gemini handles this
  async function sentiment() { return { data: [] }; }

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
