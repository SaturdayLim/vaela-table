import "./saturday/css/tokens.css";
import "./saturday/css/saturday.css";
import "./saturday/js/saturday.js";
import "./kit.css";
import "./styles.css";
import { marked } from "marked";
import { openInbox, openNote, sealNote, WrongCode } from "./lib/crypto.js";
import { initSheet } from "./sheet";
import { initDice } from "./dice";

type Post = { id: string; title: string; file: string };
type InboxMeta = { slug: string; name: string; letters: number; newest: string | null; salt?: string; file: string };
/** relay.json: the ntfy topic, the host's slug and the session-close settings (plans/table-live.md, step 5). */
type CloseConf = { who?: "any" | "host"; needs?: "all" | "one"; finish?: boolean; recap?: boolean };
type Relay = { server: string; topic: string; host?: string; close?: CloseConf };
/** A player asks to end the session, agrees, or cancels (Keep playing). Only messages for the current turn count. */
type CloseMsg = { v: 1; kind: "close"; op: "ask" | "agree" | "cancel"; turn: number; who: string; at: number };
type CloseReq = { by: string; turn: number; agreed: string[]; waiting: string[]; ready: boolean };
type Index = { rev: string; built: string; story: Post[]; inboxes: InboxMeta[]; relay?: Relay | null };
/** One player's action for one turn, carried by the relay. The newest one per player wins. */
type Action = { v: 1; kind: "action"; turn: number; who: string; text: string; at: number; checks?: Record<string, number> };
/** A check the DM called in the latest post (`table.py check`). No DC or modifier ever reaches the app. */
type Check = { id: string; who: string; label: string; mode: string };
type Item = { id: string; kind: "sheet" | "letter" | "rolls" | "pack" | "asides"; title: string; body: string };
/** The DM's new turn on the relay (`table.py send`). `text` is missing when the post is over 4 KB. */
type LivePost = { kind: "post"; turn: number; id: string; title: string; text?: string };

const VIEWS = ["table", "inbox", "dice", "start", "world", "rules", "session", "sheet"];
const KIT = ["start", "world", "rules", "session"];
const POLL_MS = 20_000;
const BASE_TITLE = document.title;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const md = (text: string) => marked.parse(text, { async: false }) as string;

// ---- small storage helpers (storage can be blocked: every call is guarded) ----
const store = {
  get(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } },
  set(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* blocked */ } },
  del(key: string) { try { localStorage.removeItem(key); } catch { /* blocked */ } },
};
const codeKey = (slug: string) => `vaela-table-code:${slug}`;
const seenKey = (slug: string) => `vaela-table-seen:${slug}`;
const SEEN_POST = "vaela-table-seen-post";

// ======================= routing =======================
let current = "table";
let lastKit = "start";

function section(view: string) { return KIT.includes(view) ? "kit" : view; }

