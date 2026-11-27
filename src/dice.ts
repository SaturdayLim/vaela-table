// Dice tray: a fair roller for players without physical dice. Results stay on this device.
// Every result is decided first (platform CSPRNG); the throw is only an animation that lands on it.
// No modifiers here: the player reads out the dice as they stand and the DM adds bonuses (table/DESIGN.md, "Dice").

type Roll = { what: string; total: number; detail: string; at: number };
const KEY = "vaela-table-dice";
const KEEP = 20;
const SIDES = [4, 6, 8, 10, 12, 20, 100] as const;
const MAX_DICE = 10;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Uniform integer in 1..sides from the platform CSPRNG (rejection sampling, no modulo bias). */
export function rollDie(sides: number): number {
  const limit = Math.floor(0x1_0000_0000 / sides) * sides;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf); while (buf[0] >= limit);
  return (buf[0] % sides) + 1;
}

/** Advantage and disadvantage keep the higher or lower of two d20. */
export function keepD20(mode: number, a: number, b: number) {
  return mode > 0 ? Math.max(a, b) : mode < 0 ? Math.min(a, b) : a;
}

// Die outlines in a 64 x 64 box. The number sits in the middle.
const SHAPE: Record<number, string> = {
  4: '<path d="M32 6 L59 54 H5 Z"/>',
  6: '<rect x="8" y="8" width="48" height="48" rx="9"/>',
  8: '<path d="M32 4 L58 32 L32 60 L6 32 Z"/><path d="M6 32 H58" class="edge"/>',
  10: '<path d="M32 4 L60 28 L32 60 L4 28 Z"/><path d="M4 28 L32 38 L60 28 M32 38 V60" class="edge"/>',
  12: '<path d="M32 4 L59 23 L49 56 H15 L5 23 Z"/><path d="M32 16 L46 27 L41 44 H23 L18 27 Z" class="edge"/>',
  20: '<path d="M32 3 L57 17.5 V46.5 L32 61 L7 46.5 V17.5 Z"/><path d="M32 13 L12 45 H52 Z M32 13 L7 17.5 M32 13 L57 17.5 M12 45 L7 17.5 M12 45 L7 46.5 M12 45 L32 61 L52 45 M52 45 L57 17.5 M52 45 L57 46.5" class="edge"/>',
  100: '<path d="M32 4 L60 28 L32 60 L4 28 Z"/><path d="M4 28 L32 38 L60 28 M32 38 V60" class="edge"/>',
};
const dieSvg = (sides: number) => `<svg viewBox="0 0 64 64" aria-hidden="true">${SHAPE[sides]}</svg>`;

function load(): Roll[] { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Roll[]; } catch { return []; } }
function save(rolls: Roll[]) { try { localStorage.setItem(KEY, JSON.stringify(rolls.slice(0, KEEP))); } catch { /* blocked: this visit only */ } }

let history: Roll[] = [];
const pool = new Map<number, number>(); // sides -> how many
let mode = 0; // -1 disadvantage, 0 normal, 1 advantage (one d20 only)
let rolling = false;

const poolCount = () => [...pool.values()].reduce((s, n) => s + n, 0);
const advOn = () => pool.get(20) === 1;

function poolText() {
  return SIDES.filter((s) => pool.get(s)).map((s) => `${pool.get(s)! > 1 ? pool.get(s) : ""}d${s}`).join(" + ");
}

// ---------- the tray: where dice rest and land ----------
type Die = { sides: number; el: HTMLElement; face: number; dropped?: boolean; ghost?: boolean };
let dice: Die[] = [];

function makeDie(sides: number, ghost = false): Die {
  const el = document.createElement("button");
  el.type = "button";
  el.className = `die d${sides}` + (ghost ? " die-ghost" : "");
  el.innerHTML = `${dieSvg(sides)}<span class="die-face">d${sides === 100 ? "%" : sides}</span>`;
  el.setAttribute("aria-label", ghost ? `Second d20 for ${mode > 0 ? "advantage" : "disadvantage"}` : `d${sides}: tap to take it out`);
  if (!ghost) el.addEventListener("click", () => { if (!rolling) { pool.set(sides, (pool.get(sides) ?? 1) - 1); if (!pool.get(sides)) pool.delete(sides); layout(); } });
  else el.tabIndex = -1;
  return { sides, el, face: 0, ghost };
}

