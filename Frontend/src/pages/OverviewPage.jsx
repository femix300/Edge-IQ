import { Link } from "react-router-dom";
import { backtestSummary, markets, signals } from "../data/mockEdgeIq";
import {
  formatCompactNumber,
  formatPercent,
  formatSignedPercent,
} from "../utils/formatters";

const summaryCards = [
  { label: "Active markets", value: markets.length, formatter: (value) => String(value) },
  { label: "Live signals", value: signals.length, formatter: (value) => String(value) },
  { label: "Backtest win rate", value: backtestSummary.winRate, formatter: (value) => formatPercent(value) },
  { label: "Sharpe equivalent", value: backtestSummary.sharpeEquivalent, formatter: (value) => value.toFixed(2) },
];

const actionTone = {
  buy_yes:
    "border-[rgba(96,198,149,0.5)] bg-[linear-gradient(180deg,rgba(96,198,149,0.26),rgba(96,198,149,0.12))] text-[#7cd9ac] shadow-[0_0_24px_rgba(96,198,149,0.22)]",
  buy_no:
    "border-[rgba(235,109,109,0.44)] bg-[linear-gradient(180deg,rgba(235,109,109,0.22),rgba(235,109,109,0.1))] text-[#ffb4ab] shadow-[0_0_24px_rgba(235,109,109,0.18)]",
  wait:
    "border-[rgba(237,164,82,0.45)] bg-[linear-gradient(180deg,rgba(237,164,82,0.24),rgba(237,164,82,0.1))] text-[#f0a500] shadow-[0_0_24px_rgba(237,164,82,0.18)]",
};

const actionLabel = {
  buy_yes: "BUY YES",
  buy_no: "BUY NO",
  wait: "WAIT",
};

