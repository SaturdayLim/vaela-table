import { describe, expect, it } from "vitest";
import { parseLookup } from "./enhance";
import { rollError, dieRange } from "./rollbox";
import { keepD20 } from "./dice";
import { prefillFrom, sheetMarkdown } from "./sheet";
import { randomGolgotha } from "./premade";
import html from "../index.html?raw";

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

describe("pre-made Golgotha characters", () => {
  const req = [...html.matchAll(/id="(f-[a-z0-9-]+)"[^>]*data-req/g)].map((m) => m[1]);
  const options = (id: string) => {
    const m = html.match(new RegExp(`<select[^>]*id="${id}"[^>]*>([\s\S]*?)</select>`));
    return m ? [...m[1].matchAll(/<option[^>]*>([^<]*)<\/option>/g)].map((o) => o[1].replace(/&amp;/g, "&")) : null;
  };
  it("fills every required field, from Golgotha, with valid choices", () => {
    expect(req.length).toBeGreaterThan(10);
    for (let n = 0; n < 200; n++) {
      const v = randomGolgotha();
      for (const id of req) expect(v[id], id).toBeTruthy();
      expect(v["f-region"]).toBe("Golgotha");
      for (const [id, val] of Object.entries(v)) {
        const opts = options(id);
        if (opts) expect(opts, `${id}=${val}`).toContain(val);
      }
      for (const a of ["str", "dex", "con", "int", "wis", "cha"]) {
        const s = Number(v[`f-${a}`]); expect(s >= 1 && s <= 20).toBe(true);
      }
      expect(new Set([1, 2, 3, 4].map((i) => v[`f-skill${i}`])).size).toBe(4);
      expect(v["f-lines"]).toBeUndefined();
    }
  });
  it("labels the Markdown as ready to play", () => {
    const md = sheetMarkdown([], { name: "Wren Coldshaft", kind: "premade", owner: "Pip", date: new Date("2026-11-27T00:00:00Z") });
    expect(md).toContain("Ready to play: no Session 0");
  });
});
