import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { portfolioAPI } from "../services/api";

const CommandersVault = () => {
  const navigate = useNavigate();
  const [riskProfile, setRiskProfile] = useState("balanced");
  const [portfolio, setPortfolio] = useState(null);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPortfolioData = async () => {
      try {
        setError(null);
        const [profileRes, tradesRes] = await Promise.all([
          portfolioAPI.getProfile(),
          portfolioAPI.getTrades()
        ]);

        if (profileRes.success) {
          setPortfolio(profileRes.profile);
          setRiskProfile(profileRes.profile.risk_tolerance || "balanced");
        } else {
          setError("Failed to load portfolio");
        }

        if (tradesRes.success) {
          setTrades(tradesRes.trades || []);
        }
      } catch (err) {
        console.error("Error fetching portfolio:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolioData();
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] px-8 py-10 font-body text-[#dee2f5]">
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
        <header className="mb-10 border-b border-[#434653]/20 pb-6 flex flex-col items-start gap-6 md:flex-row md:justify-between md:items-end">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[#8d909e]">
                lock
              </span>
              <h1 className="font-headline text-4xl font-bold text-[#b3c5ff]">
                Account Wallet
              </h1>
            </div>
            <p className="text-[#c3c6d5]">
              Manage your balance and risk settings
            </p>
          </div>

          <button className="px-4 py-2 border border-[#434653] rounded-lg font-mono text-sm hover:bg-[#1a1f2d] transition-colors cursor-pointer">
            Export History
          </button>
        </header>

        {error && (
          <div className="mb-6 rounded-lg bg-[#ffb4ab]/20 border border-[#ffb4ab]/50 p-4 text-[#ffb4ab]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <span className="material-symbols-outlined animate-spin text-4xl text-[#1a4db8]">
              refresh
            </span>
          </div>
        ) : portfolio ? (
          <>
        {/* Bankroll Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-[#1a1f2d] p-6 rounded-xl border-t-2 border-[#1a4db8] shadow-lg">
            <p className="font-mono text-[10px] uppercase text-[#8d909e] mb-2">
              Total Balance
            </p>
            <p className="font-headline text-4xl font-bold text-[#dee2f5]">
              ₦{portfolio.bankroll?.toLocaleString() || 0}
            </p>
          </div>
          <div className="bg-[#1a1f2d] p-6 rounded-xl border-t-2 border-[#7cd9ac] shadow-lg">
            <p className="font-mono text-[10px] uppercase text-[#8d909e] mb-2">
              Win Rate
            </p>
            <p className="font-headline text-4xl font-bold text-[#7cd9ac]">
              {portfolio.win_rate?.toFixed(1) || 0}%
            </p>
          </div>
          <div className="bg-[#1a1f2d] p-6 rounded-xl border-t-2 border-[#f0a500] shadow-lg">
            <p className="font-mono text-[10px] uppercase text-[#8d909e] mb-2">
              Total Trades
            </p>
            <p className="font-headline text-4xl font-bold text-[#f0a500]">
              {portfolio.total_trades || 0}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Active Positions */}
          <div className="lg:col-span-8 bg-[#090e1b] rounded-2xl border border-[#434653]/30 p-6">
            <h2 className="font-headline text-2xl mb-6">Active Trades</h2>
            <div className="space-y-4">
              {trades.length === 0 ? (
                <div className="text-sm text-[#8d909e]">No active trades</div>
              ) : trades.map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between p-4 bg-[#1a1f2d] rounded-xl border border-[#434653]/10"
                >
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-[#8d909e]">
                      deployed_code
                    </span>
                    <div>
                      <p className="font-headline font-semibold">{trade.market_title || ('Trade ' + String(trade.id).substring(0,6))}</p>
                      <p className="font-mono text-xs text-[#8d909e]">
                        Stake: ₦{Number(trade.stake_amount || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                        <p className="font-mono text-[10px] uppercase text-[#8d909e]">
                          Current Value
                        </p>
                        <p className={`font-mono text-[10px] ${(trade.current_value >= trade.stake_amount) ? 'text-[#7cd9ac]' : 'text-[#ffb4ab]'}`}>
                          {trade.current_value || trade.stake_amount}
                        </p>
                    </div>
                    <button 
                      onClick={async () => {
                        try {
                           await portfolioAPI.closeTrade({ trade_id: trade.id, exit_price: trade.current_value || 0 });
                           window.location.reload();
                        } catch(e) {
                           alert(e.message || "Failed to close trade");
                        }
                      }}
                      className="px-3 py-1 bg-[#ffb4ab]/10 text-[#ffb4ab] rounded hover:bg-[#ffb4ab]/20 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Profile Settings */}
          <div className="lg:col-span-4 bg-[#090e1b] rounded-2xl border border-[#434653]/30 p-6 flex flex-col">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-headline text-2xl">Risk Profile</h2>
              <span className="material-symbols-outlined text-[#1a4db8]">
                tune
              </span>
            </div>
            <p className="text-sm text-[#8d909e] mb-8">
              Adjust how aggressively you want to trade based on your risk
              tolerance.
            </p>

            <div className="space-y-3 flex-1">
              {[
                {
                  label: "Conservative",
                  alpha: "Low Risk",
                  desc: "Preserves capital, minimizes losses.",
                },
                {
                  label: "Balanced",
                  alpha: "Medium Risk",
                  desc: "Standard steady account growth.",
                },
                {
                  label: "Aggressive",
                  alpha: "High Risk",
                  desc: "High variance. Maximum profit seeking.",
                },
              ].map((profile) => (
                <div
                  key={profile.label}
                  onClick={() => setRiskProfile(profile.label)}
                  className={`p-4 rounded-xl cursor-pointer border transition-all ${
                    riskProfile === profile.label
                      ? "border-[#1a4db8] bg-[#1a4db8]/10"
                      : "border-[#434653]/30 hover:border-[#8d909e]"
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-headline font-bold">
                      {profile.label}
                    </span>
                    <span className="font-mono text-xs text-[#1a4db8]">
                      {profile.alpha}
                    </span>
                  </div>
                  <p className="text-xs text-[#8d909e]">{profile.desc}</p>
                </div>
              ))}
            </div>

            <button className="mt-8 w-full py-4 rounded-xl bg-[#1a4db8] text-[#b8c8ff] font-bold transition-all hover:brightness-110">
              Save Settings
            </button>
          </div>
        </div>
          </>
        ) : (
          <div className="text-center text-[#8d909e]">No portfolio data available</div>
        )}
      </div>
    </div>
  );
};

export default CommandersVault;
