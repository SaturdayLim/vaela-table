// The character sheet (table/DESIGN.md, "Character sheet").
// The picker holds the player's own character (from the open inbox) and any new characters they drafted here.
// A new character belongs to the player who drafted it; the DM gives it its own inbox code after its Session 0.
// Nothing leaves the device except by Copy or Download (Markdown), which the player sends to the DM.
import { modifier } from "./lib/rules";
import type { Profile } from "./enhance";
import { randomGolgotha } from "./premade";

const STORE = "vaela-sheet-v2";
const OLD_STORE = "au1-sheet-v1";
type Values = Record<string, string>;
type Draft = { id: string; owner: string; values: Values; saved: string; premade?: boolean };
type Saved = { drafts: Draft[]; live: Record<string, Values> };
type Live = { slug: string; name: string; profile: Profile | null };

const SKILL_NAMES: Record<string, string> = {
  "animal-handling": "Animal Handling", "sleight-of-hand": "Sleight of Hand",
};
const ABIL_FIELDS = ["str", "dex", "con", "int", "wis", "cha"];

let live: Live | null = null;
let onIdentity: (() => void) | null = null;

/** Main calls this when an inbox opens (or locks): the sheet offers that character, pre-filled. */
export function setSheetIdentity(next: Live | null) {
  live = next;
  onIdentity?.();
}

function read(): Saved {
  try {
    const s = JSON.parse(localStorage.getItem(STORE) || "null") as Saved | null;
    if (s && Array.isArray(s.drafts)) return { drafts: s.drafts, live: s.live ?? {} };
  } catch { /* nothing saved */ }
  // The old single draft becomes a new-character draft.
  const fresh: Saved = { drafts: [], live: {} };
  try {
    const old = JSON.parse(localStorage.getItem(OLD_STORE) || "null") as Values | null;
    if (old && Object.values(old).some((v) => v && v.trim())) fresh.drafts.push({ id: newId(), owner: "", values: old, saved: new Date().toISOString() });
  } catch { /* nothing to carry over */ }
  return fresh;
}
function write(s: Saved) {
  try { localStorage.setItem(STORE, JSON.stringify(s)); return true; } catch { return false; }
}
function newId() { return "n" + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36); }

/** What the open inbox already knows about a live character. */
export function prefillFrom(p: Profile | null, name: string): Values {
  const v: Values = { "f-name": p?.name || name };
  if (!p) return v;
  if (p.cls) v["f-class"] = p.cls;
  for (const a of ABIL_FIELDS) {
    const score = p.abilities?.[a] ?? p.abilities?.[a.toUpperCase()];
    if (typeof score === "number" && score > 0) v[`f-${a}`] = String(score);
  }
  (p.skills ?? []).slice(0, 4).forEach((s, i) => {
    v[`f-skill${i + 1}`] = SKILL_NAMES[s] ?? s.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  });
  return v;
}

/** The sheet as Markdown, one bullet per field, grouped by page. */
export function sheetMarkdown(groups: { part: string; rows: { label: string; value: string; req: boolean; score: boolean }[] }[],
  meta: { name: string; kind: "live" | "new" | "premade"; owner: string; date: Date }) {
  const lines = [`# Character sheet: ${meta.name || "(unnamed)"}`, ""];
  lines.push(meta.kind === "live"
    ? `Live character${meta.owner ? ` (${meta.owner})` : ""}. Changes for the DM to review.`
    : meta.kind === "premade"
    ? `Pre-made character from Golgotha${meta.owner ? `, for ${meta.owner}` : ""}. Ready to play: no Session 0. The DM opens its inbox and it joins at the next turn.`
    : `New character${meta.owner ? `, drafted by ${meta.owner}` : ""}. Not live until every required field is filled and its Session 0 is played.`);
  lines.push(`Saved ${meta.date.toISOString().slice(0, 10)}. Required fields are marked *.`, "");
  for (const g of groups) {
    lines.push(`## ${g.part}`, "");
    for (const r of g.rows) {
      let v = r.value.trim();
      if (r.score && v) v = `${v} (${modifier(v)})`;
      lines.push(`- **${r.label}${r.req ? " *" : ""}:** ${v || "(blank)"}`);
    }
    lines.push("");
  }
  lines.push("HP, AC, RP, SP, Speed and Proficiency: the DM assigns them.");
  return lines.join("\n") + "\n";
}