function show(view: string, anchor?: string | null) {
  if (!VIEWS.includes(view)) view = "table";
  current = view;
  if (KIT.includes(view)) lastKit = view;
  document.querySelectorAll<HTMLElement>("[data-view]").forEach((v) => { v.hidden = v.dataset.view !== view; });
  $("kit-nav").hidden = !KIT.includes(view);
  setSeg($("sections"), section(view));
  setSeg($("kitnav"), lastKit);
  document.querySelectorAll<HTMLAnchorElement>(".tabbar a").forEach((a) => {
    if (a.dataset.tab === section(view)) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  if (view === "table") markPostSeen();
  if (view === "inbox") enterInbox();
  updateDots();
  if (anchor) { const el = document.getElementById(anchor); if (el) { el.scrollIntoView(); return; } }
  window.scrollTo(0, 0);
}

function setSeg(group: HTMLElement, value: string) {
  group.querySelectorAll<HTMLElement>('[role="radio"]').forEach((b) => {
    const on = b.dataset.value === value;
    b.setAttribute("aria-checked", String(on));
    b.tabIndex = on ? 0 : -1;
  });
}

function fromHash(): [string, string | null] {
  const h = location.hash.replace("#", "");
  if (h === "commission") return ["session", "commission"];
  return [h || "table", null];
}

window.addEventListener("hashchange", () => { const [v, a] = fromHash(); show(v, a); });
$("sections").addEventListener("sat-change", (e) => {
  const value = (e as CustomEvent).detail.value as string;
  location.hash = value === "kit" ? lastKit : value;
});
$("kitnav").addEventListener("sat-change", (e) => { location.hash = (e as CustomEvent).detail.value; });

// ======================= content index + polling =======================
let index: Index | null = null;
let checkedAt: Date | null = null;
let arrivedAt: Date | null = null;

async function fetchFresh(path: string) {
  const res = await fetch(`${path}?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res;
}

async function check(manual = false) {
  const status = $("feed-status");
  if (manual) status.textContent = "Checking";
  try {
    const next: Index = await (await fetchFresh("content/index.json")).json();
    if (TEST_MODE) next.story = [{ id: TEST_ID, title: "Table test", file: "" }, ...next.story];
    applyLive(next);
    const changed = !index || next.rev !== index.rev;
    const prev = index;
    index = next;
    checkedAt = new Date();
    const newTurn = !!prev && next.story[0]?.id !== prev.story[0]?.id;
    if (changed) {
      await renderFeed();
      renderPick();
      await refreshOpenInbox(prev);
      if (!prev && current === "inbox") enterInbox(); // first load: a remembered code can open its inbox now
      $("build-line").textContent = `Content built ${fmtDate(new Date(index.built))}.`;
    }
    if (newTurn) arrivedAt = checkedAt;
    status.textContent = arrivedAt && checkedAt.getTime() - arrivedAt.getTime() < 5 * 60_000
      ? `New turn arrived at ${fmtTime(arrivedAt)}`
      : `Checked at ${fmtTime(checkedAt)}`;
    updateDots();
  } catch {
    status.textContent = "Table unable to load. Check internet connection and press Check now.";
  }
}

$("refresh").addEventListener("click", () => check(true));
window.setInterval(() => { if (document.visibilityState === "visible") check(); }, POLL_MS);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") check(); });

const fmtTime = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const fmtDate = (d: Date) => `${d.getDate()} ${d.toLocaleString("en-GB", { month: "short" })} ${d.getFullYear()}, ${fmtTime(d)}`;

// ======================= test mode (?test) =======================
// Opening the app with ?test shows a practice turn 9999 on this device only, with a check for every player,
// so the action box, lights and 1-20 picker can be tried on real phones without posting a turn. The DM pulls it
// with `table.py inbox --turn 9999`.
const TEST_MODE = new URLSearchParams(location.search).has("test");
const TEST_ID = "9999-table-test";

function testTurn() {
  const checks = (index?.inboxes ?? []).map((m, i) => ({ id: `t${i + 1}`, who: m.slug, label: "Perception check", mode: i % 2 ? "advantage" : "" }));
  return `# Turn 9999: Table test\n\n**Practice turn, on this device only.** Nothing here is part of the story. ` +
    `Pick a number, write anything, press Send, and watch the lights.\n\n<!-- checks: ${JSON.stringify(checks)} -->\n`;
}

// ======================= table feed =======================
function stripH1(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/^# .*\n?/m, "").trim();
}

/** Render a turn: markdown, with the `## Rolls` block that `table.py send` appends styled as a compact list. */
function renderTurn(text: string) {
  return md(stripH1(text)).replace(/<h2>Rolls<\/h2>\s*<ul>/, '<h2 class="rolls-head">Rolls</h2><ul class="rolls">');
}

async function renderFeed() {
  if (!index) return;
  const latest = $("feed-latest");
  if (!index.story.length) {
    latest.innerHTML = `<h2>No turns yet</h2><p class="sat-muted">The DM posts the first turn here when Session 1 begins.</p>`;
    $("feed-earlier-wrap").hidden = true;
    return;
  }
  const [first, ...rest] = index.story;
  const text = first.id === TEST_ID ? testTurn()
    : !first.file ? (livePost?.text ?? `# ${first.title}\n\nThe full turn arrives here within 2 minutes.`)
    : await (await fetchFresh(`content/${first.file}`)).text();
  latestChecks = parseChecks(text);
  sessionClosed = text.includes(CLOSED_MARK);
  latest.innerHTML = `<span class="sat-caption post-meta">Latest turn</span><h2>${escapeHtml(first.title)}</h2>${renderTurn(text)}`;

  const earlier = $("feed-earlier");
  earlier.innerHTML = "";
  for (const post of rest) {
    const d = document.createElement("details");
    d.className = "sat-glass-2 sat-card letter";
    d.innerHTML = `<summary><span class="letter-title">${escapeHtml(post.title)}</span></summary><div class="prose"><p class="sat-muted">Loading.</p></div>`;
    d.addEventListener("toggle", async () => {
      if (!d.open || d.dataset.loaded) return;
      d.dataset.loaded = "1";
      const body = d.querySelector(".prose")!;
      try { body.innerHTML = renderTurn(await (await fetchFresh(`content/${post.file}`)).text()); }
      catch { body.innerHTML = `<p class="sat-muted">Turn unable to load. Close and open it again.</p>`; delete d.dataset.loaded; }
    });
    earlier.appendChild(d);
  }
  $("feed-earlier-wrap").hidden = rest.length === 0;
  if (current === "table") markPostSeen();
  void pollActions();
}

// ======================= relay: shared answers, asides, live posts =======================
// One free ntfy.sh topic (relay.json) carries three kinds of message (plans/table-live.md):
//   action  a shared answer. Both players see it; the first one moves the story, a second one is read too.
//   aside   a private thread with the DM, sealed with this player's inbox code. Other players' asides are never opened.
//   post    the DM's new turn, so it shows here within 5 seconds instead of after the Pages deploy.
const ACTION_POLL_MS = 5_000;
let actions = new Map<string, Action>();
let asides: { id: string; from: "player" | "dm"; at: number; text: string }[] = [];
const asideText = new Map<string, string>(); // relay message id -> opened text (opened once per page load)
let livePost: LivePost | null = null;
let draftTurn = 0;
let latestChecks: Check[] = [];
let faces = new Map<string, number>(); // check id -> the d20 face this player tapped
let checksKey = "";
const asideSeenKey = (slug: string) => `vaela-table-aside-seen:${slug}`;
// Session close (step 5): `table.py close` ends its recap post with this mark. While it is the latest post, the
// answer and aside boxes stay closed; the next session's first post reopens them.
const CLOSED_MARK = "<!-- session: closed -->";
let sessionClosed = false;
let closeMsgs: CloseMsg[] = [];

const firstName = (slug: string) => index?.inboxes.find((m) => m.slug === slug)?.name.split(" ")[0] ?? slug;
/** "Danny", "Danny and Ilse", "Danny, Ilse and Petr". */
function nameList(slugs: string[]) {
  const n = slugs.map(firstName);
  return n.length < 2 ? n.join("") : `${n.slice(0, -1).join(", ")} and ${n[n.length - 1]}`;
}
function closeConf() {
  const c = index?.relay?.close ?? {};
  return { who: c.who ?? "any", needs: c.needs ?? "all", finish: c.finish ?? true };
}
/** The close request after every ask / agree / cancel this turn, oldest first. Mirrors close_request in table.py. */
function closeRequest(): CloseReq | null {
  if (!index) return null;
  const conf = closeConf();
  const names = index.inboxes.map((m) => m.slug);
  let req: { by: string; turn: number; agreed: string[] } | null = null;
  for (const m of [...closeMsgs].sort((a, b) => a.at - b.at)) {
    if (!names.includes(m.who)) continue;
    if (m.op === "ask" && !req && (conf.who === "any" || m.who === index.relay?.host)) req = { by: m.who, turn: m.turn, agreed: [] };
    else if (m.op === "agree" && req && m.who !== req.by && !req.agreed.includes(m.who)) req.agreed.push(m.who);
    else if (m.op === "cancel" && req) req = null;
  }
  if (!req) return null;
  const waiting = names.filter((s) => s !== req!.by && !req!.agreed.includes(s));
  return { ...req, waiting, ready: conf.needs === "one" || waiting.length === 0 };
}

/** `table.py send` writes the called checks as a hidden line: <!-- checks: [...] --> */
function parseChecks(text: string): Check[] {
  const m = text.match(/<!-- checks: (\[.*?\]) -->/s);
  if (!m) return [];
  try {
    const list = JSON.parse(m[1]);
    return Array.isArray(list) ? list.filter((c) => c && typeof c.id === "string" && typeof c.who === "string") : [];
  } catch { return []; }
}

function myChecks(slug: string) { return latestChecks.filter((c) => c.who === slug); }

/** One 1-20 grid per check called for this player. Rebuilt only when the turn or the checks change. */
function renderChecks(slug: string, turn: number) {
  const mine = myChecks(slug);
  const wrap = $("move-checks");
  wrap.hidden = mine.length === 0;
  const key = `${turn}|${slug}|${mine.map((c) => c.id).join(",")}`;
  if (key === checksKey) return;
  checksKey = key;
  wrap.innerHTML = "";
  for (const c of mine) {
    const how = c.mode === "advantage" ? "Roll two d20 and tap the higher." : c.mode === "disadvantage" ? "Roll two d20 and tap the lower." : "Roll your d20 and tap the number.";
    const group = document.createElement("div");
    group.className = "sat-stack check";
    group.innerHTML = `<p class="sat-small"><strong></strong> <span class="sat-muted"></span></p><div class="faces" role="radiogroup"></div>`;
    group.querySelector("strong")!.textContent = `${c.label}${c.mode ? ` (${c.mode})` : ""}.`;
    group.querySelector(".sat-muted")!.textContent = how;
    const grid = group.querySelector<HTMLElement>(".faces")!;
    grid.setAttribute("aria-label", `${c.label}: your d20`);
    for (let n = 1; n <= 20; n++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "face";
      b.textContent = String(n);
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(faces.get(c.id) === n));
      b.addEventListener("click", () => {
        faces.set(c.id, n);
        grid.querySelectorAll(".face").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
      });
      grid.appendChild(b);
    }
    wrap.appendChild(group);
  }
}

const turnOf = (id?: string) => (id ? parseInt(id.slice(0, 4), 10) || 0 : 0);
function currentTurn() { return turnOf(index?.story[0]?.id); }

/** The player acting on this device: the open inbox, else the one inbox whose code this device remembers. */
function me(): InboxMeta | null {
  if (opened) return opened.meta;
  const remembered = index?.inboxes.filter((m) => store.get(codeKey(m.slug))) ?? [];
  return remembered.length === 1 ? remembered[0] : null;
}
function myCode(slug: string) { return opened?.meta.slug === slug ? opened.code : store.get(codeKey(slug)); }

function relayUrl() {
  const r = index?.relay;
  return r ? `${r.server}/${encodeURIComponent(r.topic)}` : null;
}

/** A turn the DM just sent, shown before the Pages deploy catches up. Called on every index load. */
function applyLive(next: Index) {
  if (livePost && livePost.turn > turnOf(next.story[0]?.id) && !TEST_MODE) {
    next.story = [{ id: livePost.id, title: livePost.title, file: "" }, ...next.story];
  }
}

async function pollActions() {
  const url = relayUrl();
  if (!url) return renderMove();
  const who = me();
  try {
    const res = await fetch(`${url}/json?poll=1&since=all`, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const turn = currentTurn();
    const next = new Map<string, Action>();
    const mine: typeof asides = [];
    const closes: CloseMsg[] = [];
    let live: LivePost | null = null;
    for (const line of (await res.text()).split("\n")) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.event !== "message") continue;
        const a = JSON.parse(msg.message);
        // ntfy returns oldest first, so a later answer from the same player replaces the earlier one.
        if (a?.kind === "action" && a.turn === turn && typeof a.who === "string") next.set(a.who, a as Action);
        // A close request also holds over the DM's resolving post (the next turn), so it lasts until the recap.
        else if (a?.kind === "close" && (a.turn === turn || a.turn === turn - 1) && typeof a.who === "string" && typeof a.at === "number") closes.push(a as CloseMsg);
        else if (a?.kind === "post" && typeof a.turn === "number" && typeof a.id === "string" && (!live || a.turn >= live.turn)) live = a as LivePost;
        else if (a?.kind === "aside" && who && a.who === who.slug) {
          const code = myCode(who.slug);
          if (!asideText.has(msg.id) && code) {
            try { asideText.set(msg.id, await openNote(code, a)); } catch { asideText.set(msg.id, ""); }
          }
          const text = asideText.get(msg.id);
          if (text) mine.push({ id: msg.id, from: a.from === "dm" ? "dm" : "player", at: a.at, text });
        }
      } catch { /* not ours */ }
    }
    actions = next;
    asides = mine;
    closeMsgs = closes;
    if (live && index && live.turn > currentTurn() && !TEST_MODE) {
      livePost = live;
      applyLive(index);
      arrivedAt = new Date();
      await renderFeed();
      return; // renderFeed polls again for the new turn
    }
  } catch { /* relay unreachable: keep the last state */ }
  renderMove();
  renderAside();
}

