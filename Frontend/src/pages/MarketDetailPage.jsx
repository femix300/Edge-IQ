import { Link, useParams } from "react-router-dom";
import {
  assessmentsByMarketId,
  markets,
  quantMetricsByMarketId,
  signals,
} from "../data/mockEdgeIq";
import {
  formatCompactNumber,
  formatCurrency,
  formatPercent,
  formatSignalAction,
  formatSignedPercent,
} from "../utils/formatters";

const signalBadgeTone = {
  buy_yes:
    "border border-[rgba(96,198,149,0.45)] bg-[linear-gradient(180deg,rgba(96,198,149,0.24),rgba(96,198,149,0.1))] text-[var(--success)]",
  buy_no:
    "border border-[rgba(235,109,109,0.44)] bg-[linear-gradient(180deg,rgba(235,109,109,0.22),rgba(235,109,109,0.1))] text-[var(--danger)]",
  wait:
    "border border-[rgba(237,164,82,0.45)] bg-[linear-gradient(180deg,rgba(237,164,82,0.22),rgba(237,164,82,0.1))] text-[var(--accent)]",
};

const MarketDetailPage = () => {
  const { marketId } = useParams();
  const market = markets.find((entry) => entry.id === marketId) ?? markets[0];
  const quant = quantMetricsByMarketId[market.id];
  const assessment = assessmentsByMarketId[market.id];
  const signal = signals.find((entry) => entry.marketId === market.id);

  const maxVolume = Math.max(...quant.priceHistory.map((point) => point.volume ?? 0));
  const minProbability = Math.min(...quant.priceHistory.map((point) => point.impliedProbability));
  const maxProbability = Math.max(...quant.priceHistory.map((point) => point.impliedProbability));
  const probabilityRange = Math.max(maxProbability - minProbability, 0.01);
  const maxDepth = Math.max(
    ...quant.bids.map((level) => level.size),
    ...quant.asks.map((level) => level.size),
  );

  const getChartX = (index) =>
    (index / Math.max(quant.priceHistory.length - 1, 1)) * 100;
  const getChartY = (value) =>
    100 - ((value - minProbability) / probabilityRange) * 100;

  const pricePath = quant.priceHistory
    .map((point, index) => `${getChartX(index)},${getChartY(point.impliedProbability)}`)
    .join(" ");
  const areaPath = `0,100 ${pricePath} 100,100`;
  const aiReferenceY = getChartY(assessment.trueProbability);
  const yAxisTicks = [
    maxProbability,
    minProbability + probabilityRange / 2,
    minProbability,
  ];
  const timeLabels = quant.priceHistory.map((point) =>
    new Date(point.timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      hour12: true,
    }),
  );

  return (
    <div className="mx-auto max-w-[128rem] overflow-x-hidden text-[#dee2f5]">
      <Link
        to="/signals"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] transition hover:text-white"
      >
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Back to signal feed
      </Link>

      <header className="mt-5 rounded-[28px] border border-[rgba(90,129,215,0.2)] bg-[linear-gradient(145deg,rgba(11,24,47,0.92),rgba(7,16,28,0.96))] p-5 shadow-[0_26px_80px_rgba(3,10,20,0.26)] sm:rounded-[32px] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Market inspection
            </p>
            <h1 className="mt-4 max-w-4xl font-headline text-[2.1rem] font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
              {market.title}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--text-secondary)]">
              {market.description}
            </p>
          </div>
          <div
            className={`rounded-full px-5 py-3 text-sm font-extrabold uppercase tracking-[0.14em] shadow-[0_0_24px_rgba(90,129,215,0.22)] ${
              signal ? signalBadgeTone[signal.action] : signalBadgeTone.wait
            }`}
          >
            {formatSignalAction(signal?.action)}
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-white/8 bg-white/3 p-4 shadow-[0_14px_36px_rgba(2,8,18,0.18)]">
            <p className="text-sm text-[var(--text-muted)]">Implied probability</p>
            <p className="mt-3 font-headline text-5xl font-bold leading-none text-white">
              {formatPercent(market.impliedProbability)}
            </p>
          </div>
          <div className="rounded-3xl border border-white/8 bg-white/3 p-4 shadow-[0_14px_36px_rgba(2,8,18,0.18)]">
            <p className="text-sm text-[var(--text-muted)]">24h change</p>
            <p className="mt-3 font-headline text-5xl font-bold leading-none text-white">
              {formatSignedPercent(market.priceChange24h)}
            </p>
          </div>
          <div className="rounded-3xl border border-white/8 bg-white/3 p-4 shadow-[0_14px_36px_rgba(2,8,18,0.18)]">
            <p className="text-sm text-[var(--text-muted)]">24h volume</p>
            <p className="mt-3 font-headline text-5xl font-bold leading-none text-white">
              {formatCompactNumber(market.volume24h)}
            </p>
          </div>
          <div className="rounded-3xl border border-white/8 bg-white/3 p-4 shadow-[0_14px_36px_rgba(2,8,18,0.18)]">
            <p className="text-sm text-[var(--text-muted)]">Time remaining</p>
            <p className="mt-3 font-headline text-5xl font-bold leading-none text-white">
              {market.timeRemainingHours}h
            </p>
          </div>
        </div>
      </header>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-6">
          <article className="rounded-2xl border border-[#434653]/20 bg-[#090e1b] p-5 shadow-[0_12px_36px_rgba(0,0,0,0.2)] sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8d909e]">
                  Price Action
                </p>
                <h2 className="mt-2 font-headline text-3xl font-bold text-[#b3c5ff]">
                  Probability trend and volume profile
                </h2>
              </div>
            </div>

            <div className="mt-6 rounded-[24px] border border-[#434653]/20 bg-[#101622] p-4">
              <div className="flex items-start gap-3">
                <div className="hidden h-80 w-12 flex-col justify-between pb-11 text-xs font-semibold text-[#8d909e] sm:flex">
                  {yAxisTicks.map((tick) => (
                    <span key={tick}>{formatPercent(tick)}</span>
                  ))}
                </div>

                <div className="relative h-80 flex-1 overflow-hidden rounded-[20px] border border-[#434653]/20 bg-[#0d1523] px-4 pb-11 pt-12">
                  <div className="absolute left-4 right-4 top-3 z-10 flex flex-wrap items-center gap-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#c3c6d5]">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#7cd9ac]" />
                      Implied probability
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#1a4db8]" />
                      Volume
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-[2px] w-4 bg-[#f0a500]" />
                      AI fair value
                    </span>
                  </div>

                  {[20, 40, 60, 80].map((line) => (
                    <div
                      key={line}
                      className="absolute left-4 right-4 border-t border-dashed border-[#434653]/70"
                      style={{ top: `${line}%` }}
                    />
                  ))}

                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="absolute inset-x-4 top-12 h-[11rem] w-[calc(100%-2rem)] overflow-visible sm:h-[12rem]"
                  >
                    <defs>
                      <linearGradient id="probabilityFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7cd9ac" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#7cd9ac" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    <path d={`M ${areaPath} Z`} fill="url(#probabilityFill)" />
                    <line
                      x1="0"
                      x2="100"
                      y1={aiReferenceY}
                      y2={aiReferenceY}
                      stroke="#f0a500"
                      strokeWidth="1.4"
                      strokeDasharray="4 3"
                      vectorEffect="non-scaling-stroke"
                    />
                    <polyline
                      fill="none"
                      stroke="#7cd9ac"
                      strokeWidth="2.4"
                      points={pricePath}
                      vectorEffect="non-scaling-stroke"
                    />
                    {quant.priceHistory.map((point, index) => (
                      <circle
                        key={point.timestamp}
                        cx={getChartX(index)}
                        cy={getChartY(point.impliedProbability)}
                        r="2"
                        fill="#7cd9ac"
                        stroke="#0d1523"
                        strokeWidth="1"
                      />
                    ))}
                  </svg>

                  <div className="absolute bottom-11 left-4 right-4 flex h-24 items-end gap-2">
                    {quant.priceHistory.map((point) => (
                      <div
                        key={point.timestamp}
                        className="flex flex-1 flex-col items-center justify-end"
                      >
                        <div
                          className="w-full rounded-t-xl bg-[linear-gradient(180deg,#5a81d7_0%,#1d3766_100%)] opacity-85"
                          style={{ height: `${((point.volume ?? 0) / maxVolume) * 100}%` }}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="absolute bottom-3 left-4 right-4 flex justify-between text-[11px] font-semibold text-[#8d909e]">
                    {timeLabels.map((label, index) => (
                      <span
                        key={`${label}-${index}`}
                        className={`${index % 2 === 1 ? "hidden sm:inline" : ""}`}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm text-[#c3c6d5] sm:grid-cols-3">
                <div className="rounded-xl border border-[#434653]/20 bg-[#1a1f2d] p-3">
                  Current market probability:{" "}
                  <span className="font-bold text-[#f0a500]">
                    {formatPercent(market.impliedProbability)}
                  </span>
                </div>
                <div className="rounded-xl border border-[#434653]/20 bg-[#1a1f2d] p-3">
                  Highest recent probability:{" "}
                  <span className="font-bold text-white">
                    {formatPercent(maxProbability)}
                  </span>
                </div>
                <div className="rounded-xl border border-[#434653]/20 bg-[#1a1f2d] p-3">
                  Lowest recent probability:{" "}
                  <span className="font-bold text-white">
                    {formatPercent(minProbability)}
                  </span>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-[#434653]/20 bg-[#1a1f2d] p-3 text-sm text-[#c3c6d5]">
                The dashed amber line marks EdgeIQ&apos;s AI fair value estimate at{" "}
                <span className="font-bold text-[#f0a500]">
                  {formatPercent(assessment.trueProbability)}
                </span>
                , so you can compare the live market against the model&apos;s view at a glance.
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-[#434653]/20 bg-[#090e1b] p-5 shadow-[0_12px_36px_rgba(0,0,0,0.2)] sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8d909e]">
                  Quant Dashboard
                </p>
                <h2 className="mt-2 font-headline text-3xl font-bold text-[#b3c5ff]">
                  Momentum, spread, and execution conditions
                </h2>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-[#434653]/20 bg-[#1a1f2d] p-4">
                <p className="text-sm text-[#8d909e]">Momentum score</p>
                <p className="mt-2 text-4xl font-extrabold text-white">
                  {quant.momentumScore}
                </p>
                <div className="mt-4 h-2 rounded-full bg-[#252a38]">
                  <div
                    className="h-full rounded-full bg-[#7cd9ac]"
                    style={{
                      width: `${Math.min(
                        Math.max(((quant.momentumScore + 100) / 200) * 100, 0),
                        100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
              <div className="rounded-xl border border-[#434653]/20 bg-[#1a1f2d] p-4">
                <p className="text-sm text-[#8d909e]">Volume acceleration</p>
                <p className="mt-2 text-4xl font-extrabold text-white">
                  {quant.volumeAcceleration.toFixed(2)}x
                </p>
                <div className="mt-4 h-2 rounded-full bg-[#252a38]">
                  <div
                    className="h-full rounded-full bg-[#1a4db8]"
                    style={{ width: `${Math.min(quant.volumeAcceleration * 45, 100)}%` }}
                  />
                </div>
              </div>
              <div className="rounded-xl border border-[#434653]/20 bg-[#1a1f2d] p-4">
                <p className="text-sm text-[#8d909e]">Bid / ask spread</p>
                <p className="mt-2 text-4xl font-extrabold text-white">
                  {formatPercent(quant.spread)}
                </p>
                <p className="mt-4 text-sm text-[#c3c6d5]">
                  Best bid {formatPercent(quant.bestBid ?? 0)} vs ask{" "}
                  {formatPercent(quant.bestAsk ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border border-[#434653]/20 bg-[#1a1f2d] p-4">
                <p className="text-sm text-[#8d909e]">Liquidity bias</p>
                <p className="mt-2 text-4xl font-extrabold capitalize text-white">
                  {quant.liquidityBias}
                </p>
                <p className="mt-4 text-sm text-[#c3c6d5]">
                  Order book pressure currently favors the {quant.liquidityBias} side.
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-[#434653]/20 bg-[#090e1b] p-5 shadow-[0_12px_36px_rgba(0,0,0,0.2)] sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8d909e]">
                  Order Book
                </p>
                <h2 className="mt-2 font-headline text-3xl font-bold text-[#b3c5ff]">
                  Liquidity walls and book imbalance
                </h2>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-[#434653]/20 bg-[#101622] p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#7cd9ac]">
                  Bid depth
                </p>
                <div className="mt-5 space-y-3">
                  {quant.bids.map((level) => (
                    <div key={`${level.price}-bid`} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold text-[#7cd9ac]">
                          {formatPercent(level.price)}
                        </span>
                        <span className="text-[#c3c6d5]">
                          {formatCompactNumber(level.size)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[#252a38]">
                        <div
                          className="h-full rounded-full bg-[#7cd9ac]"
                          style={{ width: `${(level.size / maxDepth) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[#434653]/20 bg-[#101622] p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#ffb4ab]">
                  Ask depth
                </p>
                <div className="mt-5 space-y-3">
                  {quant.asks.map((level) => (
                    <div key={`${level.price}-ask`} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold text-[#ffb4ab]">
                          {formatPercent(level.price)}
                        </span>
                        <span className="text-[#c3c6d5]">
                          {formatCompactNumber(level.size)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[#252a38]">
                        <div
                          className="ml-auto h-full rounded-full bg-[#ffb4ab]"
                          style={{ width: `${(level.size / maxDepth) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>
        </div>

        <div className="grid gap-6">
          <article className="rounded-2xl border border-[#434653]/20 bg-[#090e1b] p-5 shadow-[0_12px_36px_rgba(0,0,0,0.2)] sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8d909e]">
              Probability comparison
            </p>
            <h2 className="mt-2 font-headline text-3xl font-bold text-[#b3c5ff]">
              Market odds vs AI fair value
            </h2>

            <div className="mt-6 rounded-[24px] border border-[#434653]/20 bg-[#101622] p-5">
              <div className="space-y-5">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-[#c3c6d5]">Market probability</span>
                    <span className="font-bold text-[#f0a500]">
                      {formatPercent(market.impliedProbability)}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-[#252a38]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#f0a500_0%,#f4c45f_100%)]"
                      style={{ width: `${market.impliedProbability * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-[#c3c6d5]">AI true probability</span>
                    <span className="font-bold text-[#7cd9ac]">
                      {formatPercent(assessment.trueProbability)}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-[#252a38]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#60c695_0%,#7cd9ac_100%)]"
                      style={{ width: `${assessment.trueProbability * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-[#434653]/20 bg-[#1a1f2d] p-4">
                  <p className="text-sm text-[#8d909e]">Confidence</p>
                  <p className="mt-2 font-headline text-5xl font-bold text-white">
                    {formatPercent(assessment.confidence)}
                  </p>
                </div>
                <div className="rounded-xl border border-[#434653]/20 bg-[#1a1f2d] p-4">
                  <p className="text-sm text-[#8d909e]">Edge</p>
                  <p className="mt-2 font-headline text-5xl font-bold text-[#7cd9ac]">
                    {formatPercent(signal?.edge ?? 0)}
                  </p>
                </div>
              </div>

              <p className="mt-5 text-sm leading-7 text-[#c3c6d5]">
                {assessment.reasoningSummary}
              </p>
            </div>
          </article>

          {signal ? (
            <article className="rounded-2xl border border-[rgba(96,198,149,0.22)] bg-[rgba(96,198,149,0.07)] p-5 shadow-[0_12px_36px_rgba(0,0,0,0.16)] sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7cd9ac]">
                Trade guidance
              </p>
              <h2 className="mt-2 font-headline text-3xl font-bold text-white">
                What EdgeIQ would recommend here
              </h2>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-[#7cd9ac]/20 bg-[#102219] p-4">
                  <p className="text-sm text-[#9ad7ba]">Expected value</p>
                  <p className="mt-2 font-headline text-4xl font-bold text-white">
                    {formatCurrency(signal.expectedValue * 1000)}
                  </p>
                </div>
                <div className="rounded-xl border border-[#7cd9ac]/20 bg-[#102219] p-4">
                  <p className="text-sm text-[#9ad7ba]">Recommended stake</p>
                  <p className="mt-2 font-headline text-4xl font-bold text-white">
                    {formatCurrency(signal.recommendedStake)}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-[#7cd9ac]/15 bg-[#102219] p-4 text-sm leading-7 text-[#c9eedd]">
                Recommendation:{" "}
                <span className="font-bold">{formatSignalAction(signal.action)}</span>.
                This remains advisory in Model A. The user acts in Bayse after
                reviewing the evidence, expected value, and stake sizing.
              </div>
            </article>
          ) : null}
        </div>
      </section>
    </div>
  );
};

export default MarketDetailPage;