export function initSheet(): void {
  const form = document.getElementById("char-sheet") as HTMLFormElement | null;
  if (!form) return;
  const fields = Array.from(form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(":is(input, select, textarea)[data-label]"));
  const reqFields = fields.filter((f) => f.hasAttribute("data-req"));
  const picker = document.getElementById("char") as HTMLSelectElement;
  const status = document.getElementById("status")!;
  const fallback = document.getElementById("fallback") as HTMLTextAreaElement;
  const clearBtn = document.getElementById("clear") as HTMLButtonElement;
  const saveBtn = document.getElementById("save") as HTMLButtonElement;
  const isQQ = (v: string) => v.trim() === "??";
  const filled = () => reqFields.filter((f) => f.value.trim() !== "").length;

  let saved = read();
  let current = "";       // "live:<slug>" or "new:<id>"
  let dirty = false;
  let pendingSwitch = ""; // a second pick with unsaved changes discards them

  const owner = () => live?.slug ?? "";
  const myDrafts = () => saved.drafts.filter((d) => d.owner === "" || d.owner === owner());

  const draft = () => saved.drafts.find((x) => `new:${x.id}` === current);

  /** Free text shows in full at a glance: a textarea grows to fit what is written (never below its rows). */
  function grow(t: HTMLTextAreaElement) {
    t.style.height = "";
    if (!t.offsetParent) return; // on a hidden subpage: sized when it is shown
    t.style.height = "auto";
    t.style.height = t.scrollHeight + 2 + "px";
  }
  form.addEventListener("input", (e) => { if (e.target instanceof HTMLTextAreaElement) grow(e.target); });
  const growAll = () => requestAnimationFrame(() => form.querySelectorAll<HTMLTextAreaElement>("textarea[data-label]").forEach(grow));
  window.addEventListener("hashchange", growAll);
  window.addEventListener("resize", growAll);

  function values(): Values {
    const v: Values = {};
    fields.forEach((f) => { if (f.value !== "") v[f.id] = f.value; });
    return v;
  }
  function fill(v: Values) {
    form!.querySelectorAll("option[data-kept]").forEach((o) => o.remove());
    fields.forEach((f) => {
      const want = v[f.id] ?? "";
      f.value = want;
      // A select whose exact option is missing takes the option the value starts with ("Mage (Scholar)" -> Mage).
      if (f instanceof HTMLSelectElement && want && f.value !== want) {
        const o = [...f.options].find((x) => x.value && want.toLowerCase().startsWith(x.value.toLowerCase()));
        if (o) f.value = o.value;
        else {
          // A free-text answer from an older sheet stays visible as its own choice rather than vanishing.
          const keep = document.createElement("option");
          keep.textContent = want; keep.dataset.kept = "1";
          f.appendChild(keep); f.value = want;
        }
      }
    });
    form!.querySelectorAll<HTMLTextAreaElement>("textarea[data-label]").forEach(grow);
    dirty = false;
    fallback.hidden = true;
    refresh();
  }

  function buildPicker() {
    picker.innerHTML = "";
    const add = (value: string, text: string) => { const o = document.createElement("option"); o.value = value; o.textContent = text; picker.appendChild(o); };
    if (live) add(`live:${live.slug}`, `${live.name} (your character)`);
    for (const d of myDrafts()) add(`new:${d.id}`, `${d.values["f-name"]?.trim() || "Unnamed"} (${d.premade ? "pre-made" : "new character"})`);
    add("create", "+ New character");
    add("random", "+ Random Golgotha character");
    if (![...picker.options].some((o) => o.value === current)) current = picker.options[0].value;
    picker.value = current;
  }

  function open(choice: string, quiet = false) {
    if (choice === "random") {
      const d: Draft = { id: newId(), owner: owner(), values: randomGolgotha(), saved: "", premade: true };
      saved.drafts.push(d);
      current = `new:${d.id}`;
      buildPicker();
      fill(d.values);
      dirty = true;
      refresh();
      say("A ready-made character from Golgotha. Change anything you like, set your Lines and Veils, then press Save.");
      return;
    }
    if (choice === "create") {
      const d: Draft = { id: newId(), owner: owner(), values: {}, saved: "" };
      saved.drafts.push(d);
      current = `new:${d.id}`;
      buildPicker();
      fill({});
      say(quiet ? "" : "New character started. Fill it in, then press Save to keep it on this device.");
      return;
    }
    current = choice;
    if (choice.startsWith("live:") && live) {
      fill({ ...prefillFrom(live.profile, live.name), ...(saved.live[live.slug] ?? {}) });
    } else {
      const d = saved.drafts.find((x) => `new:${x.id}` === choice);
      fill(d?.values ?? {});
    }
    say("");
  }

  function refresh() {
    document.querySelectorAll<HTMLElement>("[data-mod]").forEach((el) => {
      el.textContent = modifier((document.getElementById(el.dataset.mod!) as HTMLInputElement).value);
    });
    const isLive = current.startsWith("live:");
    const premade = !!draft()?.premade;
    const done = filled();
    const qq = fields.filter((f) => isQQ(f.value)).length;
    const mState = document.getElementById("m-state")!;
    const mReq = document.getElementById("m-req")!;
    const mQQ = document.getElementById("m-qq")!;
    mState.textContent = isLive ? "Live" : done === reqFields.length ? (premade ? "Pre-made: ready to play" : "Ready for Session 0") : "Draft: not live";
    mState.className = "sat-badge " + (isLive ? "badge-ok" : "sat-badge--muted");
    mReq.hidden = isLive;
    mReq.textContent = `${done} of ${reqFields.length} required`;
    mReq.className = "sat-badge " + (done === reqFields.length ? "badge-ok" : "sat-badge--muted");
    mQQ.hidden = isLive;
    mQQ.textContent = `?? used: ${qq} of 3`;
    mQQ.className = "sat-badge " + (qq > 3 ? "badge-warn" : "sat-badge--muted");
    clearBtn.textContent = isLive ? "Undo my changes" : "Delete draft";
    saveBtn.textContent = dirty ? "Save" : "Saved";
    saveBtn.toggleAttribute("aria-disabled", !dirty);
  }

  function save() {
    const v = values();
    if (current.startsWith("live:") && live) {
      saved.live[live.slug] = v;
    } else {
      const d = saved.drafts.find((x) => `new:${x.id}` === current);
      if (d) { d.values = v; d.saved = new Date().toISOString(); if (!d.owner) d.owner = owner(); }
    }
    const ok = write(saved);
    dirty = !ok;
    buildPicker();
    refresh();
    if (!ok) return say("Not saved: this browser blocks storage (private mode?). Use Copy or Download instead.", true);
    const missing = reqFields.length - filled();
    say(current.startsWith("live:")
      ? "Saved on this device. Send the changes to the DM with Copy or Download."
      : draft()?.premade && !missing ? "Saved. Ready to play, no Session 0: send it to the DM with Copy or Download."
      : missing ? `Saved on this device. ${missing} required field${missing > 1 ? "s" : ""} still blank before Session 0.` : "Saved. Ready for Session 0: send it to the DM with Copy or Download.");
  }

  function markdown() {
    const groups: Parameters<typeof sheetMarkdown>[0] = [];
    for (const f of fields) {
      const part = (f.closest("fieldset") as HTMLElement).dataset.label ?? "";
      if (groups[groups.length - 1]?.part !== part) groups.push({ part, rows: [] });
      groups[groups.length - 1].rows.push({ label: f.dataset.label!, value: f.value, req: f.hasAttribute("data-req"), score: (f as HTMLInputElement).type === "number" });
    }
    const name = (document.getElementById("f-name") as HTMLInputElement).value.trim();
    return { name, text: sheetMarkdown(groups, { name, kind: current.startsWith("live:") ? "live" : draft()?.premade ? "premade" : "new", owner: live?.name.split(" ")[0] ?? "", date: new Date() }) };
  }

  function say(msg: string, err = false) { status.textContent = msg; status.className = "status" + (err ? " err" : ""); }

  // ---- events ----
  picker.addEventListener("change", () => {
    const choice = picker.value;
    if (dirty && choice !== pendingSwitch) {
      pendingSwitch = choice;
      picker.value = current;
      say("Unsaved changes. Press Save first, or pick that character again to discard them.", true);
      return;
    }
    pendingSwitch = "";
    // An unsaved new draft that was never saved disappears when left.
    saved.drafts = saved.drafts.filter((d) => d.saved || `new:${d.id}` !== current);
    open(choice);
    buildPicker();
  });

  saveBtn.addEventListener("click", () => { if (dirty) save(); });

  document.getElementById("copy")!.addEventListener("click", () => {
    const { text } = markdown();
    const showFallback = () => {
      fallback.value = text; fallback.hidden = false; fallback.focus(); fallback.select();
      say("Clipboard unavailable here. The sheet is selected below: copy it by hand.", true);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => { fallback.hidden = true; say("Copied as Markdown. Paste it to the DM."); }, showFallback);
    } else showFallback();
  });

  document.getElementById("download")!.addEventListener("click", () => {
    const { name, text } = markdown();
    const file = `${(name || "character").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "character"}-sheet.md`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: file });
    document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    say(`Downloaded ${file}. Send it to the DM.`);
  });

  // Randomize: a d20 for each score (the Vaela rule), flickering briefly before it settles.
  const scoreInputs = ABIL_FIELDS.map((a) => document.getElementById(`f-${a}`) as HTMLInputElement);
  const d20 = () => { const b = new Uint32Array(1); crypto.getRandomValues(b); return 1 + (b[0] % 20); };
  document.getElementById("randomize")!.addEventListener("click", () => {
    const final = scoreInputs.map(() => d20());
    const settle = () => { scoreInputs.forEach((i, n) => { i.value = String(final[n]); }); dirty = true; refresh(); say("Rolled a d20 for each score. Press Save to keep them."); };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return settle();
    let ticks = 0;
    const t = window.setInterval(() => {
      scoreInputs.forEach((i) => { i.value = String(d20()); });
      refresh();
      if (++ticks >= 8) { window.clearInterval(t); settle(); }
    }, 45);
  });

  let armed = false;
  let armTimer: number | undefined;
  const disarm = () => { armed = false; clearBtn.classList.remove("armed"); refresh(); };
  clearBtn.addEventListener("click", () => {
    const isLive = current.startsWith("live:");
    if (!armed) {
      armed = true; clearBtn.classList.add("armed");
      clearBtn.textContent = isLive ? "Press again to undo" : "Press again to delete";
      armTimer = window.setTimeout(disarm, 4000);
      return;
    }
    window.clearTimeout(armTimer); armed = false; clearBtn.classList.remove("armed");
    if (isLive && live) {
      delete saved.live[live.slug]; write(saved); open(current); say("Back to the sheet from your inbox.");
    } else {
      saved.drafts = saved.drafts.filter((d) => `new:${d.id}` !== current);
      write(saved); current = ""; buildPicker(); open(picker.value); say("Draft deleted from this device.");
    }
  });

  form.addEventListener("input", () => { dirty = true; pendingSwitch = ""; refresh(); });
  form.addEventListener("change", () => { dirty = true; refresh(); });
  form.addEventListener("submit", (e) => e.preventDefault());
  window.addEventListener("beforeunload", (e) => { if (dirty && filled() + fields.filter((f) => f.value).length > 0) e.preventDefault(); });

  // The open inbox changed: offer that character (unless the player is mid-edit on another one).
  onIdentity = () => {
    if (dirty) { buildPicker(); return; }
    if (live) current = `live:${live.slug}`;
    else if (current.startsWith("live:")) current = "";
    buildPicker();
    open(picker.value, true);
  };

  buildPicker();
  open(picker.value, true);
}
