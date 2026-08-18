import type { DailyEntry, DayMeta, DeliveryStatsDB, Merchant, Rider } from "./types";
import { toISODate } from "./dates";

/** Deterministic PRNG (mulberry32) so the demo dataset is stable across reloads. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const RIDERS: Rider[] = [
  { id: "sudhakar", name: "Sudhakar" },
  { id: "ajarjan", name: "Ajarjan" },
  { id: "prasanna", name: "Prasanna" },
  { id: "rafi-sk", name: "Rafi.Sk" },
  { id: "gowtham", name: "Gowtham" },
  { id: "changaiah", name: "Changaiah" },
  { id: "teja-ram", name: "Teja Ram" },
  { id: "durairajan", name: "Durairajan" },
  { id: "polaiah", name: "Polaiah" },
  { id: "dheena", name: "Dheena" },
  { id: "vasu", name: "Vasu" },
];

export const MERCHANTS: Merchant[] = [
  { id: "fort-royal", name: "The Fort Royal Biryani" },
  { id: "fusion-street", name: "Fusion Street" },
  { id: "dhanush", name: "Dhanush Super Market" },
  { id: "fine-snacks", name: "Fine Snacks" },
  { id: "momesta", name: "Momesta" },
  { id: "nehas-kitchen", name: "Neha's Kitchen" },
];

interface RiderProfile {
  id: string;
  baseOrders: number;
  weeklyTrend: number; // additive orders/week drift
  kmPerOrder: number;
  otBase: number;
  merchantWeights: Record<string, number>;
  otNilRate: number;
  /** average minutes spent actively on one delivery (pickup to drop), used to derive active/idle time. */
  avgDeliveryMins: number;
  /** roughly when the rider reports in, as a decimal hour (9.25 = 09:15). */
  reportingHour: number;
}

const PROFILES: RiderProfile[] = [
  { id: "teja-ram", baseOrders: 8, weeklyTrend: 0.55, kmPerOrder: 5.9, otBase: 1.1, otNilRate: 0.05, avgDeliveryMins: 30, reportingHour: 8.75, merchantWeights: { "nehas-kitchen": 0.85, "fort-royal": 0.15 } },
  { id: "changaiah", baseOrders: 6.5, weeklyTrend: 0.7, kmPerOrder: 7.4, otBase: 1.0, otNilRate: 0.05, avgDeliveryMins: 32, reportingHour: 8.75, merchantWeights: { "nehas-kitchen": 0.7, "fort-royal": 0.3 } },
  { id: "sudhakar", baseOrders: 4.2, weeklyTrend: 0, kmPerOrder: 12.4, otBase: 1.5, otNilRate: 0.05, avgDeliveryMins: 40, reportingHour: 9.0, merchantWeights: { "fort-royal": 1 } },
  { id: "prasanna", baseOrders: 4.6, weeklyTrend: -0.25, kmPerOrder: 12.9, otBase: 1.5, otNilRate: 0.1, avgDeliveryMins: 42, reportingHour: 9.0, merchantWeights: { "fort-royal": 1 } },
  { id: "rafi-sk", baseOrders: 3.2, weeklyTrend: 0, kmPerOrder: 13.6, otBase: 1.8, otNilRate: 0.05, avgDeliveryMins: 48, reportingHour: 9.1, merchantWeights: { "fort-royal": 0.6, "fusion-street": 0.2, momesta: 0.2 } },
  { id: "vasu", baseOrders: 3.8, weeklyTrend: 0, kmPerOrder: 15.1, otBase: 1.5, otNilRate: 0.1, avgDeliveryMins: 46, reportingHour: 9.0, merchantWeights: { "fort-royal": 0.65, "nehas-kitchen": 0.35 } },
  { id: "polaiah", baseOrders: 4.0, weeklyTrend: 0, kmPerOrder: 4.4, otBase: 0.6, otNilRate: 0.3, avgDeliveryMins: 26, reportingHour: 9.25, merchantWeights: { "fort-royal": 0.25, "fusion-street": 0.25, momesta: 0.25, "nehas-kitchen": 0.25 } },
  { id: "ajarjan", baseOrders: 2.8, weeklyTrend: -0.15, kmPerOrder: 9.8, otBase: 1.5, otNilRate: 0.1, avgDeliveryMins: 40, reportingHour: 9.25, merchantWeights: { "fort-royal": 1 } },
  { id: "gowtham", baseOrders: 3.2, weeklyTrend: -0.85, kmPerOrder: 22.0, otBase: 1.5, otNilRate: 0.15, avgDeliveryMins: 36, reportingHour: 9.0, merchantWeights: { "fort-royal": 1 } },
  { id: "dheena", baseOrders: 2.4, weeklyTrend: -0.2, kmPerOrder: 32.0, otBase: 0.3, otNilRate: 0.4, avgDeliveryMins: 78, reportingHour: 9.5, merchantWeights: { "nehas-kitchen": 1 } },
  { id: "durairajan", baseOrders: 0.7, weeklyTrend: 0.1, kmPerOrder: 9.8, otBase: 0.2, otNilRate: 0.5, avgDeliveryMins: 36, reportingHour: 9.5, merchantWeights: { "fort-royal": 1 } },
];

const DORMANT_MERCHANT_IDS = new Set(["dhanush", "fine-snacks"]);

