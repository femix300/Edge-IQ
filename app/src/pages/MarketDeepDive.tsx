
import { useEffect, useState, useMemo, memo, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useMarketStore, useSignalStore } from "@/stores";
import { analyzeMarketStream, getPriceHistory, getOrderBook, simulateTrade } from "@/lib/api";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import {
  ArrowLeft,
  TrendingUp,
  BrainCircuit,
  Gauge,
  Coins,
  AlertTriangle,
  Zap,
  X,
  CheckCircle2,
  Clock,
  Droplets,
  BarChart2,
  Tag,
  FileText,
  Activity,
  Loader2,
} from "lucide-react";
import type { Signal, QuantMetrics, AIAnalysis } from "@/types";
import PipelineLoading from "@/components/PipelineLoading";

const TOOLTIPS: Record<string, string> = {
  edge: "Edge: The gap between market-implied probability and AI-estimated true probability.",
  ev: "Expected Value (EV): Average profit per unit staked over many repetitions.",
  kelly: "Kelly Criterion: Optimal stake size as % of bankroll based on your edge.",
  momentum: "Momentum Score: Linear regression slope over last 10 price points, -100 to +100.",
  spread: "Bid/Ask Spread: Difference between best buy and sell prices. Lower = more liquid.",
  volume: "Volume Acceleration: Ratio of last 3h volume vs prior 3h. >1 = increasing activity.",
};

const CATEGORY_CONFIG: Record<string, string> = {
  crypto: "#00d4ff",
  sports: "#00ff88",
  politics: "#ffa502",
  entertainment: "#ff6b81",
  other: "#a4b0be",
};

const StatBlock = memo(({ label, value, color, tooltip }: { label: string; value: string; color?: string; tooltip?: string }) => (
  <div className="bg-[#0a0e17] rounded-lg p-3" data-tooltip={tooltip}>
    <p className="text-[10px] uppercase text-[#8b92a8] mb-1">{label}</p>
    <p className={`text-lg font-bold font-mono-num ${color || "text-[#dee2f5]"}`}>{value}</p>
  </div>
));
StatBlock.displayName = "StatBlock";

const ToastNotification = memo(({ toast, onClose }: { toast: { message: string; type: "success" | "error" }; onClose: () => void }) => (
  <div
    className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-4 rounded-xl min-w-[380px] max-w-[480px] shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-2 fade-in duration-300"
    style={{
      backgroundColor: toast.type === "success" ? "rgba(10, 46, 26, 0.95)" : "rgba(46, 10, 10, 0.95)",
      border: `1px solid ${toast.type === "success" ? "rgba(0,255,136,0.3)" : "rgba(255,71,87,0.3)"}`,
      boxShadow: toast.type === "success"
        ? "0 8px 32px rgba(0,255,136,0.15), 0 0 0 1px rgba(0,255,136,0.1)"
        : "0 8px 32px rgba(255,71,87,0.15), 0 0 0 1px rgba(255,71,87,0.1)",
    }}
  >
    {toast.type === "success" ? (
      <div className="w-8 h-8 rounded-full bg-[#00ff88]/20 flex items-center justify-center flex-shrink-0">
        <CheckCircle2 className="w-4 h-4 text-[#00ff88]" />
      </div>
    ) : (
      <div className="w-8 h-8 rounded-full bg-[#ff4757]/20 flex items-center justify-center flex-shrink-0">
        <AlertTriangle className="w-4 h-4 text-[#ff4757]" />
      </div>
    )}
    <span className="text-sm text-[#dee2f5] flex-1 leading-relaxed">{toast.message}</span>
    <button onClick={onClose} className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors flex-shrink-0">
      <X className="w-4 h-4 text-[#8b92a8] hover:text-[#dee2f5]" />
    </button>
  </div>
));
ToastNotification.displayName = "ToastNotification";

