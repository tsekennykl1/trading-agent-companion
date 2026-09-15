// Small, dependency-free helpers for reading messy JSON from the engine.
// Every engine build spells its fields slightly differently, so these
// functions accept anything and return a clean value or `undefined`.

/** Best-effort number reader: accepts numbers, strings ("1,234.5") and objects. */
function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const normalized = v.replace(/,/g, "");
    const match = normalized.match(/-?\d+(?:\.\d+)?/);
    if (match) {
      const parsed = Number(match[0]);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const key of ["value", "price", "level", "mid", "lower", "min", "from"]) {
      const parsed = num(o[key]);
      if (parsed !== undefined) return parsed;
    }
  }
  return undefined;
}

/** "risk_level" -> "Risk Level" */
function titleCase(value: string): string {
  return value.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const STANCE_FROM_TEXT: [RegExp, number][] = [
  [/bullish|positive|strong|high/i, 60],
  [/bearish|negative|weak/i, -60],
  [/mixed|neutral|moderate|medium|elevated/i, 10],
];

function stanceScore(text: string): { stance: "bullish" | "bearish" | "neutral"; score: number } {
  for (const [re, score] of STANCE_FROM_TEXT) {
    if (re.test(text)) {
      return { stance: score > 30 ? "bullish" : score < -30 ? "bearish" : "neutral", score };
    }
  }
  return { stance: "neutral", score: 0 };
}

/** Turns a list of numbers (or objects holding one) into a plain number list. */
const numberList = (value: unknown): number[] =>
  Array.isArray(value)
    ? (value
        .map((v) =>
          v && typeof v === "object"
            ? num((v as Record<string, unknown>)["price"] ?? (v as Record<string, unknown>)["value"] ?? (v as Record<string, unknown>)["level"])
            : num(v),
        )
        .filter((v) => v !== undefined) as number[])
    : [];

/** Lowercase a name and strip punctuation, so "MACD_Signal" -> "macdsignal". */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Reads the date of a dated point, whatever the engine called the field. */
const pointDate = (o: Record<string, unknown>) =>
  String(o["t"] ?? o["date"] ?? o["Date"] ?? o["time"] ?? o["timestamp"] ?? o["x"] ?? "").slice(0, 10);
