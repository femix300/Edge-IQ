import React from "react";
import { useNavigate } from "react-router-dom";

const PricingPage = () => {
  const navigate = useNavigate();
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

        <header className="mb-16 text-center mt-12">
          <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight text-[#b3c5ff] mb-4">
            Pricing Plans
          </h1>
          <p className="text-lg md:text-xl text-[#c3c6d5] max-w-2xl mx-auto">
            Unlock powerful AI tools. Choose the plan that fits your trading
            goals.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-end">
          {/* Scout Plan */}
          <div className="rounded-2xl border border-[#434653]/30 bg-[#090e1b] p-8 transition-transform hover:-translate-y-2">
            <h2 className="font-headline text-2xl font-bold mb-2">Basic</h2>
            <p className="text-[#8d909e] text-sm mb-6">
              For casual users and beginners.
            </p>
            <div className="mb-6 border-b border-[#434653]/30 pb-6">
              <span className="font-headline text-4xl font-bold text-[#dee2f5]">
                ₦0
              </span>
              <span className="text-[#8d909e]"> /mo</span>
            </div>
            <ul className="space-y-4 mb-8 text-sm">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[#7cd9ac] text-lg">
                  check_circle
                </span>{" "}
                Delay of 15-minutes on signals
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[#7cd9ac] text-lg">
                  check_circle
                </span>{" "}
                Basic Market Overview
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[#434653] text-lg">
                  cancel
                </span>{" "}
                No custom bet sizing
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[#434653] text-lg">
                  cancel
                </span>{" "}
                No historical data access
              </li>
            </ul>
            <button
              onClick={() => alert("You are already on the Free Plan.")}
              className="w-full py-4 rounded-xl font-bold border border-[#434653] text-[#8d909e] transition-all cursor-not-allowed opacity-50"
            >
              Current Plan
            </button>
          </div>

          {/* Commander Plan */}
          <div className="rounded-2xl border border-[#1a4db8] bg-[#161b29] p-8 shadow-[0_8px_32px_0_rgba(26,77,184,0.15)] relative transform md:-translate-y-4">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#1a4db8] text-[#b8c8ff] font-mono text-xs uppercase tracking-widest py-1 px-4 rounded-full font-bold shadow-lg">
              Most Popular
            </div>
            <h2 className="font-headline text-2xl font-bold mb-2 text-[#b3c5ff]">
              Pro
            </h2>
            <p className="text-[#c3c6d5] text-sm mb-6">
              For serious traders looking to maximize profits.
            </p>
            <div className="mb-6 border-b border-[#434653]/30 pb-6">
              <span className="font-headline text-5xl font-bold text-[#b3c5ff]">
                ₦25,000
              </span>
              <span className="text-[#8d909e]"> /mo</span>
            </div>
            <ul className="space-y-4 mb-8 text-sm">
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#7cd9ac] text-lg">
                  check_circle
                </span>{" "}
                Instant live market signals
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#7cd9ac] text-lg">
                  check_circle
                </span>{" "}
                Advanced AI Analysis Dashboard
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#7cd9ac] text-lg">
                  check_circle
                </span>{" "}
                Connected Account Wallet
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#7cd9ac] text-lg">
                  check_circle
                </span>{" "}
                Historical Data Lab (3yr history)
              </li>
            </ul>
            <button
              onClick={() => alert("Redirecting to payment gateway...")}
              className="w-full py-4 rounded-xl font-bold bg-[#1a4db8] text-[#b8c8ff] hover:brightness-110 active:scale-95 transition-all shadow-lg cursor-pointer"
            >
              Upgrade to Pro
            </button>
          </div>

          {/* Institutional Plan */}
          <div className="rounded-2xl border border-[#434653]/30 bg-[#090e1b] p-8 transition-transform hover:-translate-y-2">
            <h2 className="font-headline text-2xl font-bold mb-2">
              Institutional
            </h2>
            <p className="text-[#8d909e] text-sm mb-6">
              For large teams and companies.
            </p>
            <div className="mb-6 border-b border-[#434653]/30 pb-6">
              <span className="font-headline text-4xl font-bold text-[#f0a500]">
                ₦150,000
              </span>
              <span className="text-[#8d909e]"> /mo</span>
            </div>
            <ul className="space-y-4 mb-8 text-sm">
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#7cd9ac] text-lg">
                  check_circle
                </span>{" "}
                Everything in Pro Plan
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#7cd9ac] text-lg">
                  check_circle
                </span>{" "}
                Dedicated server access
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#7cd9ac] text-lg">
                  check_circle
                </span>{" "}
                Advanced API connections
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#7cd9ac] text-lg">
                  check_circle
                </span>{" "}
                Custom Risk Settings
              </li>
            </ul>
            <button
              onClick={() => alert("Opening support chat...")}
              className="w-full py-4 rounded-xl font-bold border border-[#f0a500]/50 text-[#f0a500] hover:bg-[#f0a500]/10 transition-all cursor-pointer"
            >
              Contact Sales
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
