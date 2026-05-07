export function ChartLegend() {
  const items: Array<{ color: string; label: string; type: "dot" | "bar" | "line" | "dash" }> = [
    { color: "#26a69a", label: "실제 캔들", type: "dot" },
    { color: "#ffa726", label: "AI 상승 전망", type: "bar" },
    { color: "#26c6da", label: "AI 하락 전망", type: "bar" },
    { color: "#8b96a5", label: "지난 전망 검증", type: "bar" },
    { color: "#42a5f5", label: "AI 기준 예상선", type: "line" },
    { color: "#66bb6a", label: "상승 시나리오", type: "dash" },
    { color: "#ef5350", label: "하락 시나리오", type: "dash" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-[11px] text-muted">
      {items.map(it => (
        <div key={it.label} className="flex items-center gap-1.5">
          {it.type === "dot" && <span className="dot" style={{ background: it.color }} />}
          {it.type === "bar" && <span className="inline-block w-3 h-2.5" style={{ background: it.color }} />}
          {it.type === "line" && <span className="inline-block w-4 h-[2px]" style={{ background: it.color }} />}
          {it.type === "dash" && <span className="inline-block w-4 h-[2px] border-t border-dashed" style={{ borderColor: it.color }} />}
          <span>{it.label}</span>
        </div>
      ))}
    </div>
  );
}
