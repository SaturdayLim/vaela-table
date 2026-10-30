// Sealed inboxes. Same recipe as the Compendium's DM gate (D19): PBKDF2-SHA256 turns the
// player's code into an AES-GCM-256 key, and the whole inbox is one sealed payload.
// Plain JS (not TS) so the Node seal script and the browser share it. Uses WebCrypto only.

export const ITERATIONS = 310000;
export const CANARY = "vaela-table:inbox:v1";

const enc = new TextEncoder();
const dec = new TextDecoder();

export function b64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
export function unb64(text) {
  const s = atob(text);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** Codes are typed by players: ignore case, spaces and dashes. */
export function normaliseCode(code) {
  return String(code).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function deriveKey(code, salt, iterations) {
  const base = await crypto.subtle.importKey("raw", enc.encode(normaliseCode(code)), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

async function seal(key, text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(text)));
  return { iv: b64(iv), ct: b64(ct) };
}

async function open(key, box) {
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(box.iv) }, key, unb64(box.ct));
  return dec.decode(pt);
}

/**
 * Seal one player's inbox. `items` = [{ id, kind: "sheet" | "letter", title, body }].
 * Only the slug, character name, letter count and newest letter id stay readable.
 */
export async function sealInbox({ slug, name, code, items, iterations = ITERATIONS }) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(code, salt, iterations);
  const letters = items.filter((i) => i.kind === "letter");
  return {
    v: 1,
    slug,
    name,
    letters: letters.length,
    newest: letters.length ? letters[letters.length - 1].id : null,
    kdf: "PBKDF2-SHA256",
    iterations,
    salt: b64(salt),
    canary: await seal(key, CANARY),
    payload: await seal(key, JSON.stringify({ items })),
  };
}

export class WrongCode extends Error {
  constructor() { super("Code does not match this inbox."); this.name = "WrongCode"; }
}

/** Open a sealed inbox. Throws WrongCode when the code is wrong. */
export async function openInbox(sealed, code) {
  const key = await deriveKey(code, unb64(sealed.salt), sealed.iterations);
  try {
    if ((await open(key, sealed.canary)) !== CANARY) throw new WrongCode();
  } catch (e) {
    throw new WrongCode();
  }
  return JSON.parse(await open(key, sealed.payload));
}
