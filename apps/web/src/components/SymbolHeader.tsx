import { useEffect, useState } from "react";
import { useApp } from "../store";
import type { Quote } from "@autostock/shared";

export function SymbolHeader() {
  const sel = useApp(s => s.selected);
  const [quote, setQuote] = useState<Quote | null>(null);

  useEffect(() => {
    setQuote(null);
    const wsUrl = `ws://${location.host}/ws/quote?market=${sel.market}&symbol=${sel.symbol}`;
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "quote") setQuote(msg.quote);
      } catch { /* ignore */ }
    };
    return () => ws.close();
  }, [sel.market, sel.symbol]);

  const isUp = (quote?.change ?? 0) >= 0;

  return (
    <div className="flex items-end justify-between gap-4 px-4 pt-3">
      <div>
        <div className="text-xs text-muted">{sel.market}:{sel.symbol} · {sel.exchange}</div>
        <div className="text-2xl font-semibold">{sel.name}</div>
      </div>
      <div className="text-right">
        <div className="text-xs text-muted">실시간 현재가</div>
        <div className="text-3xl font-semibold tabular-nums">
          {quote ? formatPrice(quote.price, sel.market) : "—"}
        </div>
        {quote && (
          <div className={`text-xs ${isUp ? "text-up" : "text-down"} tabular-nums`}>
            {quote.change > 0 ? "+" : ""}{formatPrice(quote.change, sel.market)} · {quote.changePct.toFixed(2)}%
            <span className="ml-2 text-muted">{quote.source}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function formatPrice(v: number, market: string): string {
  if (market === "KR") return v.toLocaleString("ko-KR");
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