function renderMove() {
  const turn = currentTurn();
  const box = $("move");
  box.hidden = !index?.relay || !turn;
  if (box.hidden || !index) return;

  const req = closeRequest();
  const who = me();
  const lights = $("move-lights");
  lights.hidden = sessionClosed;
  lights.innerHTML = "";
  for (const m of index.inboxes) {
    // While a close request is open, the lights show where each player stands on it.
    const [on, label] = !req ? [actions.has(m.slug), actions.has(m.slug) ? "answered" : "waiting"]
      : m.slug === req.by ? [true, "wants to stop"]
      : req.agreed.includes(m.slug) ? [true, "agreed"]
      : closeConf().needs === "one" ? [true, "notified"] : [false, "deciding"];
    const li = document.createElement("li");
    li.className = "light";
    li.dataset.on = String(on);
    li.innerHTML = `<span class="light-dot" aria-hidden="true"></span>`;
    li.append(`${m.name.split(" ")[0]} ${label}`);
    lights.appendChild(li);
  }
  renderClose(who, req);

  // Closed session, or answers stopped while the DM writes the recap: no answer box.
  const shut = sessionClosed ? "Session closed. No answers until the next session starts."
    : req && (!closeConf().finish || req.turn < currentTurn()) ? "Answers are closed. The DM is writing the recap." : "";
  $("move-shut").textContent = shut;
  $("move-shut").hidden = !shut;
  if (sessionClosed) {
    $("move-answers").hidden = $("move-need").hidden = $("move-form").hidden = true;
    return;
  }

  // Shared answers, first first. Everyone sees them; the first one moves the story.
  const sent = [...actions.values()].sort((a, b) => a.at - b.at);
  const list = $("move-answers");
  list.hidden = sent.length === 0;
  list.innerHTML = "";
  for (const a of sent) {
    const li = document.createElement("li");
    const name = index.inboxes.find((m) => m.slug === a.who)?.name.split(" ")[0] ?? a.who;
    li.innerHTML = `<strong></strong> <span></span>`;
    li.querySelector("strong")!.textContent = `${name}:`;
    li.querySelector("span")!.textContent = a.text || "(rolled the check)";
    list.appendChild(li);
  }

  $("move-need").hidden = !!who;
  $("move-form").hidden = !who || !!shut;
  if (!who) return;
  $("move-name").textContent = who.name.split(" ")[0];
  const text = $<HTMLTextAreaElement>("move-text");
  const mine = actions.get(who.slug);
  if (draftTurn !== turn) { // a new turn starts with an empty box, or with what this player already sent
    text.value = mine?.text ?? "";
    faces = new Map(Object.entries(mine?.checks ?? {}));
    checksKey = "";
    $("move-status").textContent = "";
    draftTurn = turn;
  }
  renderChecks(who.slug, turn);
  // A hint like "tap your number first" stays until the player acts; only a confirmed send overwrites it.
  if ($("move-status").dataset.busy) return;
  const first = sent[0];
  if (mine) {
    $("move-status").textContent = `Sent at ${fmtTime(new Date(mine.at))}. Send again to replace it.`;
  } else if (first) {
    const name = index.inboxes.find((m) => m.slug === first.who)?.name.split(" ")[0] ?? first.who;
    $("move-status").textContent = `${name} answered first. Add yours before the DM replies and the DM reads both.`;
  }
}

