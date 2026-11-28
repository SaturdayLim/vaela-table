// Text size: five steps, kept on this device. Font tokens are in rem and spacing in px,
// so changing the root size scales the words and leaves the layout alone.
// index.html applies the saved step in <head> before first paint; this module owns the control.

export const TEXT_SIZES = [
  { name: "Small", pct: 87.5 },
  { name: "Standard", pct: 100 },
  { name: "Large", pct: 112.5 },
  { name: "Larger", pct: 125 },
  { name: "Largest", pct: 137.5 },
] as const;
const KEY = "vaela-text-size";
const DEFAULT = 1;

export function savedTextStep(): number {
  try {
    const n = Number(localStorage.getItem(KEY));
    return Number.isInteger(n) && n >= 0 && n < TEXT_SIZES.length && localStorage.getItem(KEY) !== null ? n : DEFAULT;
  } catch { return DEFAULT; }
}

function apply(step: number): void {
  document.documentElement.style.fontSize = TEXT_SIZES[step].pct + "%";
}

export function initTextSize(): void {
  const btns = document.querySelectorAll<HTMLButtonElement>("[data-text-size-btn]");
  const pop = document.getElementById("text-size") as HTMLElement | null;
  const range = document.getElementById("text-size-range") as HTMLInputElement | null;
  // The header grows with the text: keep --header-h (panel position, scroll padding) equal to its real height.
  const header = document.querySelector<HTMLElement>(".sat-header");
  if (header && "ResizeObserver" in window) {
    new ResizeObserver(() => document.documentElement.style.setProperty("--header-h", header.offsetHeight + "px")).observe(header);
  }
  if (!pop || !range) return;

  // No captions: the small and large A say what the bar does; the step name is read out to screen readers only.
  const show = (step: number) => {
    range.value = String(step);
    range.setAttribute("aria-valuetext", TEXT_SIZES[step].name);
    pop.querySelectorAll<HTMLButtonElement>("[data-step]").forEach((b) => {
      b.disabled = Number(b.dataset.step) < 0 ? step === 0 : step === TEXT_SIZES.length - 1;
    });
  };
  const set = (step: number) => {
    apply(step);
    show(step);
    try { localStorage.setItem(KEY, String(step)); } catch { /* private mode: this visit only */ }
  };
  show(savedTextStep());

  let opener: HTMLButtonElement | null = null;
  const open = (b: HTMLButtonElement) => {
    opener = b;
    pop.hidden = false;
    btns.forEach((x) => x.setAttribute("aria-expanded", "true"));
    range.focus();
  };
  const close = (refocus = false) => {
    if (pop.hidden) return;
    pop.hidden = true;
    btns.forEach((x) => x.setAttribute("aria-expanded", "false"));
    if (refocus) opener?.focus();
  };
  btns.forEach((b) => b.addEventListener("click", (e) => {
    e.stopPropagation();
    pop.hidden ? open(b) : close();
  }));
  range.addEventListener("input", () => set(Number(range.value)));
  // A mouse wheel or trackpad scroll over the panel steps through the sizes.
  let wheelAt = 0;
  pop.addEventListener("wheel", (e) => {
    e.preventDefault();
    const now = performance.now();
    if (now - wheelAt < 180 || Math.abs(e.deltaY) < 4) return;
    wheelAt = now;
    const next = Number(range.value) + (e.deltaY < 0 ? 1 : -1);
    if (next >= 0 && next < TEXT_SIZES.length) set(next);
  }, { passive: false });
  pop.querySelectorAll<HTMLButtonElement>("[data-step]").forEach((b) =>
    b.addEventListener("click", () => set(Math.min(TEXT_SIZES.length - 1, Math.max(0, Number(range.value) + Number(b.dataset.step))))));
  document.addEventListener("click", (e) => { if (!pop.contains(e.target as Node)) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(true); });
  window.addEventListener("hashchange", () => close());
}
