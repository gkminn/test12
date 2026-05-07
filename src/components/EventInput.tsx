import type { ChangeEvent } from "react";

type Mode = "json" | "raw";

type Props = {
  value: string;
  onChange: (v: string) => void;
  mode: Mode;
  onModeChange: (m: Mode) => void;
  parseError: string | null;
};

export default function EventInput({ value, onChange, mode, onModeChange, parseError }: Props) {
  const onText = (e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value);
  return (
    <section className="panel">
      <header className="panel-head">
        <h2>입력 로그</h2>
        <div className="seg">
          <button
            className={mode === "json" ? "seg-active" : ""}
            onClick={() => onModeChange("json")}
            type="button"
          >
            JSON
          </button>
          <button
            className={mode === "raw" ? "seg-active" : ""}
            onClick={() => onModeChange("raw")}
            type="button"
          >
            Raw
          </button>
        </div>
      </header>
      <textarea
        className="code"
        spellCheck={false}
        value={value}
        onChange={onText}
        placeholder={
          mode === "json"
            ? '{"message":"...","host":"..."}'
            : "원시 로그 라인을 입력하세요 (.message 로 들어갑니다)"
        }
      />
      {parseError && <div className="hint err">JSON 파싱 오류: {parseError}</div>}
      {mode === "raw" && (
        <div className="hint">Raw 모드: 입력 텍스트가 <code>{"{ message: <input> }"}</code> 로 감싸집니다.</div>
      )}
    </section>
  );
}
