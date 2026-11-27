import "./saturday/css/tokens.css";
import "./saturday/css/saturday.css";
import "./saturday/js/saturday.js";
import "./kit.css";
import "./styles.css";
import { marked } from "marked";
import { openInbox, openNote, sealNote, WrongCode } from "./lib/crypto.js";
import { initSheet, setSheetIdentity } from "./sheet";
import { initTextSize } from "./prefs";
import { initDice } from "./dice";
import { initNav, onRoute, currentRoute, setAbsent, openingBook } from "./nav";
import { enhance, profileHtml, type Profile } from "./enhance";
import { rollBox, missingRoll, type RollCheck, type RollState } from "./rollbox";

type Post = { id: string; title: string; file: string };
type InboxMeta = { slug: string; name: string; letters: number; newest: string | null; salt?: string; file: string };
/** relay.json: the ntfy topic, the host's slug and the session-close settings (plans/table-live.md, step 5). */
type CloseConf = { who?: "any" | "host"; needs?: "all" | "one"; finish?: boolean; recap?: boolean };
type Relay = { server: string; topic: string; host?: string; close?: CloseConf };
/** A player asks to end the session, agrees, or cancels (Keep playing). Only messages for the current turn count. */
type CloseMsg = { v: 1; kind: "close"; op: "ask" | "agree" | "cancel"; turn: number; who: string; at: number };
type CloseReq = { by: string; turn: number; agreed: string[]; waiting: string[]; ready: boolean };
type Index = { rev: string; built: string; story: Post[]; inboxes: InboxMeta[]; relay?: Relay | null };
/** One player's answer for one turn, carried by the relay. The newest one per player wins.
 *  checks: the die result typed for each check; forMe: checks the player asked the DM to roll. */
type Action = { v: 1; kind: "action"; turn: number; who: string; text: string; at: number; checks?: Record<string, number>; forMe?: string[] };
/** A roll the DM called (`table.py check`). No DC or modifier ever reaches the app. */
type Check = RollCheck & { who: string };
type Item = { id: string; kind: "sheet" | "letter" | "rolls" | "pack" | "asides" | "profile"; title: string; body: string };
/** The DM's new turn on the relay (`table.py send`). `text` is missing when the post is over 4 KB. */
type LivePost = { kind: "post"; turn: number; id: string; title: string; text?: string };

const POLL_MS = 20_000;
const BASE_TITLE = document.title;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const md = (text: string) => marked.parse(text, { async: false }) as string;
const HIDDEN = /<!--[\s\S]*?-->/g;

// ---- small storage helpers (storage can be blocked: every call is guarded) ----
const store = {
  get(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } },
  set(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* blocked */ } },
  del(key: string) { try { localStorage.removeItem(key); } catch { /* blocked */ } },
};
// Session storage lasts until the app (or tab) is closed: the welcome letter and the active player live here.
const session = {
  get(key: string): string | null { try { return sessionStorage.getItem(key); } catch { return null; } },
  set(key: string, value: string) { try { sessionStorage.setItem(key, value); } catch { /* blocked */ } },
  del(key: string) { try { sessionStorage.removeItem(key); } catch { /* blocked */ } },
};
const ACTIVE = "vaela-table-active";
const welcomeKey = (slug: string) => `vaela-table-welcome:${slug}`;
const codeKey = (slug: string) => `vaela-table-code:${slug}`;
const seenKey = (slug: string) => `vaela-table-seen:${slug}`;
const SEEN_POST = "vaela-table-seen-post";

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
      if (!prev && currentRoute()?.view === "inbox") enterInbox(); // first load: a remembered code can open its inbox now
      $("build-line").textContent = `Content built ${fmtDate(new Date(index.built))}.`;
    }
    if (newTurn) arrivedAt = checkedAt;
    status.textContent = arrivedAt && checkedAt.getTime() - arrivedAt.getTime() < 5 * 60_000
      ? `New turn at ${fmtTime(arrivedAt)}`
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
// Opening the app with ?test shows a practice turn 9999 on this device only, with a roll for every player,
// so the answer box, lights and roll entry can be tried on real phones without posting a turn. The DM pulls it
// with `table.py inbox --turn 9999`.
const TEST_MODE = new URLSearchParams(location.search).has("test");
const TEST_ID = "9999-table-test";

