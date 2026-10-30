/** Ability modifier, Vaela D15: floor((score - 10) / 2). Blank outside 1 to 20. */
export function modifier(score: number | string): string {
  const n = typeof score === "number" ? score : parseInt(score, 10);
  if (!Number.isInteger(n) || n < 1 || n > 20) return "";
  const m = Math.floor((n - 10) / 2);
  return (m >= 0 ? "+" : "-") + Math.abs(m);
}
