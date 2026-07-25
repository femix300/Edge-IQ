# Edge-IQ Project Handoff

This handoff summarizes the state of the Edge-IQ project, what has been built, the major architectural decisions made, and the known constraints for any future AI agent or developer continuing this work.

## Project Overview
**Edge-IQ** is a full-stack, AI-powered Prediction Market Aggregator and Quant Trading suite. 
- **Frontend**: React (Vite), Tailwind CSS, Lucide icons, Recharts.
- **Backend**: Django REST Framework, Celery for async tasks, Firebase Admin for database (Firestore), Python.
- **Data Sources**: Polymarket (Gamma API/CLOB) and Bayse.
- **AI Models**: Gemini (via `google-genai` SDK).

The primary objective of the platform is to aggregate markets, run deep quantitative and qualitative analysis, and extract "Edge Signals" (positive expected value / Kelly criterion stakes) for users.

---

## What We've Built So Far

### 1. Market Aggregation & Normalization
- We successfully integrated both **Polymarket** and **Bayse**.
- Built dedicated background scanners (`market_scanner.py` and `polymarket_scanner.py`) that normalize data into a unified, agnostic schema stored in Firestore.
- Polymarket `conditionId` maps to `bayse_event_id`, and Polymarket child `clobTokenId`s map to `bayse_market_id`. This allows the rest of the application to be completely source-agnostic.

### 2. The 4-Agent Pipeline
We built a robust, real-time pipeline accessible via the **Deep Dive** feature. The pipeline streams Server-Sent Events (SSE) back to the frontend:
1. **Agent 01 (Scanner)**: Fetches and standardizes live market data.
2. **Agent 02 (Quant Analyzer)**: Fetches order book depth, price history, and liquidity metrics, returning momentum and volume scores.
3. **Agent 03 (AI Probability)**: Scrapes external sources and queries Gemini to generate an independent probability estimate, complete with reasoning and confidence scores.
4. **Agent 04 (Signal Generator)**: Compares the AI's probability with the market's implied probability. Calculates Expected Value (EV), Edge Score, and Kelly Criterion staking recommendations.

### 3. Frontend Architecture & Multi-Dimensional Markets
- **Market Explorer**: A rich dashboard to filter, search, and browse active markets.
- **Signal Feed**: A dedicated feed of extracted "Edge Signals" where the AI thinks the market is mispriced.
- **Deep Dive UI**: 
  - Dynamic charts for Price History (Recharts LineChart) and Order Book Depth (Recharts AreaChart).
  - Explicit handling for **Multi-Dimensional Markets** (markets with multiple child outcomes, e.g., "Who will win the election?").
  - Users can select a specific child dimension. The frontend passes the `outcome_id` to the SSE stream, which routes it properly through the quant analyzer and AI agent to generate a child-specific signal.

### 4. State Persistence & Navigation (The Parity Fix)
- We implemented robust cross-page state persistence using `sessionStorage`.
- When navigating from the Signal Feed to a Deep Dive for a child dimension, the UI perfectly restores the `selectedOutcome`, the generated `signal`, the AI reasoning, and the quant metrics.
- This ensures full parity: multi-dimensional child outcomes behave exactly like straightforward binary markets.

---

## Key Technical Decisions & Patterns

### Firestore as the Single Source of Truth
- We migrated away from SQLite to Firestore to better support real-time data and serverless scaling.
- We use `fs.batch_set(..., merge=True)` for scanners to prevent overwriting nested arrays (like `outcomes`).
- Stale markets (where `closes_at` is in the past) are filtered out dynamically during fetch, and an async Celery task cleans them up in the background.

### Caching and Rate Limiting
- The AI Agent (`estimate_probability`) implements a **4-hour caching mechanism**. If an analysis exists for a market/outcome that is less than 4 hours old, and the calculated edge is >= 5%, the system immediately returns the cached result to save Gemini tokens and reduce latency. 
- Order books and price histories rely on the native Bayse/Polymarket APIs, heavily wrapped in retry logic and memory caches to prevent API rate limits.

### Source-Agnostic Signal Generation
- The `generate_signal` logic does not care if an event is Bayse or Polymarket. It relies entirely on `outcome_id`. Because `polymarket_scanner` neatly maps `clobTokenIds[0]` (the YES token) to `bayse_market_id`, order book fetching and signal generation work seamlessly across both platforms.

---

## Known Bugs Resolved in the Last Session
- **Missing AI Analysis / Edge Signal blocks for child dimensions**: Fixed by ensuring `runPipeline` caches the completed signal to `sessionStorage` and correctly loads `outcomeParams` when clicking from the Signal Feed.
- **Stale Markets appearing on the frontend**: Fixed by adding a runtime UTC validation check against `closes_at` in the `views.py` `getActiveSignals` query.
- **UI Discrepancy on Binary Markets**: Fixed by adding a dynamic `YES / NO` resolution banner in `MarketDeepDive.tsx` that clarifies exactly what the user is betting on.

## Next Steps / Future Work
1. **User Authentication Integration**: Currently, the SSE stream extracts a Firebase UID from the `Authorization` header, but UI auth state management can be expanded.
2. **Portfolio Tracking**: Now that signals and Kelly recommendations exist, a simulated portfolio view would be a natural next step to track PnL over time.
3. **Advanced AI Tooling**: Allow the Gemini agent to dynamically browse the web during analysis (currently relies on static injected context and generalized knowledge).
