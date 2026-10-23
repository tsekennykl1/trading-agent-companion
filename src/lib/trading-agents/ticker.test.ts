import { describe, expect, it } from "vitest";
import { classifyTicker } from "./ticker";

const list = { "0700": ["TENCENT", "騰訊控股"], "2318": ["PING AN", "中國平安"] };

describe("classifyTicker", () => {
  it("treats a numeric code on the HK list as an HK stock, zero-padded", () => {
    expect(classifyTicker("700", list)).toEqual({ kind: "hk", code: "0700", ticker: "0700.HK" });
  });
  it("accepts a code typed with the .HK suffix", () => {
    expect(classifyTicker("2318.hk", list)).toEqual({ kind: "hk", code: "2318", ticker: "2318.HK" });
  });
  it("flags a numeric code missing from the HK list", () => {
    expect(classifyTicker("9998", list)).toEqual({ kind: "unlisted", code: "9998" });
  });
  it("sends a ticker containing letters as a non-HK stock", () => {
    expect(classifyTicker("aapl", list)).toEqual({ kind: "other", ticker: "AAPL" });
  });
});
