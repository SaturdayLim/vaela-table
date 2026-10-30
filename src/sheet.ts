// The blank character sheet: draft kept in this browser, copied as text for the DM.
import { modifier } from "./lib/rules";

const STORE = "au1-sheet-v1";

export function initSheet(): void {
  const form = document.getElementById("sheet") as HTMLFormElement | null;
  if (!form) return;
  const fields = Array.from(form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("[data-label]"));
  const reqFields = fields.filter((f) => f.hasAttribute("data-req"));
  const status = document.getElementById("status")!;
  const fallback = document.getElementById("fallback") as HTMLTextAreaElement;
  const isQQ = (v: string) => v.trim() === "??";
  const filled = () => reqFields.filter((f) => f.value.trim() !== "").length;

  function refresh() {
    document.querySelectorAll<HTMLElement>("[data-mod]").forEach((el) => {
      el.textContent = modifier((document.getElementById(el.dataset.mod!) as HTMLInputElement).value);
    });
    const done = filled();
    const qq = fields.filter((f) => isQQ(f.value)).length;
    const mReq = document.getElementById("m-req")!;
    const mQQ = document.getElementById("m-qq")!;
    mReq.textContent = `${done} of ${reqFields.length} required`;
    mReq.className = "sat-badge " + (done === reqFields.length ? "badge-ok" : "sat-badge--muted");
    mQQ.textContent = `?? used: ${qq} of 3`;
    mQQ.className = "sat-badge " + (qq > 3 ? "badge-warn" : "sat-badge--muted");
  }

  function save() {
    const data: Record<string, string> = {};
    fields.forEach((f) => { data[f.id] = f.value; });
    try { localStorage.setItem(STORE, JSON.stringify(data)); } catch { /* private mode: draft lives only on the page */ }
  }
  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(STORE) || "null");
      if (data) fields.forEach((f) => { if (data[f.id] != null) f.value = data[f.id]; });
    } catch { /* nothing saved */ }
  }

  function asText() {
    const name = (document.getElementById("f-name") as HTMLInputElement).value.trim() || "(unnamed)";
    const lines = [`AU1 CHARACTER SHEET: ${name}`, ""];
    let group: string | null = null;
    fields.forEach((f) => {
      const fs = f.closest("fieldset")!.querySelector("legend")!.textContent!.trim();
      if (fs !== group) { if (group) lines.push(""); lines.push("## " + fs); group = fs; }
      let v = f.value.trim();
      if ((f as HTMLInputElement).type === "number" && v) v = `${v} (${modifier(v)})`;
      lines.push((f.hasAttribute("data-req") ? "* " : "") + f.dataset.label + ": " + (v || "(blank)"));
    });
    lines.push("", "HP, AC, RP, SP and speed: for the DM to finish. Proficiency +2. 50 SM.");
    return lines.join("\n");
  }

  function say(msg: string, err = false) { status.textContent = msg; status.className = "status" + (err ? " err" : ""); }

  document.getElementById("copy")!.addEventListener("click", () => {
    const text = asText();
    const missing = reqFields.length - filled();
    const note = missing ? ` ${missing} required field${missing > 1 ? "s" : ""} still blank.` : "";
    const showFallback = () => {
      fallback.value = text; fallback.hidden = false; fallback.focus(); fallback.select();
      say("Clipboard unavailable here. The sheet text is selected below: copy it by hand." + note, true);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        fallback.hidden = true;
        say("Sheet copied to clipboard. Paste it into a .txt file and send it to the host." + note, !!missing);
      }, showFallback);
    } else showFallback();
  });

  const clearBtn = document.getElementById("clear")!;
  let armed = false;
  let armTimer: number | undefined;
  const disarm = () => { armed = false; clearBtn.classList.remove("armed"); clearBtn.textContent = "Clear sheet"; };
  clearBtn.addEventListener("click", () => {
    if (!armed) {
      armed = true; clearBtn.classList.add("armed"); clearBtn.textContent = "Press again to clear";
      armTimer = window.setTimeout(disarm, 4000);
      return;
    }
    window.clearTimeout(armTimer); disarm();
    form.reset(); fallback.hidden = true; save(); refresh(); say("Sheet cleared in this browser.");
  });

  form.addEventListener("input", () => { save(); refresh(); });
  form.addEventListener("change", () => { save(); refresh(); });
  form.addEventListener("submit", (e) => e.preventDefault());
  load();
  refresh();
}
