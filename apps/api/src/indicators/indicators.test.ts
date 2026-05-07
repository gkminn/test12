import { describe, it, expect } from "vitest";
import { rsi, macd, bollinger, atr, vwap, mfi, priceTrendPct, gapDirection } from "./index.js";
import type { Candle } from "@autostock/shared";

function mkCandles(closes: number[]): Candle[] {
  return closes.map((c, i) => ({
    time: 1700000000 + i * 86400,
    open: c * 0.99,
    high: c * 1.01,
    low: c * 0.98,
    close: c,
    volume: 1000 + i * 10,
  }));
}

describe("indicators", () => {
  it("rsi: monotonically rising series → > 70", () => {
    const v = Array.from({ length: 30 }, (_, i) => 100 + i);
    expect(rsi(v, 14)).toBeGreaterThan(70);
  });

  it("rsi: monotonically falling series → < 30", () => {
    const v = Array.from({ length: 30 }, (_, i) => 200 - i);
    expect(rsi(v, 14)).toBeLessThan(30);
  });

  it("macd: line and signal computed", () => {
    const v = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 5) * 5);
    const m = macd(v);
    expect(Number.isFinite(m.line)).toBe(true);
    expect(Number.isFinite(m.signal)).toBe(true);
    expect(Number.isFinite(m.hist)).toBe(true);
  });

  it("bollinger: position bounded near +/-50", () => {
    const v = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i / 3) * 2);
    const b = bollinger(v, 20, 2);
    expect(b.posPct).toBeGreaterThanOrEqual(-100);
    expect(b.posPct).toBeLessThanOrEqual(100);
  });

  it("atr: positive % for non-flat candles", () => {
    const c = mkCandles([10, 11, 12, 11, 13, 12, 14, 13, 15, 14, 16, 15, 17, 16, 18, 17]);
    expect(atr(c, 14)).toBeGreaterThan(0);
  });

  it("vwap: weighted by volume", () => {
    const c: Candle[] = [
      { time: 0, open: 10, high: 10, low: 10, close: 10, volume: 100 },
      { time: 1, open: 20, high: 20, low: 20, close: 20, volume: 100 },
    ];
    expect(vwap(c)).toBeCloseTo(15, 2);
  });

  it("mfi: bounded 0-100", () => {
    const c = mkCandles([10, 11, 12, 11, 13, 12, 14, 13, 15, 14, 16, 15, 17, 16, 18, 17]);
    const m = mfi(c, 14);
    expect(m).toBeGreaterThanOrEqual(0);
    expect(m).toBeLessThanOrEqual(100);
  });

  it("priceTrendPct", () => {
    const c = mkCandles(Array.from({ length: 25 }, (_, i) => 100 + i));
    const p = priceTrendPct(c, 20);
    expect(p).toBeGreaterThan(0);
  });

  it("gapDirection", () => {
    const c: Candle[] = [
      { time: 0, open: 10, high: 11, low: 9, close: 10, volume: 1 },
      { time: 1, open: 12, high: 13, low: 11, close: 12, volume: 1 },
    ];
    expect(gapDirection(c)).toBeCloseTo(20, 1);
  });
});