$("move-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const who = me();
  const url = relayUrl();
  const text = $<HTMLTextAreaElement>("move-text").value.trim();
  const status = $("move-status");
  if (!who || !url) return;
  const pending = myChecks(who.slug);
  const missing = pending.find((c) => !faces.has(c.id));
  if (missing) { status.textContent = `Tap your d20 number for ${missing.label} first.`; return; }
  if (!text && !pending.length) { status.textContent = "Write what your character does first."; return; }
  const picked = Object.fromEntries(pending.map((c) => [c.id, faces.get(c.id)!]));
  const send = $<HTMLButtonElement>("move-send");
  send.setAttribute("aria-disabled", "true");
  status.dataset.busy = "1";
  status.textContent = "Sending";
  const action: Action = { v: 1, kind: "action", turn: currentTurn(), who: who.slug, text, at: Date.now(),
    ...(pending.length ? { checks: picked } : {}) };
  try {
    const res = await fetch(url, { method: "POST", body: JSON.stringify(action) });
    if (!res.ok) throw new Error(String(res.status));
    actions.set(who.slug, action);
    delete status.dataset.busy;
    renderMove();
  } catch {
    delete status.dataset.busy;
    status.textContent = "Not sent. Check internet connection and press Send again.";
  } finally {
    send.removeAttribute("aria-disabled");
  }
});

