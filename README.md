#  EdgeIQ — AI Quant Intelligence for Prediction Markets

**Build With AI OAU 2026 · GDG × Bayse Markets · Quantitative Finance Track**

EdgeIQ is an AI-powered quantitative trading assistant built on top of the Bayse Prediction Market API. It analyzes live market data, detects inefficiencies, and generates actionable trading signals with mathematical precision.

> **“When the market is wrong, EdgeIQ shows you where—and how to profit from it.”**

---

## Overview

Prediction market prices represent probabilities—but they are driven by human emotion, bias, and incomplete information.

EdgeIQ replaces guesswork with **data-driven decision making** by combining:
-  Quantitative analysis (price, momentum, liquidity)
-  AI probability estimation (real-world context via Gemini)
-  Risk management (Expected Value + Kelly Criterion)

The result: **clear, explainable, and optimized trade recommendations.**

---

##  Core Features

###  Signal Feed
- Live feed of AI-ranked trading opportunities  
- Displays:
  - Implied probability
  - True probability (AI)
  - Edge score (Alpha)
  - Expected Value (EV)
  - Momentum direction  
- Labels: **BUY / WAIT / AVOID**

---

###  Market Deep Dive
- Full quant dashboard for any market:
  - Price history charts
  - Implied probability timeline
  - Volume analysis
  - Order book depth visualization
- AI-generated event analysis

---

###  Edge Signals
- Triggered when:
  > AI probability − Market probability > threshold  
- Includes:
  - Edge score
  - Expected Value (EV)
  - Confidence level
  - **Kelly stake recommendation**

---

###  Strategy Backtester
- Test trading strategies on historical data  
- Metrics:
  - Win rate
  - Total return
  - Max drawdown
  - Sharpe-like score  

---

###  Portfolio Analytics
- Track simulated trades
- Metrics:
  - PnL over time
  - Win rate
  - Average EV
  - Kelly discipline
- AI performance feedback

---

### Probability Calibration
- Measures prediction accuracy over time  
- Compares:
  - Predicted probability vs actual outcomes  
- Ensures model reliability

---

##  Quant Concepts Used

- **Implied Probability** — Market price as probability  
- **Edge (Alpha)** — Difference between true and market probability  
- **Expected Value (EV)** — Profitability over time  
- **Kelly Criterion** — Optimal stake sizing  
- **Momentum** — Price trend continuation  
- **Liquidity / Order Book** — Market depth signals  
- **Sharpe Ratio** — Risk-adjusted returns  
- **Backtesting** — Strategy validation  

---

##  Architecture

### Frontend
- React 18 + Vite
- Tailwind CSS
- Zustand (state management)
- Recharts (data visualization)

### Backend
- Firebase Functions (serverless agents)
- Firestore (data storage)
- Bayse API (market data)
- Gemini 1.5 Flash (AI analysis)

---

##  Four-Agent System

EdgeIQ runs on a modular AI pipeline:

1. **Market Scanner Agent**
   - Fetches and ranks active markets

2. **Quantitative Analysis Agent**
   - Computes:
     - Momentum
     - Volume acceleration
     - Liquidity spread

3. **AI Probability Agent**
   - Uses Gemini + search grounding  
   - Estimates true probability

4. **Signal & Risk Agent**
   - Calculates:
     - Edge
     - Expected Value
     - Kelly stake  
   - Outputs final trade signal

---

##  Bayse API Integration

| Endpoint | Purpose |
|----------|--------|
| `/v1/pm/events` | Fetch all markets |
| `/price-history` | Charts + backtesting |
| `/ticker` | Live price data |
| `/books` | Order book depth |
| `/trades` | Trade activity |
| `/portfolio` | User analytics |
| `/websocket` | Real-time updates |

>  All API calls are routed through Firebase Functions for security.

---

##  Data Flow

```text
Bayse API → Firebase Functions → AI Agents → Firestore → React UI


