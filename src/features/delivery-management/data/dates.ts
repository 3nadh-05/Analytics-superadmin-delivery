export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, delta: number): string {
  const d = fromISODate(s);
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}

/** Monday of the ISO week containing `s`. */
export function weekStart(s: string): string {
  const d = fromISODate(s);
  const dow = d.getDay(); // 0 = Sun
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return toISODate(d);
}

export function formatShort(s: string): string {
  const d = fromISODate(s);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function formatWeekLabel(mondayISO: string): string {
  const d = fromISODate(mondayISO);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `W/C ${dd}/${mm}`;
}

export function formatLong(s: string): string {
  const d = fromISODate(s);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}
