// Reading aids for sheets and rules (table/DESIGN.md, "Formulae, references, lookups"):
//   lookup lists ("1 = -5; 2-3 = -4; ...") become a visual grid,
//   formulae (d8 + CON mod, floor((score - 10) / 2)) and source references ((D17, Class Progression)) get their own marks,
//   and the sealed profile item becomes a short live list of the character's numbers.

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);

// ---------- lookup lists ----------
const PAIR = /^(\d+(?:\s*-\s*\d+)?)\s*[=:]\s*([+-]?\d+(?:\s*[a-z]+)?)\s*(.*)$/i;

/** "Label: 1 = -5; 2-3 = -4; ..." -> { label, pairs, note }, or null when it is not a lookup list. */
export function parseLookup(text: string) {
  let t = text.trim().replace(/\.$/, "");
  let label = "";
  const lm = t.match(/^([A-Za-z][^:;=]{1,48}?):\s*(?=\d)/);
  if (lm) { label = lm[1].trim(); t = t.slice(lm[0].length); }
  const parts = t.split(";").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 3) return null;
  const pairs: [string, string][] = [];
  let note = "";
  for (let i = 0; i < parts.length; i++) {
    const m = parts[i].match(PAIR);
    if (!m) return null;
    const rest = m[3].trim();
    if (rest && i < parts.length - 1) return null; // only the last cell may carry a note
    if (rest) note = rest.replace(/^\(|\)$/g, "");
    pairs.push([m[1].replace(/\s+/g, ""), m[2].replace(/\s+/g, " ")]);
  }
  return { label, pairs, note };
}

function lookupHtml(l: NonNullable<ReturnType<typeof parseLookup>>) {
  const cells = l.pairs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("");
  return `${l.label ? `<p class="lookup-label">${esc(l.label)}</p>` : ""}<dl class="lookup">${cells}</dl>` +
    (l.note ? `<p class="lookup-note">${esc(l.note)}</p>` : "");
}

// ---------- formulae and references ----------
// A reference names a source document or rule code: (D17, Class Progression), (PH - Unlock - Kreimhilde), (A21).
const REF = String.raw`\((?=[^()]*(?:\b[A-D]\d{1,2}\b|\bPH - |[A-Za-z] - [A-Z]))[^()]*\)`;
const TERM = String.raw`(?:\d+|[A-Z]{3}(?: mod)?|score|level)`;
const FORMULA = [
  String.raw`floor\(\([^()]*\)[^()]*\)`,
  String.raw`\b\d*d\d+\b(?:\s+[+\-]\s+${TERM})*`,
  String.raw`\b${TERM}(?:\s+[+\-×*/]\s+${TERM})+`,
  String.raw`\bability modifier\s+\+\s+\d+`,
].join("|");
const MARK = new RegExp(`(${REF})|(${FORMULA})`, "g");
const SKIP = "code, pre, a, .lookup, .lookup-label, .formula, .ref, th, script, style";

export function markText(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n as Text;
    if (t.parentElement?.closest(SKIP)) continue;
    MARK.lastIndex = 0;
    if (MARK.test(t.data)) nodes.push(t);
  }
  for (const t of nodes) {
    const frag = document.createDocumentFragment();
    let last = 0;
    MARK.lastIndex = 0;
    for (let m = MARK.exec(t.data); m; m = MARK.exec(t.data)) {
      if (m.index > last) frag.append(t.data.slice(last, m.index));
      const span = document.createElement("span");
      span.className = m[1] ? "ref" : m[0].length > 22 ? "formula formula--long" : "formula";
      span.textContent = m[0];
      frag.append(span);
      last = m.index + m[0].length;
    }
    frag.append(t.data.slice(last));
    t.replaceWith(frag);
  }
}

/** Run both passes on rendered markdown. */
export function enhance(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>("p, td, li").forEach((el) => {
    if (el.children.length > 1) return;
    const l = parseLookup(el.textContent ?? "");
    if (!l) return;
    if (el.tagName === "P") { const div = document.createElement("div"); div.className = "lookup-wrap"; div.innerHTML = lookupHtml(l); el.replaceWith(div); }
    else el.innerHTML = lookupHtml(l);
  });
  markText(root);
}

