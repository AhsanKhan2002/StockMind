// ── services/groq.js ─────────────────────────────────────────
// Groq API — free tier (30 req/min, 6000 req/day)
// Using Llama 3.3 70B model

const Gemini = (() => {
  const BASE  = 'https://api.groq.com/openai/v1/chat/completions';
  const KEY   = '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';
  const MODEL = 'llama-3.3-70b-versatile';

  async function generate(prompt) {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${KEY}`,
      },
      body: JSON.stringify({
        model:       MODEL,
        temperature: 0.4,
        max_tokens:  2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Groq error ${res.status}: ${err?.error?.message || 'Unknown'}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  // Generate full investment analysis
  async function investmentAnalysis({ symbol, profile, financials, recommendations, insiders, earnings, sentiment, news }) {
    const recSummary = recommendations?.[0]
      ? `Buy: ${recommendations[0].buy}, Hold: ${recommendations[0].hold}, Sell: ${recommendations[0].sell}, Strong Buy: ${recommendations[0].strongBuy}, Strong Sell: ${recommendations[0].strongSell}`
      : 'Not available';

    const newsSummary = (news || []).slice(0, 5).map(n => `- ${n.headline}`).join('\n') || 'No recent news';

    const sentimentSummary = sentiment?.data?.length
      ? `Mentions available: ${sentiment.data.length} data points`
      : 'Sentiment data not available';

    const insiderSummary = insiders?.data?.slice(0, 3).map(i =>
      `${i.name} (${i.transactionCode}): ${i.share} shares at $${i.transactionPrice}`
    ).join('\n') || 'No recent insider activity';

    const prompt = `You are StockMind AI, a professional financial analyst. Analyze ${symbol} (${profile?.name || symbol}) for a retail investor.

Company: ${profile?.name || symbol}
Industry: ${profile?.finnhubIndustry || 'N/A'}
Market Cap: ${profile?.marketCapitalization ? '$' + (profile.marketCapitalization / 1000).toFixed(1) + 'B' : 'N/A'}
P/E Ratio: ${financials?.metric?.peBasicExclExtraTTM?.toFixed(2) || 'N/A'}
52W High: ${financials?.metric?.['52WeekHigh'] || 'N/A'}
52W Low: ${financials?.metric?.['52WeekLow'] || 'N/A'}
Analyst Consensus: ${recSummary}

Recent News:
${newsSummary}

Recent Insider Activity:
${insiderSummary}

Social Sentiment: ${sentimentSummary}

Respond ONLY with a valid JSON object, no markdown, no backticks, no explanation. Use exactly this structure:
{
  "companyContext": {
    "overview": "2-3 sentence description of what the company does and its market position",
    "marketDemand": "Unbiased 2-3 sentence assessment of market demand for the company products/services"
  },
  "reportsAndCatalysts": {
    "earningsAndReports": "Any upcoming or recent earnings reports and their impact",
    "investmentsAndPartnerships": "Notable investments, partnerships, or strategic moves",
    "analystOutlook": "Summary of analyst sentiment and price target consensus"
  },
  "optionsAndDarkPool": {
    "summary": "Brief analysis of what options activity and institutional/dark pool activity suggests",
    "implication": "One sentence on what this means for stock direction"
  },
  "socialSentiment": {
    "analysis": "2-3 sentence analysis of retail investor and social media sentiment",
    "impact": "How this sentiment could influence near-term price action"
  },
  "verdict": {
    "rating": "BUY or HOLD or RISKY BUY or AVOID",
    "summary": "2-3 sentence honest summary of whether this is a good time to invest and why",
    "keyRisk": "The single biggest risk to be aware of"
  }
}`;

    const raw = await generate(prompt);
    const cleaned = raw.replace(/```json|```/g, '').trim();
    // Extract JSON if there's any surrounding text
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No valid JSON in response');
    return JSON.parse(match[0]);
  }

  // Summarize news articles
  async function summarizeNews(symbol, articles) {
    if (!articles?.length) return [];

    const headlines = articles.slice(0, 8).map((a, i) =>
      `${i + 1}. ${a.headline} — ${a.summary || ''}`
    ).join('\n');

    const prompt = `You are a financial news analyst. For the stock ${symbol}, summarize each news item in one sentence and state how it affects the stock.

Headlines:
${headlines}

Respond ONLY with a valid JSON array, no markdown, no backticks:
[
  { "headline": "original headline", "summary": "one sentence summary", "impact": "positive or negative or neutral", "reason": "brief reason" }
]`;

    const raw = await generate(prompt);
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No valid JSON array in response');
    return JSON.parse(match[0]);
  }

  return { investmentAnalysis, summarizeNews };
})();
