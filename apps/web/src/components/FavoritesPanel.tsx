import { useApp } from "../store";

export function FavoritesPanel() {
  const favs = useApp(s => s.favorites);
  const setSelected = useApp(s => s.setSelected);
  const toggleFavorite = useApp(s => s.toggleFavorite);
  if (favs.length === 0) {
    return <div className="px-4 py-6 text-sm text-muted">★ 버튼으로 즐겨찾기를 추가하세요.</div>;
  }
  return (
    <div className="px-4 py-3 space-y-1">
      {favs.map(f => (
        <div key={`${f.market}:${f.symbol}`} className="flex items-center justify-between bg-panel border border-border rounded-md px-3 py-2">
          <button onClick={() => setSelected(f)} className="text-left">
            <div className="text-sm">{f.name}</div>
            <div className="text-xs text-muted">{f.market}:{f.symbol} · {f.exchange}</div>
          </button>
          <button onClick={() => toggleFavorite(f)} className="text-muted hover:text-down">✕</button>
        </div>
      ))}
    </div>
  );
}
