// Theme (table/DESIGN.md, "Theme"): the app follows the device's light or dark setting. The sun and moon switch
// changes it for this app session only (sessionStorage); closing the app returns to the device setting.
// There is no Auto choice to pick: Auto is what you get by not choosing.

const KEY = "vaela-theme";
const media = matchMedia("(prefers-color-scheme: dark)");

function chosen(): "light" | "dark" | null {
  try { const t = sessionStorage.getItem(KEY); return t === "light" || t === "dark" ? t : null; } catch { return null; }
}
const resolved = () => chosen() ?? (media.matches ? "dark" : "light");

function apply() {
  const root = document.documentElement;
  const pick = chosen();
  // Only a choice sets data-theme; without one the kit's tokens follow prefers-color-scheme.
  if (pick) root.setAttribute("data-theme", pick); else root.removeAttribute("data-theme");
  const dark = resolved() === "dark";
  document.querySelectorAll<HTMLButtonElement>("#theme").forEach((b) => {
    b.setAttribute("aria-checked", String(dark));
    b.dataset.on = dark ? "dark" : "light";
  });
}

export function initTheme() {
  apply();
  document.getElementById("theme")?.addEventListener("click", () => {
    try { sessionStorage.setItem(KEY, resolved() === "dark" ? "light" : "dark"); } catch { /* blocked: this page only */ }
    apply();
  });
  // The kit re-applies its own (auto) theme when the device setting changes; put this session's choice back.
  media.addEventListener("change", apply);
  document.addEventListener("sat-theme", () => { if (chosen()) apply(); });
}