function testTurn() {
  const checks = (index?.inboxes ?? []).flatMap((m, i) => [
    { id: `t${i + 1}`, who: m.slug, label: "Perception check", mode: i % 2 ? "advantage" : "", die: "d20" },
    ...(i === 0 ? [{ id: `t${i + 1}b`, who: m.slug, label: "Dagger damage", mode: "", die: "1d4" }] : []),
  ]);
  return `# Turn 9999: Table test\n\n**Practice turn, on this device only.** Nothing here is part of the story. ` +
    `Type a roll, write anything, press Send, and watch the lights.\n\n<!-- checks: ${JSON.stringify(checks)} -->\n`;
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
    setAbsent("table", "earlier", true);
    return;
  }
  const [first, ...rest] = index.story;
  const text = first.id === TEST_ID ? testTurn()
    : !first.file ? (livePost?.text ?? `# ${first.title}\n\nThe full turn arrives here within 2 minutes.`)
    : await (await fetchFresh(`content/${first.file}`)).text();
  latestChecks = parseChecks(text);
  sessionClosed = text.includes(CLOSED_MARK);
  latest.innerHTML = `<h2>${escapeHtml(first.title)}</h2>${renderTurn(text)}`;

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
  setAbsent("table", "earlier", rest.length === 0);
  if (currentRoute()?.view === "table") markPostSeen();
  void pollActions();
}

// ======================= relay: shared answers, private chat, live posts =======================
// One free ntfy.sh topic (relay.json) carries four kinds of message (plans/table-live.md):
//   action  a shared answer. Everyone sees it; the first one moves the story, a second one is read too.
//   aside   Private chat with the DM, sealed with this player's inbox code. Other players' messages are never opened.
//           A DM message may call a private roll (a hidden checks line inside the sealed text).
//   post    the DM's new turn, so it shows here at once instead of after the Pages deploy.
//   close   End the session, Agree, Keep playing.
// The app holds ONE connection to the topic (ntfy server-sent events): it replays every cached message, then pushes
// new ones as they arrive. Polling every 5 s got phones blocked (HTTP 429; plans/table-live.md step 5b).
const RETRY_MS = 30_000;
const relayMsgs = new Map<string, any>(); // ntfy message id -> payload, oldest first
let stream: EventSource | null = null;
let streamUrl = "";
let retryTimer = 0;
let relayTimer = 0;
let relayBusy = false;
let relayAgain = false;
let actions = new Map<string, Action>();
let asides: { id: string; from: "player" | "dm"; at: number; text: string }[] = [];
const asideText = new Map<string, string>(); // relay message id -> opened text (opened once per page load)
let livePost: LivePost | null = null;
let draftTurn = 0;
let latestChecks: Check[] = [];
let publicRolls: RollState = { faces: new Map(), forMe: new Set() };
const privateRolls: RollState = { faces: new Map(), forMe: new Set() };
let checksKey = "";
let privKey = "";
const asideSeenKey = (slug: string) => `vaela-table-aside-seen:${slug}`;
// Session close (step 5): `table.py close` ends its recap post with this mark. While it is the latest post, the
// answer and chat boxes stay closed; the next session's first post reopens them.
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

/** `table.py send` (and `aside` for a private roll) writes the called checks as a hidden line: <!-- checks: [...] --> */
function parseChecks(text: string): Check[] {
  const m = text.match(/<!-- checks: (\[.*?\]) -->/s);
  if (!m) return [];
  try {
    const list = JSON.parse(m[1]);
    return Array.isArray(list) ? list.filter((c) => c && typeof c.id === "string" && typeof c.who === "string") : [];
  } catch { return []; }
}

function myChecks(slug: string) { return latestChecks.filter((c) => c.who === slug); }

/** One roll box per check called for this player. Rebuilt only when the turn or the checks change. */
function renderChecks(slug: string, turn: number) {
  const mine = myChecks(slug);
  const wrap = $("move-checks");
  wrap.hidden = mine.length === 0;
  const key = `${turn}|${slug}|${mine.map((c) => c.id).join(",")}`;
  if (key === checksKey) return;
  checksKey = key;
  wrap.innerHTML = "";
  for (const c of mine) wrap.appendChild(rollBox(c, publicRolls, () => clearHint("move-status")));
}

function clearHint(id: string) { const s = $(id); if (s.dataset.hint) { s.textContent = ""; delete s.dataset.hint; } }

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

