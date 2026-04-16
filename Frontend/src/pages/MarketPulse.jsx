import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { mockEvents } from "../data/mockEvents";

const formatNum = (num) => {
  if (num >= 1e6) return (num / 1e6).toFixed(1) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(0) + "K";
  return num;
};

const MarketPulse = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("Volume");
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Attempt to fetch from Bayse API, fallback to mock data on fail
    fetch("https://api.bayse.io/v1/pm/events")
      .then((res) => {
        if (!res.ok) throw new Error("API down");
        return res.json();
      })
      .then((data) => {
        setMarkets(data);
        setLoading(false);
      })
      .catch(() => {
        // Fallback
        setTimeout(() => {
          setMarkets(mockEvents);
          setLoading(false);
        }, 800);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#080d1a] px-4 py-8 md:px-8 md:py-10 font-body text-[#dee2f5]">
      <div className="mx-auto max-w-[128rem]">
        <button
          onClick={() => navigate("/")}
          className="mb-6 flex cursor-pointer items-center gap-2 font-mono text-sm text-[#8d909e] transition-colors hover:text-[#b3c5ff]"
        >
          <span className="material-symbols-outlined text-[18px]">
            arrow_back
          </span>{" "}
          Return to Hub
        </button>
        {/* Header */}
        <header className="mb-10 flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-headline text-4xl font-bold tracking-tight text-[#b3c5ff]">
              Markets
            </h1>
            <p className="mt-2 text-[#c3c6d5]">Current Available Markets</p>
          </div>

          <div className="flex w-full overflow-x-auto gap-2 rounded-xl bg-[#1a1f2d] p-1 shadow-inner md:w-auto">
            {["Volume", "Liquidity", "Time-to-End"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`cursor-pointer px-4 py-2 rounded-lg font-mono text-sm transition-all ${
                  filter === f
                    ? "bg-[#1a4db8] text-[#b8c8ff] font-bold shadow-md"
                    : "text-[#8d909e] hover:text-[#dee2f5]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </header>

        {/* content grid */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <span className="material-symbols-outlined animate-spin text-4xl text-[#1a4db8]">
              refresh
            </span>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...markets]
              .sort((a, b) => {
                if (filter === "Volume") return b.volume - a.volume;
                if (filter === "Liquidity") return b.liquidity - a.liquidity;
                if (filter === "Time-to-End") return a.timeToEnd - b.timeToEnd;
                return 0;
              })
              .map((market) => (
                <div
                  key={market.id}
                  className="group relative overflow-hidden rounded-2xl border border-[#434653]/30 bg-[#090e1b] transition-all hover:-translate-y-1 hover:border-[#b3c5ff]/50 hover:shadow-[0_8px_30px_rgba(26,77,184,0.15)]"
                >
                  <div className="p-6">
                    <div className="mb-4 flex items-start justify-between">
                      <h3 className="font-headline text-xl font-semibold leading-snug line-clamp-2 min-h-[56px] text-[#dee2f5]">
                        {market.title}
                      </h3>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1a1f2d]">
                        <span className="material-symbols-outlined text-[#7cd9ac]">
                          monitoring
                        </span>
                      </span>
                    </div>

                    <div className="mb-6 grid grid-cols-2 gap-4 border-y border-[#434653]/30 py-4">
                      <div>
                        <p className="font-mono text-[10px] uppercase text-[#8d909e]">
                          Price
                        </p>
                        <div className="flex items-baseline gap-2">
                          <p className="font-headline text-2xl font-bold text-[#f0a500]">
                            {Math.round(market.price * 100)}¢
                          </p>
                          <span
                            className={`font-mono text-xs ${market.change.startsWith("+") ? "text-[#7cd9ac]" : "text-[#ffb4ab]"}`}
                          >
                            {market.change}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] uppercase text-[#8d909e]">
                          {filter === "Liquidity"
                            ? "Liquidity"
                            : filter === "Time-to-End"
                              ? "Days Left"
                              : "24H Vol"}
                        </p>
                        <p className="font-headline text-2xl font-bold text-[#b3c5ff]">
                          {filter === "Liquidity"
                            ? `$${formatNum(market.liquidity)}`
                            : filter === "Time-to-End"
                              ? market.timeToEnd
                              : formatNum(market.volume)}
                        </p>
                      </div>
                    </div>

                    {/* Dynamic Sparkline */}
                    <div className="mb-6 h-12 w-full flex items-end gap-1 opacity-70">
                      {market.history.map((val, idx) => {
                        const isUp = market.change.startsWith("+");
                        const color = isUp
                          ? val > 80
                            ? "bg-[#7cd9ac]"
                            : "bg-[#1a4db8]"
                          : val < 20
                            ? "bg-[#ffb4ab]"
                            : "bg-[#303443]";
                        const shadow =
                          isUp && val > 60 ? "shadow-[0_0_8px_#7cd9ac]" : "";
                        return (
                          <div
                            key={idx}
                            className={`flex-1 rounded-t ${color} ${shadow} transition-all duration-500`}
                            style={{ height: `${Math.max(10, val)}%` }}
                          />
                        );
                      })}
                    </div>

                    <button
                      onClick={() => navigate(`/terminal/${market.id}`)}
                      className="w-full cursor-pointer flex items-center justify-center gap-2 rounded-xl bg-[#1a1f2d] py-3 text-sm font-semibold transition-colors hover:bg-[#1a4db8] hover:text-[#b3c5ff]"
                    >
                      View Market
                      <span className="material-symbols-outlined text-sm">
                        arrow_forward
                      </span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketPulse;
