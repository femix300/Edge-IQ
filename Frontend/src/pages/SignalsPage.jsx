import { useMemo, useState } from "react";
import SignalCard from "../components/SignalCard";
import { markets, signals } from "../data/mockEdgeIq";

const SignalsPage = () => {
  const [filter, setFilter] = useState("Edge");
  const marketMap = Object.fromEntries(markets.map((market) => [market.id, market]));

  const rankedSignals = useMemo(() => {
    const cloned = [...signals];

    if (filter === "Confidence") {
      return cloned.sort((a, b) => b.confidence - a.confidence);
    }

    if (filter === "Kelly") {
      return cloned.sort((a, b) => b.kellyFraction - a.kellyFraction);
    }

    return cloned.sort((a, b) => b.edge - a.edge);
  }, [filter]);

  return (
    <div className="mx-auto max-w-[128rem] overflow-x-hidden text-[#dee2f5]">
      <header className="mb-8 flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-headline text-4xl font-bold tracking-tight text-[#b3c5ff] md:text-5xl">
            Signals
          </h1>
          <p className="mt-2 text-[#c3c6d5]">
            Ranked opportunities from the Bayse intelligence layer
          </p>
        </div>

        <div className="flex w-full gap-2 overflow-x-auto rounded-xl bg-[#1a1f2d] p-1 shadow-inner md:w-auto">
          {["Edge", "Confidence", "Kelly"].map((option) => (
            <button
              key={option}
              onClick={() => setFilter(option)}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                filter === option
                  ? "bg-[#1a4db8] text-[#b8c8ff] shadow-md"
                  : "text-[#8d909e] hover:text-[#dee2f5]"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </header>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {rankedSignals.map((signal) => (
          <SignalCard key={signal.id} signal={signal} market={marketMap[signal.marketId]} />
        ))}
      </section>
    </div>
  );
};

export default SignalsPage;