/** Spread the resting dice across the tray, clear of the total in the top left corner. */
function spots(n: number, w: number, h: number, size: number) {
  const out: [number, number][] = [];
  const pad = 12;
  for (let i = 0; i < n; i++) {
    let best: [number, number] = [pad, pad];
    let bestD = -1;
    for (let tries = 0; tries < 40; tries++) {
      const x = pad + Math.random() * Math.max(1, w - size - pad * 2);
      const y = pad + Math.random() * Math.max(1, h - size - pad * 2);
      if (x < 150 && y < 80) continue; // the total sits here
      const d = Math.min(Infinity, ...out.map(([ox, oy]) => Math.hypot(ox - x, oy - y)));
      if (d > bestD) { best = [x, y]; bestD = d; }
      if (d > size * 1.25) break;
    }
    out.push(best);
  }
  return out;
}

function layout(keepFaces = false, respread = false) {
  const tray = $("tray");
  const want: { sides: number; ghost: boolean }[] = [];
  for (const s of SIDES) for (let i = 0; i < (pool.get(s) ?? 0); i++) want.push({ sides: s, ghost: false });
  if (advOn() && mode !== 0) want.push({ sides: 20, ghost: true });
  // Reuse dice already on the tray so a change only moves what changed.
  const next: Die[] = [];
  const spare = [...dice];
  for (const w of want) {
    const i = spare.findIndex((d) => d.sides === w.sides && !!d.ghost === w.ghost);
    next.push(i >= 0 ? spare.splice(i, 1)[0] : makeDie(w.sides, w.ghost));
  }
  for (const d of spare) {
    d.el.classList.add("die-leaving"); // fades off, then goes
    window.setTimeout(() => d.el.remove(), reduced() ? 0 : 260);
  }
  dice = next;
  const r = tray.getBoundingClientRect();
  const size = r.width < 400 ? 56 : 64;
  const fresh = dice.filter((d) => !d.el.isConnected);
  const pos = spots(dice.length, r.width, r.height, size);
  dice.forEach((d, i) => {
    if (!keepFaces) { d.face = 0; d.dropped = false; d.el.classList.remove("die-dropped"); d.el.querySelector(".die-face")!.textContent = `d${d.sides === 100 ? "%" : d.sides}`; }
    if (!d.el.isConnected) { d.el.classList.add("die-entering"); tray.appendChild(d.el); }
    if (respread || !d.el.style.left || fresh.includes(d)) { d.el.style.left = `${pos[i][0]}px`; d.el.style.top = `${pos[i][1]}px`; }
  });
  requestAnimationFrame(() => fresh.forEach((d) => d.el.classList.remove("die-entering")));
  $("tray-empty").hidden = dice.length > 0;
  if (!keepFaces) { $("tray-total").hidden = true; }
  renderShelf();
}

