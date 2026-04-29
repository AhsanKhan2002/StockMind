// ── components/index.js ─────────────────────────────────────
// Vanilla JS component factory functions.
// Each returns a DOM element — no innerHTML injection into the document directly.

// ── StockCard ────────────────────────────────────────────────
function StockCard(stock, rank) {
  const isGain = stock.dp >= 0;
  const card = document.createElement('div');
  card.className = `stock-card ${isGain ? 'gain' : 'loss'}`;
  card.style.setProperty('--delay', `${rank * 80}ms`);

  card.innerHTML = `
    <div class="card-rank">${String(rank + 1).padStart(2, '0')}</div>
    <div class="card-body">
      <div class="card-top">
        <span class="card-symbol">${stock.symbol}</span>
        <span class="card-change ${isGain ? 'up' : 'down'}">
          ${isGain ? '▲' : '▼'} ${Math.abs(stock.dp).toFixed(2)}%
        </span>
      </div>
      <div class="card-price">$${stock.c.toFixed(2)}</div>
      <div class="card-meta">
        <span>O: $${stock.o.toFixed(2)}</span>
        <span>H: $${stock.h.toFixed(2)}</span>
        <span>L: $${stock.l.toFixed(2)}</span>
      </div>
    </div>
    <div class="card-arrow">→</div>
  `;

  card.addEventListener('click', () => Router.navigate(`/stock/${stock.symbol}`));
  card.style.cursor = 'pointer';
  return card;
}

// ── MiniSparkline ─────────────────────────────────────────────
function MiniSparkline(closes, isGain) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 120 40');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.className = 'sparkline';

  if (!closes || closes.length < 2) return svg;

  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const w = 120, h = 40, pad = 2;

  const pts = closes.map((v, i) => {
    const x = pad + (i / (closes.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });

  const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  line.setAttribute('points', pts.join(' '));
  line.setAttribute('fill', 'none');
  line.setAttribute('stroke', isGain ? 'var(--gain)' : 'var(--loss)');
  line.setAttribute('stroke-width', '2');
  line.setAttribute('stroke-linejoin', 'round');
  line.setAttribute('stroke-linecap', 'round');

  // Gradient area fill
  const area = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  const areaPoints = pts.join(' ') + ` ${120-pad},${h-pad} ${pad},${h-pad}`;
  area.setAttribute('points', areaPoints);
  area.setAttribute('fill', isGain ? 'url(#gainGrad)' : 'url(#lossGrad)');
  area.setAttribute('opacity', '0.15');

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <linearGradient id="gainGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--gain)" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="var(--gain)" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--loss)" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="var(--loss)" stop-opacity="0"/>
    </linearGradient>
  `;

  svg.appendChild(defs);
  svg.appendChild(area);
  svg.appendChild(line);
  return svg;
}

// ── DetailChart ───────────────────────────────────────────────
function DetailChart(candles, symbol) {
  const wrap = document.createElement('div');
  wrap.className = 'detail-chart-wrap';

  if (!candles || candles.s === 'no_data' || !candles.c?.length) {
    wrap.innerHTML = '<p class="no-data">Chart data unavailable.</p>';
    return wrap;
  }

  const closes = candles.c;
  const dates  = candles.t.map(ts => {
    const d = new Date(ts * 1000);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const isGain = closes[closes.length - 1] >= closes[0];
  const min    = Math.min(...closes);
  const max    = Math.max(...closes);
  const range  = max - min || 1;

  const W = 700, H = 180, padL = 50, padR = 20, padT = 10, padB = 30;
  const iW = W - padL - padR;
  const iH = H - padT - padB;

  const pts = closes.map((v, i) => {
    const x = padL + (i / (closes.length - 1)) * iW;
    const y = padT + (1 - (v - min) / range) * iH;
    return [x, y];
  });

  const linePts = pts.map(p => p.join(',')).join(' ');
  const areaPts = linePts + ` ${pts[pts.length-1][0]},${H-padB} ${pts[0][0]},${H-padB}`;

  // Y-axis labels
  const yLabels = [0, 0.25, 0.5, 0.75, 1].map(pct => {
    const val  = min + pct * range;
    const y    = padT + (1 - pct) * iH;
    return `<text x="${padL - 6}" y="${y + 4}" text-anchor="end" class="chart-label">$${val.toFixed(0)}</text>
            <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" class="chart-grid"/>`;
  }).join('');

  // X-axis labels — show first, middle, last
  const xIdxs = [0, Math.floor(closes.length / 2), closes.length - 1];
  const xLabels = xIdxs.map(i => {
    const [x] = pts[i];
    return `<text x="${x}" y="${H - padB + 18}" text-anchor="middle" class="chart-label">${dates[i]}</text>`;
  }).join('');

  wrap.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" class="detail-chart" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${isGain ? 'var(--gain)' : 'var(--loss)'}" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="${isGain ? 'var(--gain)' : 'var(--loss)'}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${yLabels}
      ${xLabels}
      <polygon points="${areaPts}" fill="url(#chartGrad)"/>
      <polyline points="${linePts}" fill="none"
        stroke="${isGain ? 'var(--gain)' : 'var(--loss)'}"
        stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    </svg>
  `;
  return wrap;
}

// ── Spinner ───────────────────────────────────────────────────
function Spinner(message = 'Loading…') {
  const el = document.createElement('div');
  el.className = 'spinner-wrap';
  el.innerHTML = `
    <div class="spinner-ring"></div>
    <p class="spinner-msg">${message}</p>
  `;
  return el;
}

// ── ErrorBanner ───────────────────────────────────────────────
function ErrorBanner(message) {
  const el = document.createElement('div');
  el.className = 'error-banner';
  el.textContent = `⚠ ${message}`;
  return el;
}

// ── VerdictBadge ─────────────────────────────────────────────
function VerdictBadge(rating) {
  const map = {
    'BUY':        { cls: 'verdict-buy',   icon: '↑' },
    'HOLD':       { cls: 'verdict-hold',  icon: '→' },
    'RISKY BUY':  { cls: 'verdict-risky', icon: '⚡' },
    'AVOID':      { cls: 'verdict-avoid', icon: '↓' },
  };
  const { cls, icon } = map[rating?.toUpperCase()] || { cls: 'verdict-hold', icon: '?' };
  const el = document.createElement('div');
  el.className = `verdict-badge ${cls}`;
  el.innerHTML = `<span class="verdict-icon">${icon}</span><span class="verdict-label">${rating}</span>`;
  return el;
}

// ── NewsCard ─────────────────────────────────────────────────
function NewsCard(item) {
  const impactClass = { positive: 'impact-pos', negative: 'impact-neg', neutral: 'impact-neu' }[item.impact] || 'impact-neu';
  const el = document.createElement('div');
  el.className = 'news-card';
  el.innerHTML = `
    <div class="news-impact-bar ${impactClass}"></div>
    <div class="news-content">
      <p class="news-headline">${item.headline}</p>
      <p class="news-summary">${item.summary}</p>
      <span class="news-tag ${impactClass}">${item.impact?.toUpperCase() || 'NEUTRAL'} — ${item.reason}</span>
    </div>
  `;
  return el;
}

// ── AnalysisSection ───────────────────────────────────────────
function AnalysisSection(title, icon, content) {
  const el = document.createElement('div');
  el.className = 'analysis-section';
  el.innerHTML = `
    <div class="analysis-header">
      <span class="analysis-icon">${icon}</span>
      <h3 class="analysis-title">${title}</h3>
    </div>
    <div class="analysis-body">${content}</div>
  `;
  return el;
}