const OverviewPage = () => {
  const highlightedSignals = signals.slice(0, 3);

  return (
    <div className="mx-auto max-w-[128rem] overflow-x-hidden text-[#dee2f5]">
      <section className="grid items-center gap-8 overflow-hidden rounded-[28px] border border-[#434653]/20 bg-[#090e1b] px-5 py-8 shadow-[0_20px_60px_rgba(0,0,0,0.28)] sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10">
        <div className="z-10">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#434653]/30 bg-[#252a38] px-3 py-1 text-xs font-semibold text-[#b3c5ff]">
            <span className="material-symbols-outlined text-[14px]">verified</span>
            Powered by Gemini AI and Bayse market data
          </div>
          <h1 className="max-w-[58rem] font-headline text-[2.8rem] font-bold leading-[1.02] tracking-tight text-[#edf3ff] sm:text-6xl">
            Know the edge before the market does.
          </h1>
          <p className="mt-5 max-w-[48rem] text-base leading-8 text-[#c3c6d5] sm:text-lg">
            EdgeIQ scans live Bayse markets, compares market probability to AI-estimated
            fair probability, and tells users whether the edge is on buying YES,
            buying NO, or waiting.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/signals"
              className="rounded-xl bg-[#1a4db8] px-7 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-[#dfe8ff] shadow-[0_10px_30px_rgba(26,77,184,0.28)] transition-all hover:brightness-110"
            >
              Open Signal Feed
            </Link>
            <Link
              to="/backtester"
              className="rounded-xl border border-[#434653] px-7 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-[#dee2f5] transition-colors hover:bg-[#1a1f2d]"
            >
              Review Backtester
            </Link>
          </div>
        </div>

        <div className="relative mt-6 lg:mt-0">
          <div className="absolute left-[18%] top-[8%] h-72 w-72 rounded-full bg-[#1a4db8]/12 blur-3xl" />
          <div className="relative rounded-2xl border border-[#434653]/20 bg-[#101622] p-5 shadow-2xl sm:p-6">
            <div className="mb-5 flex gap-1.5">
              <div className="h-3 w-3 rounded-full border border-red-500/50 bg-red-500/20" />
              <div className="h-3 w-3 rounded-full border border-yellow-500/50 bg-yellow-500/20" />
              <div className="h-3 w-3 rounded-full border border-green-500/50 bg-green-500/20" />
            </div>
            <div className="space-y-4">
              {highlightedSignals.map((signal) => (
                <div
                  key={signal.id}
                  className={`flex items-center justify-between rounded-xl border-l-4 bg-[#1a1f2d] p-4 ${
                    signal.action === "buy_yes"
                      ? "border-[#7cd9ac]"
                      : signal.action === "buy_no"
                        ? "border-[#ffb4ab]"
                        : "border-[#f0a500]"
                  }`}
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#c3c6d5]">
                      {signal.marketTitle}
                    </p>
                    <p className="mt-1 font-headline text-lg font-bold">
                      {actionLabel[signal.action]}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-extrabold text-[#7cd9ac]">
                      {formatPercent(signal.edge)}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#c3c6d5]">
                      Edge Score
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-[#434653]/20 bg-[#090e1b] p-5 shadow-[0_12px_36px_rgba(0,0,0,0.2)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8d909e]">
              {card.label}
            </p>
            <p className="mt-3 font-headline text-4xl font-bold text-[#edf3ff]">
              {card.formatter(card.value)}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-2xl border border-[#434653]/20 bg-[#090e1b] p-5 shadow-[0_12px_36px_rgba(0,0,0,0.2)] sm:p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8d909e]">
                How EdgeIQ Works
              </p>
              <h2 className="mt-2 font-headline text-3xl font-bold text-[#b3c5ff]">
                From raw market data to a clear trading decision
              </h2>
            </div>
            <Link
              to="/signals"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1a4db8] px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-[#dfe8ff] shadow-[0_10px_30px_rgba(26,77,184,0.28)] transition-all hover:brightness-110"
            >
              See signals
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: "Scan",
                description: "EdgeIQ monitors live Bayse markets and picks out the ones worth attention first.",
              },
              {
                title: "Measure",
                description: "Quant metrics like momentum, spread, and liquidity pressure are calculated for each market.",
              },
              {
                title: "Estimate",
                description: "AI compares the market price with a grounded probability estimate from real-world context.",
              },
              {
                title: "Signal",
                description: "EdgeIQ returns BUY YES, BUY NO, or WAIT with confidence, EV, and stake sizing guidance.",
              },
            ].map((step) => (
              <div key={step.title} className="rounded-xl border border-[#434653]/20 bg-[#1a1f2d] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8d909e]">
                  {step.title}
                </p>
                <p className="mt-3 text-base font-semibold text-[#edf3ff]">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-[#434653]/20 bg-[#090e1b] p-5 shadow-[0_12px_36px_rgba(0,0,0,0.2)] sm:p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8d909e]">
                Watchlist Snapshot
              </p>
              <h2 className="mt-2 font-headline text-3xl font-bold text-[#b3c5ff]">
                Markets to keep in focus
              </h2>
            </div>
          </div>

          <div className="space-y-4">
            {markets.slice(0, 3).map((market) => (
              <div key={market.id} className="rounded-xl border border-[#434653]/20 bg-[#1a1f2d] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <h3 className="font-headline text-xl font-bold text-[#edf3ff]">
                    {market.title}
                  </h3>
                  <span className="text-lg font-bold text-[#f0a500]">
                    {formatPercent(market.impliedProbability)}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-[#c3c6d5]">
                  <span>Vol {formatCompactNumber(market.volume24h)}</span>
                  <span>{formatSignedPercent(market.priceChange24h)}</span>
                  <span>{market.timeRemainingHours}h left</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 rounded-2xl border border-[#434653]/20 bg-[#090e1b] p-5 shadow-[0_12px_36px_rgba(0,0,0,0.2)] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8d909e]">
              Top Signals
            </p>
            <h2 className="mt-2 font-headline text-3xl font-bold text-[#b3c5ff]">
              Read the market before acting in Bayse
            </h2>
          </div>
          <Link to="/signals" className="text-sm font-semibold text-[#b3c5ff] hover:text-white">
            Open full feed
          </Link>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {highlightedSignals.map((signal) => (
            <article key={signal.id} className="rounded-xl border border-[#434653]/20 bg-[#1a1f2d] p-5">
              <span
                className={`inline-flex rounded-full border px-4 py-2 text-sm font-extrabold uppercase tracking-[0.16em] ${actionTone[signal.action]}`}
              >
                {actionLabel[signal.action]}
              </span>
              <h3 className="mt-4 font-headline text-2xl font-bold text-[#edf3ff]">
                {signal.marketTitle}
              </h3>
              <div className="mt-5 flex flex-wrap gap-4 text-sm text-[#c3c6d5]">
                <span>Market {formatPercent(signal.marketProbability)}</span>
                <span>AI {formatPercent(signal.aiProbability)}</span>
                <span className="font-bold text-[#7cd9ac]">Edge {formatPercent(signal.edge)}</span>
              </div>
              <p className="mt-4 leading-7 text-[#c3c6d5]">{signal.reasoningSummary}</p>
              <Link
                to={`/markets/${signal.marketId}`}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#090e1b] px-5 py-3 text-sm font-bold text-[#dee2f5] transition-colors hover:bg-[#1a4db8] hover:text-[#b3c5ff]"
              >
                Inspect Market
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default OverviewPage;
