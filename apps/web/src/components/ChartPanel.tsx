import { useEffect, useMemo, useRef } from "react";
import {
  createChart,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
  type Time,
} from "lightweight-charts";
import type { Candle, Interval, Prediction } from "@autostock/shared";

interface Props {
  candles: Candle[];
  prediction?: Prediction | null;
  interval: Interval;
  height?: number;
}

const COLORS = {
  upBody: "#26a69a",
  downBody: "#ef5350",
  bull: "#ffa726",
  bear: "#26c6da",
  baseline: "#42a5f5",
  bullScenario: "#66bb6a",
  bearScenario: "#ef5350",
  bandTop: "rgba(66, 165, 245, 0.18)",
  bandBottom: "rgba(66, 165, 245, 0.02)",
};

export function ChartPanel({ candles, prediction, interval, height = 460 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const bullSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const bearSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const baselineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bullLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bearLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const upperBandRef = useRef<ISeriesApi<"Area"> | null>(null);
  const lowerBandRef = useRef<ISeriesApi<"Area"> | null>(null);

  // Init chart once
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#0d1117" },
        textColor: "#8b96a5",
        fontFamily: "Pretendard, system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: "#1f2a37" },
        horzLines: { color: "#1f2a37" },
      },
      rightPriceScale: { borderColor: "#1f2a37" },
      timeScale: {
        borderColor: "#1f2a37",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: { mode: CrosshairMode.Normal },
      width: containerRef.current.clientWidth,
      height,
    });

    candleSeriesRef.current = chart.addCandlestickSeries({
      upColor: COLORS.upBody,
      downColor: COLORS.downBody,
      borderUpColor: COLORS.upBody,
      borderDownColor: COLORS.downBody,
      wickUpColor: COLORS.upBody,
      wickDownColor: COLORS.downBody,
    });

    bullSeriesRef.current = chart.addCandlestickSeries({
      upColor: COLORS.bull,
      downColor: COLORS.bull,
      borderUpColor: COLORS.bull,
      borderDownColor: COLORS.bull,
      wickUpColor: COLORS.bull,
      wickDownColor: COLORS.bull,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    bearSeriesRef.current = chart.addCandlestickSeries({
      upColor: COLORS.bear,
      downColor: COLORS.bear,
      borderUpColor: COLORS.bear,
      borderDownColor: COLORS.bear,
      wickUpColor: COLORS.bear,
      wickDownColor: COLORS.bear,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    upperBandRef.current = chart.addAreaSeries({
      topColor: COLORS.bandTop,
      bottomColor: COLORS.bandBottom,
      lineColor: "rgba(66,165,245,0)",
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    lowerBandRef.current = chart.addAreaSeries({
      topColor: "rgba(13,17,23,1)",
      bottomColor: "rgba(13,17,23,1)",
      lineColor: "rgba(66,165,245,0)",
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    baselineRef.current = chart.addLineSeries({
      color: COLORS.baseline,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });
    bullLineRef.current = chart.addLineSeries({
      color: COLORS.bullScenario,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    bearLineRef.current = chart.addLineSeries({
      color: COLORS.bearScenario,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    chartRef.current = chart;

    const onResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push candle data
  useEffect(() => {
    if (!candleSeriesRef.current) return;
    const data = candles.map(c => ({
      time: c.time as UTCTimestamp,
      open: c.open, high: c.high, low: c.low, close: c.close,
    }));
    candleSeriesRef.current.setData(data);
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  // Push prediction overlays
  useEffect(() => {
    const bull = bullSeriesRef.current;
    const bear = bearSeriesRef.current;
    const baseline = baselineRef.current;
    const bullL = bullLineRef.current;
    const bearL = bearLineRef.current;
    const upperBand = upperBandRef.current;
    const lowerBand = lowerBandRef.current;
    if (!bull || !bear || !baseline || !bullL || !bearL || !upperBand || !lowerBand) return;

    if (!prediction || candles.length === 0) {
      bull.setData([]); bear.setData([]); baseline.setData([]);
      bullL.setData([]); bearL.setData([]);
      upperBand.setData([]); lowerBand.setData([]);
      return;
    }

    const lastClose = candles[candles.length - 1].close;
    const lastTime = candles[candles.length - 1].time;
    const step = prediction.step;

    const futureTimes: number[] = [];
    for (let i = 0; i < prediction.path.baseline.length; i++) {
      futureTimes.push(lastTime + step * (i + 1));
    }

    // Build synthesized future candles for bull & bear paths so the chart
    // shows the spiky candlestick "fan" effect from the screenshot.
    const bullCandles = futureTimes.map((t, i) => synthCandle(t, prediction.path.bull, i, lastClose));
    const bearCandles = futureTimes.map((t, i) => synthCandle(t, prediction.path.bear, i, lastClose));

    bull.setData(bullCandles);
    bear.setData(bearCandles);

    baseline.setData([
      { time: lastTime as UTCTimestamp, value: lastClose },
      ...futureTimes.map((t, i) => ({ time: t as UTCTimestamp, value: prediction.path.baseline[i] })),
    ]);
    bullL.setData([
      { time: lastTime as UTCTimestamp, value: lastClose },
      ...futureTimes.map((t, i) => ({ time: t as UTCTimestamp, value: prediction.path.bull[i] })),
    ]);
    bearL.setData([
      { time: lastTime as UTCTimestamp, value: lastClose },
      ...futureTimes.map((t, i) => ({ time: t as UTCTimestamp, value: prediction.path.bear[i] })),
    ]);

    // Cone: upper minus lower as two area series stacked.
    upperBand.setData([
      { time: lastTime as UTCTimestamp, value: lastClose },
      ...futureTimes.map((t, i) => ({ time: t as UTCTimestamp, value: prediction.path.upper[i] })),
    ]);
    lowerBand.setData([
      { time: lastTime as UTCTimestamp, value: lastClose },
      ...futureTimes.map((t, i) => ({ time: t as UTCTimestamp, value: prediction.path.lower[i] })),
    ]);

    // Hit-rate marker on last actual bar
    candleSeriesRef.current?.setMarkers([
      {
        time: lastTime as UTCTimestamp,
        position: "aboveBar",
        color: prediction.trend === "bear" ? "#ef5350" : "#66bb6a",
        shape: "circle",
        text: `적중 ${prediction.hitRate}%`,
      },
    ]);

    // Extend time scale to show full prediction range
    chartRef.current?.timeScale().fitContent();
  }, [prediction, candles]);

  const summary = useMemo(() => prediction?.summary, [prediction]);

  return (
    <div className="relative">
      <div ref={containerRef} style={{ width: "100%", height }} />
      {summary && (
        <div className="absolute left-3 bottom-3 max-w-[60%] text-xs text-muted bg-panel2/80 border border-border rounded px-2 py-1 backdrop-blur">
          {summary}
        </div>
      )}
    </div>
  );
}

// Build a synthesized candle around the predicted close, with a small
// open/high/low spread so the future bars look like the screenshot's
// orange/cyan candle fan.
function synthCandle(time: number, path: number[], i: number, lastClose: number) {
  const close = path[i];
  const prev = i === 0 ? lastClose : path[i - 1];
  const range = Math.abs(close - prev) * 1.4 + Math.abs(close) * 0.001;
  const open = prev;
  const high = Math.max(open, close) + range * 0.4;
  const low = Math.min(open, close) - range * 0.4;
  return { time: time as Time as UTCTimestamp, open, high, low, close };
}