// ---- session close: End the session, Agree, Keep playing, Cancel request ----
function renderClose(who: InboxMeta | null, req: CloseReq | null) {
  const box = $("close");
  box.hidden = !who || sessionClosed;
  if (box.hidden || !who || !index) return;
  const conf = closeConf();
  const host = index.relay?.host;
  const mine = req?.by === who.slug;
  const agreed = !!req?.agreed.includes(who.slug);
  let banner = "";
  if (req) {
    banner = conf.needs === "one" ? (mine ? "You asked to end the session. The DM wraps up next." : `${firstName(req.by)} ended the session. The DM wraps up next.`)
      : req.ready ? "Everyone agreed to end the session. The DM wraps up next."
      : mine ? `You asked to end the session. Waiting for ${nameList(req.waiting)} to agree.`
      : agreed ? `You agreed. Waiting for ${nameList(req.waiting)}.`
      : `${firstName(req.by)} asked to end the session here.`;
    if (conf.finish && req.turn === currentTurn()) banner += " Answers for this turn still count: the DM resolves them before closing.";
  }
  $("close-banner").textContent = banner;
  $("close-banner").hidden = !req;
  const canAsk = conf.who === "any" || who.slug === host;
  $("close-ask").hidden = !!req || !canAsk;
  $("close-cancel").hidden = !mine;
  $("close-agree").hidden = $("close-keep").hidden = !req || mine || agreed || req.ready || conf.needs === "one";
  const status = $("close-status");
  if (!status.dataset.busy) status.textContent = !req && !canAsk && host ? `Only ${firstName(host)} can end the session.` : "";
}

