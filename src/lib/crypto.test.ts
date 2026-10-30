import { describe, expect, it } from "vitest";
import { sealInbox, openInbox, normaliseCode, WrongCode } from "./crypto.js";
import { modifier } from "./rules";

const items = [
  { id: "sheet", kind: "sheet", title: "Test Sheet", body: "Numbers." },
  { id: "001-hello", kind: "letter", title: "Letter 001", body: "A private line." },
];

describe("sealed inbox", () => {
  it("opens with the right code, typed loosely", async () => {
    const sealed = await sealInbox({ slug: "t", name: "Tess", code: "AB12-CD34-EF56", items, iterations: 1000 });
    expect(sealed.letters).toBe(1);
    expect(sealed.newest).toBe("001-hello");
    expect(JSON.stringify(sealed)).not.toContain("private line");
    const opened = await openInbox(sealed, "ab12 cd34 ef56");
    expect(opened.items).toEqual(items);
  });

  it("refuses a wrong code", async () => {
    const sealed = await sealInbox({ slug: "t", name: "Tess", code: "AB12-CD34-EF56", items, iterations: 1000 });
    await expect(openInbox(sealed, "AB12-CD34-EF57")).rejects.toBeInstanceOf(WrongCode);
  });

  it("normalises codes", () => {
    expect(normaliseCode(" k7qf-m2xd 9pra ")).toBe("K7QFM2XD9PRA");
  });
});

describe("ability modifier (D15)", () => {
  it("is floor((score - 10) / 2)", () => {
    expect([1, 3, 7, 9, 10, 11, 12, 18, 20].map(modifier)).toEqual(["-5", "-4", "-2", "-1", "+0", "+0", "+1", "+4", "+5"]);
    expect(modifier(0)).toBe("");
    expect(modifier("x")).toBe("");
  });
});