// ---------- the throw ----------
function animateTo(d: Die, final: number, delay: number, landX: number, landY: number, tray: DOMRect) {
  const faceEl = d.el.querySelector(".die-face")!;
  d.el.style.left = `${landX}px`;
  d.el.style.top = `${landY}px`;
  if (reduced()) { faceEl.textContent = String(final); return Promise.resolve(); }
  // Thrown in from the bottom edge, two bounces, rolling to a stop on the decided face.
  const fromX = tray.width * (0.3 + Math.random() * 0.4) - landX;
  const fromY = tray.height + 40 - landY;
  const spin = (Math.random() < 0.5 ? -1 : 1) * (540 + Math.random() * 360);
  const dur = 950 + Math.random() * 250;
  const kf: Keyframe[] = [
    { transform: `translate(${fromX}px, ${fromY}px) rotate(0deg) scale(0.7)`, offset: 0 },
    { transform: `translate(${fromX * 0.35}px, ${fromY * 0.25 - 30}px) rotate(${spin * 0.55}deg) scale(1.12)`, offset: 0.38 },
    { transform: `translate(${fromX * 0.12}px, ${fromY * 0.06}px) rotate(${spin * 0.82}deg) scale(0.96)`, offset: 0.62 },
    { transform: `translate(${fromX * 0.03}px, -8px) rotate(${spin * 0.95}deg) scale(1.03)`, offset: 0.8 },
    { transform: "translate(0, 0) rotate(" + spin + "deg) scale(1)", offset: 1 },
  ];
  const anim = d.el.animate(kf, { duration: dur, delay, easing: "cubic-bezier(0.22, 0.7, 0.3, 1)", fill: "backwards" });
  // The face flickers fast, then slower, then settles on the result just before the die stops.
  const start = performance.now() + delay;
  let t = 0;
  const tick = () => {
    const el = performance.now() - start;
    if (el >= dur * 0.86) { faceEl.textContent = String(final); return; }
    if (el > 0) faceEl.textContent = String(rollDie(d.sides));
    t = window.setTimeout(tick, 40 + (el / dur) * 160);
  };
  t = window.setTimeout(tick, delay);
  return anim.finished.then(() => { window.clearTimeout(t); faceEl.textContent = String(final); d.el.style.transform = ""; }).catch(() => {});
}

async function throwDice() {
  if (rolling || !poolCount()) return;
  rolling = true;
  $<HTMLButtonElement>("dice-roll").setAttribute("aria-disabled", "true");
  const tray = $("tray").getBoundingClientRect();
  // Decide every face first.
  const results = dice.map((d) => rollDie(d.sides));
  const d20s = dice.filter((d) => d.sides === 20);
  let kept: number[] = [];
  let detail = "";
  if (advOn() && mode !== 0 && d20s.length === 2) {
    const [a, b] = [results[dice.indexOf(d20s[0])], results[dice.indexOf(d20s[1])]];
    const keep = keepD20(mode, a, b);
    const dropIdx = a === keep ? dice.indexOf(d20s[1]) : dice.indexOf(d20s[0]);
    dice.forEach((d, i) => { d.dropped = i === dropIdx; });
    detail = `d20 showed ${a} and ${b}, kept ${keep}`;
  } else dice.forEach((d) => { d.dropped = false; });
  kept = results.filter((_, i) => !dice[i].dropped);
  const total = kept.reduce((s, n) => s + n, 0);
  const others = dice.map((d, i) => ({ d, r: results[i] })).filter(({ d }) => d.sides !== 20 || !(advOn() && mode !== 0));
  if (!detail) detail = dice.length > 1 ? `Dice showed ${results.join(", ")}` : `Die showed ${results[0]}`;
  else if (others.length) detail += `; ${others.map(({ r }) => r).join(", ")}`;

  $("tray-total").hidden = true;
  dice.forEach((d) => d.el.classList.remove("die-dropped"));
  const size = tray.width < 400 ? 56 : 64;
  const land = spots(dice.length, tray.width, tray.height, size);
  await Promise.all(dice.map((d, i) => { d.face = results[i]; return animateTo(d, results[i], i * 70, land[i][0], land[i][1], tray); }));
  dice.forEach((d) => d.el.classList.toggle("die-dropped", !!d.dropped));

  const nat = advOn() && kept.length === 1 && dice.length <= 2 ? (kept[0] === 20 ? " Natural 20." : kept[0] === 1 ? " Natural 1." : "") : "";
  const label = poolText() + (advOn() && mode > 0 ? " with advantage" : advOn() && mode < 0 ? " with disadvantage" : "");
  $("tray-total-n").textContent = String(total);
  $("tray-total-what").textContent = label;
  $("tray-total").hidden = false;
  history = [{ what: label, total, detail: detail + "." + nat, at: Date.now() }, ...history].slice(0, KEEP);
  save(history);
  renderHistory();
  rolling = false;
  $<HTMLButtonElement>("dice-roll").removeAttribute("aria-disabled");
}

