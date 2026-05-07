import type { Prediction } from "@autostock/shared";

export function MLPredictionCard({ prediction }: { prediction: Prediction | null | undefined }) {
  if (!prediction) {
    return <div className="px-4 py-6 text-sm text-muted">예측을 생성하는 중…</div>;
  }
  const { trend, hitRate, path, summary, modelVersion } = prediction;
  const lastBaseline = path.baseline[path.baseline.length - 1];
  const firstBaseline = path.baseline[0];
  const expectedPct = ((lastBaseline - firstBaseline) / firstBaseline) * 100;
  const trendLabel = trend === "bull" ? "상승 우위" : trend === "bear" ? "하락 우위" : "중립";
  const trendColor = trend === "bull" ? "text-up" : trend === "bear" ? "text-down" : "text-muted";
  const arrow = trend === "bull" ? "📈" : trend === "bear" ? "📉" : "➖";
  const sign = expectedPct > 0 ? "+" : "";

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
      {summary && <div className="mt-2 text-xs text-muted">{summary}</div>}
    </div>
  );
}
