import Fuse from "fuse.js";
import type { Market, SearchResult, SymbolInfo } from "@autostock/shared";
import krRaw from "./kr.json" with { type: "json" };
import usRaw from "./us.json" with { type: "json" };

const HANGUL_CHO = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];

function chosung(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.charCodeAt(0) - 0xac00;
    if (code >= 0 && code <= 11171) {
      out += HANGUL_CHO[Math.floor(code / 588)];
    } else {
      out += ch;
    }
  }
  return out;
}

interface CatalogEntry extends SymbolInfo {
  cho: string;
}

const kr: CatalogEntry[] = (krRaw as Array<Omit<SymbolInfo, "market">>).map(r => ({
  ...r, market: "KR" as Market, cho: chosung(r.name),
}));
const us: CatalogEntry[] = (usRaw as Array<Omit<SymbolInfo, "market">>).map(r => ({
  ...r, market: "US" as Market, cho: r.name,
}));

const all: CatalogEntry[] = [...kr, ...us];

const fuse = new Fuse(all, {
  keys: ["name", "symbol", "cho"],
  threshold: 0.4,
  ignoreLocation: true,
  includeScore: true,
});

export function search(q: string, limit = 10): SearchResult[] {
  if (!q.trim()) return [];
  const results = fuse.search(q, { limit });
  return results.map(r => ({
    symbol: r.item.symbol,
    name: r.item.name,
    market: r.item.market,
    exchange: r.item.exchange,
    score: 1 - (r.score ?? 0),
  }));
}

export function findSymbol(market: Market, symbol: string): SymbolInfo | undefined {
  return all.find(s => s.market === market && s.symbol.toUpperCase() === symbol.toUpperCase());
}