async function sendClose(op: CloseMsg["op"]) {
  const who = me();
  const url = relayUrl();
  const status = $("close-status");
  if (!who || !url || status.dataset.busy) return;
  status.dataset.busy = "1";
  status.textContent = "Sending";
  const msg: CloseMsg = { v: 1, kind: "close", op, turn: currentTurn(), who: who.slug, at: Date.now() };
  try {
    const res = await fetch(url, { method: "POST", body: JSON.stringify(msg) });
    if (!res.ok) throw new Error(String(res.status));
    closeMsgs = [...closeMsgs, msg];
    delete status.dataset.busy;
    renderMove();
  } catch {
    delete status.dataset.busy;
    status.textContent = "Not sent. Check internet connection and try again.";
  }
}
$("close-ask").addEventListener("click", () => sendClose("ask"));
$("close-agree").addEventListener("click", () => sendClose("agree"));
$("close-keep").addEventListener("click", () => sendClose("cancel"));
$("close-cancel").addEventListener("click", () => sendClose("cancel"));

// ---- aside: a private thread with the DM ----
function renderAside() {
  const who = me();
  const box = $<HTMLDetailsElement>("aside");
  const usable = !!index?.relay && !!who && !!myCode(who.slug);
  box.hidden = !usable || sessionClosed;
  $("aside-closed").hidden = !usable || !sessionClosed;
  if (box.hidden || !who) return;
  const others = index!.inboxes.filter((m) => m.slug !== who.slug).map((m) => m.slug);
  $("aside-who").textContent = others.length ? nameList(others) : "the other players";
  const thread = $("aside-thread");
  thread.innerHTML = asides.length ? "" : `<li class="sat-muted">No asides yet this session. Earlier ones are in your inbox.</li>`;
  for (const m of asides) {
    const li = document.createElement("li");
    li.dataset.from = m.from;
    li.innerHTML = `<strong></strong> <span></span>`;
    li.querySelector("strong")!.textContent = m.from === "dm" ? "DM:" : "You:";
    li.querySelector("span")!.textContent = m.text;
    thread.appendChild(li);
  }
  const seen = Number(store.get(asideSeenKey(who.slug)) ?? 0);
  const fresh = asides.filter((m) => m.from === "dm" && m.at > seen).length;
  if (box.open && fresh) store.set(asideSeenKey(who.slug), String(Date.now()));
  const badge = $("aside-new");
  badge.hidden = box.open || fresh === 0;
  badge.textContent = `${fresh} new`;
}
$("aside").addEventListener("toggle", renderAside);

$("aside-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const who = me();
  const url = relayUrl();
  const code = who && myCode(who.slug);
  const box = $<HTMLTextAreaElement>("aside-text");
  const status = $("aside-status");
  const text = box.value.trim();
  if (!who || !url || !code) return;
  if (!text) { status.textContent = "Write your aside first."; return; }
  const send = $<HTMLButtonElement>("aside-send");
  send.setAttribute("aria-disabled", "true");
  status.textContent = "Sealing";
  try {
    const sealed = await sealNote(code, text);
    const res = await fetch(url, { method: "POST", body: JSON.stringify({ v: 1, kind: "aside", who: who.slug, from: "player", at: Date.now(), ...sealed }) });
    if (!res.ok) throw new Error(String(res.status));
    box.value = "";
    status.textContent = "Sent privately. The DM answers here.";
    void pollActions();
  } catch {
    status.textContent = "Not sent. Check internet connection and press Send again.";
  } finally {
    send.removeAttribute("aria-disabled");
  }
});

