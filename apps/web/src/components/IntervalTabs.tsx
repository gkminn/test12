import type { Interval } from "@autostock/shared";
import { ALL_INTERVALS } from "@autostock/shared";

export function IntervalTabs({ value, onChange }: { value: Interval; onChange: (i: Interval) => void }) {
  return (
    <div className="flex items-center gap-1 bg-panel2 border border-border rounded-lg p-1">
      {ALL_INTERVALS.map(i => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className={`px-3 py-1 text-sm rounded-md ${value === i ? "bg-panel text-fg" : "text-muted hover:text-fg"}`}
        >
          {i}
        </button>
      ))}
    </div>
  );
}
