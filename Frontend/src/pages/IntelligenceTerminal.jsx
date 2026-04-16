import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { mockEvents } from "../data/mockEvents";

const mockLogs = [
  {
    agent: "Scanner",
    message: "Getting live market data...",
    status: "loading",
  },
  {
    agent: "Math Bot",
    message: "Calculating price movements...",
    status: "loading",
  },
  {
    agent: "Researcher",
    message: "Searching recent news...",
    status: "loading",
  },
  {
    agent: "Manager",
    message: "Calculating best bet size...",
    status: "loading",
  },
];

const IntelligenceTerminal = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const market = mockEvents.find((m) => m.id === id) || mockEvents[0];
  const [logs, setLogs] = useState([]);
  const [researching, setResearching] = useState(true);
  const [edgePercent, setEdgePercent] = useState(0);
  const [stakeSlider, setStakeSlider] = useState(0);

  const bankroll = 100000;

  useEffect(() => {
    // Run Agentic Workflow Mock
    let step = 0;
    setLogs([]);
    const interval = setInterval(() => {
      if (step < mockLogs.length) {
        setLogs((prev) => [
          ...prev,
          {
            ...mockLogs[step],
            status: "done",
            time: new Date().toLocaleTimeString(),
          },
        ]);
        step++;
      } else {
        clearInterval(interval);
        setResearching(false);
        setEdgePercent(market.edge);

        // Simple algorithm to recommend stake size based on edge utilizing part of Bankroll (Mock Kelly)
        const recommendedStake = Math.min(
          bankroll,
          Math.max(1000, Math.floor((market.edge / 100) * bankroll * 2.5)),
        );
        // Round to nearest 1000
        setStakeSlider(Math.round(recommendedStake / 1000) * 1000);
      }
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] p-4 lg:p-10 font-body text-[#dee2f5] grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* SIDEBAR: The Intelligence Waterfall */}
      <div className="lg:col-span-3 flex flex-col gap-6">
        <div className="flex items-center gap-3 border-b border-[#434653]/30 pb-4">
          <span className="material-symbols-outlined text-3xl text-[#1a4db8]">
            neurology
          </span>
          <h2 className="font-headline text-xl font-bold">Agents</h2>
        </div>

        <div className="flex-1 rounded-2xl bg-[#090e1b] border border-[#434653]/20 p-5 space-y-6">
          {logs.map((log, i) => (
            <div key={i} className="animate-fade-in">
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`font-mono text-xs font-bold uppercase ${
                    log.agent === "Scanner"
                      ? "text-[#b3c5ff]"
                      : log.agent === "Math Bot"
                        ? "text-[#7cd9ac]"
                        : log.agent === "Researcher"
                          ? "text-[#f0a500]"
                          : "text-[#ffb4ab]"
                  }`}
                >
                  {log.agent}
                </span>
                <span className="font-mono text-[10px] text-[#8d909e]">
                  {log.time}
                </span>
              </div>
              <p className="text-sm text-[#c3c6d5]">{log.message}</p>
            </div>
          ))}
          {researching && (
            <div className="flex items-center gap-3 text-[#1a4db8] animate-pulse mt-4">
              <span className="material-symbols-outlined animate-spin">
                refresh
              </span>
              <span className="font-mono text-sm">Researching...</span>
            </div>
          )}
        </div>
      </div>

      {/* CORE VIEW */}
      <div className="lg:col-span-9 flex flex-col gap-6">
        <button
          onClick={() => navigate("/markets")}
          className="flex cursor-pointer items-center gap-2 font-mono text-sm text-[#8d909e] transition-colors hover:text-[#b3c5ff] w-max"
        >
          <span className="material-symbols-outlined text-[18px]">
            arrow_back
          </span>{" "}
          Back to Markets
        </button>
        {/* Top Header */}
        <div className="rounded-2xl bg-[#1a1f2d] border border-[#434653]/30 p-6 flex flex-col items-start gap-4 shadow-lg md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono text-xs uppercase text-[#8d909e] mb-1">
              Market ID: {market.id}
            </p>
            <h1 className="font-headline text-2xl md:text-3xl font-bold">
              {market.title}
            </h1>
          </div>
          <div className="w-full text-left md:w-auto md:text-right">
            <span className="inline-block px-3 py-1 rounded bg-[#7cd9ac]/10 text-[#7cd9ac] font-mono text-sm border border-[#7cd9ac]/20">
              {researching ? "ANALYZING" : "SIGNAL READY"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
          {/* The Probability Nexus */}
          <div className="rounded-2xl bg-[#090e1b] border border-[#434653]/20 p-6 flex flex-col items-center justify-center relative overflow-hidden">
            <h3 className="font-headline text-lg w-full mb-6">
              Chance of Winning
            </h3>

            <div className="relative w-full h-48 flex items-end justify-center mb-6">
              {/* Morphing Bell Curve Mock */}
              <svg
                viewBox="0 0 400 200"
                className="w-full h-full drop-shadow-[0_0_15px_rgba(26,77,184,0.4)]"
              >
                <path
                  d={
                    researching
                      ? "M 0 200 C 150 200, 150 100, 200 100 C 250 100, 250 200, 400 200"
                      : "M 0 200 C 100 200, 150 20, 200 20 C 250 20, 300 200, 400 200"
                  }
                  fill="none"
                  stroke="#1a4db8"
                  strokeWidth="4"
                  className="transition-all duration-1000 ease-in-out"
                />
                <path
                  d="M 0 200 C 180 200, 220 120, 280 120 C 330 120, 350 200, 400 200"
                  fill="none"
                  stroke="#434653"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                />
                {!researching && (
                  <>
                    <line
                      x1="200"
                      y1="20"
                      x2="200"
                      y2="200"
                      stroke="#7cd9ac"
                      strokeWidth="2"
                      strokeDasharray="4"
                    />
                    <text
                      x="135"
                      y="40"
                      fill="#7cd9ac"
                      className="font-mono text-sm"
                    >
                      True Prob: {market.trueProb}%
                    </text>
                    <line
                      x1="280"
                      y1="120"
                      x2="280"
                      y2="200"
                      stroke="#f0a500"
                      strokeWidth="2"
                      strokeDasharray="4"
                    />
                    <text
                      x="290"
                      y="110"
                      fill="#f0a500"
                      className="font-mono text-sm"
                    >
                      Mkt: {Math.round(market.price * 100)}%
                    </text>
                  </>
                )}
              </svg>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#1a4db8] rounded-full"></div> Gemini
                AI
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#434653] rounded-full border border-dashed"></div>{" "}
                Market Assumed
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-8">
            {/* The SMC Heatmap */}
            <div className="rounded-2xl bg-[#090e1b] border border-[#434653]/20 p-6 flex-1">
              <h3 className="font-headline text-lg mb-4 flex justify-between">
                Where the Money Is
                <span className="material-symbols-outlined text-[#8d909e]">
                  view_timeline
                </span>
              </h3>
              <div className="flex h-32 w-full border-l border-b border-[#434653] relative opacity-80">
                {/* Horizontal Volume Bars */}
                <div className="absolute top-[10%] left-0 h-4 bg-[#7cd9ac]/80 w-[45%]" />
                <div className="absolute top-[30%] left-0 h-4 bg-[#b3c5ff]/40 w-[20%]" />
                <div className="absolute top-[50%] left-0 h-4 bg-[#f0a500]/90 w-[80%] shadow-[0_0_10px_#f0a500]" />
                <div className="absolute top-[70%] left-0 h-4 bg-[#b3c5ff]/60 w-[35%]" />
                <div className="absolute top-[90%] left-0 h-4 bg-[#ffb4ab]/80 w-[60%]" />
                {!researching && (
                  <div className="absolute top-[50%] left-[82%] text-xs font-mono text-[#f0a500] whitespace-nowrap -translate-y-1/2">
                    BIG INVESTORS BUYING HERE
                  </div>
                )}
              </div>
            </div>

            {/* The Kelly Action Card */}
            <div
              className={`rounded-2xl border transition-all duration-500 overflow-hidden ${researching ? "bg-[#161b29] border-[#434653]/20" : "bg-[#161b29] border-[#7cd9ac]/40 shadow-[0_4px_30px_rgba(124,217,172,0.15)]"}`}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <p className="font-mono text-xs uppercase text-[#8d909e]">
                      Your Edge
                    </p>
                    <p className="font-headline text-4xl font-bold text-[#7cd9ac]">
                      {edgePercent}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs uppercase text-[#8d909e]">
                      Bankroll
                    </p>
                    <p className="font-headline text-xl">
                      ₦{bankroll.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between font-mono text-sm mb-2">
                    <span>Stake Size</span>
                    <span className="text-[#f0a500] font-bold">
                      ₦{stakeSlider.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="100000"
                    step="1000"
                    value={stakeSlider}
                    onChange={(e) => setStakeSlider(Number(e.target.value))}
                    className="w-full accent-[#7cd9ac] opacity-90 cursor-pointer"
                    disabled={researching}
                  />
                  {!researching && (
                    <p className="text-xs text-[#8d909e] mt-2 italic">
                      Calculated using best risk-reward math
                    </p>
                  )}
                </div>

                <button
                  disabled={researching}
                  className="w-full py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-[#7cd9ac] text-[#002b18] hover:brightness-110 active:scale-[0.98]"
                >
                  {researching ? "Awaiting Signal..." : "Execute Buy Position"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntelligenceTerminal;