/** Open the relay stream, unless it is already open. A refused connection (HTTP 429) is retried after RETRY_MS. */
function connectRelay() {
  const url = relayUrl();
  if (!url) return;
  if (stream && streamUrl === url && stream.readyState !== EventSource.CLOSED) return;
  stream?.close();
  streamUrl = url;
  const es = new EventSource(`${url}/sse?since=all`);
  stream = es;
  es.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.event !== "message" || relayMsgs.has(msg.id)) return; // a reconnect replays everything: skip repeats
      relayMsgs.set(msg.id, JSON.parse(msg.message));
      window.clearTimeout(relayTimer);
      relayTimer = window.setTimeout(() => void pollActions(), 100); // one redraw per burst (the replay on connect)
    } catch { /* not ours */ }
  };
  es.onerror = () => {
    // A dropped line reconnects by itself; a refused one stays closed, so try again later.
    if (es.readyState === EventSource.CLOSED && stream === es) {
      stream = null;
      window.clearTimeout(retryTimer);
      retryTimer = window.setTimeout(connectRelay, RETRY_MS);
    }
  };
}

/** Rebuild answers, private chat, close requests and the live post from every relay message, then redraw. */
async function pollActions() {
  const url = relayUrl();
  if (!url) return renderMove();
  connectRelay();
  if (relayBusy) { relayAgain = true; return; }
  relayBusy = true;
  const who = me();
  try {
    const turn = currentTurn();
    const next = new Map<string, Action>();
    const mine: typeof asides = [];
    const closes: CloseMsg[] = [];
    let live: LivePost | null = null;
    for (const [id, a] of relayMsgs) {
      try {
        // Oldest first, so a later answer from the same player replaces the earlier one.
        if (a?.kind === "action" && a.turn === turn && typeof a.who === "string") next.set(a.who, a as Action);
        // A close request also holds over the DM's resolving post (the next turn), so it lasts until the recap.
        else if (a?.kind === "close" && (a.turn === turn || a.turn === turn - 1) && typeof a.who === "string" && typeof a.at === "number") closes.push(a as CloseMsg);
        else if (a?.kind === "post" && typeof a.turn === "number" && typeof a.id === "string" && (!live || a.turn >= live.turn)) live = a as LivePost;
        else if (a?.kind === "aside" && who && a.who === who.slug) {
          const code = myCode(who.slug);
          if (!asideText.has(id) && code) {
            try { asideText.set(id, await openNote(code, a)); } catch { asideText.set(id, ""); }
          }
          const text = asideText.get(id);
          if (text) mine.push({ id, from: a.from === "dm" ? "dm" : "player", at: a.at, text });
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
      relayAgain = true; // renderFeed asks for a rebuild for the new turn; it runs once this one ends
      await renderFeed();
    } else {
      renderMove();
      renderChat();
    }
  } finally {
    relayBusy = false;
  }
  if (relayAgain) { relayAgain = false; await pollActions(); }
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
    li.innerHTML = `<strong></strong> <span></span>`;
    li.querySelector("strong")!.textContent = `${firstName(a.who)}:`;
    li.querySelector("span")!.textContent = a.text || "(sent a roll)";
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
    publicRolls = { faces: new Map(Object.entries(mine?.checks ?? {})), forMe: new Set(mine?.forMe ?? []) };
    checksKey = "";
    $("move-status").textContent = "";
    draftTurn = turn;
  }
  renderChecks(who.slug, turn);
  // A hint like "type your roll first" stays until the player acts; only a confirmed send overwrites it.
  const status = $("move-status");
  if (status.dataset.busy || status.dataset.hint) return;
  const first = sent[0];
  if (mine) status.textContent = `Sent at ${fmtTime(new Date(mine.at))}. Send again to replace it.`;
  else if (first) status.textContent = `${firstName(first.who)} answered first. Add yours before the DM replies and the DM reads both.`;
}

function hint(id: string, text: string) { const s = $(id); s.textContent = text; s.dataset.hint = "1"; }

$("move-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const who = me();
  const url = relayUrl();
  const text = $<HTMLTextAreaElement>("move-text").value.trim();
  const status = $("move-status");
  if (!who || !url) return;
  const pending = myChecks(who.slug);
  const missing = missingRoll(pending, publicRolls);
  if (missing) {
    hint("move-status", `Type your roll for ${missing.label}, or press Roll for me.`);
    document.querySelector<HTMLInputElement>("#move-checks .roll-input:not(:disabled)")?.focus();
    return;
  }
  if (!text && !pending.length) { hint("move-status", "Write what your character does first."); return; }
  const picked = Object.fromEntries(pending.filter((c) => publicRolls.faces.has(c.id)).map((c) => [c.id, publicRolls.faces.get(c.id)!]));
  const forMe = pending.filter((c) => publicRolls.forMe.has(c.id)).map((c) => c.id);
  const send = $<HTMLButtonElement>("move-send");
  send.setAttribute("aria-disabled", "true");
  status.dataset.busy = "1";
  delete status.dataset.hint;
  status.textContent = "Sending";
  const action: Action = { v: 1, kind: "action", turn: currentTurn(), who: who.slug, text, at: Date.now(),
    ...(Object.keys(picked).length ? { checks: picked } : {}), ...(forMe.length ? { forMe } : {}) };
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

// ---- Private chat: a sealed thread with the DM, plus any private roll the DM calls in it ----
const ROLLS_LINE = /<!-- rolls: (\{.*?\}) -->/s;

/** Private rolls the DM called that this player has not answered yet. */
function pendingPrivate(): Check[] {
  const answered = new Set<string>();
  for (const m of asides) {
    if (m.from !== "player") continue;
    const r = m.text.match(ROLLS_LINE);
    if (r) try { Object.keys(JSON.parse(r[1])).forEach((k) => answered.add(k)); } catch { /* not ours */ }
  }
  return asides.filter((m) => m.from === "dm").flatMap((m) => parseChecks(m.text)).filter((c) => !answered.has(c.id));
}

function renderChat() {
  const who = me();
  const box = $("chat");
  const usable = !!index?.relay && !!who && !!myCode(who.slug) && !!currentTurn();
  box.hidden = !usable;
  if (!usable || !who) return;
  $("chat-closed").hidden = !sessionClosed;
  $("chat-form").hidden = sessionClosed;
  const others = index!.inboxes.filter((m) => m.slug !== who.slug).map((m) => m.slug);
  $("chat-who").textContent = others.length ? nameList(others) : "The other players";
  const thread = $("chat-thread");
  thread.innerHTML = asides.length ? "" : `<li class="sat-muted sat-small">No messages yet this session.</li>`;
  for (const m of asides) {
    const li = document.createElement("li");
    li.dataset.from = m.from;
    li.innerHTML = `<strong></strong> <span></span>`;
    li.querySelector("strong")!.textContent = m.from === "dm" ? "DM:" : "You:";
    li.querySelector("span")!.textContent = m.text.replace(HIDDEN, "").trim();
    thread.appendChild(li);
  }
  thread.scrollTop = thread.scrollHeight;
  // Private rolls: one box each, rebuilt only when the set changes.
  const pend = pendingPrivate();
  const key = pend.map((c) => c.id).join(",");
  const wrap = $("chat-checks");
  wrap.hidden = pend.length === 0 || sessionClosed;
  if (key !== privKey) {
    privKey = key;
    wrap.innerHTML = "";
    for (const c of pend) wrap.appendChild(rollBox(c, privateRolls, () => clearHint("chat-status")));
  }
  const seen = Number(store.get(asideSeenKey(who.slug)) ?? 0);
  const fresh = asides.filter((m) => m.from === "dm" && m.at > seen).length;
  const badge = $("chat-new");
  badge.hidden = fresh === 0;
  badge.textContent = `${fresh} new`;
}
// Reading the box clears its "new" badge.
["pointerdown", "focusin"].forEach((ev) => $("chat").addEventListener(ev, () => {
  const who = me();
  if (who && !$("chat-new").hidden) { store.set(asideSeenKey(who.slug), String(Date.now())); renderChat(); }
}));

$("chat-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const who = me();
  const url = relayUrl();
  const code = who && myCode(who.slug);
  const box = $<HTMLTextAreaElement>("chat-text");
  const status = $("chat-status");
  if (!who || !url || !code) return;
  const pend = pendingPrivate();
  const done = pend.filter((c) => privateRolls.faces.has(c.id) || privateRolls.forMe.has(c.id));
  let text = box.value.trim();
  if (!text && !done.length) {
    hint("chat-status", pend.length ? `Type your roll for ${pend[0].label}, or press Roll for me.` : "Write your message first.");
    return;
  }
  if (done.length) {
    const rolls = Object.fromEntries(done.map((c) => [c.id, privateRolls.forMe.has(c.id) ? "dm" : privateRolls.faces.get(c.id)!]));
    const said = done.map((c) => privateRolls.forMe.has(c.id) ? `${c.label}: roll for me.` : `${c.label}: rolled ${privateRolls.faces.get(c.id)}.`).join(" ");
    text = `${text ? `${text}\n\n` : ""}${said}\n\n<!-- rolls: ${JSON.stringify(rolls)} -->`;
  }
  const send = $<HTMLButtonElement>("chat-send");
  send.setAttribute("aria-disabled", "true");
  delete status.dataset.hint;
  status.textContent = "Sealing";
  try {
    const sealed = await sealNote(code, text);
    const res = await fetch(url, { method: "POST", body: JSON.stringify({ v: 1, kind: "aside", who: who.slug, from: "player", at: Date.now(), ...sealed }) });
    if (!res.ok) throw new Error(String(res.status));
    box.value = "";
    done.forEach((c) => { privateRolls.faces.delete(c.id); privateRolls.forMe.delete(c.id); });
    status.textContent = "Sent privately. The DM answers here.";
    void pollActions();
  } catch {
    status.textContent = "Not sent. Check internet connection and press Send again.";
  } finally {
    send.removeAttribute("aria-disabled");
  }
});

// No polling: the stream pushes. A phone may drop the line while asleep; reconnect when the app is shown again.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && stream?.readyState === EventSource.CLOSED) connectRelay();
});

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
    const code = store.get(codeKey(meta.slug));
    b.innerHTML = `<span class="sat-h2">${escapeHtml(meta.name)}</span>
      <span class="sat-cluster" style="--sat-gap: var(--sat-space-2)"><span class="sat-small sat-muted">${meta.letters} letter${meta.letters === 1 ? "" : "s"}</span>${code ? `<span class="sat-badge badge-ok">Signed in</span>` : ""}${fresh ? `<span class="sat-badge">${fresh} new</span>` : ""}</span>`;
    // A player already signed in on this device opens without the code.
    b.addEventListener("click", () => (code ? void unlock(meta, code, true, true) : startUnlock(meta)));
    pick.appendChild(b);
  }
}

