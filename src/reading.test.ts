import { describe, expect, it } from "vitest";
import { parseLookup } from "./enhance";
import { rollError, dieRange } from "./rollbox";
import { keepD20 } from "./dice";
import { prefillFrom, sheetMarkdown } from "./sheet";

describe("lookup lists", () => {
  it("reads a labelled modifier lookup", () => {
    const l = parseLookup("Score to modifier: 1 = -5; 2-3 = -4; 4-5 = -3; 6-7 = -2; 8-9 = -1; 10-11 = 0; 12-13 = +1; 14-15 = +2; 16-17 = +3; 18-19 = +4; 20 = +5.");
    expect(l?.label).toBe("Score to modifier");
    expect(l?.pairs.length).toBe(11);
    expect(l?.pairs[1]).toEqual(["2-3", "-4"]);
    expect(l?.pairs[10]).toEqual(["20", "+5"]);
  });
  it("reads a table cell with units and a closing note", () => {
    const l = parseLookup("1-3: 10 lb; 4-6: 20; 7-9: 30; 10-12: 40");
    expect(l?.pairs[0]).toEqual(["1-3", "10 lb"]);
    const s = parseLookup("12: 40; 13-15: 45; 16-18: 50; 19-20: 55 (minimum DEX is 12)");
    expect(s?.note).toBe("minimum DEX is 12");
  });
  it("leaves prose alone", () => {
    expect(parseLookup("Your hit points grow each level by one d8 roll with your CON mod added.")).toBeNull();
    expect(parseLookup("1 = one; but this is a sentence; not a list")).toBeNull();
  });
});

describe("roll entry", () => {
  it("knows each die's range", () => {
    expect(dieRange("d20")).toEqual([1, 20]);
    expect(dieRange("2d6")).toEqual([2, 12]);
    expect(dieRange("1d4")).toEqual([1, 4]);
  });
  it("explains a bad entry", () => {
    expect(rollError("14")).toBe("");
    expect(rollError("")).toBe("");
    expect(rollError("1a")).toMatch(/^Numbers only/);
    expect(rollError("0")).toMatch(/too low/);
    expect(rollError("21")).toMatch(/21 is too high\. A d20 shows 1 to 20\./);
    expect(rollError("13", "2d6")).toMatch(/2d6 adds up to 2 to 12/);
    expect(rollError("1", "2d6")).toMatch(/too low/);
  });
});

describe("advantage", () => {
  it("keeps the higher or lower d20", () => {
    expect(keepD20(1, 4, 17)).toBe(17);
    expect(keepD20(-1, 4, 17)).toBe(4);
    expect(keepD20(0, 4, 17)).toBe(4);
  });
});

describe("character sheet", () => {
  it("pre-fills a live character from the inbox profile", () => {
    const v = prefillFrom({ name: "Test Hero", cls: "Mage (Scholar)", level: 3, pb: 2,
      abilities: { str: 8, dex: 14, con: 12, int: 16, wis: 10, cha: 0 }, saves: [], skills: ["arcana", "sleight-of-hand"], expertise: [], derived: [] }, "Fallback");
    expect(v["f-name"]).toBe("Test Hero");
    expect(v["f-class"]).toBe("Mage (Scholar)");
    expect(v["f-int"]).toBe("16");
    expect(v["f-cha"]).toBeUndefined();
    expect(v["f-skill2"]).toBe("Sleight of Hand");
    expect(prefillFrom(null, "Only A Name")).toEqual({ "f-name": "Only A Name" });
  });
  it("writes Markdown with marks for required and blank fields", () => {
    const md = sheetMarkdown([{ part: "Stats", rows: [
      { label: "STR", value: "14", req: false, score: true },
      { label: "Anchor", value: "", req: true, score: false }] }],
      { name: "Test Hero", kind: "new", owner: "Pip", date: new Date("2026-11-27T00:00:00Z") });
    expect(md).toMatch(/^# Character sheet: Test Hero/);
    expect(md).toContain("drafted by Pip");
    expect(md).toContain("- **STR:** 14 (+2)");
    expect(md).toContain("- **Anchor *:** (blank)");
  });
});