// ---------- shelf, advantage slider, history ----------
function renderShelf() {
  document.querySelectorAll<HTMLElement>("[data-add]").forEach((b) => {
    const n = pool.get(Number(b.dataset.add)) ?? 0;
    const badge = b.querySelector<HTMLElement>(".shelf-n")!;
    badge.textContent = String(n);
    badge.hidden = n === 0;
    b.setAttribute("aria-label", `Add a d${b.dataset.add}${n ? `, ${n} in the tray` : ""}`);
  });
  const adv = $("adv");
  adv.classList.toggle("is-on", advOn());
  adv.setAttribute("aria-hidden", String(!advOn()));
  $<HTMLInputElement>("adv-range").disabled = !advOn();
  $("dice-roll").textContent = poolCount() ? `Roll ${poolText()}` : "Roll";
  $<HTMLButtonElement>("dice-roll").disabled = !poolCount();
  $<HTMLButtonElement>("dice-empty").disabled = !poolCount();
}

function setMode(v: number) {
  mode = v;
  const range = $<HTMLInputElement>("adv-range");
  range.value = String(v);
  range.setAttribute("aria-valuetext", v > 0 ? "Advantage" : v < 0 ? "Disadvantage" : "Normal");
  document.querySelectorAll<HTMLElement>("[data-adv]").forEach((l) => l.classList.toggle("is-on", Number(l.dataset.adv) === v));
  $("adv").dataset.mode = String(v);
  layout(false);
}

function renderHistory() {
  const list = $("dice-history");
  list.innerHTML = "";
  for (const r of history) {
    const li = document.createElement("li");
    const time = new Date(r.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    li.innerHTML = `<span class="dice-h-total sat-num"></span><span class="dice-h-what"></span><span class="sat-small sat-muted"></span>`;
    li.children[0].textContent = String(r.total);
    li.children[1].textContent = r.what;
    li.children[2].textContent = `${r.detail} ${time}`;
    list.appendChild(li);
  }
  $("dice-history-empty").hidden = history.length > 0;
  $("dice-clear").hidden = history.length === 0;
}

export function initDice() {
  history = load();
  renderHistory();
  const shelf = $("shelf");
  for (const s of SIDES) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `shelf-die d${s}`;
    b.dataset.add = String(s);
    b.innerHTML = `${dieSvg(s)}<span class="shelf-label">d${s}</span><span class="shelf-n sat-num" hidden>0</span>`;
    b.addEventListener("click", () => {
      if (rolling || poolCount() >= MAX_DICE) return;
      pool.set(s, (pool.get(s) ?? 0) + 1);
      layout();
    });
    shelf.appendChild(b);
  }
  // Graduated slider: Disadvantage, Normal, Advantage. The thumb snaps to a stop; the second d20 fades on and off.
  const range = $<HTMLInputElement>("adv-range");
  range.addEventListener("input", () => setMode(Math.round(Number(range.value))));
  document.querySelectorAll<HTMLElement>("[data-adv]").forEach((l) => l.addEventListener("click", () => { if (advOn()) setMode(Number(l.dataset.adv)); }));
  $("dice-roll").addEventListener("click", () => void throwDice());
  $("tray").addEventListener("dblclick", () => void throwDice());
  $("dice-empty").addEventListener("click", () => { if (!rolling) { pool.clear(); setMode(0); } });
  $("dice-clear").addEventListener("click", () => { history = []; save(history); renderHistory(); });
  // The tray is sized by CSS; lay dice out again when it changes size (rotation, first show).
  let lastW = 0;
  new ResizeObserver(([e]) => { const w = Math.round(e.contentRect.width); if (!rolling && w && w !== lastW) { lastW = w; layout(true, true); } }).observe($("tray"));
  setMode(0);
}
