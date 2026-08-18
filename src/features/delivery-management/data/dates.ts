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

/** "HH:MM" -> minutes since midnight, or null if malformed. */
export function timeToMinutes(t: string | null): number | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Minutes between two "HH:MM" clock times on the same day, or null if either is missing/invalid or exit isn't after reporting. */
export function minutesBetween(reportingTime: string | null, exitTime: string | null): number | null {
  const start = timeToMinutes(reportingTime);
  const end = timeToMinutes(exitTime);
  if (start == null || end == null || end <= start) return null;
  return end - start;
}

export function formatHm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
