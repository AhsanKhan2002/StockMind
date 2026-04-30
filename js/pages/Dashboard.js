// ── pages/Dashboard.js ───────────────────────────────────────

const Dashboard = (() => {
  let weeklyData = {};   // cache { symbol: candles }

  async function render() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    app.className = 'page-dashboard';

    // Header
    const header = document.createElement('header');
    header.className = 'dash-header';
    header.innerHTML = `
      <div class="logo-wrap">
        <span class="logo-icon">◈</span>
        <span class="logo-text">Stock<em>Mind</em></span>
      </div>
      <div class="dash-tagline">AI-powered market intelligence</div>
      <div class="market-time" id="market-time"></div>
    `;
    app.appendChild(header);

    // Ticker tape
    const tape = document.createElement('div');
    tape.className = 'ticker-tape';
    tape.innerHTML = `<div class="tape-inner" id="tape-inner"><span class="tape-loading">Loading market data…</span></div>`;
    app.appendChild(tape);

    // Main grid
    const main = document.createElement('main');
    main.className = 'dash-main';

    // Gainers panel
    const gainersPanel = createPanel('top-gainers', '▲ Top Gainers', 'gain');
    const losersPanel  = createPanel('top-losers',  '▼ Top Losers',  'loss');

    main.appendChild(gainersPanel);
    main.appendChild(losersPanel);
    app.appendChild(main);

    // Weekly trend section
    const weeklySection = document.createElement('section');
    weeklySection.className = 'weekly-section';
    weeklySection.innerHTML = `
      <div class="weekly-header">
        <h2 class="section-title">Weekly Trend</h2>
        <div class="weekly-controls">
          <span class="weekly-label">Select a stock:</span>
          <select id="weekly-select" class="weekly-select">
            <option value="">— choose a symbol —</option>
          </select>
        </div>
      </div>
      <div id="weekly-chart-area" class="weekly-chart-area">
        <div class="weekly-placeholder">
          <span class="placeholder-icon">◈</span>
          <p>Select a stock above to see its weekly performance chart</p>
        </div>
      </div>
    `;
    app.appendChild(weeklySection);

    // Footer
    const footer = document.createElement('footer');
    footer.className = 'dash-footer';
    footer.innerHTML = `
      <p>StockMind &mdash; Data by Finnhub &middot; AI by Gemini &middot; For informational purposes only. Not financial advice.</p>
    `;
    app.appendChild(footer);

    // Update clock
    updateClock();
    setInterval(updateClock, 1000);

    // Load data
    await loadMovers(gainersPanel, losersPanel, weeklySection);
  }

  function createPanel(id, title, type) {
    const panel = document.createElement('section');
    panel.className = `movers-panel ${type}-panel`;
    panel.innerHTML = `
      <div class="panel-header">
        <h2 class="panel-title ${type}-title">${title}</h2>
        <div class="panel-subtitle">Past trading day</div>
      </div>
      <div class="cards-list" id="${id}">
        ${[...Array(5)].map(() => `<div class="stock-card skeleton"></div>`).join('')}
      </div>
    `;
    return panel;
  }

  async function loadMovers(gainersPanel, losersPanel, weeklySection) {
    try {
      const { gainers, losers } = await Finnhub.topMovers();

      // Render gainers
      const gainersEl = gainersPanel.querySelector('#top-gainers');
      gainersEl.innerHTML = '';
      gainers.forEach((s, i) => gainersEl.appendChild(StockCard(s, i)));

      // Render losers
      const losersEl = losersPanel.querySelector('#top-losers');
      losersEl.innerHTML = '';
      losers.forEach((s, i) => losersEl.appendChild(StockCard(s, i)));

      // Populate weekly dropdown with all movers
      const allSymbols = [...gainers, ...losers].map(s => s.symbol);
      const select = document.getElementById('weekly-select');
      allSymbols.forEach(sym => {
        const opt = document.createElement('option');
        opt.value = sym;
        opt.textContent = sym;
        select.appendChild(opt);
      });

      select.addEventListener('change', () => {
        if (select.value) loadWeeklyChart(select.value);
      });

      // Ticker tape
      populateTape([...gainers, ...losers]);

    } catch (err) {
      console.error(err);
      document.getElementById('top-gainers').innerHTML = '';
      document.getElementById('top-gainers').appendChild(ErrorBanner('Failed to load gainers. Check your Finnhub API key.'));
      document.getElementById('top-losers').innerHTML = '';
      document.getElementById('top-losers').appendChild(ErrorBanner('Failed to load losers.'));
    }
  }

  async function loadWeeklyChart(symbol) {
    const area = document.getElementById('weekly-chart-area');
    area.innerHTML = '';
    area.appendChild(Spinner(`Loading ${symbol} weekly data…`));

    try {
      if (!weeklyData[symbol]) {
        weeklyData[symbol] = await Finnhub.weeklyCandles(symbol);
      }
      const candles = weeklyData[symbol];
      area.innerHTML = '';

      const wrap = document.createElement('div');
      wrap.className = 'weekly-chart-inner';

      // Stats bar
      if (candles.c?.length) {
        const first = candles.c[0];
        const last  = candles.c[candles.c.length - 1];
        const chg   = ((last - first) / first * 100).toFixed(2);
        const isUp  = last >= first;
        wrap.innerHTML = `
          <div class="weekly-stats">
            <span class="weekly-symbol">${symbol}</span>
            <span class="weekly-price">$${last.toFixed(2)}</span>
            <span class="weekly-change ${isUp ? 'up' : 'down'}">${isUp ? '▲' : '▼'} ${Math.abs(chg)}% this week</span>
          </div>
        `;
      }

      wrap.appendChild(DetailChart(candles, symbol));
      area.appendChild(wrap);
    } catch (err) {
      area.innerHTML = '';
      area.appendChild(ErrorBanner(`Could not load chart for ${symbol}`));
    }
  }

  function populateTape(stocks) {
    const inner = document.getElementById('tape-inner');
    if (!inner) return;
    const items = [...stocks, ...stocks]; // duplicate for seamless loop
    inner.innerHTML = items.map(s => {
      const up = s.dp >= 0;
      return `<span class="tape-item">
        <span class="tape-sym">${s.symbol}</span>
        <span class="tape-val">$${s.c.toFixed(2)}</span>
        <span class="tape-chg ${up ? 'up' : 'down'}">${up ? '+' : ''}${s.dp.toFixed(2)}%</span>
      </span>`;
    }).join('<span class="tape-dot">◆</span>');
  }

  function updateClock() {
    const el = document.getElementById('market-time');
    if (!el) return;
    const now = new Date();
    const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const h = nyTime.getHours(), m = nyTime.getMinutes();
    const isOpen = nyTime.getDay() >= 1 && nyTime.getDay() <= 5 && (h > 9 || (h === 9 && m >= 30)) && h < 16;
    el.innerHTML = `<span class="market-status ${isOpen ? 'open' : 'closed'}">${isOpen ? '● MARKET OPEN' : '● MARKET CLOSED'}</span> <span class="market-tz">${now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' })} ET</span>`;
  }

  return { render };
})();
