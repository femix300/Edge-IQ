import { backtestSummary } from "../data/mockEdgeIq";
import { formatPercent } from "../utils/formatters";

const BacktesterPage = () => {
  return (
    <div className="mx-auto max-w-7xl overflow-x-hidden">
      <header className="rounded-[28px] border border-[rgba(90,129,215,0.2)] bg-[linear-gradient(145deg,rgba(11,24,47,0.92),rgba(7,16,28,0.96))] p-5 shadow-[0_24px_70px_rgba(3,10,20,0.26)] sm:rounded-[32px] sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--accent)]">
          Backtester
        </p>
        <h1 className="mt-4 font-headline text-[2.25rem] font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
          A thin v1 research surface that can expand once market ingestion is stable
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
          This page is deliberately scoped to match the roadmap: start with
          strategy thresholds and summary performance, then deepen it after the
          live signal loop is reliable.
        </p>
      </header>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[28px] border border-white/10 bg-[rgba(7,16,28,0.8)] p-5 sm:rounded-[32px] sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--text-muted)]">
            Strategy controls
          </p>
          <div className="mt-6 space-y-5">
            <label className="block">
              <span className="text-sm text-[var(--text-secondary)]">Minimum edge</span>
              <input type="range" min="5" max="30" value="15" readOnly className="mt-3 w-full accent-[var(--success)]" />
            </label>
            <label className="block">
              <span className="text-sm text-[var(--text-secondary)]">Minimum momentum</span>
              <input type="range" min="0" max="100" value="55" readOnly className="mt-3 w-full accent-[var(--primary-soft)]" />
            </label>
            <label className="block">
              <span className="text-sm text-[var(--text-secondary)]">Risk mode</span>
              <div className="mt-3 flex flex-wrap gap-3">
                {["conservative", "balanced", "aggressive"].map((mode) => (
                  <span
                    key={mode}
                    className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] ${
                      mode === "balanced"
                        ? "bg-[rgba(90,129,215,0.24)] text-white"
                        : "border border-white/10 text-[var(--text-muted)]"
                    }`}
                  >
                    {mode}
                  </span>
                ))}
              </div>
            </label>
          </div>
        </article>

        <article className="rounded-[28px] border border-white/10 bg-[rgba(7,16,28,0.8)] p-5 sm:rounded-[32px] sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--text-muted)]">
            Summary output
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/8 bg-white/3 p-4">
              <p className="text-sm text-[var(--text-muted)]">Runs</p>
              <p className="mt-2 font-headline text-4xl font-bold text-white">
                {backtestSummary.runs}
              </p>
            </div>
            <div className="rounded-3xl border border-white/8 bg-white/3 p-4">
              <p className="text-sm text-[var(--text-muted)]">Win rate</p>
              <p className="mt-2 font-headline text-4xl font-bold text-white">
                {formatPercent(backtestSummary.winRate)}
              </p>
            </div>
            <div className="rounded-3xl border border-white/8 bg-white/3 p-4">
              <p className="text-sm text-[var(--text-muted)]">Total return</p>
              <p className="mt-2 font-headline text-4xl font-bold text-white">
                {formatPercent(backtestSummary.totalReturn)}
              </p>
            </div>
            <div className="rounded-3xl border border-white/8 bg-white/3 p-4">
              <p className="text-sm text-[var(--text-muted)]">Max drawdown</p>
              <p className="mt-2 font-headline text-4xl font-bold text-white">
                {formatPercent(backtestSummary.maxDrawdown)}
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-[28px] border border-white/8 bg-white/3 p-5">
            <p className="text-sm leading-7 text-[var(--text-secondary)]">
              Expected backend fit: `GET /api/backtests/summary/` for headline
              stats, then `POST /api/backtests/run/` once the strategy simulation
              endpoint exists in Django.
            </p>
          </div>
        </article>
      </section>
    </div>
  );
};

export default BacktesterPage;
