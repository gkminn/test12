import { useState } from "react";
import { useApp } from "../store";

interface Msg { role: "user" | "assistant"; content: string }

export function Chatbot() {
  const sel = useApp(s => s.selected);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: `${sel.name}에 대해 무엇이 궁금하세요?` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const next = [...messages, userMsg];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          market: sel.market, symbol: sel.symbol, name: sel.name,
          messages: next,
        }),
      });
      if (!res.ok || !res.body) throw new Error("chat failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const ev = JSON.parse(data);
            if (ev.text) {
              acc += ev.text;
              setMessages(curr => {
                const cp = [...curr];
                cp[cp.length - 1] = { role: "assistant", content: acc };
                return cp;
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      setMessages(curr => {
        const cp = [...curr];
        cp[cp.length - 1] = { role: "assistant", content: `(오류: ${(e as Error).message})` };
        return cp;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[420px] px-4 py-3">
      <div className="flex-1 overflow-auto space-y-2">
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[85%] text-sm rounded-lg px-3 py-2 ${m.role === "user" ? "bg-baseline/20 ml-auto" : "bg-panel border border-border"}`}>
            {m.content || <span className="text-muted">…</span>}
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") send(); }}
          placeholder="질문 입력…"
          className="flex-1 bg-panel2 border border-border rounded-md px-3 py-2 text-sm outline-none"
        />
        <button onClick={send} disabled={loading} className="px-3 py-2 bg-baseline/20 border border-baseline rounded-md text-sm">전송</button>
      </div>
    </div>
  );
}
