// ── pages/StockDetail.js ─────────────────────────────────────

const StockDetail = (() => {

  async function render(symbol) {
    const app = document.getElementById('app');
    app.innerHTML = '';
    app.className = 'page-detail';

    // Back nav
    const nav = document.createElement('nav');
    nav.className = 'detail-nav';
    nav.innerHTML = `
      <button class="back-btn" id="back-btn">← Dashboard</button>
      <div class="logo-wrap small">
        <span class="logo-icon">◈</span>
        <span class="logo-text">Stock<em>Mind</em></span>
      </div>
    `;
    app.appendChild(nav);
    document.getElementById('back-btn').addEventListener('click', () => Router.navigate('/'));

    // Hero placeholder while loading
    const hero = document.createElement('section');
    hero.className = 'detail-hero';
    hero.innerHTML = `
      <div class="hero-left">
        <div class="hero-symbol">${symbol}</div>
        <div class="hero-name" id="hero-name">Loading…</div>
        <div class="hero-industry" id="hero-industry"></div>
      </div>
      <div class="hero-right">
        <div class="hero-price" id="hero-price">—</div>
        <div class="hero-change" id="hero-change"></div>
        <div class="hero-stats" id="hero-stats"></div>
      </div>
    `;
    app.appendChild(hero);

    // Chart area
    const chartSection = document.createElement('section');
    chartSection.className = 'detail-chart-section';
    chartSection.innerHTML = `<h2 class="section-title">Weekly Performance</h2>`;
    const chartArea = document.createElement('div');
    chartArea.id = 'chart-area';
    chartArea.appendChild(Spinner('Loading chart…'));
    chartSection.appendChild(chartArea);
    app.appendChild(chartSection);

    // News section
    const newsSection = document.createElement('section');
    newsSection.className = 'detail-section news-section';
    newsSection.innerHTML = `
      <h2 class="section-title">📰 Latest News & Market Impact</h2>
      <div id="news-area" class="news-area">${Spinner('Fetching news…').outerHTML}</div>
    `;
    app.appendChild(newsSection);

    // AI Analysis section
    const aiSection = document.createElement('section');
    aiSection.className = 'detail-section ai-section';
    aiSection.innerHTML = `
      <div class="ai-section-header">
        <span class="ai-badge">◈ AI</span>
        <h2 class="section-title">StockMind Investment Analysis</h2>
        <p class="ai-disclaimer">Powered by Gemini AI. For informational purposes only — not financial advice.</p>
      </div>
      <div id="ai-area" class="ai-area">${Spinner('Analyzing with AI — this may take 10–20 seconds…').outerHTML}</div>
    `;
    app.appendChild(aiSection);

    // Footer
    const footer = document.createElement('footer');
    footer.className = 'dash-footer';
    footer.innerHTML = `<p>StockMind &mdash; Data by Finnhub &middot; AI by Gemini &middot; Not financial advice.</p>`;
    app.appendChild(footer);

    // Load all data in parallel (profile+quote fast, AI slow)
    loadCoreData(symbol, hero, chartArea);
    loadNews(symbol, newsSection.querySelector('#news-area'));
    loadAIAnalysis(symbol, aiSection.querySelector('#ai-area'));
  }

  async function loadCoreData(symbol, hero, chartArea) {
    try {
      const [quoteData, profileData, candles] = await Promise.all([
        Finnhub.quote(symbol),
        Finnhub.profile(symbol),
        Finnhub.weeklyCandles(symbol),
      ]);

      // Update hero
      const isUp = quoteData.dp >= 0;
      hero.querySelector('#hero-name').textContent      = profileData.name || symbol;
      hero.querySelector('#hero-industry').textContent  = profileData.finnhubIndustry || '';
      hero.querySelector('#hero-price').textContent     = `$${quoteData.c.toFixed(2)}`;

      const changeEl = hero.querySelector('#hero-change');
      changeEl.textContent  = `${isUp ? '▲' : '▼'} ${Math.abs(quoteData.dp).toFixed(2)}%  ($${Math.abs(quoteData.d).toFixed(2)})`;
      changeEl.className    = `hero-change ${isUp ? 'up' : 'down'}`;

      const fin = await Finnhub.financials(symbol).catch(() => ({}));
      const m   = fin.metric || {};
      hero.querySelector('#hero-stats').innerHTML = `
        <div class="stat-item"><span class="stat-label">Mkt Cap</span><span class="stat-value">${profileData.marketCapitalization ? '$' + (profileData.marketCapitalization / 1000).toFixed(1) + 'B' : '—'}</span></div>
        <div class="stat-item"><span class="stat-label">P/E</span><span class="stat-value">${m.peBasicExclExtraTTM?.toFixed(1) || '—'}</span></div>
        <div class="stat-item"><span class="stat-label">52W High</span><span class="stat-value">${m['52WeekHigh'] ? '$' + m['52WeekHigh'].toFixed(2) : '—'}</span></div>
        <div class="stat-item"><span class="stat-label">52W Low</span><span class="stat-value">${m['52WeekLow'] ? '$' + m['52WeekLow'].toFixed(2) : '—'}</span></div>
        <div class="stat-item"><span class="stat-label">Volume</span><span class="stat-value">${quoteData.v ? (quoteData.v / 1e6).toFixed(1) + 'M' : '—'}</span></div>
        <div class="stat-item"><span class="stat-label">Exchange</span><span class="stat-value">${profileData.exchange || '—'}</span></div>
      `;

      // Chart
      chartArea.innerHTML = '';
      chartArea.appendChild(DetailChart(candles, symbol));

    } catch (err) {
      console.error('Core data error:', err);
      hero.querySelector('#hero-name').textContent = 'Error loading data';
      chartArea.innerHTML = '';
      chartArea.appendChild(ErrorBanner('Could not load stock data. Check your API key.'));
    }
  }

  async function loadNews(symbol, container) {
    try {
      const rawNews = await Finnhub.news(symbol);
      if (!rawNews?.length) {
        container.innerHTML = '<p class="no-data">No recent news found for this stock.</p>';
        return;
      }

      const summarized = await Gemini.summarizeNews(symbol, rawNews);

      container.innerHTML = '';
      if (!summarized?.length) {
        container.innerHTML = '<p class="no-data">Could not summarize news.</p>';
        return;
      }

      summarized.forEach(item => container.appendChild(NewsCard(item)));

    } catch (err) {
      console.error('News error:', err);
      container.innerHTML = '';
      container.appendChild(ErrorBanner('Could not load news analysis.'));
    }
  }

  async function loadAIAnalysis(symbol, container) {
    try {
      const [profileData, finData, recsData, insidersData, earningsData, sentimentData, newsData] = await Promise.allSettled([
        Finnhub.profile(symbol),
        Finnhub.financials(symbol),
        Finnhub.recommendations(symbol),
        Finnhub.insiders(symbol),
        Finnhub.earnings(symbol),
        Finnhub.sentiment(symbol),
        Finnhub.news(symbol),
      ]);

      const analysis = await Gemini.investmentAnalysis({
        symbol,
        profile:         profileData.value,
        financials:      finData.value,
        recommendations: recsData.value,
        insiders:        insidersData.value,
        earnings:        earningsData.value,
        sentiment:       sentimentData.value,
        news:            newsData.value,
      });

      container.innerHTML = '';
      renderAnalysis(container, analysis);

    } catch (err) {
      console.error('AI analysis error:', err);
      container.innerHTML = '';
      container.appendChild(ErrorBanner('AI analysis failed. Check your Gemini API key or try again.'));
    }
  }

  function renderAnalysis(container, a) {
    // Verdict at top
    const verdictWrap = document.createElement('div');
    verdictWrap.className = 'verdict-wrap';
    verdictWrap.appendChild(VerdictBadge(a.verdict?.rating));
    verdictWrap.innerHTML += `
      <div class="verdict-text">
        <p class="verdict-summary">${a.verdict?.summary || ''}</p>
        <p class="verdict-risk"><span class="risk-label">⚠ Key Risk:</span> ${a.verdict?.keyRisk || ''}</p>
      </div>
    `;
    container.appendChild(verdictWrap);

    // Section 1: Company Context
    container.appendChild(AnalysisSection(
      'Company & Market Demand', '🏢',
      `<p>${a.companyContext?.overview || ''}</p>
       <div class="analysis-sub"><strong>Market Demand:</strong> ${a.companyContext?.marketDemand || ''}</div>`
    ));

    // Section 2: Reports & Catalysts
    container.appendChild(AnalysisSection(
      'Reports, Investments & Analyst Outlook', '📊',
      `<div class="analysis-sub"><strong>Earnings & Reports:</strong> ${a.reportsAndCatalysts?.earningsAndReports || ''}</div>
       <div class="analysis-sub"><strong>Investments & Partnerships:</strong> ${a.reportsAndCatalysts?.investmentsAndPartnerships || ''}</div>
       <div class="analysis-sub"><strong>Analyst Outlook:</strong> ${a.reportsAndCatalysts?.analystOutlook || ''}</div>`
    ));

    // Section 3: Options & Dark Pool
    container.appendChild(AnalysisSection(
      'Options & Dark Pool Activity', '🔭',
      `<p>${a.optionsAndDarkPool?.summary || ''}</p>
       <div class="analysis-implication">${a.optionsAndDarkPool?.implication || ''}</div>`
    ));

    // Section 4: Social Sentiment
    container.appendChild(AnalysisSection(
      'Social Media Sentiment', '💬',
      `<p>${a.socialSentiment?.analysis || ''}</p>
       <div class="analysis-sub"><strong>Price Impact:</strong> ${a.socialSentiment?.impact || ''}</div>`
    ));
  }

  return { render };
})();
