// Sections, subpages and the chapter turn (table/DESIGN.md, "Pages").
// A section ([data-view]) holds subpages ([data-sub] with data-label). Its notebook tabs at the top are built here.
// Hash routes: #section or #section/sub. Old links (#world, #rules, #session, #start, #commission) still work.
// A move forward turns the page like a book chapter; a move back turns it the other way.

export const SECTIONS = ["table", "inbox", "dice", "kit", "sheet"];
const ALIAS: Record<string, string> = { start: "kit/start", world: "kit/world", rules: "kit/rules", session: "kit/session", commission: "kit/session" };
const SUB_KEY = (v: string) => `vaela-table-sub:${v}`;

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const store = {
  get(k: string) { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { sessionStorage.setItem(k, v); } catch { /* blocked */ } },
};

export type Route = { view: string; sub: string; anchor: string | null };
type Listener = (r: Route, prev: Route | null) => void;
const listeners: Listener[] = [];
export function onRoute(fn: Listener) { listeners.push(fn); }

let route: Route | null = null;
export const currentRoute = () => route;

function subsOf(view: string) {
  const sec = document.querySelector<HTMLElement>(`[data-view="${view}"]`);
  return sec ? [...sec.querySelectorAll<HTMLElement>("[data-sub]")] : [];
}
const available = (el: HTMLElement) => !el.hasAttribute("data-absent");

