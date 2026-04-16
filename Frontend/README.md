# 🎨 EdgeIQ Frontend

Frontend application for **EdgeIQ — AI Quant Intelligence Platform for Prediction Markets**

Built with React, this interface transforms complex quantitative analysis into intuitive, real-time trading insights.

---

## 📌 Overview

The EdgeIQ frontend is a **data visualization and interaction layer** that:

- Displays AI-generated trading signals
- Visualizes market data (price, volume, order book)
- Streams real-time updates
- Enables strategy testing and portfolio tracking

It is designed to make **quantitative finance understandable, visual, and actionable**.

---

## ⚙️ Tech Stack

- **React 18 + Vite** — Fast, modern frontend tooling
- **Tailwind CSS** — Utility-first styling system
- **Zustand** — Lightweight global state management
- **Recharts** — Data visualization (charts, graphs)
- **React Router v6** — Client-side routing

---

## 🧱 Architecture

The frontend follows a **modular, feature-driven architecture**:
src/
│
├── pages/ # Route-level pages
├── components/ # Reusable UI components
├── features/ # Feature-specific modules (signals, markets, etc.)
├── store/ # Zustand global stores
├── services/ # API calls (Firebase Functions)
├── hooks/ # Custom React hooks
├── utils/ # Helper functions
└── styles/ # Global styles

---

## 🗂️ Pages

| Page | Description |
|------|-------------|
| **Signal Feed** | Displays AI-ranked trading opportunities |
| **Market Deep Dive** | Full analytics dashboard for a selected market |
| **Backtester** | Strategy simulation and performance results |
| **Portfolio** | Tracks simulated trades and performance metrics |
| **Settings** | User preferences (bankroll, risk tolerance) |

---

## 🧩 Core Components

### 🔹 MarketCard
- Displays:
  - Market name
  - Current price
  - Implied probability
  - 24h change
- Used in Signal Feed and Market List

---

### 🔹 SignalCard
- Shows:
  - Market vs AI probability
  - Edge score
  - Expected Value (EV)
  - Kelly stake recommendation
- Includes visual indicators (confidence, trend)

---

### 🔹 Charts (Recharts)
- **LineChart** → Price history
- **BarChart** → Volume analysis
- **AreaChart** → Order book depth
- **ScatterPlot** → Probability calibration

---

## 🧠 State Management (Zustand)

Global state is managed using lightweight stores:

### Stores

- `marketStore`
  - Active markets
  - Price updates
  - Selected market

- `signalStore`
  - Generated signals
  - Signal ranking
  - Filters (edge threshold, category)

- `portfolioStore`
  - Trade history
  - PnL tracking
  - Performance metrics

---

## 🔄 Data Flow

```text
Frontend → Firebase Functions → Bayse API / Gemini → Firestore → Frontend