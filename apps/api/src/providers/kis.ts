import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Candle, Interval, Quote } from "@autostock/shared";
import { env, KIS_BASE } from "../env.js";

const TOKEN_FILE = resolve(process.cwd(), ".kis-token.json");

interface CachedToken {
  access_token: string;
  expires_at: number;       // unix seconds
  env: "prod" | "vts";
}

let memoryToken: CachedToken | null = null;
let inflight: Promise<string> | null = null;

async function readDiskToken(): Promise<CachedToken | null> {
  try {
    const raw = await readFile(TOKEN_FILE, "utf-8");
    return JSON.parse(raw) as CachedToken;
  } catch {
    return null;
  }
}

async function writeDiskToken(t: CachedToken) {
  await writeFile(TOKEN_FILE, JSON.stringify(t, null, 2), "utf-8");
}

async function fetchNewToken(): Promise<string> {
  if (!env.KIS_APP_KEY || !env.KIS_APP_SECRET) {
    throw new Error("KIS_APP_KEY/KIS_APP_SECRET not set");
  }
  const res = await fetch(`${KIS_BASE}/oauth2/tokenP`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: env.KIS_APP_KEY,
      appsecret: env.KIS_APP_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`KIS token failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  const cached: CachedToken = {
    access_token: data.access_token,
    expires_at: Math.floor(Date.now() / 1000) + (data.expires_in ?? 86400) - 600,
    env: env.KIS_ENV,
  };
  memoryToken = cached;
  await writeDiskToken(cached);
  return cached.access_token;
}

export async function getKisToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (memoryToken && memoryToken.env === env.KIS_ENV && memoryToken.expires_at > now) {
    return memoryToken.access_token;
  }
  const disk = await readDiskToken();
  if (disk && disk.env === env.KIS_ENV && disk.expires_at > now) {
    memoryToken = disk;
    return disk.access_token;
  }
  if (inflight) return inflight;
  inflight = fetchNewToken().finally(() => { inflight = null; });
  return inflight;
}

interface KisHeaders {
  appkey?: string;
  appsecret?: string;
  authorization?: string;
  tr_id: string;
  custtype?: "P" | "B";
}

async function kisGet<T>(path: string, query: Record<string, string>, trId: string): Promise<T> {
  const token = await getKisToken();
  const url = new URL(KIS_BASE + path);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const headers: Record<string, string> = {
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
    appkey: env.KIS_APP_KEY,
    appsecret: env.KIS_APP_SECRET,
    tr_id: trId,
    custtype: "P",
  };
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`KIS ${path} failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

interface KisQuoteResp {
  output: {
    stck_prpr: string;        // 현재가
    prdy_vrss: string;        // 전일대비
    prdy_ctrt: string;        // 전일대비율 %
    stck_prdy_clpr: string;   // 전일종가
  };
}

export async function getKrQuote(symbol: string): Promise<Quote> {
  const data = await kisGet<KisQuoteResp>(
    "/uapi/domestic-stock/v1/quotations/inquire-price",
    { FID_COND_MRKT_DIV_CODE: "J", FID_INPUT_ISCD: symbol },
    "FHKST01010100",
  );
  const o = data.output;
  return {
    symbol,
    market: "KR",
    price: Number(o.stck_prpr),
    change: Number(o.prdy_vrss),
    changePct: Number(o.prdy_ctrt),
    prevClose: Number(o.stck_prdy_clpr),
    asOf: Math.floor(Date.now() / 1000),
    source: "KIS REST",
  };
}

interface KisDailyResp {
  output: Array<{
    stck_bsop_date: string;   // YYYYMMDD
    stck_oprc: string;
    stck_hgpr: string;
    stck_lwpr: string;
    stck_clpr: string;
    acml_vol: string;
  }>;
}

interface KisIntradayResp {
  output2: Array<{
    stck_bsop_date: string;   // YYYYMMDD
    stck_cntg_hour: string;   // HHMMSS
    stck_oprc: string;
    stck_hgpr: string;
    stck_lwpr: string;
    stck_prpr: string;
    cntg_vol: string;
  }>;
}

function parseYmd(d: string): number {
  // YYYYMMDD -> unix seconds at 00:00 KST (=> 15:00 UTC prev day). Return KRX trading-day open epoch.
  const y = Number(d.slice(0, 4));
  const m = Number(d.slice(4, 6)) - 1;
  const day = Number(d.slice(6, 8));
  // Use UTC noon to keep the date stable across timezones.
  return Math.floor(Date.UTC(y, m, day, 0, 0, 0) / 1000);
}

function parseYmdHms(d: string, t: string): number {
  const y = Number(d.slice(0, 4));
  const mo = Number(d.slice(4, 6)) - 1;
  const da = Number(d.slice(6, 8));
  const h = Number(t.slice(0, 2));
  const mi = Number(t.slice(2, 4));
  const s = Number(t.slice(4, 6));
  // KIS reports KST. KST = UTC+9.
  return Math.floor(Date.UTC(y, mo, da, h - 9, mi, s) / 1000);
}

export async function getKrDailyCandles(symbol: string, limit = 200): Promise<Candle[]> {
  const today = new Date();
  const end = ymd(today);
  const start = ymd(new Date(today.getTime() - limit * 2 * 86400_000));
  const data = await kisGet<KisDailyResp>(
    "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice",
    {
      FID_COND_MRKT_DIV_CODE: "J",
      FID_INPUT_ISCD: symbol,
      FID_INPUT_DATE_1: start,
      FID_INPUT_DATE_2: end,
      FID_PERIOD_DIV_CODE: "D",
      FID_ORG_ADJ_PRC: "0",
    },
    "FHKST03010100",
  );
  const rows = (data.output ?? []).filter(r => r.stck_bsop_date);
  return rows
    .map(r => ({
      time: parseYmd(r.stck_bsop_date),
      open: Number(r.stck_oprc),
      high: Number(r.stck_hgpr),
      low: Number(r.stck_lwpr),
      close: Number(r.stck_clpr),
      volume: Number(r.acml_vol),
    }))
    .sort((a, b) => a.time - b.time)
    .slice(-limit);
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${da}`;
}

export async function getKrMinuteCandles(symbol: string, intervalMin: 1 | 5 | 15 | 60, limit = 200): Promise<Candle[]> {
  // KIS intraday endpoint returns 30 records per call ending at FID_INPUT_HOUR_1 (HHMMSS, KST).
  const out: Candle[] = [];
  let cursor = "153000";
  let safety = 0;
  while (out.length < limit && safety++ < 12) {
    const data = await kisGet<KisIntradayResp>(
      "/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice",
      {
        FID_ETC_CLS_CODE: "",
        FID_COND_MRKT_DIV_CODE: "J",
        FID_INPUT_ISCD: symbol,
        FID_INPUT_HOUR_1: cursor,
        FID_PW_DATA_INCU_YN: "Y",
      },
      "FHKST03010200",
    );
    const rows = data.output2 ?? [];
    if (rows.length === 0) break;
    const mapped = rows
      .filter(r => r.stck_cntg_hour && r.stck_bsop_date)
      .map(r => ({
        time: parseYmdHms(r.stck_bsop_date, r.stck_cntg_hour),
        open: Number(r.stck_oprc),
        high: Number(r.stck_hgpr),
        low: Number(r.stck_lwpr),
        close: Number(r.stck_prpr),
        volume: Number(r.cntg_vol),
      }));
    out.push(...mapped);
    const oldest = mapped[mapped.length - 1];
    if (!oldest) break;
    const d = new Date(oldest.time * 1000);
    const h = String((d.getUTCHours() + 9) % 24).padStart(2, "0");
    const m = String(d.getUTCMinutes()).padStart(2, "0");
    cursor = `${h}${m}00`;
  }
  // Aggregate 1-minute bars to the requested interval.
  out.sort((a, b) => a.time - b.time);
  const bucketed = aggregate(out, intervalMin * 60);
  return bucketed.slice(-limit);
}

function aggregate(bars: Candle[], stepSec: number): Candle[] {
  if (stepSec === 60) return bars;
  const buckets: Record<number, Candle> = {};
  for (const b of bars) {
    const k = Math.floor(b.time / stepSec) * stepSec;
    const cur = buckets[k];
    if (!cur) {
      buckets[k] = { ...b, time: k };
    } else {
      cur.high = Math.max(cur.high, b.high);
      cur.low = Math.min(cur.low, b.low);
      cur.close = b.close;
      cur.volume += b.volume;
    }
  }
  return Object.values(buckets).sort((a, b) => a.time - b.time);
}

export async function getKrCandles(symbol: string, interval: Interval, limit = 200): Promise<Candle[]> {
  if (interval === "1d") return getKrDailyCandles(symbol, limit);
  const map: Record<Exclude<Interval, "1d">, 1 | 5 | 15 | 60> = {
    "1m": 1, "5m": 5, "15m": 15, "1h": 60,
  };
  return getKrMinuteCandles(symbol, map[interval], limit);
}
