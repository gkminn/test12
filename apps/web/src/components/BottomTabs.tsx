import { useApp } from "../store";

const TABS = ["예측", "근거", "즐겨찾기", "개선", "챗봇"] as const;

export function BottomTabs() {
  const tab = useApp(s => s.bottomTab);
  const setTab = useApp(s => s.setBottomTab);
  return (
    <div className="grid grid-cols-5 border-y border-border bg-panel2">
      {TABS.map(t => (
        <button
          key={t}
          onClick={() => setTab(t)}
          className={`py-2 text-sm ${tab === t ? "text-fg border-b-2 border-baseline" : "text-muted"}`}
        >
          {t === "즐겨찾기" ? "★" : t}
        </button>
      ))}
    </div>
  );
}
