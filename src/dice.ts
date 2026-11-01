// Dice tray: a fair local roller for players without physical dice. Results stay on this device.

type Roll = { what: string; total: number; detail: string; at: number };
const KEY = "vaela-table-dice";
const KEEP = 12;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

/** Uniform integer in 1..sides from the platform CSPRNG (rejection sampling, no modulo bias). */
export function rollDie(sides: number): number {
  const limit = Math.floor(0x1_0000_0000 / sides) * sides;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf); while (buf[0] >= limit);
  return (buf[0] % sides) + 1;
}

const signed = (n: number) => (n >= 0 ? `+ ${n}` : `- ${Math.abs(n)}`);

function load(): Roll[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Roll[]; } catch { return []; }
}
function save(rolls: Roll[]) {
  try { localStorage.setItem(KEY, JSON.stringify(rolls.slice(0, KEEP))); } catch { /* storage blocked: history lives for this visit only */ }
}

let history: Roll[] = [];

function show(r: Roll) {
  $("dice-what").textContent = r.what;
  $("dice-total").textContent = String(r.total);
  $("dice-detail").textContent = r.detail;
  const card = $("dice-result");
  card.hidden = false;
  card.classList.remove("dice-flash");
  void card.offsetWidth; // restart the highlight
  card.classList.add("dice-flash");
  // On a phone the roll buttons sit below the fold: bring the result into view.
  const box = card.getBoundingClientRect();
  if (box.top < 0 || box.bottom > innerHeight) card.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  history = [r, ...history].slice(0, KEEP);
  save(history);
  renderHistory();
}

function renderHistory() {
  const list = $("dice-history");
  list.innerHTML = "";
  for (const r of history) {
    const li = document.createElement("li");
    const time = new Date(r.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    li.innerHTML = `<span class="dice-h-total"></span><span class="dice-h-what"></span><span class="sat-small sat-muted"></span>`;
    li.children[0].textContent = String(r.total);
    li.children[1].textContent = r.what;
    li.children[2].textContent = `${r.detail}, at ${time}`;
    list.appendChild(li);
  }
  $("dice-history-wrap").hidden = history.length === 0;
}

const intOf = (id: string, fallback: number) => {
  const n = Math.trunc(Number($<HTMLInputElement>(id).value));
  return Number.isFinite(n) ? n : fallback;
};

export function initDice() {
  history = load();
  renderHistory();

  $("d20-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const mod = intOf("d20-mod", 0);
    const mode = $("d20-mode").querySelector<HTMLElement>('[aria-checked="true"]')?.dataset.value ?? "normal";
    const a = rollDie(20);
    const b = mode === "normal" ? a : rollDie(20);
    const kept = mode === "adv" ? Math.max(a, b) : mode === "dis" ? Math.min(a, b) : a;
    const dice = mode === "normal" ? `d20 showed ${a}` : `d20 showed ${a} and ${b}, kept ${kept}`;
    const nat = kept === 20 ? ". Natural 20." : kept === 1 ? ". Natural 1." : "";
    const label = mode === "adv" ? "d20 with advantage" : mode === "dis" ? "d20 with disadvantage" : "d20";
    show({ what: `${label} ${signed(mod)}`, total: kept + mod, detail: `${dice} ${signed(mod)}${nat}`, at: Date.now() });
  });

  $("dice-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const sides = Number((e as SubmitEvent).submitter?.getAttribute("value") ?? 6);
    const count = Math.min(20, Math.max(1, intOf("dice-count", 1)));
    const mod = intOf("dice-mod", 0);
    const faces = Array.from({ length: count }, () => rollDie(sides));
    const sum = faces.reduce((s, f) => s + f, 0);
    const what = `${count}d${sides}${mod ? ` ${signed(mod)}` : ""}`;
    const detail = `${count > 1 ? `Dice showed ${faces.join(", ")}` : `Die showed ${faces[0]}`}${mod ? ` ${signed(mod)}` : ""}`;
    show({ what, total: sum + mod, detail, at: Date.now() });
  });

  $("dice-clear").addEventListener("click", () => {
    history = [];
    save(history);
    renderHistory();
    $("dice-result").hidden = true;
  });
}
