import type { Reasoning, ReasoningFactor, FactorGroup } from "@autostock/shared";

const GROUP_ORDER: FactorGroup[] = ["기본", "가격", "수급", "시장", "뉴스"];

export function ReasoningPanel({ reasoning }: { reasoning: Reasoning | null | undefined }) {
  if (!reasoning) {
    return <div className="px-4 py-6 text-sm text-muted">근거를 불러오는 중…</div>;
  }
  const grouped = new Map<FactorGroup, ReasoningFactor[]>();
  for (const f of reasoning.factors) {
    const list = grouped.get(f.group) ?? [];
    list.push(f);
    grouped.set(f.group, list);
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-baseline">🛡️</span>
        <h3 className="text-base font-semibold">근거</h3>
      </div>
      {GROUP_ORDER.map(group => {
        const items = grouped.get(group);
        if (!items || items.length === 0) return null;
        return (
          <div key={group} className="mb-3">
            <div className="flex items-center justify-between text-xs text-muted mb-1">
              <span>{groupLabel(group)}</span>
              <span>{items.length}</span>
            </div>
            <div className="divide-y divide-border bg-panel border border-border rounded-md">
              {items.map(f => (
                <div key={f.name} className="flex items-center justify-between px-3 py-2">
                  <div className="text-sm">{f.name}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm tabular-nums">{f.value}</span>
                    <ScoreChip score={f.score} verdict={f.verdict} />
                    <span className="text-muted text-sm cursor-help" title={f.description ?? f.name}>ⓘ</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ScoreChip({ score, verdict }: { score: number; verdict: ReasoningFactor["verdict"] }) {
  const color = verdict === "상승" ? "bg-up/15 text-up" :
                verdict === "하락" ? "bg-down/15 text-down" :
                verdict === "대기" ? "bg-baseline/15 text-baseline" :
                "bg-muted/15 text-muted";
  const sign = score > 0 ? "+" : "";
  return (
    <span className={`score-chip ${color}`}>
      점수 {sign}{score} <span className="ml-1 opacity-80">{verdict}</span>
    </span>
  );
}

function groupLabel(g: FactorGroup): string {
  switch (g) {
    case "기본": return "기본";
    case "가격": return "가격";
    case "수급": return "수급";
    case "시장": return "시장";
    case "뉴스": return "뉴스/이벤트";
  }
}