function weekIndex(date: Date, startDate: Date) {
  const days = Math.floor((date.getTime() - startDate.getTime()) / 86400000);
  return Math.floor(days / 7);
}

function formatHourMinute(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function pickMerchant(rnd: () => number, weights: Record<string, number>): string {
  const entries = Object.entries(weights);
  const r = rnd();
  let acc = 0;
  for (const [id, w] of entries) {
    acc += w;
    if (r <= acc) return id;
  }
  return entries[entries.length - 1][0];
}

/** Generates a plausible, internally-consistent multi-week dataset ending on `today` (inclusive, partial). */
export function generateSeedData(today: Date): DeliveryStatsDB {
  const rnd = mulberry32(20260818);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 7 * 8); // 8 weeks of history

  const entries: DailyEntry[] = [];
  const days: DayMeta[] = [];

  const cur = new Date(startDate);
  while (cur <= today) {
    const dateStr = toISODate(cur);
    const isToday = toISODate(cur) === toISODate(today);
    const wIdx = weekIndex(cur, startDate);
    const dow = cur.getDay(); // 0 = Sun

    // Sundays are a planned off day for the fleet.
    if (dow === 0) {
      days.push({ date: dateStr, closed: !isToday });
      cur.setDate(cur.getDate() + 1);
      continue;
    }

    const isMissingKmDay = dateStr === toISODate(offsetDays(today, -4));
    const isOtClusterDay = dateStr === toISODate(offsetDays(today, -1));
    const isNoShowDay = dateStr === toISODate(offsetDays(today, -2));

    for (const profile of PROFILES) {
      const rider = RIDERS.find((r) => r.id === profile.id)!;
      let attendance: "P" | "A" = "P";
      if (rider.id === "durairajan" && isNoShowDay) attendance = "A";

      if (attendance === "A") {
        entries.push({
          date: dateStr,
          riderId: rider.id,
          attendance: "A",
          orders: 0,
          km: null,
          otHours: null,
          reportingTime: null,
          exitTime: null,
          activeMinutes: null,
          merchantOrders: {},
          payoutMod: false,
        });
        continue;
      }

      const trend = profile.baseOrders + profile.weeklyTrend * wIdx;
      const noise = (rnd() - 0.5) * 2.2;
      let orders = Math.max(0, Math.round(trend + noise));
      if (isToday) orders = Math.max(0, Math.round(orders * 0.55)); // partial live day

      const merchantOrders: Record<string, number> = {};
      // last two closed days: dormant merchants stop receiving orders entirely.
      const daysFromToday = Math.round((today.getTime() - cur.getTime()) / 86400000);
      const merchantWeights = { ...profile.merchantWeights };
      if (daysFromToday <= 1) {
        for (const id of DORMANT_MERCHANT_IDS) delete merchantWeights[id];
      }
      const weightSum = Object.values(merchantWeights).reduce((a, b) => a + b, 0) || 1;
      for (const key of Object.keys(merchantWeights)) merchantWeights[key] /= weightSum;

      for (let i = 0; i < orders; i++) {
        const mId = pickMerchant(rnd, merchantWeights);
        merchantOrders[mId] = (merchantOrders[mId] ?? 0) + 1;
      }

      let km: number | null = null;
      if (orders > 0) {
        km = Math.round(orders * profile.kmPerOrder * (0.85 + rnd() * 0.3) * 10) / 10;
      } else {
        km = 0;
      }
      if (rider.id === "prasanna" && isMissingKmDay) km = null;

      let otHours: number | null = null;
      if (rnd() > profile.otNilRate) {
        otHours = Math.round((profile.otBase + (rnd() - 0.3) * 0.8) * 2) / 2;
        if (otHours < 0) otHours = 0;
        if (isOtClusterDay && orders > 0) otHours = Math.max(otHours, 1.5);
      }

      const reportingHour = profile.reportingHour + (rnd() - 0.5) * 0.4;
      const shiftHours = 8 + (rnd() - 0.5) * 0.6 + (otHours ?? 0) * 0.3;
      const reportingTime = formatHourMinute(reportingHour);
      const exitTime = formatHourMinute(reportingHour + shiftHours);
      const shiftMinutes = Math.round(shiftHours * 60);
      const rawActiveMinutes = orders * profile.avgDeliveryMins * (0.85 + rnd() * 0.4);
      const activeMinutes = Math.max(0, Math.min(shiftMinutes - 10, Math.round(rawActiveMinutes)));

      entries.push({
        date: dateStr,
        riderId: rider.id,
        attendance: "P",
        orders,
        km,
        otHours,
        reportingTime,
        exitTime,
        activeMinutes,
        merchantOrders,
        payoutMod: false,
      });
    }

    days.push({
      date: dateStr,
      closed: !isToday,
      sourceFile: !isToday ? `DELIVERY SUMMARY ${dateStr.slice(2).split("-").reverse().join("-")}.xlsx` : undefined,
      lastUpload: !isToday ? new Date(cur.getTime() + 9 * 3600000 + 12 * 60000).toISOString() : undefined,
    });

    cur.setDate(cur.getDate() + 1);
  }

  return {
    version: 1,
    riders: RIDERS,
    merchants: MERCHANTS,
    entries,
    days,
    rates: { baseActiveRider: 300, perKm: 7, perOtHour: 95, standardShiftHours: 8 },
  };
}

function offsetDays(date: Date, delta: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return d;
}
