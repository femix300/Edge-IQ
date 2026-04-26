import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { marketsAPI, portfolioAPI } from "../services/api";

const extractMarketsList = (response) => response?.results || response?.markets || [];
const MAX_ANALYSIS_POLL_ATTEMPTS = 45;
const ANALYSIS_POLL_INTERVAL_MS = 2000;

const IntelligenceTerminal = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [market, setMarket] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [logs, setLogs] = useState([]);
  const [researching, setResearching] = useState(true);
  const [edgePercent, setEdgePercent] = useState(0);
  const [stakeSlider, setStakeSlider] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [taskId, setTaskId] = useState(null);
  const [taskStatus, setTaskStatus] = useState("IDLE");
  const bankroll = Number(portfolio?.bankroll || 10000);

  const startAsyncAnalysis = async (marketId, userBankroll) => {
    try {
      setResearching(true);
      setTaskStatus("PENDING");
      setLogs((prev) => [
        ...prev,
        {
          agent: "Researcher",
          message: "Queued async analysis job...",
          status: "pending",
          time: new Date().toLocaleTimeString(),
        },
      ]);

      const asyncRes = await marketsAPI.analyzeMarketAsync(marketId, userBankroll);
      if (asyncRes?.success && asyncRes?.task_id) {
        setTaskId(asyncRes.task_id);
        setLogs((prev) => [
          ...prev,
          {
            agent: "Researcher",
            message: "Analysis running in background...",
            status: "pending",
            time: new Date().toLocaleTimeString(),
          },
        ]);
      } else {
        setResearching(false);
        setError("Failed to start async analysis job.");
      }
    } catch (analysisErr) {
      console.error("Analysis error:", analysisErr);
      setTaskStatus("FAILED");
      setResearching(false);
      setError(analysisErr?.message || "Failed to queue async analysis task.");
      setLogs((prev) => [
        ...prev,
        {
          agent: "Researcher",
          message: "Failed to queue analysis job.",
          status: "error",
          time: new Date().toLocaleTimeString(),
        },
      ]);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        let resolvedMarketId = id;
        if (!resolvedMarketId || resolvedMarketId === "latest") {
          const savedId = localStorage.getItem("edgeiq_last_analysis_market_id");
          if (savedId && resolvedMarketId !== "latest") {
            resolvedMarketId = savedId;
          }
        }

        if (!resolvedMarketId || resolvedMarketId === "latest") {
          const latestRes = await marketsAPI.getMarkets({ status: "open", page_size: 1 });
          const latestMarkets = extractMarketsList(latestRes);
          if (!latestMarkets.length) {
            setError("No markets available for analysis.");
            setResearching(false);
            return;
          }
          resolvedMarketId = String(latestMarkets[0].id);
        }

        const marketRes = await marketsAPI.getMarket(resolvedMarketId);
        const marketData = marketRes.market || marketRes;
        setMarket(marketData);
        localStorage.setItem("edgeiq_last_analysis_market_id", String(marketData.id));
        setLogs([
          { agent: "Scanner", message: `Loaded market: ${marketData.title || resolvedMarketId}`, status: "done", time: new Date().toLocaleTimeString() },
        ]);

        let userBankroll = 10000;
        try {
          const portfolioRes = await portfolioAPI.getProfile();
          if (portfolioRes.success || portfolioRes.bankroll) {
            const profileData = portfolioRes.profile || portfolioRes;
            setPortfolio(profileData);
            userBankroll = profileData.bankroll || 10000;
            setLogs((prev) => [
              ...prev,
              { agent: "Math Bot", message: `Bankroll loaded: ₦${Number(userBankroll).toLocaleString()}`, status: "done", time: new Date().toLocaleTimeString() },
            ]);
          }
        } catch (e) {
          console.warn("Could not fetch portfolio profile:", e);
        }

        // Render market view immediately, then run analysis in background.
        setLoading(false);
        if (marketData?.id) {
          await startAsyncAnalysis(marketData.id, userBankroll);
        } else {
          setResearching(false);
        }
      } catch (err) {
        console.error("Error fetching market data:", err);
        setError(err.message || "Failed to load market data.");
        setResearching(false);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    if (!taskId) return;

    let attempts = 0;
    let lastSeenStatus = "";

    const pollHandle = setInterval(async () => {
      try {
        attempts += 1;
        const statusRes = await marketsAPI.getTaskStatus(taskId);
        const currentStatus = statusRes?.status || "UNKNOWN";
        setTaskStatus(currentStatus);

        if (currentStatus !== lastSeenStatus) {
          lastSeenStatus = currentStatus;
          setLogs((prev) => [
            ...prev,
            {
              agent: "Researcher",
              message: `Task status: ${currentStatus}`,
              status: statusRes?.ready ? "done" : "pending",
              time: new Date().toLocaleTimeString(),
            },
          ]);
        }

        if (statusRes?.ready) {
          clearInterval(pollHandle);

          const taskResult = statusRes?.result;
          const taskFailed = currentStatus === "FAILURE" || taskResult?.status === "error";
          if (taskFailed) {
            setError(taskResult?.error || statusRes?.error || "Async analysis failed.");
            setLogs((prev) => [
              ...prev,
              {
                agent: "Researcher",
                message: "Background analysis failed.",
                status: "error",
                time: new Date().toLocaleTimeString(),
              },
            ]);
            setResearching(false);
            return;
          }

          const payload = taskResult?.result || taskResult;
          if (payload) {
            setAnalysis(payload);
          }
          setLogs((prev) => [
            ...prev,
            {
              agent: "Researcher",
              message: "Signal generation complete.",
              status: "done",
              time: new Date().toLocaleTimeString(),
            },
          ]);
          setResearching(false);
        }

        if (attempts >= MAX_ANALYSIS_POLL_ATTEMPTS) {
          clearInterval(pollHandle);
          setResearching(false);
          setTaskStatus("TIMEOUT");
          setError("Analysis is still running in background. If this persists, ensure Celery worker is running.");
        }
      } catch (pollErr) {
        clearInterval(pollHandle);
        setResearching(false);
        setTaskStatus("FAILED");
        setError(pollErr?.message || "Failed to poll analysis status.");
      }
    }, ANALYSIS_POLL_INTERVAL_MS);

    return () => clearInterval(pollHandle);
  }, [taskId]);

  useEffect(() => {
    if (!market) return;

    const edge = Number(analysis?.signal?.edge_score || analysis?.ai_analysis?.edge_score || 0);
    setEdgePercent(edge);

    const currentBankroll = Number(portfolio?.bankroll || 10000);
    const recommendedStake = Math.min(
      currentBankroll,
      Math.max(1000, Math.floor((edge / 100) * currentBankroll * 2.5)),
    );
    setStakeSlider(Math.round(recommendedStake / 1000) * 1000);
  }, [analysis, market, portfolio]);

  const handleSimulateTrade = async () => {
    try {
        setLoading(true);
        if (!analysis?.signal?.id) {
           setError('No signal available to execute trade.');
           setLoading(false);
           return;
        }
        const res = await portfolioAPI.simulateTrade({
           signal_id: analysis.signal.id,
           stake_amount: stakeSlider
        });
        
        if (res.success || res.trade_id) {
           navigate('/vault');
        } else {
           setError(res.error || 'Failed to simulate trade.');
           setLoading(false);
        }
    } catch(e) {
        setError(e.message || 'Execution error');
        setLoading(false);
    }
  };

  const displayedProbability = Number(
    analysis?.ai_analysis?.probability ?? market?.implied_probability ?? 0,
  );
  const marketPricePercent = Math.round(
    Number(market?.current_price ?? market?.price ?? 0) * 100,
  );
  const analysisStateLabel = researching
    ? `ANALYZING (${taskStatus})`
    : analysis?.signal
      ? "SIGNAL READY"
      : "ANALYSIS COMPLETE";

  return (
    <div className="min-h-screen bg-[#020617] p-4 lg:p-10 font-body text-[#dee2f5] grid grid-cols-1 lg:grid-cols-12 gap-8">
      {error && (
        <div className="col-span-full rounded-lg bg-[#ffb4ab]/20 border border-[#ffb4ab]/50 p-4 text-[#ffb4ab]">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="col-span-full flex h-64 items-center justify-center">
          <span className="material-symbols-outlined animate-spin text-4xl text-[#1a4db8]">
            refresh
          </span>
        </div>
      ) : market ? (
        <>
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
              Market {market.bayse_event_id || market.id}
            </p>
            <h1 className="font-headline text-2xl md:text-3xl font-bold">
              {market.title || "Market Analysis"}
            </h1>
          </div>
          <div className="w-full text-left md:w-auto md:text-right">
            <span className="inline-block px-3 py-1 rounded bg-[#7cd9ac]/10 text-[#7cd9ac] font-mono text-sm border border-[#7cd9ac]/20">
              {analysisStateLabel}
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
              {/* Probability curve visualization */}
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
                      True Prob: {Math.round(displayedProbability)}%
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
                      Mkt: {marketPricePercent}%
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
                    disabled={researching || !analysis?.signal?.id}
                  />
                  {!researching && (
                    <p className="text-xs text-[#8d909e] mt-2 italic">
                      Calculated using best risk-reward math
                    </p>
                  )}
                </div>

                <button onClick={handleSimulateTrade}
                  disabled={researching || !analysis?.signal?.id}
                  className="w-full py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-[#7cd9ac] text-[#002b18] hover:brightness-110 active:scale-[0.98]"
                >
                  {researching ? "Awaiting Signal..." : "Execute Buy Position"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
        </>
      ) : (
        <div className="col-span-full text-center text-[#8d909e]">Market not found</div>
      )}
    </div>
  );
};

export default IntelligenceTerminal;

