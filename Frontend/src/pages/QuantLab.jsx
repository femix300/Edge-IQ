import React from "react";
import { useNavigate } from "react-router-dom";

const QuantLab = () => {
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
        <header className="mb-10">
          <h1 className="font-headline text-4xl font-bold text-[#b3c5ff]">
            Data Insights
          </h1>
          <p className="mt-2 text-[#c3c6d5]">
            Review your past performance and strategies
          </p>
        </header>

        <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* PnL Graph */}
          <div className="rounded-2xl border border-[#434653]/30 bg-[#090e1b] p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline text-xl">Total Profit</h3>
              <div className="text-right">
                <p className="font-mono text-sm text-[#8d909e]">
                  Initial: ₦100,000
                </p>
                <p className="font-mono font-bold text-[#7cd9ac]">
                  +142.5% Net
                </p>
              </div>
            </div>

            <div className="h-64 flex items-end gap-1 overflow-hidden">
              {/* Mock Bar Chart representing Cumulative Return */}
              {Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-[#1a4db8] rounded-t min-w-[10px]"
                  style={{
                    height: `${20 + i * 2.5 + (Math.random() * 10 - 5)}%`,
                  }}
                ></div>
              ))}
            </div>
          </div>

          {/* Calibration Chart */}
          <div className="rounded-2xl border border-[#434653]/30 bg-[#090e1b] p-6 shadow-xl">
            <div className="mb-6">
              <h3 className="font-headline text-xl">How Accurate is Our AI?</h3>
              <p className="font-mono text-[10px] uppercase text-[#8d909e] mt-1">
                Accuracy Score: 92.4%
              </p>
            </div>

            <div className="relative h-64 border-l border-b border-[#434653] flex items-end p-2 bg-[#1a1f2d]/30">
              {/* 45 degree line perfect calibration */}
              <svg
                className="absolute inset-0 w-full h-full"
                preserveAspectRatio="none"
                viewBox="0 0 100 100"
              >
                <line
                  x1="0"
                  y1="100"
                  x2="100"
                  y2="0"
                  stroke="#434653"
                  strokeDasharray="4"
                />

                {/* Scatter plot of buckets */}
                <circle cx="10" cy="90" r="3" fill="#b3c5ff" />
                <circle cx="20" cy="85" r="4" fill="#b3c5ff" />
                <circle cx="30" cy="65" r="3.5" fill="#f0a500" />
                <circle cx="40" cy="55" r="5" fill="#b3c5ff" />
                <circle cx="50" cy="45" r="4" fill="#b3c5ff" />
                <circle cx="60" cy="30" r="6" fill="#7cd9ac" />
                <circle cx="70" cy="25" r="4" fill="#b3c5ff" />
                <circle cx="80" cy="15" r="7" fill="#7cd9ac" />
                <circle cx="90" cy="10" r="4" fill="#1a4db8" />
              </svg>
            </div>
          </div>
        </div>

        {/* Past Signals Table */}
        <div className="rounded-2xl border border-[#434653]/30 bg-[#090e1b] overflow-hidden">
          <div className="p-6 border-b border-[#434653]/30">
            <h3 className="font-headline text-xl">Past Trade History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-sm">
              <thead className="bg-[#1a1f2d] text-[#8d909e]">
                <tr>
                  <th className="px-6 py-4 font-medium uppercase">Event</th>
                  <th className="px-6 py-4 font-medium uppercase">Date</th>
                  <th className="px-6 py-4 font-medium uppercase">Result</th>
                  <th className="px-6 py-4 font-medium uppercase">
                    Why AI Chose This
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#434653]/20">
                <tr className="hover:bg-[#1a1f2d]/50 transition-colors">
                  <td className="px-6 py-4 text-[#dee2f5] font-headline">
                    Fed 25bps Cut March
                  </td>
                  <td className="px-6 py-4 text-[#c3c6d5]">Mar 10, 2026</td>
                  <td className="px-6 py-4 text-[#7cd9ac] font-bold">WIN</td>
                  <td className="px-6 py-4 text-[#8d909e] text-xs">
                    CPI data indicated cooling. Swap markets undervaluing
                    probability compared to FOMC dot plot.
                  </td>
                </tr>
                <tr className="hover:bg-[#1a1f2d]/50 transition-colors">
                  <td className="px-6 py-4 text-[#dee2f5] font-headline">
                    ETH Gas &lt; 15 gwei
                  </td>
                  <td className="px-6 py-4 text-[#c3c6d5]">Feb 28, 2026</td>
                  <td className="px-6 py-4 text-[#ffb4ab] font-bold">LOSS</td>
                  <td className="px-6 py-4 text-[#8d909e] text-xs">
                    L2 migration accelerated, but sudden meme-coin spike
                    nullified models. Overfitted on base usage.
                  </td>
                </tr>
                <tr className="hover:bg-[#1a1f2d]/50 transition-colors">
                  <td className="px-6 py-4 text-[#dee2f5] font-headline">
                    OpenAI Sora Release
                  </td>
                  <td className="px-6 py-4 text-[#c3c6d5]">Feb 15, 2026</td>
                  <td className="px-6 py-4 text-[#7cd9ac] font-bold">WIN</td>
                  <td className="px-6 py-4 text-[#8d909e] text-xs">
                    Github repo leaks and exec tweets strongly hinted at
                    imminent launch. Sentiment score 98/100.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuantLab;