function enterInbox() {
  if (opened) return showInboxPanel("open");
  if (!index) return showInboxPanel("pick");
  // A code remembered on this device opens its inbox straight away.
  // With several players signed in here, the one active last in this app session opens; otherwise pick.
  const remembered = index.inboxes.filter((m) => store.get(codeKey(m.slug)));
  const last = remembered.find((m) => m.slug === session.get(ACTIVE));
  const auto = remembered.length === 1 ? remembered[0] : last;
  if (auto) { void unlock(auto, store.get(codeKey(auto.slug))!, true, true); return; }
  showInboxPanel(picking ? "unlock" : "pick");
}

function showInboxPanel(which: "pick" | "unlock" | "open") {
  $("inbox-pick").hidden = which !== "pick";
  $("inbox-unlock").hidden = which !== "unlock";
  $("inbox-open").hidden = which !== "open";
  $("lock").hidden = which !== "open";
  $("switch").hidden = which !== "open";
  $("inbox-title").textContent = which === "open" && opened ? `${opened.meta.name.split(" ")[0]}'s Inbox` : "Inbox";
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
    shareIdentity();
    store.set(seenKey(meta.slug), String(meta.letters));
    picking = null;
    session.set(ACTIVE, meta.slug);
    showInboxPanel("open");
    welcome(meta);
    updateDots();
    renderMove();
    void pollActions();
  } catch (e) {
    if (silent) { store.del(codeKey(meta.slug)); showInboxPanel("pick"); return; }
    err.textContent = e instanceof WrongCode
      ? "Code does not match this inbox. Check the code the host sent you (e.g. K7QF4M)."
      : "Inbox unable to load. Check internet connection and try again.";
    err.hidden = false;
    $<HTMLInputElement>("code").setAttribute("aria-invalid", "true");
  } finally {
    go.removeAttribute("aria-disabled");
    go.textContent = "Open inbox";
  }
}