window.setInterval(() => {
  if (document.visibilityState === "visible" && current === "table") void pollActions();
}, ACTION_POLL_MS);

function markPostSeen() {
  if (index?.story[0]) store.set(SEEN_POST, index.story[0].id);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// ======================= sealed inboxes =======================
let picking: InboxMeta | null = null;
let opened: { meta: InboxMeta; code: string; items: Item[] } | null = null;

function renderPick() {
  const pick = $("inbox-pick");
  pick.innerHTML = "";
  if (!index?.inboxes.length) {
    pick.innerHTML = `<p class="sat-muted">No inboxes yet. The DM opens one for each player before play.</p>`;
    return;
  }
  for (const meta of index.inboxes) {
    const seen = store.get(seenKey(meta.slug));
    const fresh = seen !== null && meta.letters > Number(seen) ? meta.letters - Number(seen) : 0;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sat-glass inbox-card";
    b.innerHTML = `<span class="sat-caption">Inbox</span><span class="sat-h2">${escapeHtml(meta.name)}</span>
      <span class="sat-cluster" style="--sat-gap: var(--sat-space-2)"><span class="sat-small sat-muted">${meta.letters} letter${meta.letters === 1 ? "" : "s"}</span>${fresh ? `<span class="sat-badge">${fresh} new</span>` : ""}</span>`;
    b.addEventListener("click", () => startUnlock(meta));
    pick.appendChild(b);
  }
}

function enterInbox() {
  if (opened) return showInboxPanel("open");
  if (!index) return showInboxPanel("pick");
  // A code remembered on this device opens its inbox straight away.
  const remembered = index.inboxes.filter((m) => store.get(codeKey(m.slug)));
  if (remembered.length === 1) { void unlock(remembered[0], store.get(codeKey(remembered[0].slug))!, true, true); return; }
  showInboxPanel(picking ? "unlock" : "pick");
}

function showInboxPanel(which: "pick" | "unlock" | "open") {
  $("inbox-pick").hidden = which !== "pick";
  $("inbox-unlock").hidden = which !== "unlock";
  $("inbox-open").hidden = which !== "open";
}

function startUnlock(meta: InboxMeta) {
  picking = meta;
  $("unlock-title").textContent = meta.name;
  $<HTMLInputElement>("code").value = "";
  $("code-error").hidden = true;
  $<HTMLInputElement>("code").removeAttribute("aria-invalid");
  showInboxPanel("unlock");
  $("code").focus();
}

$("unlock-back").addEventListener("click", () => { picking = null; showInboxPanel("pick"); });
$("inbox-unlock").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!picking) return;
  const remember = $("remember").getAttribute("aria-checked") === "true";
  await unlock(picking, $<HTMLInputElement>("code").value, remember, false);
});

async function unlock(meta: InboxMeta, code: string, remember: boolean, silent: boolean) {
  const go = $<HTMLButtonElement>("unlock-go");
  const err = $("code-error");
  go.setAttribute("aria-disabled", "true");
  go.textContent = "Opening";
  try {
    const sealed = await (await fetchFresh(`content/${meta.file}`)).json();
    const data = await openInbox(sealed, code);
    if (remember) store.set(codeKey(meta.slug), code); else store.del(codeKey(meta.slug));
    const seenBefore = store.get(seenKey(meta.slug));
    opened = { meta, code, items: data.items as Item[] };
    renderOpen(seenBefore === null ? 0 : Math.max(0, meta.letters - Number(seenBefore)));
    store.set(seenKey(meta.slug), String(meta.letters));
    picking = null;
    showInboxPanel("open");
    updateDots();
    renderMove();
    void pollActions();
  } catch (e) {
    if (silent) { store.del(codeKey(meta.slug)); showInboxPanel("pick"); return; }
    err.textContent = e instanceof WrongCode
      ? "Code does not match this inbox. Check the code the host sent you (e.g. K7QF-M2XD-9PRA)."
      : "Inbox unable to load. Check internet connection and try again.";
    err.hidden = false;
    $<HTMLInputElement>("code").setAttribute("aria-invalid", "true");
  } finally {
    go.removeAttribute("aria-disabled");
    go.textContent = "Open inbox";
  }
}

