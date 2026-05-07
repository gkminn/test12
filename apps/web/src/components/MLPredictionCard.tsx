import type { Prediction } from "@autostock/shared";

export function MLPredictionCard({ prediction }: { prediction: Prediction | null | undefined }) {
  if (!prediction) {
    return <div className="px-4 py-6 text-sm text-muted">예측을 생성하는 중…</div>;
  }
  const { trend, hitRate, bullProb, bearProb, path, summary, modelVersion } = prediction;
  const lastBaseline = path.baseline[path.baseline.length - 1];
  const firstBaseline = path.baseline[0];
  const expectedPct = ((lastBaseline - firstBaseline) / firstBaseline) * 100;
  const trendLabel = trend === "bull" ? "상승 우위" : trend === "bear" ? "하락 우위" : "중립";
  const trendColor = trend === "bull" ? "text-up" : trend === "bear" ? "text-down" : "text-muted";
  const arrow = trend === "bull" ? "📈" : trend === "bear" ? "📉" : "➖";
  const sign = expectedPct > 0 ? "+" : "";

  const bp = bullProb ?? (trend === "bull" ? 60 : trend === "bear" ? 40 : 50);
  const brp = bearProb ?? (100 - bp);

  return (
    <div className="px-4 py-3 border-t border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>🧠</span>
          <span className="font-semibold">ML 예측</span>
          <span className="text-xs text-muted">{modelVersion}</span>
        </div>
        <div className="text-xs text-muted">적중 {hitRate}%</div>
      </div>

      <div className="mt-2 flex items-baseline justify-between">
        <div className={`text-xl font-semibold ${trendColor} flex items-center gap-2`}>
          {arrow} {trendLabel}
        </div>
        <div className={`text-xl font-semibold tabular-nums ${expectedPct >= 0 ? "text-up" : "text-down"}`}>
          {sign}{expectedPct.toFixed(1)}%
        </div>
      </div>

      {/* Bull / Bear probability bar */}
      <div className="mt-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-up font-medium">상승 {bp}%</span>
          <span className="text-down font-medium">하락 {brp}%</span>
        </div>
        <div className="flex h-2 rounded overflow-hidden">
          <div
            className="transition-all duration-500"
            style={{ width: `${bp}%`, background: "#26a69a" }}
          />
          <div
            className="transition-all duration-500"
            style={{ width: `${brp}%`, background: "#ef5350" }}
          />
        </div>
      </div>

      {summary && <div className="mt-2 text-xs text-muted">{summary}</div>}
    </div>
  );
}
