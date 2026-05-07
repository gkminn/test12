import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import { useApp } from "../store";
import type { SearchResult } from "@autostock/shared";

export function SearchBar() {
  const selected = useApp(s => s.selected);
  const setSelected = useApp(s => s.setSelected);
  const favorites = useApp(s => s.favorites);
  const toggleFavorite = useApp(s => s.toggleFavorite);

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const isFav = useMemo(() => favorites.some(f => f.market === selected.market && f.symbol === selected.symbol), [favorites, selected]);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const { results } = await api.search(q.trim());
        setResults(results);
        setOpen(true);
      } catch { /* ignore */ }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center gap-2 px-3 h-10 rounded-lg bg-panel2 border border-border">
        <span className="text-muted">🔎</span>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={`${selected.name} 검색 또는 변경`}
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted"
        />
        <button
          onClick={() => toggleFavorite(selected)}
          className="text-lg"
          title={isFav ? "즐겨찾기 해제" : "즐겨찾기 추가"}
        >
          {isFav ? "★" : "☆"}
        </button>
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-panel border border-border rounded-lg shadow-xl max-h-80 overflow-auto">
          {results.map(r => (
            <button
              key={`${r.market}:${r.symbol}`}
              onClick={() => {
                setSelected({ market: r.market, symbol: r.symbol, name: r.name, exchange: r.exchange });
                setQ("");
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-panel2 flex items-center justify-between"
            >
              <div>
                <div className="text-sm">{r.name}</div>
                <div className="text-xs text-muted">{r.market}:{r.symbol} · {r.exchange}</div>
              </div>
              <span className="text-[10px] text-muted">{(r.score * 100).toFixed(0)}%</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
