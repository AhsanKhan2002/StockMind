◈ StockMind
AI-powered stock market intelligence dashboard — built with vanilla HTML, CSS, and JavaScript. No frameworks. Deployed on GitHub Pages.
🌐 Live Site: ahsankhan2002.github.io/StockMind

What is StockMind?
StockMind is a real-time stock market dashboard that combines live market data with AI-generated investment analysis. It was built as a portfolio project to demonstrate API integration, AI summarization, and component-based JavaScript architecture without relying on any frontend frameworks.
The app gives retail investors a quick, intelligent overview of what's moving in the market and why — with enough depth to actually inform a decision.

Features
Dashboard

Top 5 Gainers & Losers — Live market data showing the biggest movers of the past trading day with price, open, high, and low
Ticker Tape — Scrolling live price feed across the top
Market Status — Real-time open/closed indicator with Eastern Time clock
Weekly Trend Chart — Select any stock from the movers list to see its past week performance rendered as an SVG chart

Stock Detail Page
Click any stock card to dive deeper:

Company Hero — Symbol, company name, live price, daily change, market cap, P/E ratio, 52-week range, volume, and exchange
Weekly Performance Chart — SVG line chart built from scratch with gradient fill, price labels, and date axis
Latest News & Market Impact — Recent headlines fetched from Finnhub and summarized by Groq AI, each tagged as Positive / Negative / Neutral with a brief reason
StockMind Investment Analysis — Full AI-generated analysis powered by Groq (Llama 3.3 70B) covering:

🏢 Company & Market Demand — What the company does and an unbiased assessment of demand for its products/services
📊 Reports, Investments & Analyst Outlook — Earnings reports, partnerships, insider activity, and analyst consensus
🔭 Options & Dark Pool Activity — What institutional positioning suggests about smart money sentiment
💬 Social Media Sentiment — Retail investor sentiment and its potential impact on price action
Final Verdict — BUY / HOLD / RISKY BUY / AVOID with a concise summary and the single biggest risk to be aware of
