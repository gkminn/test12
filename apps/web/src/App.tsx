import { useApp } from "./store";
import { SearchBar } from "./components/SearchBar";
import { SymbolHeader } from "./components/SymbolHeader";
import { ChartPane } from "./components/ChartPane";
import { BottomTabs } from "./components/BottomTabs";
import { ReasoningPanel } from "./components/ReasoningPanel";
import { MLPredictionCard } from "./components/MLPredictionCard";
import { FavoritesPanel } from "./components/FavoritesPanel";
import { Chatbot } from "./components/Chatbot";
import { useIndicators, usePrediction } from "./hooks";

export default function App() {
  const sel = useApp(s => s.selected);
  const interval = useApp(s => s.interval);
  const setInterval = useApp(s => s.setInterval);
  const splitView = useApp(s => s.splitView);
  const toggleSplit = useApp(s => s.toggleSplit);
  const rightInterval = useApp(s => s.rightInterval);
  const setRightInterval = useApp(s => s.setRightInterval);
  const tab = useApp(s => s.bottomTab);

  const indicatorsQ = useIndicators(sel.market, sel.symbol, interval);
  const predictionQ = usePrediction(sel.market, sel.symbol, interval);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-bg border-b border-border">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex-1"><SearchBar /></div>
          <button
            onClick={toggleSplit}
            className="text-xs px-2 py-1 bg-panel2 border border-border rounded-md text-muted hover:text-fg"
            title="좌우 분할"
          >
            {splitView ? "단일 보기" : "좌우 분할"}
          </button>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto w-full px-4 py-3 flex-1">
        <SymbolHeader />

        <div className={`mt-3 grid gap-3 ${splitView ? "grid-cols-2" : "grid-cols-1"}`}>
          <ChartPane interval={interval} onInterval={setInterval} height={460} />
          {splitView && <ChartPane interval={rightInterval} onInterval={setRightInterval} height={460} />}
        </div>

        <div className="mt-3 bg-panel border border-border rounded-lg overflow-hidden">
          <BottomTabs />
          <div className="min-h-[280px]">
            {tab === "예측"   && <MLPredictionCard prediction={predictionQ.data} />}
            {tab === "근거"   && <ReasoningPanel reasoning={indicatorsQ.data} />}
            {tab === "즐겨찾기" && <FavoritesPanel />}
            {tab === "개선"   && <div className="px-4 py-6 text-sm text-muted">사용자 피드백을 통해 모델을 개선하는 기능은 향후 추가됩니다.</div>}
            {tab === "챗봇"   && <Chatbot />}
          </div>
        </div>

        <div className="mt-2 px-1 text-[10px] text-muted">
          본 화면의 예측은 투자 참고용이며 손실 책임은 본인에게 있습니다.
        </div>
      </main>
    </div>
  );
}