export function parseHash(): Route {
  let h = location.hash.replace(/^#/, "");
  const anchor = h === "commission" ? "commission" : null;
  if (ALIAS[h]) h = ALIAS[h];
  let [view, sub] = h.split("/");
  if (!SECTIONS.includes(view)) view = "table";
  const subs = subsOf(view).filter(available).map((s) => s.dataset.sub!);
  if (!sub || !subs.includes(sub)) {
    const last = store.get(SUB_KEY(view));
    sub = last && subs.includes(last) ? last : subs[0] ?? "";
  }
  return { view, sub, anchor };
}

/** Where a page sits in reading order: section first, then subpage. Decides which way the page turns. */
function order(r: Route) {
  const subs = subsOf(r.view).map((s) => s.dataset.sub);
  return SECTIONS.indexOf(r.view) * 100 + Math.max(0, subs.indexOf(r.sub));
}

/** Build (or refresh) the notebook tabs of one section. Absent subpages get no tab. */
export function buildTabs(view: string) {
  const sec = document.querySelector<HTMLElement>(`[data-view="${view}"]`);
  const bar = sec?.querySelector<HTMLElement>(".subtabs");
  if (!sec || !bar) return;
  const subs = subsOf(view);
  bar.innerHTML = "";
  bar.hidden = subs.filter(available).length < 2 || bar.hasAttribute("data-off");
  for (const s of subs) {
    if (!available(s)) continue;
    const b = document.createElement("a");
    b.href = `#${view}/${s.dataset.sub}`;
    b.setAttribute("role", "tab");
    b.dataset.for = s.dataset.sub;
    b.id = `tab-${view}-${s.dataset.sub}`;
    s.setAttribute("role", "tabpanel");
    s.setAttribute("aria-labelledby", b.id);
    // Felt's rule: sub-navigation is icons; the open tab opens out to its title (CSS shows the span only when selected).
    const label = s.dataset.label ?? s.dataset.sub!;
    b.setAttribute("aria-label", label);
    b.title = label;
    b.innerHTML = `${s.dataset.icon ? `<svg aria-hidden="true"><use href="#${s.dataset.icon}"/></svg>` : ""}<span></span><i class="dot" hidden></i>`;
    b.querySelector("span")!.textContent = label;
    bar.appendChild(b);
  }
  if (route?.view === view) markTabs(route);
}

function markTabs(r: Route) {
  const sec = document.querySelector<HTMLElement>(`[data-view="${r.view}"]`);
  sec?.querySelectorAll<HTMLAnchorElement>(".subtabs [role=tab]").forEach((t) => {
    const on = t.dataset.for === r.sub;
    t.setAttribute("aria-selected", String(on));
    t.tabIndex = on ? 0 : -1;
    if (on) t.scrollIntoView({ block: "nearest", inline: "nearest" });
  });
}

function apply(r: Route) {
  document.querySelectorAll<HTMLElement>("[data-view]").forEach((v) => { v.hidden = v.dataset.view !== r.view; });
  for (const s of subsOf(r.view)) s.hidden = s.dataset.sub !== r.sub;
  markTabs(r);
  document.querySelectorAll<HTMLElement>("#sections [role=radio]").forEach((b) => {
    const on = b.dataset.value === r.view;
    b.setAttribute("aria-checked", String(on));
    b.tabIndex = on ? 0 : -1;
  });
  document.querySelectorAll<HTMLAnchorElement>(".tabbar a").forEach((a) => {
    if (a.dataset.tab === r.view) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  if (r.anchor) document.getElementById(r.anchor)?.scrollIntoView();
  else window.scrollTo(0, 0);
}

/** Show a route. Between sections the page slides sideways like a scroll; between tabs of one section it turns
 *  like a book page (View Transitions, else a CSS fallback). Reduced motion: an instant change. */
let running: { skipTransition?: () => void } | null = null;
export function go(r: Route) {
  const prev = route;
  const same = prev && prev.view === r.view && prev.sub === r.sub;
  route = r;
  if (r.sub) store.set(SUB_KEY(r.view), r.sub);
  const done = () => { apply(r); listeners.forEach((fn) => fn(r, prev)); };
  if (!prev || same || reduced()) return done();
  const fwd = order(r) >= order(prev);
  const kind = prev.view === r.view ? "turn" : "slide";
  document.documentElement.dataset.turn = `${kind}-${fwd ? "fwd" : "back"}`;
  type VT = { finished: Promise<void>; ready: Promise<void>; updateCallbackDone: Promise<void>; skipTransition?: () => void };
  const doc = document as Document & { startViewTransition?: (cb: () => void) => VT };
  if (doc.startViewTransition) {
    running?.skipTransition?.(); // a second tap finishes the first move at once instead of stacking two
    const vt = doc.startViewTransition(done);
    vt.ready.catch(() => {}); // a skipped or hidden-tab transition rejects: the page still changed
    vt.updateCallbackDone.catch(() => {});
    running = vt;
    vt.finished.catch(() => {}).finally(() => {
      if (running === vt) { running = null; delete document.documentElement.dataset.turn; }
    });
  } else {
    done();
    const main = document.querySelector<HTMLElement>("main")!;
    main.classList.remove("turn-in");
    void main.offsetWidth;
    main.classList.add("turn-in");
  }
}

export function initNav() {
  SECTIONS.forEach(buildTabs);
  window.addEventListener("hashchange", () => go(parseHash()));
  document.getElementById("sections")?.addEventListener("sat-change", (e) => {
    location.hash = (e as CustomEvent).detail.value;
  });
  // Arrow keys move along a tab row.
  document.addEventListener("keydown", (e) => {
    const t = (e.target as HTMLElement).closest?.(".subtabs [role=tab]") as HTMLElement | null;
    if (!t || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
    const tabs = [...t.parentElement!.querySelectorAll<HTMLElement>("[role=tab]")];
    const next = tabs[(tabs.indexOf(t) + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    next.focus();
    next.click();
    e.preventDefault();
  });
  go(parseHash());
}

/** Mark a subpage absent (no tab) or present again; leaves it if it was open. */
export function setAbsent(view: string, sub: string, absent: boolean) {
  const el = document.querySelector<HTMLElement>(`[data-view="${view}"] [data-sub="${sub}"]`);
  if (!el || el.hasAttribute("data-absent") === absent) return;
  el.toggleAttribute("data-absent", absent);
  buildTabs(view);
  if (absent && route?.view === view && route.sub === sub) go(parseHash());
  // A link straight to this subpage (#inbox/profile) waited for it to exist: open it now.
  else if (!absent && route?.view === view && route.sub !== sub && location.hash === `#${view}/${sub}`) go(parseHash());
}

/** A new-content dot on a subpage tab. */
export function setTabDot(view: string, sub: string, on: boolean) {
  const dot = document.querySelector<HTMLElement>(`#tab-${view}-${sub} .dot`);
  if (dot) dot.hidden = !on;
}

// ---------- app launch: every page load except a reload ----------
// Opening the app (a new tab, a closed home-screen app opened again, a restored tab) is a launch; pressing reload is
// not. Session storage alone cannot tell: iOS home-screen apps and restored tabs keep it across a close.
export const isLaunch = (() => {
  const nav = performance.getEntriesByType?.("navigation")[0] as PerformanceNavigationTiming | undefined;
  return nav ? nav.type !== "reload" : true;
})();
/** One id per launch: the welcome letter shows once per player per launch. */
export const launchId = (() => {
  let id = store.get("vaela-table-launch");
  if (isLaunch || !id) { id = Math.random().toString(36).slice(2); store.set("vaela-table-launch", id); }
  return id;
})();

// ---------- the opening book: a closed book with the V opens into the Table, on every launch ----------
export function openingBook() {
  const el = document.getElementById("splash");
  if (!el) return;
  if (!isLaunch || reduced()) { el.remove(); return; }
  el.hidden = false;
  const end = () => { el.classList.add("is-done"); window.setTimeout(() => el.remove(), 420); };
  const t = window.setTimeout(end, 2900);
  el.addEventListener("click", () => { window.clearTimeout(t); end(); }, { once: true });
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("is-open")));
}
