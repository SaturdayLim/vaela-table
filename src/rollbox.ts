// Roll entry box (table/DESIGN.md, "Roll entry"). Each box shows its die as a watermark and, while empty, the die's
// name (D4, D20) in grey in the middle. The player types a physical roll, or presses Roll for me: the number spins
// like a carousel on screen and lands on a fair result. "DM rolls" (a toggle) hands the roll to the DM instead.
// A bad entry pulses red and a popup says why; leaving the box with a bad entry clears it. The app never adds a
// modifier: the DM does.

export type RollCheck = { id: string; label: string; mode: string; die?: string };
export type RollState = { faces: Map<string, number>; forMe: Set<string> };

/** "d20" -> [1, 20]; "2d6" -> [2, 12]. */
export function dieRange(die = "d20"): [number, number] {
  const m = die.match(/^(\d*)d(\d+)$/);
  const n = m ? Number(m[1] || 1) : 1;
  const sides = m ? Number(m[2]) : 20;
  return [n, n * sides];
}

/** Why an entry is not a valid result for this die, or "" when it is. */
export function rollError(raw: string, die = "d20"): string {
  const v = raw.trim();
  const [lo, hi] = dieRange(die);
  const shows = die.startsWith("1d") || /^d/.test(die) ? `A ${die} shows ${lo} to ${hi}.` : `${die} adds up to ${lo} to ${hi}.`;
  if (!v) return "";
  if (!/^\d+$/.test(v)) return `Numbers only. ${shows}`;
  const n = Number(v);
  if (n < lo) return `${n} is too low. ${shows}`;
  if (n > hi) return `${n} is too high. ${shows}`;
  return "";
}

/** The watermark symbol for a die: 2d6 uses the d6, d100 the d10. */
export function dieIcon(die = "d20") {
  const sides = Number(die.match(/d(\d+)$/)?.[1] ?? 20);
  return `i-d${[4, 6, 8, 10, 12, 20].includes(sides) ? sides : sides === 100 ? 10 : 20}`;
}
const dieName = (die: string) => die.replace(/^1d/, "d").toUpperCase();

function fair(max: number) {
  const a = new Uint32Array(1);
  const limit = Math.floor(0x1_0000_0000 / max) * max; // no modulo bias
  do crypto.getRandomValues(a); while (a[0] >= limit);
  return (a[0] % max) + 1;
}
/** A fair roll of `die` (sum of its dice). */
export function rollDie(die = "d20") {
  const m = die.match(/^(\d*)d(\d+)$/);
  const n = m ? Number(m[1] || 1) : 1, sides = m ? Number(m[2]) : 20;
  let t = 0;
  for (let i = 0; i < n; i++) t += fair(sides);
  return t;
}

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
let uid = 0;

