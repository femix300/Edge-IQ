import { Link } from "react-router-dom";
import {
  formatCurrency,
  formatPercent,
  formatSignalAction,
} from "../utils/formatters";

const actionStyles = {
  buy_yes:
    "border-[rgba(96,198,149,0.5)] bg-[linear-gradient(180deg,rgba(96,198,149,0.26),rgba(96,198,149,0.12))] text-[var(--success)] shadow-[0_0_24px_rgba(96,198,149,0.22)]",
  wait: "border-[rgba(237,164,82,0.45)] bg-[linear-gradient(180deg,rgba(237,164,82,0.24),rgba(237,164,82,0.1))] text-[var(--accent)] shadow-[0_0_24px_rgba(237,164,82,0.18)]",
  buy_no:
    "border-[rgba(235,109,109,0.44)] bg-[linear-gradient(180deg,rgba(235,109,109,0.22),rgba(235,109,109,0.1))] text-[var(--danger)] shadow-[0_0_24px_rgba(235,109,109,0.18)]",
};

const SignalCard = ({ market, signal }) => {
  return (
    <article className="group relative flex h-full min-h-[25rem] flex-col overflow-hidden rounded-2xl border border-[#434653]/30 bg-[#090e1b] p-4 transition-all hover:-translate-y-1 hover:border-[#b3c5ff]/50 hover:shadow-[0_8px_30px_rgba(26,77,184,0.15)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {market.category}
          </p>
          <h2 className="mt-3 line-clamp-3 min-h-[5.5rem] text-lg font-semibold leading-7 text-white sm:text-xl sm:leading-8">
            {market.title}
          </h2>
        </div>
        <span
          className={`w-fit whitespace-nowrap rounded-full border px-4 py-2 text-sm font-extrabold uppercase tracking-[0.16em] ${actionStyles[signal.action]}`}
        >
          {formatSignalAction(signal.action)}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 border-y border-[#434653]/30 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8d909e]">Market</p>
          <p className="mt-2 text-lg font-bold text-white">
            {formatPercent(signal.marketProbability)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8d909e]">AI</p>
          <p className="mt-2 text-lg font-bold text-white">
            {formatPercent(signal.aiProbability)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8d909e]">Edge</p>
          <p className="mt-2 font-headline text-2xl font-bold text-[#7cd9ac]">
            {formatPercent(signal.edge)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8d909e]">Kelly</p>
          <p className="mt-2 text-lg font-bold text-[#b3c5ff]">
            {formatPercent(signal.kellyFraction)}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-[#7cd9ac]/20 bg-[#7cd9ac]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#7cd9ac]">
          Confidence {formatPercent(signal.confidence)}
        </span>
        <span className="rounded-full border border-[#1a4db8]/30 bg-[#1a4db8]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#b3c5ff]">
          Stake {formatCurrency(signal.recommendedStake)}
        </span>
      </div>

      <p className="mt-5 text-sm leading-7 text-[var(--text-secondary)]">
        {signal.reasoningSummary}
      </p>

      <div className="mt-auto border-t border-white/8 pt-5">
        <div className="flex flex-col gap-2 text-sm text-[var(--text-secondary)]">
          <span>EV {formatCurrency(signal.expectedValue * 1000)} per 1k staked</span>
          <span>Market {formatPercent(signal.marketProbability)} vs AI {formatPercent(signal.aiProbability)}</span>
        </div>
        <Link
          to={`/markets/${market.id}`}
          className="mt-5 block w-full rounded-xl bg-[#1a1f2d] px-5 py-3 text-center text-sm font-bold text-[#dee2f5] transition-colors hover:bg-[#1a4db8] hover:text-[#b3c5ff]"
        >
          Inspect Market
        </Link>
      </div>
    </article>
  );
};

export default SignalCard;