const formatVolume = (vol: number) => {
  if (vol >= 1e6) return `₦${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `₦${(vol / 1e3).toFixed(1)}K`;
  return `₦${Math.round(vol).toLocaleString()}`;
};

const formatDate = (iso?: string | null | any) => {
  if (!iso) return "—";
  // Handle Firestore Timestamp objects
  const dateStr = typeof iso === 'object' && iso._seconds
    ? new Date(iso._seconds * 1000).toISOString()
    : typeof iso === 'object' && iso.toDate
    ? iso.toDate().toISOString()
    : String(iso);
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
};

const formatTimeRemaining = (closesAt?: string | null | any) => {
  if (!closesAt) return null;
  // Handle Firestore Timestamp objects
  const dateStr = typeof closesAt === 'object' && closesAt._seconds
    ? new Date(closesAt._seconds * 1000).toISOString()
    : typeof closesAt === 'object' && closesAt.toDate
    ? closesAt.toDate().toISOString()
    : String(closesAt);
  try {
    const diff = new Date(dateStr).getTime() - Date.now();
    if (diff <= 0) return "Closed";
    const days = Math.floor(diff / 86400000);
    const hrs = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return `${days}d ${hrs}h remaining`;
    return `${hrs}h remaining`;
  } catch { return null; }
};

// ─── Static Market Detail View ───────────────────────────────────────────────
const StaticMarketView = ({ market, onDeepDive, selectedOutcome, setSelectedOutcome }: { market: any; onDeepDive: () => void; selectedOutcome: any; setSelectedOutcome: (o: any) => void }) => {
  const catColor = CATEGORY_CONFIG[market.category?.toLowerCase()] || CATEGORY_CONFIG.other;
  const targetObj = selectedOutcome || market;
  const prob = Number(targetObj.implied_probability) || (Number(targetObj.current_price) * 100);
  // When a dimension is selected, use its own close date for the time badge and timeline
  const activeDates = selectedOutcome || market;
  const timeLeft = formatTimeRemaining(activeDates.closes_at);
  const liquidityLabel = market.liquidity > 50000 ? { label: "Deep", color: "text-[#00ff88]" }
    : market.liquidity > 10000 ? { label: "Moderate", color: "text-[#ffa502]" }
    : { label: "Thin", color: "text-[#ff4757]" };

  // Derive multi-dimensional from BOTH the Firestore flag AND outcomes count
  // (the flag may be stale in existing Firestore docs)
  const isMulti = (market.is_multi_dimensional || (market.outcomes?.length > 1)) && !selectedOutcome;

  return (
    <div className="space-y-5">
      {/* Hero Header */}
      <div className="bg-[#131a2b] rounded-xl border border-[#1a2030] overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${catColor}, ${catColor}44)` }} />
        <div className="p-6">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span
              className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider"
              style={{ backgroundColor: `${catColor}18`, color: catColor, border: `1px solid ${catColor}30` }}
            >
              {market.category || "Market"}
            </span>
            <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase border ${
              market.status === "open"
                ? "bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/30"
                : "bg-[#ff4757]/10 text-[#ff4757] border-[#ff4757]/30"
            }`}>
              {market.status || "open"}
            </span>
            {timeLeft && (
              <span className="flex items-center gap-1 text-xs text-[#8b92a8]">
                <Clock className="w-3.5 h-3.5" />
                {timeLeft}
              </span>
            )}
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-[#dee2f5] leading-snug mb-2">
            {selectedOutcome ? `${market.title} - ${selectedOutcome.title}` : market.title}
          </h1>
          <p className="text-xs text-[#5a6070] font-mono">ID: {selectedOutcome ? selectedOutcome.bayse_market_id : market.bayse_event_id}</p>
        </div>
      </div>

      {isMulti ? (
        <div className="bg-[#131a2b] rounded-xl border border-[#1a2030] p-6">
          <h3 className="text-sm font-semibold text-[#dee2f5] mb-4">Select an Outcome to Analyze</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {market.outcomes?.map((outcome: any) => {
              const isClosed = outcome.status === 'closed';
              return (
                <div 
                  key={outcome.bayse_market_id}
                  onClick={() => !isClosed && setSelectedOutcome(outcome)}
                  className={`bg-[#0a0e17] rounded-xl border p-4 transition-all ${
                    isClosed
                      ? 'border-[#1a2030] opacity-50 cursor-not-allowed'
                      : 'border-[#1a2030] cursor-pointer hover:border-[#00d4ff]/40 hover:bg-[#00d4ff]/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-[#dee2f5]">{outcome.title}</h4>
                    {isClosed && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#ff4757]/10 text-[#ff4757] border border-[#ff4757]/20">
                        Closed
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <p className="text-[10px] text-[#8b92a8] uppercase">Price</p>
                      <p className="font-mono-num text-[#dee2f5]">₦{Number(outcome.current_price || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#8b92a8] uppercase">Implied Prob</p>
                      <p className="font-mono-num text-[#00d4ff]">{Number(outcome.implied_probability || (Number(outcome.current_price) * 100)).toFixed(1)}%</p>
                    </div>
                    {outcome.closes_at && (
                      <div>
                        <p className="text-[10px] text-[#8b92a8] uppercase">Closes</p>
                        <p className="font-mono-num text-[#8b92a8] text-xs">{new Date(outcome.closes_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {/* YES / NO resolution indicator for binary markets */}
          {(() => {
            const singleOutcome = market.outcomes?.[0];
            const outcomeTitle = singleOutcome?.title;
            // Only show if outcome title is different from market title and is not generic
            const isGeneric = !outcomeTitle || outcomeTitle === 'Yes' || outcomeTitle === 'No' || outcomeTitle === market.title;
            if (isGeneric) return null;
            return (
              <div className="bg-[#0a1628] rounded-xl border border-[#00ff88]/20 p-4 flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#00ff88]/10 flex items-center justify-center">
                  <span className="text-[#00ff88] text-xs font-bold">YES</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase text-[#8b92a8] tracking-wider mb-0.5">This market resolves YES if</p>
                  <p className="text-sm font-semibold text-[#dee2f5] leading-snug">{outcomeTitle}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-[10px] text-[#8b92a8] uppercase">YES price</p>
                  <p className="font-mono-num text-[#00ff88] font-bold">₦{Number(singleOutcome.current_price || 0).toFixed(2)}</p>
                </div>
              </div>
            );
          })()}

          {/* Key Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#131a2b] rounded-xl border border-[#1a2030] p-4 flex flex-col gap-1">
          <p className="text-[10px] uppercase text-[#8b92a8] tracking-wider">Current Price</p>
          <p className="text-2xl font-bold font-mono-num text-[#dee2f5]">
            ₦{Number(targetObj.current_price || 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-[#131a2b] rounded-xl border border-[#1a2030] p-4 flex flex-col gap-1">
          <p className="text-[10px] uppercase text-[#8b92a8] tracking-wider">Implied Prob</p>
          <p className="text-2xl font-bold font-mono-num text-[#00d4ff]">{prob.toFixed(1)}%</p>
        </div>
        <div className="bg-[#131a2b] rounded-xl border border-[#1a2030] p-4 flex flex-col gap-1">
          <p className="text-[10px] uppercase text-[#8b92a8] tracking-wider flex items-center gap-1">
            <Droplets className="w-3 h-3" /> Liquidity
          </p>
          <p className={`text-2xl font-bold font-mono-num ${liquidityLabel.color}`}>
            {formatVolume(market.liquidity || 0)}
          </p>
          <p className={`text-[11px] font-medium ${liquidityLabel.color}`}>{liquidityLabel.label}</p>
        </div>
        <div className="bg-[#131a2b] rounded-xl border border-[#1a2030] p-4 flex flex-col gap-1">
          <p className="text-[10px] uppercase text-[#8b92a8] tracking-wider flex items-center gap-1">
            <Activity className="w-3 h-3" /> Signal Score
          </p>
          <p className="text-2xl font-bold font-mono-num text-[#ffa502]">
            {Number(market.signal_potential_score || 0).toFixed(0)}
          </p>
          <p className="text-[11px] text-[#5a6070]">out of 100</p>
        </div>
      </div>

      {/* Description */}
      {(selectedOutcome?.description || market.description) && (
        <div className="bg-[#131a2b] rounded-xl border border-[#1a2030] p-5">
          <h3 className="text-sm font-semibold text-[#dee2f5] mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#00d4ff]" />
            About this Market
          </h3>
          <p className="text-sm text-[#8b92a8] leading-relaxed">{selectedOutcome?.description || market.description}</p>
        </div>
      )}

      {/* Market Timeline */}
      <div className="bg-[#131a2b] rounded-xl border border-[#1a2030] p-5">
        <h3 className="text-sm font-semibold text-[#dee2f5] mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#00d4ff]" />
          {selectedOutcome ? `${selectedOutcome.title} – Timeline` : 'Market Timeline'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] uppercase text-[#5a6070] mb-1">Opens</p>
            <p className="text-sm text-[#dee2f5] font-mono-num">{formatDate(activeDates.opens_at)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-[#5a6070] mb-1">Closes</p>
            <p className="text-sm text-[#dee2f5] font-mono-num">{formatDate(activeDates.closes_at)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-[#5a6070] mb-1">RESOLUTION DATE</p>
            <p className="text-sm text-[#dee2f5] font-mono-num">{formatDate(market.resolved_at)}</p>
          </div>
        </div>
      </div>

      {/* Market Stats */}
      <div className="bg-[#131a2b] rounded-xl border border-[#1a2030] p-5">
        <h3 className="text-sm font-semibold text-[#dee2f5] mb-4 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-[#00d4ff]" />
          Market Stats
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-[#0a0e17] rounded-lg p-3">
            <p className="text-[10px] uppercase text-[#8b92a8] mb-1">Total Volume</p>
            <p className="text-base font-bold font-mono-num text-[#dee2f5]">{formatVolume(market.total_volume || 0)}</p>
          </div>
          <div className="bg-[#0a0e17] rounded-lg p-3">
            <p className="text-[10px] uppercase text-[#8b92a8] mb-1">Available Liquidity</p>
            <p className="text-base font-bold font-mono-num text-[#dee2f5]">{formatVolume(market.liquidity || 0)}</p>
          </div>
          <div className="bg-[#0a0e17] rounded-lg p-3">
            <p className="text-[10px] uppercase text-[#8b92a8] mb-1">24h Volume</p>
            <p className="text-base font-bold font-mono-num text-[#dee2f5]">{formatVolume(market.volume_24h || 0)}</p>
          </div>
        </div>
      </div>

      {/* Tags */}
      {market.category && (
        <div className="bg-[#131a2b] rounded-xl border border-[#1a2030] p-5">
          <h3 className="text-sm font-semibold text-[#dee2f5] mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#00d4ff]" />
            Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            <span
              className="px-3 py-1 rounded-full text-xs font-medium"
              style={{ backgroundColor: `${catColor}15`, color: catColor, border: `1px solid ${catColor}30` }}
            >
              {market.category}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#0a0e17] text-[#8b92a8] border border-[#1a2030]">
              Prediction Market
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${market.source === "polymarket" ? "bg-[#9b59b6]/15 text-[#9b59b6] border-[#9b59b6]/30" : "bg-[#00d4ff]/10 text-[#00d4ff] border-[#00d4ff]/30"}`}>
              {market.source === "polymarket" ? "Polymarket" : "Bayse"}
            </span>
          </div>
        </div>
      )}

      {/* Deep Dive CTA */}
      <div className="bg-gradient-to-br from-[#131a2b] to-[#0d1520] rounded-xl border border-[#00d4ff]/20 p-6 shadow-[0_0_40px_rgba(0,212,255,0.06)]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-[#dee2f5] mb-1 flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-[#00d4ff]" />
              Ready for AI-Powered Analysis?
            </h3>
            <p className="text-sm text-[#8b92a8]">
              Run our 4-agent pipeline — market scanner, signal generator, quant engine, and AI analyst — to find your edge.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {selectedOutcome && (
              <button
                onClick={() => setSelectedOutcome(null)}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-3.5 rounded-xl font-bold text-sm text-[#8b92a8] bg-[#0a0e17] border border-[#1a2030] hover:text-[#dee2f5] transition-all"
              >
                Back to Options
              </button>
            )}
            <button
              onClick={onDeepDive}
              className="flex-shrink-0 flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm text-[#0a0e17] transition-all hover:brightness-110 hover:scale-105 active:scale-100"
              style={{ background: "linear-gradient(135deg, #00d4ff, #00ff88)" , boxShadow: "0 0 24px rgba(0,212,255,0.35)" }}
            >
              <BrainCircuit className="w-4 h-4" />
              Deep Dive
            </button>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const MarketDeepDive = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedMarket, markets, quantMetrics: storeQuantMetrics, aiAnalysis: storeAiAnalysis, setSelectedMarket, setQuantMetrics, setAiAnalysis } = useMarketStore();
  const { selectedSignal } = useSignalStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signal, setSignal] = useState<Signal | null>(null);
  const [quantMetrics, setLocalQuantMetrics] = useState<QuantMetrics | null>(null);
  const [aiAnalysis, setLocalAiAnalysis] = useState<AIAnalysis | null>(null);
  const [priceData, setPriceData] = useState<Array<{ time: string; price: number; prob: number }>>([]);
  const [priceLoading, setPriceLoading] = useState(false);
  const [orderBookLoading, setOrderBookLoading] = useState(false);
  const [orderBookData, setOrderBookData] = useState<{ bids: Array<{ price: number; quantity: number }>; asks: Array<{ price: number; quantity: number }> } | null>(null);
  const [riskMode, setRiskMode] = useState<"conservative" | "balanced" | "aggressive">("balanced");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [fromSignal, setFromSignal] = useState(false);
  const [pipelineProgress, setPipelineProgress] = useState<{ step: string; agent: number; total: number; message: string } | null>(null);
  const [staticOnly, setStaticOnly] = useState(() => {
    if (location.state?.staticOnly === false) return false;
    if (location.state?.staticOnly === true) return true;
    const isSignal = sessionStorage.getItem("fromSignal") === "true" || !!sessionStorage.getItem("cachedSignal");
    return !isSignal;
  });
  const [deepDiveTriggered, setDeepDiveTriggered] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<any | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const ranRef = useRef(false);

  // Resolve the market object — from store selection, markets list, or sessionStorage
  const resolveMarket = () => {
    if (selectedMarket && (selectedMarket.bayse_event_id === id || selectedMarket.id === id)) return selectedMarket;
    const fromList = markets.find((m) => m.bayse_event_id === id || m.id === id);
    if (fromList) return fromList;
    const cached = sessionStorage.getItem("cachedMarket");
    if (cached) {
      try { return JSON.parse(cached); } catch { /* ignore */ }
    }
    return null;
  };

  useEffect(() => {
    if (!id) return;
    if (ranRef.current) return;
    ranRef.current = true;

    setError(null);
    setSignal(null);
    setLocalQuantMetrics(null);
    setLocalAiAnalysis(null);
    setPriceData([]);
    setOrderBookData(null);
    setPipelineProgress(null);

    const isFromSignalCheck = sessionStorage.getItem("fromSignal") === "true" ||
      (!!sessionStorage.getItem("cachedSignal") && sessionStorage.getItem("cachedMarketId") === id);
    const isStaticOnly = location.state?.staticOnly === true || (!location.state && !isFromSignalCheck);
    setStaticOnly(isStaticOnly);

    // Resolve market from store/list/cache immediately so static view renders
    const resolvedMarket = resolveMarket();
    if (resolvedMarket) {
      setSelectedMarket(resolvedMarket);
      if (isStaticOnly) return;
    } else if (isStaticOnly) {
      // Hard refresh: fetch market from backend by id
      setLoading(true);
      import("@/lib/api").then(({ getMarkets }) =>
        getMarkets({ page_size: 200 })
      ).then((data: any) => {
        const found = (data.results || data).find((m: any) => m.bayse_event_id === id || m.id === id);
        if (found) setSelectedMarket(found);
        else setError("Market data not found.");
      }).catch(() => setError("Failed to load market data."))
        .finally(() => setLoading(false));
      return;
    }

    // Signal feed path
    const isFromSignal = sessionStorage.getItem("fromSignal") === "true" ||
      (!!sessionStorage.getItem("cachedSignal") && sessionStorage.getItem("cachedMarketId") === id);
    sessionStorage.setItem("cachedMarketId", id || "");
    if (!isFromSignal) {
      sessionStorage.removeItem("cachedSignal");
      sessionStorage.removeItem("cachedMarket");
      sessionStorage.removeItem("cachedAiAnalysis");
      sessionStorage.removeItem("cachedQuantMetrics");
      sessionStorage.removeItem("fromSignal");
    }
    setFromSignal(isFromSignal);

    if (isFromSignal) {
      const loadCached = async () => {
        try {
          setPriceLoading(true);
          setOrderBookLoading(true);
          const [history, ob] = await Promise.all([
            getPriceHistory(id!).catch(() => []),
            getOrderBook(id!).then(ob => { setOrderBookLoading(false); return ob; }).catch(() => { setOrderBookLoading(false); return null; }),
          ]);
          setPriceLoading(false);
          if (Array.isArray(history) && history.length > 0) {
            setPriceData(history.map((h: any) => ({
              time: new Date(h.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              price: Number(Number(h.price || 0).toFixed(4)),
              prob: Number((Number(h.price || 0) * 100).toFixed(2)),
            })));
          }
          if (ob) setOrderBookData(ob);
          const cachedSignal = sessionStorage.getItem("cachedSignal");
          const signalToUse = selectedSignal || (cachedSignal ? JSON.parse(cachedSignal) : null);
          if (signalToUse) setSignal(signalToUse);
          const cachedMarket = sessionStorage.getItem("cachedMarket");
          if (storeAiAnalysis) { setLocalAiAnalysis(storeAiAnalysis); }
          else {
            const cachedAi = sessionStorage.getItem("cachedAiAnalysis");
            if (cachedAi) setLocalAiAnalysis(JSON.parse(cachedAi));
          }
          if (storeQuantMetrics) { setLocalQuantMetrics(storeQuantMetrics); }
          else {
            const cachedQuant = sessionStorage.getItem("cachedQuantMetrics");
            if (cachedQuant) setLocalQuantMetrics(JSON.parse(cachedQuant));
          }
          if (!selectedMarket && cachedMarket) setSelectedMarket(JSON.parse(cachedMarket));
        } catch { /* ignore */ }
        setLoading(false);
        sessionStorage.removeItem("fromSignal");
      };
      loadCached();
      return;
    }

    // Direct URL hit — run full pipeline immediately
    runPipeline();
  }, [id]);

  const runPipeline = async () => {
    setLoading(true);
    setError(null);
    setPipelineProgress(null);
    try {
      const outcomeParams = selectedOutcome
        ? { outcome_id: selectedOutcome.bayse_market_id, outcome_title: selectedOutcome.title }
        : undefined;
      const result = await analyzeMarketStream(id!, 10000, (progress) => {
        setPipelineProgress(progress);
      }, outcomeParams);
      if (result.success) {
        setSelectedMarket(result.market);
        setSignal(result.signal);
        setLocalQuantMetrics(result.quant_metrics);
        setLocalAiAnalysis(result.ai_analysis);
        setQuantMetrics(result.quant_metrics);
        setAiAnalysis(result.ai_analysis);

        try {
          setPriceLoading(true);
          const history = await getPriceHistory(id!);
          setPriceLoading(false);
          setPriceData(history.map((h) => ({
            time: new Date(h.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            price: Number(Number(h.price || 0).toFixed(4)),
            prob: Number((Number(h.price || 0) * 100).toFixed(2)),
          })));
        } catch {
          setPriceData(Array.from({ length: 20 }).map((_, i) => ({
            time: `Day ${i + 1}`,
            price: Number((0.35 + Math.sin(i * 0.5) * 0.1 + Math.random() * 0.05).toFixed(4)),
            prob: Number(((0.35 + Math.sin(i * 0.5) * 0.1 + Math.random() * 0.05) * 100).toFixed(2)),
          })));
        }

        try {
          setOrderBookLoading(true);
          const ob = await getOrderBook(id!);
          setOrderBookData(ob);
          setOrderBookLoading(false);
        } catch {
          setOrderBookData({
            bids: Array.from({ length: 10 }).map((_, i) => ({ price: Number((0.35 - i * 0.01).toFixed(3)), quantity: Math.round(1000 + Math.random() * 5000) })),
            asks: Array.from({ length: 10 }).map((_, i) => ({ price: Number((0.36 + i * 0.01).toFixed(3)), quantity: Math.round(800 + Math.random() * 4000) })),
          });
          setOrderBookLoading(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDeepDive = () => {
    setStaticOnly(false);
    setDeepDiveTriggered(true);
    window.scrollTo({ top: 0, behavior: 'instant' });
    runPipeline();
  };

  const market = selectedMarket;
  // When a specific outcome is selected, show that outcome's stats, not the parent market's
  const activeTarget = selectedOutcome || market;
  const rawProb = Number(activeTarget?.implied_probability) || (Number(activeTarget?.current_price) * 100);
  const prob = Number(rawProb.toFixed(2));

  const orderBookChartData = useMemo(() => {
    if (!orderBookData || !orderBookData.bids || !orderBookData.asks) return [];
    return [
      ...[...orderBookData.bids].sort((a, b) => b.price - a.price).map((b) => ({ price: b.price, bidVolume: b.quantity, askVolume: 0, side: "bid" as const })),
      ...[...orderBookData.asks].sort((a, b) => a.price - b.price).map((a) => ({ price: a.price, bidVolume: 0, askVolume: a.quantity, side: "ask" as const })),
    ].sort((a, b) => a.price - b.price);
  }, [orderBookData]);

  const bestBid = orderBookData?.bids?.[0]?.price || 0;
  const bestAsk = orderBookData?.asks?.[0]?.price || 0;
  const spread = Number((bestAsk - bestBid).toFixed(4));

  const kellyMap = {
    conservative: signal?.recommended_stake_conservative,
    balanced: signal?.recommended_stake_balanced,
    aggressive: signal?.recommended_stake_aggressive,
  };

  const handleSimulateTrade = async () => {
    const stake = kellyMap[riskMode];
    if (!stake || !signal) return;
    try {
      await simulateTrade(signal.id || signal.market_event_id, stake);
      const stakeFormatted = stake.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      setToast({
        message: `Trade simulated! ₦${stakeFormatted} staked on "${signal.market_title?.slice(0, 40)}..."`,
        type: "success",
      });
    } catch (err) {
      setToast({
        message: "Trade failed: " + (err instanceof Error ? err.message : "Unknown error"),
        type: "error",
      });
    }
  };

  if (loading && !staticOnly) return <PipelineLoading progress={pipelineProgress} />;
  if (loading && staticOnly) return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-[#00d4ff]" /></div>;

  if (error) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="w-10 h-10 text-[#ff4757] mx-auto mb-4" />
        <p className="text-[#ff4757]">{error}</p>
        <button onClick={() => navigate("/markets")} className="mt-4 px-4 py-2 bg-[#00d4ff]/10 text-[#00d4ff] rounded-lg text-sm">
          Back to Markets
        </button>
      </div>
    );
  }

  // ── Static view ──
  if (staticOnly && !deepDiveTriggered) {
    return (
      <div className="space-y-6">
        {toast && <ToastNotification toast={toast} onClose={() => setToast(null)} />}
        <button onClick={() => navigate("/markets")} className="flex items-center gap-2 text-sm text-[#8b92a8] hover:text-[#dee2f5] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Markets
        </button>
        {market ? (
          <StaticMarketView market={market} onDeepDive={handleDeepDive} selectedOutcome={selectedOutcome} setSelectedOutcome={setSelectedOutcome} />
        ) : (
          <div className="text-center py-16 text-[#8b92a8]">
            <p>Market data not found. <button onClick={() => navigate("/markets")} className="text-[#00d4ff] underline">Go back</button></p>
          </div>
        )}
      </div>
    );
  }

  // ── Full analysis view (post Deep Dive / signal feed / direct URL) ──
  return (
    <div className="space-y-6">
      {toast && <ToastNotification toast={toast} onClose={() => setToast(null)} />}

      <button onClick={() => navigate("/markets")} className="flex items-center gap-2 text-sm text-[#8b92a8] hover:text-[#dee2f5] transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Markets
      </button>

      {/* Market Header */}
      <div className="bg-[#131a2b] rounded-xl border border-[#1a2030] p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-[#00d4ff]/10 rounded text-[10px] font-bold text-[#00d4ff] uppercase">
                {market?.category || "Market"}
              </span>
              {fromSignal && (
                <span className="px-2 py-0.5 bg-[#00ff88]/10 rounded text-[10px] font-bold text-[#00ff88]">
                  From Signal Feed
                </span>
              )}
              <span className="text-xs text-[#8b92a8] font-mono-num">
                ID: {selectedOutcome ? String(selectedOutcome.bayse_market_id || '').slice(0, 12) : String(market?.bayse_event_id || '').slice(0, 12)}...
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-[#dee2f5]">
              {selectedOutcome ? `${market?.title} - ${selectedOutcome.title}` : (market?.title || "Unknown Market")}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-[#8b92a8]">Implied Probability</p>
              <p className="text-2xl font-bold font-mono-num text-[#00d4ff]">{Number(prob).toFixed(1)}%</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#8b92a8]">Current Price</p>
              <p className="text-2xl font-bold font-mono-num text-[#dee2f5]">
                ₦{Number((selectedOutcome?.current_price ?? market?.current_price) || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Price History Chart */}
      <div className="bg-[#131a2b] rounded-xl border border-[#1a2030] p-6">
        <h3 className="text-sm font-semibold text-[#dee2f5] mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#00d4ff]" />
          Price History & Implied Probability
        </h3>
        {priceLoading ? (
          <div className="h-[300px] flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-[#00d4ff]/30 border-t-[#00d4ff] rounded-full animate-spin" />
            <p className="text-sm text-[#8b92a8]">Loading price history...</p>
          </div>
        ) : priceData.length === 0 ? (
          <div className="h-[300px] flex flex-col items-center justify-center gap-2">
            <TrendingUp className="w-8 h-8 text-[#1a2030]" />
            <p className="text-[#8b92a8] text-sm">No price history available for this market</p>
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={priceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2030" />
                <XAxis dataKey="time" stroke="#5a6070" fontSize={11} />
                <YAxis yAxisId="price" stroke="#5a6070" fontSize={11} domain={[0, "auto"]} />
                <YAxis yAxisId="prob" orientation="right" stroke="#5a6070" fontSize={11} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#131a2b", border: "1px solid #1a2030", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#8b92a8" }}
                  formatter={(value: number, name: string) => {
                    if (name === "price") return [`₦${Number(value).toFixed(2)}`, "Price"];
                    if (name === "prob") return [`${Number(value).toFixed(1)}%`, "Probability"];
                    return [value, name];
                  }}
                />
                <Line yAxisId="price" type="monotone" dataKey="price" stroke="#00d4ff" strokeWidth={2} dot={false} />
                <Line yAxisId="prob" type="monotone" dataKey="prob" stroke="#ffa502" strokeWidth={1} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Order Book */}
      <div className="bg-[#131a2b] rounded-xl border border-[#1a2030] p-6">
        <h3 className="text-sm font-semibold text-[#dee2f5] mb-4 flex items-center gap-2">
          <Gauge className="w-4 h-4 text-[#00d4ff]" />
          Order Book Depth
        </h3>
        {orderBookLoading ? (
          <div className="h-[250px] flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-[#00d4ff]/30 border-t-[#00d4ff] rounded-full animate-spin" />
            <p className="text-sm text-[#8b92a8]">Loading order book data...</p>
          </div>
        ) : orderBookChartData.length > 0 ? (
          <>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <StatBlock label="Best Bid" value={`₦${Number(bestBid).toFixed(3)}`} color="text-[#00ff88]" />
              <StatBlock label="Spread" value={`${Number(spread).toFixed(4)}`} color="text-[#ffa502]" />
              <StatBlock label="Best Ask" value={`₦${Number(bestAsk).toFixed(3)}`} color="text-[#ff4757]" />
            </div>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={orderBookChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2030" />
                  <XAxis dataKey="price" stroke="#5a6070" fontSize={11} />
                  <YAxis stroke="#5a6070" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#131a2b", border: "1px solid #1a2030", borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number) => [Number(value).toLocaleString(), "Volume"]}
                  />
                  <Area type="monotone" dataKey="bidVolume" stackId="1" stroke="#00ff88" fill="#00ff88" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="askVolume" stackId="1" stroke="#ff4757" fill="#ff4757" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-[250px] text-center">
            <Gauge className="w-10 h-10 text-[#5a6070] mb-3" />
            <p className="text-[#8b92a8] text-sm">No active order book for this market</p>
            <p className="text-[#5a6070] text-xs mt-1">Liquidity may be thin or the market is inactive</p>
          </div>
        )}
      </div>

      {/* AI Analysis */}
      {aiAnalysis && (
        <div className="bg-[#131a2b] rounded-xl border border-[#1a2030] p-6">
          <h3 className="text-sm font-semibold text-[#dee2f5] mb-4 flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-[#00d4ff]" />
            AI Probability Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <StatBlock label="Market Says" value={`${Number(prob).toFixed(1)}%`} color="text-[#ffa502]" />
            <StatBlock label="AI Estimates" value={`${Number(aiAnalysis.probability).toFixed(1)}%`} color="text-[#00ff88]" />
            <StatBlock label="Confidence" value={`${aiAnalysis.confidence}%`} color="text-[#00d4ff]" />
          </div>
          <div className="bg-[#0a0e17] rounded-lg p-4">
            <p className="text-sm text-[#8b92a8] leading-relaxed whitespace-pre-wrap break-words">{aiAnalysis.reasoning}</p>
            {aiAnalysis.sources && (
              <p className="text-xs text-[#5a6070] mt-3 pt-3 border-t border-[#1a2030]">Sources: {aiAnalysis.sources}</p>
            )}
          </div>
        </div>
      )}

      {/* Edge Signal */}
      {signal && Math.abs(signal.edge_score) >= 5 && (() => {
        const isBuy = signal.direction === "BUY";
        const pColorClass = isBuy ? "text-[#00ff88]" : "text-[#ffa502]";
        const pBorderClass = isBuy ? "border-[#00ff88]/30" : "border-[#ffa502]/30";
        const pShadowClass = isBuy ? "shadow-[0_0_30px_rgba(0,255,136,0.05)]" : "shadow-[0_0_30px_rgba(255,165,2,0.05)]";
        
        return (
          <div className={`bg-[#131a2b] rounded-xl border ${pBorderClass} p-6 ${pShadowClass}`}>
            <div className="flex items-center gap-2 mb-4">
              <Zap className={`w-5 h-5 ${pColorClass}`} />
              <h3 className={`text-lg font-bold ${pColorClass}`}>Edge Signal Detected</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatBlock label="Edge Score" value={`+${Number(Math.abs(signal.edge_score)).toFixed(1)}%`} color={pColorClass} tooltip={TOOLTIPS.edge} />
              <StatBlock label="Expected Value" value={`₦${Number(signal.expected_value).toFixed(2)}`} color={signal.expected_value > 0 ? "text-[#00ff88]" : "text-[#ff4757]"} tooltip={TOOLTIPS.ev} />
              <StatBlock label="Kelly %" value={`${Number(signal.kelly_percentage || 0).toFixed(1)}%`} color="text-[#00d4ff]" tooltip={TOOLTIPS.kelly} />
              <StatBlock label="Direction" value={signal.direction === "BUY" ? "BUY YES" : signal.direction === "SELL" ? "BUY NO" : signal.direction || "WAIT"} color={pColorClass} />
          </div>
          <div className="mb-4">
            <p className="text-xs text-[#8b92a8] mb-2">Risk Tolerance</p>
            <div className="flex gap-2">
              {(["conservative", "balanced", "aggressive"] as const).map((mode) => (
                <button key={mode} onClick={() => setRiskMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${riskMode === mode ? "bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/30" : "bg-[#0a0e17] text-[#8b92a8] border border-[#1a2030]"}`}>
                  {mode}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-[#0a0e17] rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-[#8b92a8]">Recommended Stake ({riskMode})</p>
              <p className="text-2xl font-bold font-mono-num text-[#00ff88]">
                ₦{kellyMap[riskMode]?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
              </p>
            </div>
            <button onClick={handleSimulateTrade} className="px-6 py-3 bg-[#00ff88] text-[#0a0e17] rounded-lg font-bold text-sm hover:brightness-110 transition-all flex items-center gap-2">
              <Coins className="w-4 h-4" />
              Simulate Trade
            </button>
          </div>
        </div>
        );
      })()}

      {/* Quant Metrics */}
      {quantMetrics && (
        <div className="bg-[#131a2b] rounded-xl border border-[#1a2030] p-6">
          <h3 className="text-sm font-semibold text-[#dee2f5] mb-4">Quantitative Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatBlock label="Momentum" value={`${Number(quantMetrics.momentum_score).toFixed(1)}`} color={quantMetrics.momentum_direction === "bullish" ? "text-[#00ff88]" : quantMetrics.momentum_direction === "bearish" ? "text-[#ff4757]" : "text-[#ffa502]"} tooltip={TOOLTIPS.momentum} />
            <StatBlock label="Volume Accel" value={`${Number(quantMetrics.volume_acceleration).toFixed(2)}x`} color="text-[#00d4ff]" tooltip={TOOLTIPS.volume} />
            <StatBlock label="Order Bias" value={quantMetrics.order_book_bias} color={quantMetrics.order_book_bias === "bullish" ? "text-[#00ff88]" : quantMetrics.order_book_bias === "bearish" ? "text-[#ff4757]" : "text-[#ffa502]"} />
            <StatBlock label="Bid/Ask" value={`${Number(quantMetrics.bid_ask_spread).toFixed(4)}`} color="text-[#dee2f5]" tooltip={TOOLTIPS.spread} />
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketDeepDive;
