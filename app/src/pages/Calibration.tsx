import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCalibrationStore } from "@/stores";
import { getCalibrationData, getAccuracyMetrics, getPredictionStats, resolvePredictions, manualResolvePrediction, unresolvePredictions } from "@/lib/api";
import { Target, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";

const Calibration = () => {
  const navigate = useNavigate();
  const { calibrationData, accuracyMetrics, loading, predStats, setCalibrationData, setAccuracyMetrics, setLoading, setLastFetched, setPredStats } = useCalibrationStore();
  const [tooltip, setTooltip] = useState<{x: number, y: number, p: any} | null>(null);
  const [resolving, setResolving] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const [syncResult, setSyncResult] = useState<{ updated: number; notResolvedYet: number; nonPoly: number } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const now = Date.now();
      const hasData = !!calibrationData && !!accuracyMetrics;

      // SWR: only show spinner if we have absolutely nothing to show yet
      if (!hasData) setLoading(true);

      // Always fetch in the background — never skip to guarantee latest data
      try {
        const [calRes, accRes, predRes] = await Promise.all([
          getCalibrationData(),
          getAccuracyMetrics(),
          getPredictionStats(),
        ]);
        if (predRes.success) setPredStats(predRes);
        if (calRes.success) {
          setCalibrationData({
            calibration_points: calRes.calibration_points,
            perfect_line: calRes.perfect_line,
            total_markets_analyzed: calRes.total_markets_analyzed,
          });
        }
        if (accRes.success) setAccuracyMetrics(accRes.metrics);
        setLastFetched(now);
      } catch { /* ignore — stale data stays visible if request fails */ }

      setLoading(false);
    };
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount — SWR: always fetch fresh, show stale instantly

  const chartData = calibrationData?.calibration_points?.map((p: any) => ({
    predicted: p.predicted,
    actual: p.actual,
    count: p.count,
    bin: p.bin,
  })) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-10 h-10 text-[#00d4ff] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#dee2f5] flex items-center gap-2">
          <Target className="w-6 h-6 text-[#00d4ff]" />
          Probability Calibration
        </h1>
        <p className="text-sm text-[#8b92a8] mt-1">
          Calibration of Polymarket crowd signals — the data source EdgeIQ's predictions are built on. EdgeIQ's own track record is tracked below.
        </p>
      </div>

      {accuracyMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#131a2b] rounded-lg p-4 border border-[#1a2030]">
            <p className="text-xs text-[#8b92a8] uppercase mb-1">Predictions</p>
            <p className="text-xl font-bold font-mono-num text-[#dee2f5]">{accuracyMetrics.total_predictions}</p>
          </div>
          <div className="bg-[#131a2b] rounded-lg p-4 border border-[#1a2030]">
            <p className="text-xs text-[#8b92a8] uppercase mb-1">Accuracy</p>
            <p className="text-xl font-bold font-mono-num text-[#00ff88]">{accuracyMetrics.accuracy}%</p>
          </div>
          <div className="bg-[#131a2b] rounded-lg p-4 border border-[#1a2030]">
            <p className="text-xs text-[#8b92a8] uppercase mb-1">Brier Score</p>
            <p className="text-xl font-bold font-mono-num text-[#00d4ff]">{accuracyMetrics.brier_score}</p>
          </div>
          <div className="bg-[#131a2b] rounded-lg p-4 border border-[#1a2030]">
            <p className="text-xs text-[#8b92a8] uppercase mb-1">Calibration Error</p>
            <p className="text-xl font-bold font-mono-num text-[#ffa502]">{accuracyMetrics.calibration_error}%</p>
          </div>
        </div>
      )}

      <div className="bg-[#131a2b] rounded-xl border border-[#1a2030] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#dee2f5]">
            Predicted Probability vs. Actual Outcome Frequency
          </h3>
          {calibrationData?.total_markets_analyzed != null && (
            <span className="text-xs text-[#8b92a8] bg-[#0a0e17] px-2 py-1 rounded">
              {calibrationData.total_markets_analyzed.toLocaleString()} markets analysed
            </span>
          )}
        </div>
        <div className="h-[400px]">
          {chartData.length > 0 ? (() => {
            const W = 560, H = 340;
            const pad = { top: 20, right: 30, bottom: 50, left: 45 };
            const iW = W - pad.left - pad.right;
            const iH = H - pad.top - pad.bottom;
            const toX = (v: number) => pad.left + (v / 100) * iW;
            const toY = (v: number) => pad.top + iH - (v / 100) * iH;
            const ticks = [0, 25, 50, 75, 100];
            return (
              <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
                {ticks.map(v => (
                  <g key={v}>
                    <line x1={toX(v)} y1={pad.top} x2={toX(v)} y2={toY(0)} stroke="#1a2030" strokeWidth="1" />
                    <line x1={pad.left} y1={toY(v)} x2={toX(100)} y2={toY(v)} stroke="#1a2030" strokeWidth="1" />
                    <text x={toX(v)} y={toY(0) + 18} textAnchor="middle" fill="#5a6070" fontSize="11">{v}</text>
                    <text x={pad.left - 8} y={toY(v) + 4} textAnchor="end" fill="#5a6070" fontSize="11">{v}</text>
                  </g>
                ))}
                <text x={W / 2} y={H - 4} textAnchor="middle" fill="#8b92a8" fontSize="12">Predicted Probability (%)</text>
                <text x={14} y={H / 2} textAnchor="middle" fill="#8b92a8" fontSize="12" transform={`rotate(-90,14,${H/2})`}>Actual Frequency (%)</text>
                <line x1={toX(0)} y1={toY(0)} x2={toX(100)} y2={toY(100)} stroke="#5a6070" strokeWidth="1.5" strokeDasharray="6 4" />
                <polyline points={chartData.map((p: any) => `${toX(p.predicted)},${toY(p.actual)}`).join(' ')} fill="none" stroke="#00d4ff" strokeWidth="1.5" opacity="0.4" />
                {chartData.map((p: any, i: number) => (
                  <circle
                    key={i}
                    cx={toX(p.predicted)} cy={toY(p.actual)} r="8"
                    fill="#00d4ff" opacity="0.85" style={{cursor:'pointer'}}
                    onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, p })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
                {tooltip && (
                  <foreignObject x={toX(tooltip.p.predicted) + 10} y={toY(tooltip.p.actual) - 50} width="180" height="70">
                    <div style={{background:'#131a2b',border:'1px solid #1a2030',borderRadius:8,padding:'8px 10px',fontSize:11,color:'#dee2f5'}}>
                      <div style={{color:'#00d4ff',fontWeight:600,marginBottom:2}}>{tooltip.p.bin}</div>
                      <div>Predicted: <b>{tooltip.p.predicted}%</b></div>
                      <div>Actual: <b>{tooltip.p.actual}%</b></div>
                      <div style={{color:'#8b92a8'}}>{tooltip.p.count} markets</div>
                    </div>
                  </foreignObject>
                )}
              </svg>
            );
          })() : (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-12 h-12 rounded-full bg-[#0a0e17] border border-[#1a2030] flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-[#8b92a8]" />
              </div>
              <div className="text-center">
                <p className="text-[#8b92a8] text-sm font-medium">Calibration data is loading from Polymarket</p>
                <p className="text-[#5a6070] text-xs mt-1">This chart populates as Polymarket markets resolve over time.</p>
                <p className="text-[#5a6070] text-xs">The more resolved markets, the more accurate the calibration curve.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#131a2b] rounded-xl border border-[#1a2030] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-[#dee2f5]">EdgeIQ Prediction Tracker</h3>
            <p className="text-xs text-[#5a6070] mt-1">Real predictions made by EdgeIQ's 4-agent pipeline — tracked as markets resolve</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                setResolving(true);
                setSyncResult(null);
                try {
                  await unresolvePredictions();
                  const syncRes = await resolvePredictions();
                  // Show how many were resolved vs still pending
                  if (syncRes?.success) {
                    setSyncResult({
                      updated: syncRes.updated ?? 0,
                      notResolvedYet: syncRes.skipped_not_resolved_yet ?? 0,
                      nonPoly: syncRes.skipped_non_polymarket ?? 0,
                    });
                    if ((syncRes.updated ?? 0) > 0) setShowPredictions(true);
                  }
                  const res = await getPredictionStats();
                  if (res.success) setPredStats(res);
                } catch (err) {
                  console.error("Sync outcomes failed:", err);
                } finally {
                  setResolving(false);
                }
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-[#1a2030] text-[#8b92a8] hover:text-[#00d4ff] border border-[#1a2030] hover:border-[#00d4ff] transition-colors"
            >
              {resolving ? "Resolving..." : "↻ Sync Outcomes"}
            </button>
            <button
              onClick={() => setShowPredictions(p => !p)}
              className="text-xs px-3 py-1.5 rounded-lg bg-[#1a2030] text-[#8b92a8] hover:text-[#dee2f5] border border-[#1a2030] transition-colors"
            >
              {showPredictions ? "▲ Hide" : "▼ Show"}
            </button>
          </div>
        </div>

        {syncResult !== null && !resolving && (
          <div className={`mb-4 px-3 py-2 rounded-lg text-xs flex items-center gap-2 border ${
            syncResult.updated > 0
              ? "bg-[#00ff8810] border-[#00ff8830] text-[#00ff88]"
              : "bg-[#1a2030] border-[#1a2030] text-[#8b92a8]"
          }`}>
            {syncResult.updated > 0 ? (
              <>
                <span className="font-semibold">✓ {syncResult.updated} prediction{syncResult.updated !== 1 ? "s" : ""} resolved</span>
                {syncResult.notResolvedYet > 0 && (
                  <span className="text-[#5a6070]">· {syncResult.notResolvedYet} market{syncResult.notResolvedYet !== 1 ? "s" : ""} not resolved yet on Polymarket</span>
                )}
                {syncResult.nonPoly > 0 && (
                  <span className="text-[#5a6070]">· {syncResult.nonPoly} need manual resolve</span>
                )}
              </>
            ) : (
              <>
                <span>No new resolutions found</span>
                {syncResult.notResolvedYet > 0 && (
                  <span className="text-[#5a6070]">· {syncResult.notResolvedYet} Polymarket market{syncResult.notResolvedYet !== 1 ? "s" : ""} still open</span>
                )}
                {syncResult.nonPoly > 0 && (
                  <span className="text-[#5a6070]">· {syncResult.nonPoly} non-Polymarket (use manual YES/NO)</span>
                )}
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total Predictions", value: predStats?.stats?.total ?? 0, color: "#dee2f5" },
            { label: "Resolved", value: predStats?.stats?.resolved ?? 0, color: "#00d4ff" },
            { label: "Pending", value: predStats?.stats?.pending ?? 0, color: "#ffa502" },
            { label: "Accuracy", value: predStats?.stats?.accuracy != null ? `${predStats.stats.accuracy}%` : "—", color: "#00ff88" },
          ].map((s, i) => (
            <div key={i} className="bg-[#0a0e17] rounded-lg p-3 border border-[#1a2030]">
              <p className="text-[10px] uppercase tracking-wider text-[#5a6070] mb-1">{s.label}</p>
              <p className="text-lg font-bold font-mono-num" style={{color: s.color}}>{s.value}</p>
            </div>
          ))}
        </div>

        {showPredictions && (
          predStats?.recent_predictions?.length > 0 ? (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[#131a2b] z-10">
                  <tr className="text-[#5a6070] border-b border-[#1a2030]">
                    <th className="text-left pb-2 pr-4">Market</th>
                    <th className="text-right pb-2 pr-4">EdgeIQ</th>
                    <th className="text-right pb-2 pr-4">Crowd</th>
                    <th className="text-center pb-2 pr-4">Predicted</th>
                    <th className="text-center pb-2 pr-4">Actual</th>
                    <th className="text-center pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const allPreds = predStats.recent_predictions;
                    const resolvedPreds = allPreds.filter((p: any) => p.status === 'resolved');
                    const pendingPreds = allPreds.filter((p: any) => p.status !== 'resolved');

                    return (
                      <>
                        {resolvedPreds.map((p: any, i: number) => (
                          <tr key={`r-${i}`} className="border-b border-[#1a2030] hover:bg-[#0a0e17]">
                            <td className="py-2 pr-4 text-[#dee2f5] max-w-[220px] truncate">
                              <button 
                                onClick={() => navigate(`/market/${p.market_id}`, { state: { staticOnly: true } })}
                                className="hover:text-[#00d4ff] hover:underline text-left truncate w-full"
                                title={p.market_title}
                              >
                                {p.market_title}
                              </button>
                            </td>
                            <td className="py-2 pr-4 text-right text-[#00d4ff]">{p.ai_probability}%</td>
                            <td className="py-2 pr-4 text-right text-[#8b92a8]">{p.market_probability}%</td>
                            <td className="py-2 pr-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${p.predicted_outcome === 'YES' ? 'bg-[#00ff8820] text-[#00ff88]' : 'bg-[#ff4d4d20] text-[#ff4d4d]'}`}>
                                {p.predicted_outcome}
                              </span>
                            </td>
                            <td className="py-2 pr-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${p.resolved_outcome === 'YES' ? 'bg-[#00d4ff20] text-[#00d4ff]' : 'bg-[#ffa50220] text-[#ffa502]'}`}>
                                {p.resolved_outcome}
                              </span>
                            </td>
                            <td className="py-2 text-center">
                              {p.was_correct ? (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-[#00ff8820] text-[#00ff88]">✓ Correct</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-[#ff4d4d20] text-[#ff4d4d]">✗ Wrong</span>
                              )}
                            </td>
                          </tr>
                        ))}

                        {resolvedPreds.length > 0 && pendingPreds.length > 0 && (
                          <tr>
                            <td colSpan={6} className="py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 border-t border-[#1a2030]" />
                                <span className="text-[10px] uppercase tracking-wider text-[#5a6070]">
                                  Pending — awaiting market resolution
                                </span>
                                <div className="flex-1 border-t border-[#1a2030]" />
                              </div>
                            </td>
                          </tr>
                        )}

                        {pendingPreds.map((p: any, i: number) => (
                          <tr key={`p-${i}`} className="border-b border-[#1a2030] hover:bg-[#0a0e17] opacity-70">
                            <td className="py-2 pr-4 text-[#dee2f5] max-w-[220px] truncate">
                              <button 
                                onClick={() => navigate(`/market/${p.market_id}`, { state: { staticOnly: true } })}
                                className="hover:text-[#00d4ff] hover:underline text-left truncate w-full"
                                title={p.market_title}
                              >
                                {p.market_title}
                              </button>
                            </td>
                            <td className="py-2 pr-4 text-right text-[#00d4ff]">{p.ai_probability}%</td>
                            <td className="py-2 pr-4 text-right text-[#8b92a8]">{p.market_probability}%</td>
                            <td className="py-2 pr-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${p.predicted_outcome === 'YES' ? 'bg-[#00ff8820] text-[#00ff88]' : 'bg-[#ff4d4d20] text-[#ff4d4d]'}`}>
                                {p.predicted_outcome}
                              </span>
                            </td>
                            <td className="py-2 pr-4 text-center">
                              <span className="text-[10px] text-[#5a6070]">—</span>
                            </td>
                            <td className="py-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={async () => { await manualResolvePrediction(p.id, "YES"); const res = await getPredictionStats(); if (res.success) setPredStats(res); }} className="px-2 py-0.5 rounded text-[10px] bg-[#00ff8815] text-[#00ff88] hover:bg-[#00ff8830] border border-[#00ff8840]">YES</button>
                                <button onClick={async () => { await manualResolvePrediction(p.id, "NO"); const res = await getPredictionStats(); if (res.success) setPredStats(res); }} className="px-2 py-0.5 rounded text-[10px] bg-[#ff4d4d15] text-[#ff4d4d] hover:bg-[#ff4d4d30] border border-[#ff4d4d40]">NO</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-[#5a6070]">
              <Target className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">No predictions yet</p>
              <p className="text-xs mt-1">Run a Deep Dive on any market to start building EdgeIQ's track record</p>
            </div>
          )
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#131a2b] rounded-xl border border-[#1a2030] p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-[#00ff88]" />
            <h4 className="text-sm font-semibold text-[#dee2f5]">Well-Calibrated Regions</h4>
          </div>
          <p className="text-sm text-[#8b92a8]">
            Probabilities between 40-60% tend to align closest with actual outcomes. This is the "efficient" range where market prices and AI estimates converge.
          </p>
        </div>
        <div className="bg-[#131a2b] rounded-xl border border-[#1a2030] p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-[#ffa502]" />
            <h4 className="text-sm font-semibold text-[#dee2f5]">Under-Confident Regions</h4>
          </div>
          <p className="text-sm text-[#8b92a8]">
            Extreme probabilities (below 20% or above 80%) show the most deviation. EdgeIQ is conservative in high-confidence predictions — this is safer but leaves edge on the table.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Calibration;
