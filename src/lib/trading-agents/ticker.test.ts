import { describe, expect, it } from "vitest";
import { classifyTicker } from "./ticker";
import { suggestUsSecurities, type UsSecurities } from "./us-securities";

const list = { "0700": ["TENCENT", "騰訊控股"], "2318": ["PING AN", "中國平安"] };
const us: UsSecurities = {
  AAPL: ["Apple Inc.", null, "NASDAQ"],
  "BRK-B": ["Berkshire Hathaway Inc. New", null, "NYSE"],
  A: ["Agilent Technologies Inc.", null, "NYSE"],
  AA: ["Alcoa Corp", null, "NYSE"],
  PINE: ["Alpine Income Property Trust", null, "NYSE"],
};

describe("classifyTicker", () => {
  it("treats a numeric code on the HK list as an HK stock, zero-padded", () => {
    expect(classifyTicker("700", list, us)).toEqual({ kind: "hk", code: "0700", ticker: "0700.HK" });
  });
  it("accepts a code typed with the .HK suffix", () => {
    expect(classifyTicker("2318.hk", list, us)).toEqual({ kind: "hk", code: "2318", ticker: "2318.HK" });
  });
  it("flags a numeric code missing from the HK list", () => {
    expect(classifyTicker("9998", list, us)).toEqual({ kind: "unlisted", code: "9998" });
  });
  it("treats a letter code on the US list as a US stock", () => {
    expect(classifyTicker("aapl", list, us)).toEqual({ kind: "us", ticker: "AAPL" });
  });
  it("maps a dotted share class to the US list's dash form", () => {
    expect(classifyTicker("brk.b", list, us)).toEqual({ kind: "us", ticker: "BRK-B" });
  });
  it("sends an unknown letter code as typed", () => {
    expect(classifyTicker("7203.t", list, us)).toEqual({ kind: "other", ticker: "7203.T" });
  });
});

describe("suggestUsSecurities", () => {
  it("lists ticker prefix matches shortest first, then name matches", () => {
    expect(suggestUsSecurities("a", us).map(([t]) => t)).toEqual(["A", "AA", "AAPL", "BRK-B", "PINE"]);
  });
  it("matches company names when no ticker starts with the text", () => {
    expect(suggestUsSecurities("alpine", us).map(([t]) => t)).toEqual(["PINE"]);
  });
});