function renderOpen(newCount: number) {
  if (!opened) return;
  $("open-title").textContent = `${opened.meta.name}'s inbox`;
  const badge = $("open-new");
  badge.hidden = newCount === 0;
  badge.textContent = `${newCount} new`;

  const letters = opened.items.filter((i) => i.kind === "letter").reverse();
  const list = $("open-letters");
  list.innerHTML = letters.length ? "" : `<p class="sat-muted">No letters yet.</p>`;
  letters.forEach((l, i) => {
    const d = document.createElement("details");
    d.className = "sat-glass-2 sat-card letter";
    d.open = i === 0;
    d.innerHTML = `<summary><span class="sat-caption">${i < newCount ? "New letter" : "Letter"}</span><span class="letter-title">${escapeHtml(l.title)}</span></summary><div class="prose">${md(l.body)}</div>`;
    list.appendChild(d);
  });

  const sheet = opened.items.find((i) => i.kind === "sheet");
  $("open-sheet").hidden = !sheet;
  if (sheet) {
    $("open-sheet-title").textContent = sheet.title;
    $("open-sheet-body").innerHTML = md(sheet.body);
  }
  const pack = opened.items.find((i) => i.kind === "pack");
  $("open-pack").hidden = !pack;
  if (pack) $("open-pack-body").innerHTML = md(pack.body);
  const asideLog = opened.items.find((i) => i.kind === "asides");
  $("open-asides").hidden = !asideLog;
  if (asideLog) $("open-asides-body").innerHTML = md(asideLog.body);
  const rolls = opened.items.find((i) => i.kind === "rolls");
  $("open-rolls").hidden = !rolls;
  if (rolls) $("open-rolls-body").innerHTML = md(rolls.body);
  // Sheet links point at ../sheet.md in the source; inside the app the sheet sits below the letters.
  list.querySelectorAll<HTMLAnchorElement>('a[href$="sheet.md"]').forEach((a) => {
    a.href = "#inbox";
    a.addEventListener("click", (e) => { e.preventDefault(); const s = $<HTMLDetailsElement>("open-sheet"); s.open = true; s.scrollIntoView({ behavior: "smooth" }); });
  });
}

async function refreshOpenInbox(prev: Index | null) {
  if (!opened || !index) return;
  const meta = index.inboxes.find((m) => m.slug === opened!.meta.slug);
  const before = prev?.inboxes.find((m) => m.slug === opened!.meta.slug);
  if (!meta || (before && before.newest === meta.newest && before.letters === meta.letters && before.salt === meta.salt)) return;
  const sealed = await (await fetchFresh(`content/${meta.file}`)).json();
  try {
    const data = await openInbox(sealed, opened.code);
    const seen = Number(store.get(seenKey(meta.slug)) ?? 0);
    opened = { meta, code: opened.code, items: data.items };
    renderOpen(Math.max(0, meta.letters - seen));
    if (current === "inbox") store.set(seenKey(meta.slug), String(meta.letters));
  } catch {
    // The DM changed this inbox's code: lock it and ask for the new one.
    lockInbox();
  }
}

function lockInbox() {
  if (opened) store.del(codeKey(opened.meta.slug));
  opened = null;
  renderPick();
  showInboxPanel("pick");
  updateDots();
  renderMove();
  renderAside();
}
$("lock").addEventListener("click", lockInbox);

// ======================= new-content dots =======================
function updateDots() {
  const postNew = !!index?.story[0] && store.get(SEEN_POST) !== index.story[0].id && current !== "table";
  const inboxNew = !!index?.inboxes.some((m) => {
    const seen = store.get(seenKey(m.slug));
    return seen !== null && store.get(codeKey(m.slug)) !== null && m.letters > Number(seen);
  }) && current !== "inbox";
  document.querySelectorAll<HTMLElement>('[data-dot="table"]').forEach((d) => { d.hidden = !postNew; });
  document.querySelectorAll<HTMLElement>('[data-dot="inbox"]').forEach((d) => { d.hidden = !inboxNew; });
  // A tab left in the background shows new content in its title.
  const unseenPost = !!index?.story[0] && store.get(SEEN_POST) !== index.story[0].id;
  document.title = (postNew || inboxNew || (unseenPost && document.visibilityState === "hidden")) ? `(New) ${BASE_TITLE}` : BASE_TITLE;
}

// ======================= start =======================
initSheet();
initDice();
const [v, a] = fromHash();
show(v, a);
void check();