// ---------- profile: the character's numbers as a short live list ----------
export type Profile = {
  name: string; cls: string; level: number; pb: number;
  abilities: Record<string, number>; saves: string[]; skills: string[]; expertise: string[];
  derived: { stat: string; value: string }[];
};

const ABIL = ["str", "dex", "con", "int", "wis", "cha"];
const SKILL_ABIL: Record<string, string> = {
  acrobatics: "dex", "animal-handling": "wis", arcana: "int", athletics: "str", deception: "cha", history: "int",
  insight: "wis", intimidation: "cha", investigation: "int", medicine: "wis", nature: "int", perception: "wis",
  performance: "cha", persuasion: "cha", religion: "int", "sleight-of-hand": "dex", stealth: "dex", survival: "wis",
};
// What each figure means, for its header tip.
const TIPS: Record<string, string> = {
  str: "Strength: lifting, climbing, hitting hard.", dex: "Dexterity: balance, aim, quick hands, Stealth.",
  con: "Constitution: stamina and health.", int: "Intelligence: memory, reasoning, Investigation.",
  wis: "Wisdom: noticing and judging, Perception and Insight.", cha: "Charisma: presence and persuasion.",
  HP: "Hit points. At 0 you fall and start dying.", AC: "Armour class. An attack hits when it reaches this number.",
  Initiative: "Added to your d20 when a fight starts. Higher acts first.", Speed: "How far you move in one turn.",
  Carry: "The most you can carry without slowing down.", RP: "Resonance points: what casting costs.",
  SP: "Stamina points: what physical exertion costs.", "Hit dice": "Spent on a short rest to heal.",
  Saves: "You add your proficiency to these saving throws.", Skills: "Ability modifier plus proficiency. The DM adds it to your roll.",
};
const sign = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);
const modOf = (s: number) => Math.floor((s - 10) / 2);
const titled = (s: string) => s.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

function tipHead(label: string, tip: string | undefined, cls = "sat-caption") {
  if (!tip) return `<span class="${cls}">${esc(label)}</span>`;
  return `<span class="sat-tip tip-head"><button type="button" class="sat-tip-btn ${cls}" aria-expanded="false">${esc(label)}</button>` +
    `<span class="sat-tip-body" role="tooltip">${esc(tip)}</span></span>`;
}

export function profileHtml(p: Profile) {
  const abil = ABIL.map((a) => {
    const s = p.abilities[a];
    return `<div class="pf-abil">${tipHead(a.toUpperCase(), TIPS[a])}<span class="pf-score sat-num">${s ?? "?"}</span>` +
      `<span class="pf-mod sat-num">${s ? sign(modOf(s)) : ""}</span></div>`;
  }).join("");
  const skills = p.skills.map((k) => {
    const a = SKILL_ABIL[k];
    const bonus = a && p.abilities[a] ? modOf(p.abilities[a]) + p.pb * (p.expertise.includes(k) ? 2 : 1) : null;
    return `<li><span>${esc(titled(k))}</span><span class="sat-num">${bonus === null ? "" : sign(bonus)}</span></li>`;
  }).join("");
  const derived = p.derived.map((d) =>
    `<div class="pf-stat">${tipHead(d.stat, TIPS[d.stat])}<span class="pf-val sat-num">${esc(d.value)}</span></div>`).join("");
  return `<p class="pf-line">${esc(titled(p.cls || "No class"))} ${p.level || ""}, proficiency ${sign(p.pb)}</p>` +
    `<div class="pf-abils">${abil}</div>` +
    (derived ? `<div class="pf-stats">${derived}</div>` : "") +
    `<div class="pf-cols"><div>${tipHead("Saves", TIPS.Saves, "sat-h3")}<p>${p.saves.length ? p.saves.map((s) => s.toUpperCase()).join(", ") : "None"}</p></div>` +
    `<div>${tipHead("Skills", TIPS.Skills, "sat-h3")}${skills ? `<ul class="pf-skills">${skills}</ul>` : "<p>None chosen yet</p>"}</div></div>`;
}
