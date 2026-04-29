// ── services/gemini.js ───────────────────────────────────────
// Gemini Flash API calls. Key is read from config.js.

const Gemini = (() => {
  const MODEL = 'gemini-1.5-flash';
  const BASE  = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  function key() {
    return 'AIzaSyC0mPqb2Eq-TrOpu7xxx63kPgiN8w7uYpQ';
  }

  async function generate(prompt) {
    const url = `${BASE}?key=${key()}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Gemini error ${res.status}: ${err?.error?.message || 'Unknown'}`);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  // Generate the full investment analysis for a stock
  async function investmentAnalysis({ symbol, profile, financials, recommendations, insiders, earnings, sentiment, news }) {
    const recSummary = recommendations?.[0]
      ? `Buy: ${recommendations[0].buy}, Hold: ${recommendations[0].hold}, Sell: ${recommendations[0].sell}, Strong Buy: ${recommendations[0].strongBuy}, Strong Sell: ${recommendations[0].strongSell}`
      : 'Not available';

    const newsSummary = (news || []).slice(0, 5).map(n => `- ${n.headline}`).join('\n') || 'No recent news';

    const sentimentSummary = sentiment?.data?.length
      ? `Reddit mentions: ${sentiment.data.slice(-1)[0]?.mention || 0}, Twitter mentions: ${sentiment.data.slice(-1)[0]?.mention || 0}`
      : 'Sentiment data not available';

    const insiderSummary = insiders?.data?.slice(0, 3).map(i =>
      `${i.name} (${i.transactionCode}): ${i.share} shares at $${i.transactionPrice}`
    ).join('\n') || 'No recent insider activity';

    const prompt = `
You are StockMind AI, a professional financial analyst assistant. Analyze ${symbol} (${profile?.name || symbol}) for a retail investor considering whether to invest.

Company: ${profile?.name || symbol}
Industry: ${profile?.finnhubIndustry || 'N/A'}
Market Cap: ${profile?.marketCapitalization ? '$' + (profile.marketCapitalization / 1000).toFixed(1) + 'B' : 'N/A'}
P/E Ratio: ${financials?.metric?.peBasicExclExtraTTM?.toFixed(2) || 'N/A'}
52W High: ${financials?.metric?.['52WeekHigh'] || 'N/A'}
52W Low: ${financials?.metric?.['52WeekLow'] || 'N/A'}
Revenue Growth (YoY): ${financials?.metric?.revenueGrowthTTMYoy?.toFixed(2) || 'N/A'}%
Analyst Consensus: ${recSummary}

Recent News Headlines:
${newsSummary}

Recent Insider Activity:
${insiderSummary}

Social Sentiment: ${sentimentSummary}

Respond ONLY with a valid JSON object (no markdown, no backticks) with exactly this structure:
{
  "companyContext": {
    "overview": "2-3 sentence description of what the company does and its market position",
    "marketDemand": "Unbiased 2-3 sentence assessment of market demand for the company's products/services, including competitive landscape"
  },
  "reportsAndCatalysts": {
    "earningsAndReports": "Any upcoming or recent earnings reports and their impact on the stock",
    "investmentsAndPartnerships": "Notable investments, partnerships, or strategic moves",
    "analystOutlook": "Summary of analyst sentiment and price target consensus"
  },
  "optionsAndDarkPool": {
    "summary": "Brief analysis of what options activity and institutional/dark pool activity suggests about where smart money is positioned. Note if specific data is unavailable.",
    "implication": "One sentence on what this means for the stock direction"
  },
  "socialSentiment": {
    "analysis": "2-3 sentence analysis of retail investor and social media sentiment around this stock",
    "impact": "How this sentiment could influence near-term price action"
  },
  "verdict": {
    "rating": "BUY | HOLD | RISKY BUY | AVOID",
    "summary": "2-3 sentence honest summary of whether this is a good time to invest and why",
    "keyRisk": "The single biggest risk to be aware of"
  }
}`;

    const raw = await generate(prompt);
    // Strip any accidental markdown fences
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  }

  // Summarize news articles and their impact on a stock
  async function summarizeNews(symbol, articles) {
    if (!articles?.length) return [];
    const headlines = articles.slice(0, 8).map((a, i) => `${i + 1}. ${a.headline} — ${a.summary || ''}`).join('\n');
    const prompt = `
You are a financial news analyst. For the stock ${symbol}, summarize each of the following news items in one sentence and briefly state how it likely affects the stock (positive/negative/neutral and why).

Headlines:
${headlines}

Respond ONLY with a valid JSON array (no markdown, no backticks) like:
[
  { "headline": "original headline", "summary": "one sentence summary", "impact": "positive/negative/neutral", "reason": "brief reason" }
]`;

    const raw = await generate(prompt);
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  }

  return { investmentAnalysis, summarizeNews };
})();
