import { useMemo, useState } from "react";
import EventInput from "./components/EventInput";
import VrlEditor from "./components/VrlEditor";
import ResultPanel from "./components/ResultPanel";
import DiagnosticsPanel from "./components/DiagnosticsPanel";
import { runVrl, isErr, type VrlResult } from "./vrl/runner";
import { DEFAULT_LOG, DEFAULT_VRL } from "./samples";

type Mode = "json" | "raw";

export default function App() {
  const [logText, setLogText] = useState(DEFAULT_LOG);
  const [mode, setMode] = useState<Mode>("json");
  const [vrlText, setVrlText] = useState(DEFAULT_VRL);
  const [result, setResult] = useState<VrlResult | null>(null);
  const [running, setRunning] = useState(false);
  const [clientErr, setClientErr] = useState<string | null>(null);

  const parseError = useMemo(() => {
    if (mode !== "json") return null;
    try {
      JSON.parse(logText);
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }, [logText, mode]);

  const onRun = async () => {
    setClientErr(null);
    let event: unknown;
    if (mode === "json") {
      try {
        event = JSON.parse(logText);
      } catch (e) {
        setClientErr(`Invalid JSON: ${(e as Error).message}`);
        setResult(null);
        return;
      }
    } else {
      event = { message: logText };
    }
    setRunning(true);
    try {
      const r = await runVrl(vrlText, event);
      setResult(r);
    } catch (e) {
      setClientErr(`WASM error: ${(e as Error).message}`);
      setResult(null);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">
            <span className="dot" />QUARRY VRL
          </span>
          <span className="sub">Vector Remap Language Tester</span>
        </div>
        <nav className="nav">
          <a
            href="https://vector.dev/docs/reference/vrl/"
            target="_blank"
            rel="noreferrer"
          >
            VRL
          </a>
          <a
            href="https://vector.dev/docs/reference/vrl/functions/"
            target="_blank"
            rel="noreferrer"
          >
            Functions
          </a>
          <a
            className="pill"
            href="https://vector.dev/docs/reference/vrl/expressions/"
            target="_blank"
            rel="noreferrer"
          >
            Docs ↗
          </a>
        </nav>
      </header>

      <section className="hero">
        <div>
          <h2>
            로그를 <span className="accent">정확하게</span> 파싱하세요.
          </h2>
          <p>원시 로그와 VRL 파서를 입력하고 Run Test를 누르면 결과·진단이 표시됩니다.</p>
        </div>
        <span className="meta-tag">VRL · WASM RUNTIME</span>
      </section>

      <main className="grid">
        <div className="col">
          <EventInput
            value={logText}
            onChange={setLogText}
            mode={mode}
            onModeChange={setMode}
            parseError={parseError}
          />
          <VrlEditor value={vrlText} onChange={setVrlText} />
          <div className="run-row">
            <button
              type="button"
              className="run"
              onClick={onRun}
              disabled={running || (mode === "json" && parseError !== null)}
            >
              {running ? "실행 중…" : "Run Test"}
            </button>
            {clientErr && <span className="hint err">{clientErr}</span>}
          </div>
        </div>

        <div className="col">
          {result === null && !clientErr && (
            <section className="panel placeholder">
              <p>좌측에 로그와 VRL을 입력하고 <b>Run Test</b>를 눌러주세요.</p>
              <p>최초 실행 시 WASM 모듈을 로드합니다(수백 KB).</p>
            </section>
          )}
          {result !== null && isErr(result) && <DiagnosticsPanel result={result} />}
          {result !== null && !isErr(result) && <ResultPanel result={result} />}
        </div>
      </main>
    </div>
  );
}
