import { create } from "zustand";
import type { Interval, Market } from "@autostock/shared";

interface SymbolSelection {
  market: Market;
  symbol: string;
  name: string;
  exchange: string;
}

interface AppState {
  selected: SymbolSelection;
  interval: Interval;
  splitView: boolean;
  rightInterval: Interval;
  bottomTab: "예측" | "근거" | "즐겨찾기" | "개선" | "챗봇";
  favorites: SymbolSelection[];
  setSelected: (s: SymbolSelection) => void;
  setInterval: (i: Interval) => void;
  setRightInterval: (i: Interval) => void;
  setBottomTab: (t: AppState["bottomTab"]) => void;
  toggleSplit: () => void;
  toggleFavorite: (s: SymbolSelection) => void;
}

const FAVORITES_KEY = "autostock-favorites";

function loadFavorites(): SymbolSelection[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as SymbolSelection[]) : [];
  } catch {
    return [];
  }
}

function saveFavorites(items: SymbolSelection[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
}

export const useApp = create<AppState>((set, get) => ({
  selected: { market: "KR", symbol: "018880", name: "한온시스템", exchange: "KOSPI" },
  interval: "1d",
  splitView: false,
  rightInterval: "1m",
  bottomTab: "예측",
  favorites: loadFavorites(),
  setSelected: (s) => set({ selected: s }),
  setInterval: (i) => set({ interval: i }),
  setRightInterval: (i) => set({ rightInterval: i }),
  setBottomTab: (t) => set({ bottomTab: t }),
  toggleSplit: () => set({ splitView: !get().splitView }),
  toggleFavorite: (s) => {
    const cur = get().favorites;
    const exists = cur.find(f => f.market === s.market && f.symbol === s.symbol);
    const next = exists
      ? cur.filter(f => !(f.market === s.market && f.symbol === s.symbol))
      : [...cur, s];
    saveFavorites(next);
    set({ favorites: next });
  },
}));
