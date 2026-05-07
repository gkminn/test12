import type { VrlOk } from "../vrl/runner";

type Props = { result: VrlOk };

export default function ResultPanel({ result }: Props) {
  const json = JSON.stringify(result.target_value, null, 2);
  const elapsed =
    result.elapsed_time === null
      ? "n/a"
      : `${result.elapsed_time.toFixed(3)} ms`;
  return (
    <section className="panel">
      <header className="panel-head">
        <h2>
          결과 <span className="badge ok">OK</span>
        </h2>
        <span className="meta">elapsed: {elapsed}</span>
      </header>
      <pre className="code out">{json}</pre>
    </section>
  );
}
