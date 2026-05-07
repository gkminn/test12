import type { VrlErr } from "../vrl/runner";

type Props = { result: VrlErr };

export default function DiagnosticsPanel({ result }: Props) {
  return (
    <section className="panel">
      <header className="panel-head">
        <h2>
          결과 <span className="badge err">ERROR</span>
        </h2>
      </header>
      <pre className="code out err-out">{result.msg}</pre>
      {result.list.length > 1 && (
        <details className="details">
          <summary>{result.list.length}개 진단 요약</summary>
          <ul>
            {result.list.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
