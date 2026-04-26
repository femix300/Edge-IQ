const steps = [
  {
    icon: "grid_view",
    title: "Market Scanner",
    description: "Aggregates global liquidity and volume data instantly.",
    color: "text-[#b3c5ff]",
    fill: false,
  },
  {
    icon: "analytics",
    title: "Smart Analysis",
    description: "Checks math to see if the market is right or wrong.",
    color: "text-[#b3c5ff]",
    fill: false,
  },
  {
    icon: "psychology",
    title: "AI Probability",
    description: "Gemini AI models sentiment and news volatility.",
    color: "text-[#f0a500]",
    fill: true,
  },
  {
    icon: "bolt",
    title: "Trade Signal",
    description: "Final recommendation with confidence weighting.",
    color: "text-[#7cd9ac]",
    fill: true,
  },
];

const pipelineSteps = [
  {
    title: "Scanner",
    description:
      "Constant scanning of all global markets to see where money is moving.",
    icon: "grid_view",
    bar: "bg-[#b3c5ff]",
  },
  {
    title: "Analysis",
    description:
      "Neural network filtering of macro data points against historical volatility clusters.",
    icon: "analytics",
    bar: "bg-[#b3c5ff]",
  },
  {
    title: "Probability",
    description: "Calculates the exact percent chance of winning right now.",
    icon: "psychology",
    bar: "bg-[#b3c5ff]",
  },
  {
    title: "Signal",
    description:
      "Executable trade parameters pushed to terminal with millisecond latency.",
    icon: "bolt",
    bar: "bg-[#efa500]",
  },
];

import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

const TadaText = () => {
  const [renderKey, setRenderKey] = useState(0);

  const wordsData = [
    { text: "Know", highlight: false },
    { text: "the", highlight: false },
    { text: "edge", highlight: true },
    { text: "before", highlight: false },
    { text: "the", highlight: false },
    { text: "market", highlight: false },
    { text: "does.", highlight: false },
  ];

  let charIndex = 0;

  useEffect(() => {
    const totalTime = (36 * 0.05 * 1000) + 800 + 4000;
    const interval = setInterval(() => {
      setRenderKey(prev => prev + 1);
    }, totalTime);
    return () => clearInterval(interval);
  }, []);

  return (
    <span key={renderKey} className="inline-block">
      {wordsData.map((wordObj, wIdx) => (
        <span key={wIdx} className="inline-block whitespace-nowrap">
          {wordObj.text.split("").map((char, cIdx) => {
            const currentDelay = charIndex * 0.05;
            charIndex++;
            return (
              <span
                key={cIdx}
                className={`inline-block ${wordObj.highlight ? 'text-[#f0a500]' : ''}`}
                style={{
                  opacity: 0,
                  animation: 'tada 0.8s forwards',
                  animationDelay: `${currentDelay}s`
                }}
              >
                {char}
              </span>
            );
          })}
          {wIdx < wordsData.length - 1 && (
            <span 
              className="inline-block whitespace-pre"
              style={{
                opacity: 0,
                animation: 'tada 0.8s forwards',
                animationDelay: `${(charIndex++) * 0.05}s`
              }}
            >
              {" "}
            </span>
          )}
        </span>
      ))}
    </span>
  );
};

