import type { ChangeEvent } from "react";

type Props = { value: string; onChange: (v: string) => void };

export default function VrlEditor({ value, onChange }: Props) {
  const onText = (e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value);
  return (
    <section className="panel">
      <header className="panel-head">
        <h2>VRL 파서</h2>
        <a
          className="link"
          href="https://vector.dev/docs/reference/vrl/functions/"
          target="_blank"
          rel="noreferrer"
        >
          docs ↗
        </a>
      </header>
      <textarea
        className="code"
        spellCheck={false}
        value={value}
        onChange={onText}
        placeholder=". = parse_regex!(.message, r'...')"
      />
    </section>
  );
}
