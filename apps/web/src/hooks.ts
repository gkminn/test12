import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import type { Interval, Market } from "@autostock/shared";

export function useCandles(market: Market, symbol: string, interval: Interval) {
  return useQuery({
    queryKey: ["candles", market, symbol, interval],
    queryFn: () => api.candles(market, symbol, interval),
    staleTime: 30_000,
  });
}

export function useIndicators(market: Market, symbol: string, interval: Interval) {
  return useQuery({
    queryKey: ["indicators", market, symbol, interval],
    queryFn: () => api.indicators(market, symbol, interval),
    staleTime: 60_000,
  });
}

export function usePrediction(market: Market, symbol: string, interval: Interval, enabled = true) {
  return useQuery({
    queryKey: ["prediction", market, symbol, interval],
    queryFn: () => api.predict(market, symbol, interval),
    staleTime: 5 * 60_000,
    enabled,
  });
}
