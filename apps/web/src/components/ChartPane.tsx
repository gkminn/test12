import type { Interval } from "@autostock/shared";
import { useCandles, usePrediction } from "../hooks";
import { useApp } from "../store";
import { ChartLegend } from "./ChartLegend";
import { ChartPanel } from "./ChartPanel";
import { IntervalTabs } from "./IntervalTabs";

interface Props {
  interval: Interval;
  onInterval: (i: Interval) => void;
  height?: number;
}

export function ChartPane({ interval, onInterval, height = 460 }: Props) {
  const sel = useApp(s => s.selected);
  const candlesQ = useCandles(sel.market, sel.symbol, interval);
  const predictionQ = usePrediction(sel.market, sel.symbol, interval, !!candlesQ.data?.candles?.length);

  const candles = candlesQ.data?.candles ?? [];

  return (
    <div className="bg-panel border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2">
        <ChartLegend />
        <IntervalTabs value={interval} onChange={onInterval} />
      </div>
      <div className="relative">
        <ChartPanel candles={candles} prediction={predictionQ.data} interval={interval} height={height} />
        {(candlesQ.isLoading || predictionQ.isLoading) && (
          <div className="absolute top-2 right-2 text-[11px] text-muted">불러오는 중…</div>
        )}
        {(candlesQ.error || predictionQ.error) && (
          <div className="absolute top-2 right-2 text-[11px] text-down">
            {(candlesQ.error as Error)?.message ?? (predictionQ.error as Error)?.message}
          </div>
        )}
      </div>
    </div>
  );
}
