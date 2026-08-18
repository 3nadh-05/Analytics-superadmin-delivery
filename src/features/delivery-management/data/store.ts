import { useSyncExternalStore } from "react";
import type { DailyEntry, DayMeta, DeliveryStatsDB } from "./types";
import { generateSeedData } from "./seed";
import { toISODate } from "./dates";

const STORAGE_KEY = "delivery-stats/v1";

let db: DeliveryStatsDB = load();
const listeners = new Set<() => void>();

function load(): DeliveryStatsDB {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DeliveryStatsDB;
  } catch {
    // fall through to seed
  }
  const seeded = generateSeedData(new Date());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

function persist(next: DeliveryStatsDB) {
  db = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  listeners.forEach((l) => l());
}

function notify() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  listeners.forEach((l) => l());
}

export function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getSnapshot(): DeliveryStatsDB {
  return db;
}

export function useDeliveryStatsDB(): DeliveryStatsDB {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function todayISO(): string {
  return toISODate(new Date());
}

// ---- mutations ----

export function upsertEntry(entry: DailyEntry) {
  const idx = db.entries.findIndex((e) => e.date === entry.date && e.riderId === entry.riderId);
  const entries = [...db.entries];
  if (idx >= 0) entries[idx] = entry;
  else entries.push(entry);

  let days = db.days;
  if (!days.some((d) => d.date === entry.date)) {
    days = [...days, { date: entry.date, closed: entry.date !== todayISO() }];
  }
  db = { ...db, entries, days };
  notify();
}

export function deleteEntry(date: string, riderId: string) {
  db = { ...db, entries: db.entries.filter((e) => !(e.date === date && e.riderId === riderId)) };
  notify();
}

export function setDayClosed(date: string, closed: boolean) {
  const days = db.days.map((d) => (d.date === date ? { ...d, closed, lastUpload: closed ? new Date().toISOString() : d.lastUpload } : d));
  if (!days.some((d) => d.date === date)) days.push({ date, closed, lastUpload: closed ? new Date().toISOString() : undefined });
  db = { ...db, days };
  notify();
}

export function getDayMeta(date: string): DayMeta {
  return db.days.find((d) => d.date === date) ?? { date, closed: false };
}

export function resetToSeed() {
  persist(generateSeedData(new Date()));
}

export function updateRates(rates: DeliveryStatsDB["rates"]) {
  db = { ...db, rates };
  notify();
}
