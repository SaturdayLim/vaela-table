import { describe, expect, it } from "vitest";
import { rollDie } from "./dice";

describe("dice tray", () => {
  it("rolls every face of a d20 and nothing outside 1..20", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 4000; i++) {
      const r = rollDie(20);
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(20);
      seen.add(r);
    }
    expect(seen.size).toBe(20);
  });

  it("handles d100", () => {
    for (let i = 0; i < 500; i++) expect(rollDie(100)).toBeLessThanOrEqual(100);
  });
});
