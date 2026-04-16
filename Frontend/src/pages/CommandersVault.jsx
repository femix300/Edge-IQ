import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const CommandersVault = () => {
  const navigate = useNavigate();
  const [riskProfile, setRiskProfile] = useState("Balanced");

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

        {/* Bankroll Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-[#1a1f2d] p-6 rounded-xl border-t-2 border-[#1a4db8] shadow-lg">
            <p className="font-mono text-[10px] uppercase text-[#8d909e] mb-2">
              Total Balance
            </p>
            <p className="font-headline text-4xl font-bold text-[#dee2f5]">
              ₦142,500
            </p>
          </div>
          <div className="bg-[#1a1f2d] p-6 rounded-xl border-t-2 border-[#7cd9ac] shadow-lg">
            <p className="font-mono text-[10px] uppercase text-[#8d909e] mb-2">
              Available Cash
            </p>
            <p className="font-headline text-4xl font-bold text-[#7cd9ac]">
              ₦95,000
            </p>
          </div>
          <div className="bg-[#1a1f2d] p-6 rounded-xl border-t-2 border-[#f0a500] shadow-lg">
            <p className="font-mono text-[10px] uppercase text-[#8d909e] mb-2">
              At-Risk Capital
            </p>
            <p className="font-headline text-4xl font-bold text-[#f0a500]">
              ₦47,500
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Active Positions */}
          <div className="lg:col-span-8 bg-[#090e1b] rounded-2xl border border-[#434653]/30 p-6">
            <h2 className="font-headline text-2xl mb-6">Active Trades</h2>
            <div className="space-y-4">
              {[
                {
                  name: "BTC touches $100k",
                  stake: "₦20,000",
                  pnl: "+₦4,500",
                  color: "text-[#7cd9ac]",
                },
                {
                  name: "NVDA Q2 Earnings Beat",
                  stake: "₦15,000",
                  pnl: "-₦1,200",
                  color: "text-[#ffb4ab]",
                },
                {
                  name: "Solana ETF Approval",
                  stake: "₦12,500",
                  pnl: "+₦8,900",
                  color: "text-[#7cd9ac]",
                },
              ].map((pos, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 bg-[#1a1f2d] rounded-xl border border-[#434653]/10"
                >
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-[#8d909e]">
                      deployed_code
                    </span>
                    <div>
                      <p className="font-headline font-semibold">{pos.name}</p>
                      <p className="font-mono text-xs text-[#8d909e]">
                        Stake: {pos.stake}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[10px] uppercase text-[#8d909e]">
                      Current Profit/Loss
                    </p>
                    <p className={`font-mono text-lg font-bold ${pos.color}`}>
                      {pos.pnl}
                    </p>
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
      </div>
    </div>
  );
};

export default CommandersVault;
