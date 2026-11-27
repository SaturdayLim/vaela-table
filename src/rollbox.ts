// Roll entry box (table/DESIGN.md, "Roll entry"): the player types the result of a physical or in-app roll.
// A d20 shows its silhouette as a shadow in the box. A bad entry pulses red and says why. "Roll for me" hands the
// roll to the DM. The app never adds a modifier: the DM does.

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

let uid = 0;

export function rollBox(c: RollCheck, st: RollState, onChange: () => void): HTMLElement {
  const die = c.die || "d20";
  const id = `roll-${c.id}-${++uid}`;
  const how = c.mode === "advantage" ? "Roll two, enter the higher" : c.mode === "disadvantage" ? "Roll two, enter the lower" : "";
  const wrap = document.createElement("div");
  wrap.className = "roll";
  wrap.innerHTML = `
    <label class="roll-label" for="${id}"><strong></strong> <span class="sat-muted"></span></label>
    <div class="roll-row">
      <div class="roll-box" data-die="${die}">
        ${die === "d20" ? `<svg class="roll-shadow" aria-hidden="true"><use href="#i-d20"/></svg>` : `<span class="roll-die" aria-hidden="true">${die}</span>`}
        <input class="roll-input sat-num" id="${id}" type="text" inputmode="numeric" maxlength="3" autocomplete="off" aria-describedby="${id}-err">
      </div>
      <button type="button" class="sat-btn sat-btn--sm roll-forme" aria-pressed="false">Roll for me</button>
      <p class="roll-pop" id="${id}-err" role="alert" hidden></p>
    </div>`;
  wrap.querySelector("strong")!.textContent = c.label;
  wrap.querySelector(".roll-label .sat-muted")!.textContent = how;
  const input = wrap.querySelector<HTMLInputElement>("input")!;
  const box = wrap.querySelector<HTMLElement>(".roll-box")!;
  const pop = wrap.querySelector<HTMLElement>(".roll-pop")!;
  const forMe = wrap.querySelector<HTMLButtonElement>(".roll-forme")!;
  input.setAttribute("aria-label", `${c.label}: your ${die} result`);

  const sync = () => {
    const mine = st.forMe.has(c.id);
    forMe.setAttribute("aria-pressed", String(mine));
    forMe.textContent = mine ? "DM rolls" : "Roll for me";
    input.disabled = mine;
    input.placeholder = mine ? "DM" : "";
    box.dataset.filled = String(mine || st.faces.has(c.id));
    if (!mine && st.faces.has(c.id) && document.activeElement !== input) input.value = String(st.faces.get(c.id));
    if (mine) input.value = "";
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
    const err = rollError(input.value, die);
    if (err) { st.faces.delete(c.id); fail(err); }
    else {
      clear();
      if (input.value.trim()) st.faces.set(c.id, Number(input.value)); else st.faces.delete(c.id);
    }
    box.dataset.filled = String(st.faces.has(c.id));
    onChange();
  });
  forMe.addEventListener("click", () => {
    if (st.forMe.has(c.id)) st.forMe.delete(c.id);
    else { st.forMe.add(c.id); st.faces.delete(c.id); clear(); }
    sync();
    onChange();
  });
  sync();
  return wrap;
}

/** The first check that still needs a result, or null. */
export function missingRoll(checks: RollCheck[], st: RollState) {
  return checks.find((c) => !st.faces.has(c.id) && !st.forMe.has(c.id)) ?? null;
}