/** Test welcome letter: once per player per app open. Closing the app clears session storage, so it shows again next time. */
function welcome(meta: InboxMeta) {
  if (session.get(welcomeKey(meta.slug))) return;
  session.set(welcomeKey(meta.slug), "1");
  const dlg = $<HTMLDialogElement>("welcome");
  const first = meta.name.split(" ")[0];
  $("welcome-title").textContent = `Welcome back, ${first}`;
  $("welcome-body").innerHTML = md(WELCOME_TEST.replace(/\{first\}/g, escapeHtml(first)));
  if (typeof dlg.showModal === "function" && !dlg.open) dlg.showModal();
}
// A test letter until the DM writes real ones. Player-safe text only.
const WELCOME_TEST = `{first}, the lamp is lit and your chair is where you left it.

- **Your move** on the Table page is where you answer the turn.
- **Private chat** is sealed: only you and the DM read it.
- Your letters are in this inbox. New ones carry a badge.

This is a test letter. It appears the first time you open the app, and again after you close it and come back.`;

/** Hand the open inbox's character to the Character Sheet (or none when locked). */
function shareIdentity() {
  if (!opened) return setSheetIdentity(null);
  const p = opened.items.find((i) => i.kind === "profile");
  let profile: Profile | null = null;
  if (p) try { profile = JSON.parse(p.body) as Profile; } catch { profile = null; }
  setSheetIdentity({ slug: opened.meta.slug, name: opened.meta.name, profile });
}