export function rollBox(c: RollCheck, st: RollState, onChange: () => void): HTMLElement {
  const die = c.die || "d20";
  const id = `roll-${c.id}-${++uid}`;
  const two = c.mode === "advantage" || c.mode === "disadvantage";
  const how = c.mode === "advantage" ? "Roll two, enter the higher" : c.mode === "disadvantage" ? "Roll two, enter the lower" : "";
  const wrap = document.createElement("div");
  wrap.className = "roll";
  wrap.dataset.check = c.id;
  wrap.innerHTML = `
    <label class="roll-label" for="${id}"><strong></strong> <span class="sat-muted"></span></label>
    <div class="roll-row">
      <div class="roll-box" data-die="${die}">
        <svg class="roll-shadow" aria-hidden="true"><use href="#${dieIcon(die)}"/></svg>
        <input class="roll-input sat-num" id="${id}" type="text" inputmode="decimal" pattern="[0-9]*" maxlength="3" autocomplete="off" enterkeyhint="done" aria-describedby="${id}-err">
      </div>
      <div class="roll-acts">
        <button type="button" class="sat-btn sat-btn--sm roll-here">Roll for me</button>
        <button type="button" class="sat-btn sat-btn--ghost sat-btn--sm roll-dm" aria-pressed="false">DM rolls</button>
      </div>
      <p class="roll-pop" id="${id}-err" role="alert" hidden></p>
    </div>
    <p class="roll-note sat-small sat-muted" hidden></p>`;
  wrap.querySelector("strong")!.textContent = c.label;
  wrap.querySelector(".roll-label .sat-muted")!.textContent = how;
  const input = wrap.querySelector<HTMLInputElement>("input")!;
  const box = wrap.querySelector<HTMLElement>(".roll-box")!;
  const pop = wrap.querySelector<HTMLElement>(".roll-pop")!;
  const here = wrap.querySelector<HTMLButtonElement>(".roll-here")!;
  const dm = wrap.querySelector<HTMLButtonElement>(".roll-dm")!;
  const note = wrap.querySelector<HTMLElement>(".roll-note")!;
  input.setAttribute("aria-label", `${c.label}: your ${die} result`);
  let spinning = false;

  const sync = () => {
    const byDm = st.forMe.has(c.id);
    dm.setAttribute("aria-pressed", String(byDm));
    input.disabled = byDm;
    here.disabled = byDm;
    input.placeholder = byDm ? "DM" : dieName(die);
    box.dataset.filled = String(byDm || st.faces.has(c.id));
    if (!byDm && st.faces.has(c.id) && document.activeElement !== input && !spinning) input.value = String(st.faces.get(c.id));
    if (byDm) { input.value = ""; note.hidden = true; }
  };
  const fail = (msg: string) => {
    pop.textContent = msg;
    pop.hidden = false;
    input.setAttribute("aria-invalid", "true");
    box.classList.remove("bad");
    void box.offsetWidth; // restart the pulse
    box.classList.add("bad");
  };
  const clear = () => { pop.hidden = true; input.removeAttribute("aria-invalid"); box.classList.remove("bad"); };

  input.addEventListener("input", () => {
    note.hidden = true;
    const err = rollError(input.value, die);
    if (err) { st.faces.delete(c.id); fail(err); }
    else {
      clear();
      if (input.value.trim()) st.faces.set(c.id, Number(input.value)); else st.faces.delete(c.id);
    }
    box.dataset.filled = String(st.faces.has(c.id));
    onChange();
  });
  // Leaving the box with a bad entry clears it, so a wrong number is never left looking accepted.
  input.addEventListener("blur", () => {
    if (!input.value || !rollError(input.value, die)) return;
    input.value = "";
    st.faces.delete(c.id);
    clear();
    box.dataset.filled = "false";
    onChange();
  });

  // Roll for me: the number spins like a carousel and slows onto a fair result. Advantage rolls two.
  here.addEventListener("click", () => {
    if (spinning) return;
    const a = rollDie(die), b = two ? rollDie(die) : 0;
    const final = !two ? a : c.mode === "advantage" ? Math.max(a, b) : Math.min(a, b);
    const [lo, hi] = dieRange(die);
    clear();
    const land = () => {
      spinning = false;
      box.classList.remove("spin");
      input.value = String(final);
      st.faces.set(c.id, final);
      box.dataset.filled = "true";
      note.textContent = two ? `Rolled ${a} and ${b}: ${final} counts.` : `Rolled ${final} here.`;
      note.hidden = false;
      onChange();
    };
    if (reduced()) return land();
    spinning = true;
    box.classList.add("spin");
    const ticks = [40, 45, 50, 60, 70, 85, 100, 120, 145, 175, 210];
    let i = 0;
    const tick = () => {
      if (i >= ticks.length) return land();
      let n = lo + Math.floor(Math.random() * (hi - lo + 1));
      if (String(n) === input.value) n = n === hi ? lo : n + 1;
      input.value = String(n);
      input.classList.remove("tick");
      void input.offsetWidth;
      input.classList.add("tick");
      window.setTimeout(tick, ticks[i++]);
    };
    tick();
  });

  dm.addEventListener("click", () => {
    if (st.forMe.has(c.id)) st.forMe.delete(c.id);
    else { st.forMe.add(c.id); st.faces.delete(c.id); clear(); }
    sync();
    onChange();
  });

  // Send was pressed with this box empty: say so here, as a popup on the box.
  wrap.addEventListener("roll-missing", () => {
    fail(`Please enter ${c.label} result, or select Roll for me.`);
    input.focus({ preventScroll: true });
    wrap.scrollIntoView({ block: "nearest", behavior: reduced() ? "auto" : "smooth" });
  });
  sync();
  return wrap;
}

/** The first check that still needs a result, or null. */
export function missingRoll(checks: RollCheck[], st: RollState) {
  return checks.find((c) => !st.faces.has(c.id) && !st.forMe.has(c.id)) ?? null;
}

/** Show the "please enter" popup on the box for this check, inside `root`. */
export function flagMissing(root: HTMLElement, c: RollCheck) {
  root.querySelector<HTMLElement>(`.roll[data-check="${CSS.escape(c.id)}"]`)?.dispatchEvent(new CustomEvent("roll-missing"));
}
