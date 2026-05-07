# AutoStock AI

검색 → AI 예측 → 근거 분석을 한 화면에 보여주는 한국·미국 주식 분석 데모.

```
apps/
  api/    Fastify + yahoo-finance2 + Claude
  web/    Vite + React + TypeScript + lightweight-charts
packages/
  shared/ 양쪽이 공유하는 타입
```

데이터는 **Yahoo Finance** 한 곳에서 가져옵니다. 한국 종목은 코드 뒤에
`.KS`(KOSPI) / `.KQ`(KOSDAQ) 를 자동으로 붙여 호출하므로 별도 증권 계좌나
KIS API 키가 필요하지 않습니다. (15~20분 지연 시세)

## 빠른 시작

```bash
# 1) 의존성 설치
npm install

# 2) (선택) Anthropic 키만 채우면 끝
cp .env.example .env
#   ANTHROPIC_API_KEY=sk-ant-...

# 3) 동시 기동 (web=5173, api=5174)
npm run dev
```

브라우저에서 `http://localhost:5173` 접속 → 검색창에 종목명(예: "한온시스템", "AAPL") 입력.

## 주요 화면

- 실시간(폴링) 현재가 헤더
- 1m / 5m / 15m / 1h / 1d 인터벌 전환
- 캔들 차트 위에 Claude의 상승·하락 시나리오, 기준선, 신뢰 밴드, 적중률 뱃지
- 하단 탭: 예측 / 근거 / 즐겨찾기 / 개선 / 챗봇
- 근거 패널: RSI, MACD, 볼린저, ATR, VWAP, OBV, MFI, 시장지수, FX, 뉴스 흐름

## 환경변수

| Name | 설명 |
|---|---|
| `ANTHROPIC_API_KEY` | 미설정 시 ATR 기반 합성 시나리오로 fallback |
| `PORT_API` | 기본 5174 |

## 테스트

```bash
npm test     # vitest로 indicators 단위 테스트
```

## 면책

본 화면의 예측·근거는 투자 참고용 데이터입니다. 매매 결정 및 손실 책임은 사용자 본인에게 있습니다.