/** Fill one inbox subpage, or mark it absent (no tab) when the inbox has no such item. */
function fillSub(sub: string, el: HTMLElement, html: string | null, enhanceIt = false) {
  setAbsent("inbox", sub, html === null);
  if (html === null) return;
  el.innerHTML = html;
  if (enhanceIt) enhance(el);
}

function renderOpen(newCount: number) {
  if (!opened) return;
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
    d.innerHTML = `<summary><span class="letter-title">${escapeHtml(l.title)}</span>${i < newCount ? `<span class="sat-badge">New</span>` : ""}</summary><div class="prose">${md(l.body)}</div>`;
    list.appendChild(d);
  });

  const item = (kind: Item["kind"]) => opened!.items.find((i) => i.kind === kind);
  const profile = item("profile");
  let pf: string | null = null;
  if (profile) try { pf = profileHtml(JSON.parse(profile.body) as Profile); } catch { pf = null; }
  fillSub("profile", $("open-profile"), pf);
  const sheet = item("sheet");
  fillSub("sheet", $("open-sheet-body"), sheet ? `<h2>${escapeHtml(sheet.title)}</h2>${md(sheet.body)}` : null, true);
  const pack = item("pack");
  fillSub("pack", $("open-pack-body"), pack ? md(pack.body) : null);
  const rolls = item("rolls");
  fillSub("rolls", $("open-rolls-body"), rolls ? md(stripH1(rolls.body)) : null);
  const asideLog = item("asides");
  fillSub("asides", $("open-asides-body"), asideLog ? md(stripH1(asideLog.body)) : null);
  // Sheet links point at ../sheet.md in the source; inside the app the sheet is its own subpage.
  list.querySelectorAll<HTMLAnchorElement>('a[href$="sheet.md"]').forEach((a) => { a.href = "#inbox/sheet"; });
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
    shareIdentity();
    if (currentRoute()?.view === "inbox") store.set(seenKey(meta.slug), String(meta.letters));
  } catch {
    // The DM changed this inbox's code: lock it and ask for the new one.
    lockInbox();
  }
}

/** Lock forgets this player's code on the device; Switch player keeps it, so they stay signed in. */
function lockInbox(forget = true) {
  if (opened && forget) store.del(codeKey(opened.meta.slug));
  opened = null;
  session.del(ACTIVE);
  shareIdentity();
  renderPick();
  showInboxPanel("pick");
  updateDots();
  renderMove();
  renderChat();
}
$("lock").addEventListener("click", () => lockInbox(true));
$("switch").addEventListener("click", () => lockInbox(false));

// ======================= new-content dots =======================
function updateDots() {
  const view = currentRoute()?.view;
  const postNew = !!index?.story[0] && store.get(SEEN_POST) !== index.story[0].id && view !== "table";
  const inboxNew = !!index?.inboxes.some((m) => {
    const seen = store.get(seenKey(m.slug));
    return seen !== null && store.get(codeKey(m.slug)) !== null && m.letters > Number(seen);
  }) && view !== "inbox";
  document.querySelectorAll<HTMLElement>('[data-dot="table"]').forEach((d) => { d.hidden = !postNew; });
  document.querySelectorAll<HTMLElement>('[data-dot="inbox"]').forEach((d) => { d.hidden = !inboxNew; });
  // A tab left in the background shows new content in its title.
  const unseenPost = !!index?.story[0] && store.get(SEEN_POST) !== index.story[0].id;
  document.title = (postNew || inboxNew || (unseenPost && document.visibilityState === "hidden")) ? `(New) ${BASE_TITLE}` : BASE_TITLE;
}

// ======================= start =======================
onRoute((r) => {
  if (r.view === "table") markPostSeen();
  if (r.view === "inbox") enterInbox();
  updateDots();
});
initSheet();
initTextSize();
initDice();
initNav();
enhance(document.querySelector<HTMLElement>('[data-sub="rules"]')!);
openingBook();
void check();
