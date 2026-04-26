import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signalsAPI, backtestAPI, portfolioAPI } from "../services/api";

const QuantLab = () => {
  const navigate = useNavigate();
  const [strategies, setStrategies] = useState([]);
  const [calibration, setCalibration] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [recentTrades, setRecentTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [stratRes, calRes, analyticsRes, tradesRes] = await Promise.all([
          backtestAPI.getStrategies().catch(() => ({ strategies: [] })),
          signalsAPI.getCalibration().catch(() => null),
          portfolioAPI.getAnalytics().catch(() => null),
          portfolioAPI.getTrades().catch(() => ({ trades: [] })),
        ]);

        if (stratRes?.strategies) {
          setStrategies(stratRes.strategies);
        }

        if (calRes?.success) {
          setCalibration(calRes);
        }

        if (analyticsRes?.success) {
          setAnalytics(analyticsRes.analytics);
        }

        if (tradesRes?.success) {
          const closedTrades = (tradesRes.trades || []).filter(
            (trade) => trade.status === "won" || trade.status === "lost",
          );
          setRecentTrades(closedTrades.slice(0, 12));
        }
      } catch (e) {
        setError("Failed to load quant lab data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080d1a] flex items-center justify-center p-8 text-center text-white">
        <span className="material-symbols-outlined animate-spin text-4xl text-[#1a4db8]">
          refresh
        </span>
      </div>
    );
  }
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
        <header className="mb-10">
          <h1 className="font-headline text-4xl font-bold text-[#b3c5ff]">
            Data Insights
          </h1>
          <p className="mt-2 text-[#c3c6d5]">
            Review your past performance and strategies
          </p>
        </header>

        {error && (
          <div className="mb-6 rounded-lg bg-[#ffb4ab]/20 border border-[#ffb4ab]/50 p-4 text-[#ffb4ab]">
            {error}
          </div>
        )}

        <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="rounded-2xl border border-[#434653]/30 bg-[#090e1b] p-6 shadow-xl">
            <h3 className="font-headline text-xl">Total PnL</h3>
            <p className={`mt-3 font-headline text-4xl font-bold ${Number(analytics?.total_pnl || 0) >= 0 ? "text-[#7cd9ac]" : "text-[#ffb4ab]"}`}>
              ₦{Number(analytics?.total_pnl || 0).toLocaleString()}
            </p>
            <p className="mt-2 text-[#8d909e] text-sm">
              Win Rate: {Number(analytics?.win_rate || 0).toFixed(1)}%
            </p>
            <p className="text-[#8d909e] text-sm">
              Trades: {analytics?.total_trades || 0}
            </p>
          </div>

          <div className="rounded-2xl border border-[#434653]/30 bg-[#090e1b] p-6 shadow-xl">
            <h3 className="font-headline text-xl">Open Positions</h3>
            <p className="mt-3 font-headline text-4xl font-bold text-[#b3c5ff]">
              {analytics?.open_positions || 0}
            </p>
            <p className="mt-2 text-[#8d909e] text-sm">
              Bankroll: ₦{Number(analytics?.bankroll || 0).toLocaleString()}
            </p>
            <p className="text-[#8d909e] text-sm">
              Max Drawdown: ₦{Number(analytics?.max_drawdown || 0).toLocaleString()}
            </p>
          </div>

          <div className="rounded-2xl border border-[#434653]/30 bg-[#090e1b] p-6 shadow-xl">
            <h3 className="font-headline text-xl">Model Calibration</h3>
            <p className="mt-3 font-headline text-4xl font-bold text-[#f0a500]">
              {calibration?.total_markets_analyzed || 0}
            </p>
            <p className="mt-2 text-[#8d909e] text-sm">
              Resolved markets analyzed
            </p>
            <p className="text-[#8d909e] text-sm">
              Buckets: {calibration?.calibration_points?.length || 0}
            </p>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="rounded-2xl border border-[#434653]/30 bg-[#090e1b] p-6 shadow-xl">
            <h3 className="font-headline text-xl mb-4">Calibration Points</h3>
            {calibration?.calibration_points?.length ? (
              <div className="space-y-3 max-h-64 overflow-auto pr-2">
                {calibration.calibration_points.map((point) => (
                  <div key={point.bin} className="rounded-lg border border-[#434653]/30 bg-[#1a1f2d] p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-[#8d909e]">{point.bin}</span>
                      <span className="font-mono text-xs text-[#b3c5ff]">n={point.count}</span>
                    </div>
                    <div className="mt-2 text-sm">
                      Predicted: <span className="text-[#7cd9ac]">{Number(point.predicted).toFixed(1)}%</span> | Actual: <span className="text-[#f0a500]">{Number(point.actual).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#8d909e]">No calibration points available yet.</p>
            )}
          </div>

          <div className="rounded-2xl border border-[#434653]/30 bg-[#090e1b] p-6 shadow-xl">
            <h3 className="font-headline text-xl mb-4">Strategy Library</h3>
            {strategies.length ? (
              <div className="space-y-3">
                {strategies.map((strategy) => (
                  <div key={strategy.id} className="rounded-lg border border-[#434653]/30 bg-[#1a1f2d] p-3">
                    <p className="font-headline text-[#dee2f5]">{strategy.name}</p>
                    <p className="mt-1 text-xs text-[#8d909e]">{strategy.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#8d909e]">No strategy data available.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#434653]/30 bg-[#090e1b] overflow-hidden">
          <div className="p-6 border-b border-[#434653]/30">
            <h3 className="font-headline text-xl">Closed Trade History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-sm">
              <thead className="bg-[#1a1f2d] text-[#8d909e]">
                <tr>
                  <th className="px-6 py-4 font-medium uppercase">Market</th>
                  <th className="px-6 py-4 font-medium uppercase">Direction</th>
                  <th className="px-6 py-4 font-medium uppercase">Stake</th>
                  <th className="px-6 py-4 font-medium uppercase">ROI</th>
                  <th className="px-6 py-4 font-medium uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#434653]/20">
                {recentTrades.length ? (
                  recentTrades.map((trade) => (
                    <tr key={trade.id} className="hover:bg-[#1a1f2d]/50 transition-colors">
                      <td className="px-6 py-4 text-[#dee2f5] font-headline">{trade.market_title || trade.market_id || trade.id}</td>
                      <td className="px-6 py-4 text-[#c3c6d5]">{trade.direction || "-"}</td>
                      <td className="px-6 py-4 text-[#c3c6d5]">₦{Number(trade.stake_amount || 0).toLocaleString()}</td>
                      <td className={`px-6 py-4 font-bold ${Number(trade.roi || 0) >= 0 ? "text-[#7cd9ac]" : "text-[#ffb4ab]"}`}>
                        {Number(trade.roi || 0).toFixed(2)}%
                      </td>
                      <td className={`px-6 py-4 font-bold ${trade.status === "won" ? "text-[#7cd9ac]" : "text-[#ffb4ab]"}`}>
                        {String(trade.status || "-").toUpperCase()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-6 text-[#8d909e]">No closed trades yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuantLab;