function LandingPage() {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  return (
    <div className="min-h-screen w-full bg-[#080d1a] text-[#dee2f5]">
      <nav className="fixed top-0 z-50 w-full bg-[#020617]/95 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[128rem] items-center justify-between px-8 py-4 lg:px-32">
          <div className="flex items-center gap-2">
            {/* <span className="material-symbols-outlined text-2xl text-[#60a5fa]" style={{ fontVariationSettings: "'FILL' 1" }}>
              bolt
            </span> */}
            <img src="../bayseLogo.png" alt="bayse" />
            <span className="font-headline text-xl font-bold tracking-tighter text-[#b3c5ff] md:text-2xl">
              EdgeIQ
            </span>
          </div>
          <div className="hidden items-center gap-8 lg:flex">
            <button
              onClick={() => navigate("/markets")}
              className="font-medium text-slate-400 transition-colors hover:text-white cursor-pointer"
            >
              Markets
            </button>
            <button
              onClick={() => navigate("/analysis")}
              className="font-medium text-slate-400 transition-colors hover:text-white cursor-pointer"
            >
              Signals
            </button>
            <button
              onClick={() => navigate("/quant-lab")}
              className="font-medium text-slate-400 transition-colors hover:text-white cursor-pointer"
            >
              Analytics
            </button>
            <button
              onClick={() => navigate("/pricing")}
              className="font-medium text-slate-400 transition-colors hover:text-white cursor-pointer"
            >
              Pricing
            </button>
          </div>
          <div className="hidden items-center gap-4 md:flex">
            <button
              onClick={() => navigate("/auth")}
              className="font-medium text-slate-400 transition-colors hover:text-white cursor-pointer"
            >
              Login
            </button>
            <button
              onClick={() => navigate("/markets")}
              className="rounded-xl bg-[#1a4db8] px-6 py-2.5 font-semibold cursor-pointer text-[#b8c8ff] transition-all hover:brightness-110 active:scale-95"
            >
              Launch App
            </button>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="rounded-xl bg-[#303443] p-2 flex items-center justify-center text-[#dee2f5] lg:hidden cursor-pointer transition-colors active:scale-95">
            <span className="material-symbols-outlined">{isMobileMenuOpen ? "close" : "menu"}</span>
          </button>
        </div>
        {isMobileMenuOpen && (
          <div className="absolute top-[100%] left-0 w-full bg-[#020617] border-b border-[#434653]/30 px-8 py-6 flex flex-col gap-2 lg:hidden shadow-2xl">
            <button onClick={() => navigate("/markets")} className="text-left font-medium text-slate-300 py-3 border-b border-[#434653]/20">Markets</button>
            <button onClick={() => navigate("/analysis")} className="text-left font-medium text-slate-300 py-3 border-b border-[#434653]/20">Signals</button>
            <button onClick={() => navigate("/quant-lab")} className="text-left font-medium text-slate-300 py-3 border-b border-[#434653]/20">Analytics</button>
            <button onClick={() => navigate("/pricing")} className="text-left font-medium text-slate-300 py-3 border-b border-[#434653]/20">Pricing</button>
            <button onClick={() => navigate("/auth")} className="text-left font-medium text-slate-300 py-3 border-b border-[#434653]/20">Login</button>
            <button onClick={() => navigate("/markets")} className="mt-4 rounded-xl bg-[#1a4db8] px-6 py-3 font-bold text-[#b8c8ff] text-center shadow-lg">Launch App</button>
          </div>
        )}
      </nav>

      <section className="mx-auto mt-10 grid max-w-[128rem] grid-cols-1 items-center gap-12 overflow-hidden px-8 pb-20 pt-32 lg:grid-cols-2 lg:px-32">
        <div className="z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#434653]/30 bg-[#252a38] px-3 py-1 font-mono text-xs text-[#b3c5ff]">
            <span className="material-symbols-outlined text-[14px]">
              verified
            </span>
            Powered by Gemini AI + Bayse Markets API
          </div>
          <h1 className="mb-6 max-w-[58.4rem] font-headline text-6xl font-bold leading-[1.1] tracking-tight md:text-7xl">
            <TadaText />
          </h1>
          <p className="mb-10 max-w-[57.6rem] text-xl leading-relaxed text-[#c3c6d5]">
            Find hidden opportunities in prediction markets using smart math and
            AI tools.
          </p>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => navigate("/auth", { state: { isSignUp: true } })}
              className="cursor-pointer flex items-center gap-2 rounded-xl bg-[#1a4db8] px-8 py-4 text-lg font-bold text-[#b8c8ff] shadow-[0_8px_32px_0_rgba(26,77,184,0.3)] transition-all hover:brightness-110 active:scale-95"
            >
              Start Trading Smarter <span>→</span>
            </button>
            <button
              onClick={() => navigate("/quant-lab")}
              className="cursor-pointer rounded-xl border border-[#434653] px-8 py-4 text-lg font-bold transition-colors hover:bg-[#1a1f2d]"
            >
              See How It Works
            </button>
          </div>
        </div>

        <div className="relative mt-12 lg:mt-0">
          <div className="absolute left-[9.95rem] top-[4.57rem] h-[31.25rem] w-[31.25rem] rounded-[1.2rem] bg-[#b3c5ff]/10 blur-3xl" />
          <div className="relative origin-bottom-right rotate-3 scale-110 rounded-2xl border border-[#434653]/20 bg-[#090e1b] p-6 shadow-2xl">
            <div className="mb-6 flex gap-1.5">
              <div className="h-3 w-3 rounded-full border border-red-500/50 bg-red-500/20" />
              <div className="h-3 w-3 rounded-full border border-yellow-500/50 bg-yellow-500/20" />
              <div className="h-3 w-3 rounded-full border border-green-500/50 bg-green-500/20" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border-l-4 border-[#7cd9ac] bg-[#1a1f2d] p-4">
                <div>
                  <p className="font-mono text-xs text-[#c3c6d5]">
                    BTC/USD PRICE
                  </p>
                  <p className="font-headline text-lg font-bold">BTC BUY</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xl font-bold text-[#7cd9ac]">
                    +23
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[#c3c6d5]">
                    Edge Score
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl border-l-4 border-[#7cd9ac] bg-[#1a1f2d] p-4">
                <div>
                  <p className="font-mono text-xs text-[#c3c6d5]">ETH 24H</p>
                  <p className="font-headline text-lg font-bold">ETH BUY</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xl font-bold text-[#7cd9ac]">
                    +22
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[#c3c6d5]">
                    Edge Score
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl border-l-4 border-[#f0a500] bg-[#1a1f2d] p-4">
                <div>
                  <p className="font-mono text-xs text-[#c3c6d5]">
                    US INFLATION DATA
                  </p>
                  <p className="font-headline text-lg font-bold">WAIT</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xl font-bold text-[#f0a500]">
                    +8
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[#c3c6d5]">
                    Edge Score
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl border-l-4 border-[#ffb4ab] bg-[#1a1f2d] p-4">
                <div>
                  <p className="font-mono text-xs text-[#c3c6d5]">
                    USD/NGN FOREX
                  </p>
                  <p className="font-headline text-lg font-bold">AVOID</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xl font-bold text-[#ffb4ab]">
                    -24
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[#c3c6d5]">
                    Edge Score
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full border-y border-[#434653]/10 bg-[#090e1b]">
        <div className="mx-auto flex max-w-[128rem] flex-wrap items-center justify-between gap-8 px-8 py-10 lg:px-32">
          <div>
            <p className="font-mono text-xs uppercase tracking-tighter text-[#c3c6d5]">
              Active Markets
            </p>
            <p className="font-headline text-3xl font-bold">47</p>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-tighter text-[#c3c6d5]">
              Live Signals
            </p>
            <p className="font-headline text-3xl font-bold text-[#f0a500]">6</p>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-tighter text-[#c3c6d5]">
              Avg Edge Score
            </p>
            <p className="font-headline text-3xl font-bold text-[#7cd9ac]">
              +23 pts
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-[#1a1f2d]">
              <span className="material-symbols-outlined text-[#1a4db8]">
                api
              </span>
            </div>
            <p className="font-headline text-xl font-bold">
              Built on Bayse API
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[128rem] px-8 py-24 lg:px-32">
        <h2 className="mx-auto mb-20 max-w-[67.2rem] text-center font-headline text-4xl font-bold text-[#b3c5ff] md:text-5xl">
          From raw market data to a trade decision. In seconds.
        </h2>
        <div className="relative mb-16 grid gap-6 md:grid-cols-4">
          <div className="absolute left-[15%] right-[15%] top-12 -z-10 hidden h-[2px] bg-gradient-to-r from-transparent via-[#434653]/30 to-transparent md:block" />
          {steps.map((step) => (
            <div
              key={step.title}
              className="flex flex-col items-center rounded-xl border border-[#434653]/10 bg-[#1a1f2d] p-8 text-center"
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[1.2rem] bg-[#252a38]">
                <span
                  className={`material-symbols-outlined text-3xl ${step.color}`}
                  style={{
                    fontVariationSettings: step.fill ? "'FILL' 1" : "'FILL' 0",
                  }}
                >
                  {step.icon}
                </span>
              </div>
              <h3 className="mb-2 font-headline text-lg font-bold">
                {step.title}
              </h3>
              <p className="text-sm text-[#c3c6d5]">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto max-w-[76.8rem] rounded-xl border border-[#434653]/20 bg-[#161b29] p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-mono text-xs uppercase tracking-widest text-[#c3c6d5]">
              Live Sample Output
            </p>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7cd9ac] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#7cd9ac]" />
              </span>
              <p className="font-mono text-xs text-[#7cd9ac]">CALIBRATED</p>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-6 md:flex-row">
            <div>
              <h4 className="mb-1 font-headline text-xl font-bold">
                BTC/USD &gt; $105K by Dec 31
              </h4>
              <p className="text-sm text-[#c3c6d5]">
                Confidence: 84% | Market Price: 62c | Fair Value: 79c
              </p>
            </div>
            <div className="flex flex-col items-end">
              <p className="font-mono text-2xl font-bold text-[#f0a500]">
                +27.4% EDGE
              </p>
              <span className="rounded bg-[#7cd9ac]/10 px-2 py-0.5 font-mono text-[10px] text-[#7cd9ac]">
                STRONG BUY
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[128rem] px-8 pb-24 lg:px-32">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="group overflow-hidden rounded-xl bg-[#161b29] transition-transform hover:-translate-y-1">
            <div className="flex h-full flex-col p-8">
              <h3 className="mb-4 font-headline text-2xl font-bold">
                Signal Feed
              </h3>
              <p className="mb-10 flex-grow text-[#c3c6d5]">
                A continuous stream of weighted opportunities across all
                prediction assets.
              </p>
              <div className="relative h-40">
                <div className="absolute left-0 top-0 w-full rounded-xl border border-[#434653]/20 bg-[#1a1f2d] p-4 shadow-xl transition-transform group-hover:-translate-y-2">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-mono text-[10px]">NASDAQ ATH</p>
                    <p className="font-mono text-[#7cd9ac]">+12</p>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#252a38]">
                    <div className="h-full w-[70%] rounded-full bg-[#7cd9ac]" />
                  </div>
                </div>
                <div className="absolute left-4 top-8 w-full rounded-xl border border-[#434653]/20 bg-[#1a1f2d] p-4 opacity-60 shadow-xl">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-mono text-[10px]">FED RATE CUT</p>
                    <p className="font-mono text-[#f0a500]">+4</p>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#252a38]">
                    <div className="h-full w-[40%] rounded-full bg-[#f0a500]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="group overflow-hidden rounded-xl border-t-4 border-[#b3c5ff] bg-[#161b29] transition-transform hover:-translate-y-1">
            <div className="flex h-full flex-col p-8">
              <h3 className="mb-4 font-headline text-2xl font-bold">
                Advanced Data View
              </h3>
              <p className="mb-10 flex-grow text-[#c3c6d5]">
                See the numbers yourself. View market depth and read exactly why
                our AI sent the alert.
              </p>
              <div className="rounded-xl border border-[#434653]/20 bg-[#1a1f2d] p-4">
                <div className="mb-4 flex h-20 items-end gap-1">
                  <div className="h-[30%] w-full bg-[#b3c5ff]/20" />
                  <div className="h-[50%] w-full bg-[#b3c5ff]/20" />
                  <div className="h-[80%] w-full bg-[#b3c5ff]" />
                  <div className="h-[60%] w-full bg-[#b3c5ff]/20" />
                  <div className="h-[45%] w-full bg-[#b3c5ff]/20" />
                  <div className="h-[35%] w-full bg-[#b3c5ff]/20" />
                </div>
                <div className="flex justify-between font-mono text-[8px] uppercase text-[#c3c6d5]">
                  <span>Analysis Active</span>
                  <span>98.2% Accuracy</span>
                </div>
              </div>
            </div>
          </div>

          <div className="group overflow-hidden rounded-xl bg-[#161b29] transition-transform hover:-translate-y-1">
            <div className="flex h-full flex-col p-8">
              <h3 className="mb-4 font-headline text-2xl font-bold">
                Strategy Backtester
              </h3>
              <p className="mb-10 flex-grow text-[#c3c6d5]">
                Validate your edge. Test signals against historical market
                performance with one click.
              </p>
              <div className="flex flex-col items-center justify-center rounded-xl border border-[#434653]/20 bg-[#1a1f2d] p-4">
                <p className="mb-1 font-mono text-3xl font-bold text-[#7cd9ac]">
                  74.2%
                </p>
                <p className="mb-4 font-mono text-[10px] uppercase text-[#c3c6d5]">
                  WIN RATE
                </p>
                <div className="h-1 w-full rounded-full bg-[#252a38]">
                  <div className="h-full w-[74%] rounded-full bg-[#7cd9ac]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-[128rem] overflow-hidden px-8 py-24 text-center lg:px-32 md:py-32">
        <div className="absolute inset-0 -z-10 rounded-3xl bg-[#b3c5ff]/5" />
        <h2 className="mb-10 font-headline text-5xl font-bold leading-tight md:text-6xl">
          Stop guessing. Start trading with{" "}
          <span className="text-[#f0a500]">edge</span>.
        </h2>
        <div className="mb-12 flex flex-col items-center justify-center gap-6 md:flex-row">
          <button
            onClick={() => navigate("/auth", { state: { isSignUp: true } })}
            className="cursor-pointer flex items-center gap-2 rounded-xl bg-[#1a4db8] px-10 py-5 text-xl font-bold text-[#b8c8ff] shadow-xl transition-all hover:brightness-110 active:scale-95"
          >
            Create Your Account <span>→</span>
          </button>
          <button
            onClick={() => navigate("/auth")}
            className="cursor-pointer rounded-xl border border-[#434653] px-10 py-5 text-xl font-bold transition-colors hover:bg-[#1a1f2d]"
          >
            Sign In
          </button>
        </div>
        <div className="flex flex-wrap justify-center gap-8 font-mono text-sm text-[#c3c6d5]/60">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">
              verified
            </span>
            Free during beta
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">
              settings_input_component
            </span>
            Bayse API integrated
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">bolt</span>
            Powered by Gemini AI
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 bg-[#090e1b] py-12">
        <div className="mx-auto grid max-w-[128rem] grid-cols-2 items-center gap-8 px-8 md:flex md:justify-between lg:px-32">
          <div className="col-span-2 flex items-center gap-2 md:col-span-1">
            <span
              className="material-symbols-outlined text-xl text-[#b3c5ff]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              bolt
            </span>
            <span className="font-headline text-lg font-bold text-[#b3c5ff]">
              EdgeIQ
            </span>
          </div>
          <p className="hidden font-mono text-xs text-slate-500 md:block">
            © 2026 EdgeIQ Technologies. Quantitative Precision.
          </p>
          <div className="col-span-2 flex items-center gap-6 md:col-span-1">
            <a
              href="#"
              className="font-mono text-sm text-slate-500 transition-transform hover:translate-x-1 hover:text-[#b3c5ff]"
            >
              API Docs
            </a>
            <a
              href="#"
              className="font-mono text-sm text-slate-500 transition-transform hover:translate-x-1 hover:text-[#b3c5ff]"
            >
              Bayse Markets
            </a>
            <a
              href="#"
              className="font-mono text-sm text-slate-500 transition-transform hover:translate-x-1 hover:text-[#b3c5ff]"
            >
              Twitter
            </a>
            <a
              href="#"
              className="font-mono text-sm text-slate-500 transition-transform hover:translate-x-1 hover:text-[#b3c5ff]"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default LandingPage;
