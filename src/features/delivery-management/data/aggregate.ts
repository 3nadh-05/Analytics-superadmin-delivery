import type { DailyEntry, DeliveryStatsDB, PayoutRates } from "./types";
import { addDays, fromISODate, weekStart } from "./dates";

export interface RiderDayRow {
  riderId: string;
  riderName: string;
  attendance: "P" | "A";
  orders: number;
  km: number | null;
  kmPerOrder: number | null;
  otHours: number | null;
  payout: number | null;
  loadFraction: number; // orders / max orders among riders that day
  merchantOrders: Record<string, number>;
}

export interface MerchantDayRow {
  merchantId: string;
  merchantName: string;
  orders: number;
  km: number;
  share: number; // 0..1 of day's total orders
}

export interface PayoutBreakdown {
  base: number;
  distance: number;
  overtime: number;
  total: number;
  perDelivery: number;
}

export interface Exception {
  id: string;
  kind: "dormant-merchant" | "long-trip" | "no-show" | "ot-cluster" | "missing-km" | "ot-nil";
  severity: "warning" | "serious" | "critical";
  title: string;
  subject: string;
  detail: string;
}

export interface DayStats {
  date: string;
  orders: number;
  km: number;
  kmMissingCount: number;
  kmPerOrder: number;
  otHours: number;
  otNilCount: number;
  activeRiders: number;
  rosterSize: number;
  riders: RiderDayRow[];
  merchants: MerchantDayRow[];
  payout: PayoutBreakdown;
  exceptions: Exception[];
}

const LONG_TRIP_KM_PER_ORDER = 20;
const OT_FLAG_HOURS = 1.5;
const OT_CLUSTER_MIN_RIDERS = 4;
const DORMANT_LOOKBACK_DAYS = 2;

function entriesForDate(db: DeliveryStatsDB, date: string): DailyEntry[] {
  return db.entries.filter((e) => e.date === date);
}

export function computePayout(rates: PayoutRates, activeRiders: number, km: number, otHours: number, orders: number): PayoutBreakdown {
  const base = activeRiders * rates.baseActiveRider;
  const distance = Math.round(km * rates.perKm);
  const overtime = Math.round(otHours * rates.perOtHour);
  const total = base + distance + overtime;
  return { base, distance, overtime, total, perDelivery: orders > 0 ? total / orders : 0 };
}

export function computeDayStats(db: DeliveryStatsDB, date: string): DayStats {
  const dayEntries = entriesForDate(db, date);
  const orders = dayEntries.reduce((s, e) => s + e.orders, 0);
  const km = dayEntries.reduce((s, e) => s + (e.km ?? 0), 0);
  const kmMissingCount = dayEntries.filter((e) => e.attendance === "P" && e.orders > 0 && e.km == null).length;
  const otHours = dayEntries.reduce((s, e) => s + (e.otHours ?? 0), 0);
  const otNilCount = dayEntries.filter((e) => e.attendance === "P" && e.otHours == null).length;
  const activeRiders = dayEntries.filter((e) => e.attendance === "P").length;
  const maxOrders = Math.max(1, ...dayEntries.map((e) => e.orders));

  const riders: RiderDayRow[] = db.riders.map((r) => {
    const e = dayEntries.find((x) => x.riderId === r.id);
    const rOrders = e?.orders ?? 0;
    const rKm = e?.km ?? null;
    const rOt = e?.otHours ?? null;
    const rAttendance = e?.attendance ?? "A";
    const payout =
      rAttendance === "P"
        ? Math.round(db.rates.baseActiveRider + (rKm ?? 0) * db.rates.perKm + (rOt ?? 0) * db.rates.perOtHour)
        : null;
    return {
      riderId: r.id,
      riderName: r.name,
      attendance: rAttendance,
      orders: rOrders,
      km: rKm,
      kmPerOrder: rKm != null && rOrders > 0 ? Math.round((rKm / rOrders) * 10) / 10 : null,
      otHours: rOt,
      payout,
      loadFraction: rOrders / maxOrders,
      merchantOrders: e?.merchantOrders ?? {},
    };
  });
  riders.sort((a, b) => b.orders - a.orders);

  const merchants: MerchantDayRow[] = db.merchants.map((m) => {
    let mOrders = 0;
    let mKm = 0;
    for (const e of dayEntries) {
      const o = e.merchantOrders[m.id] ?? 0;
      if (o > 0) {
        mOrders += o;
        if (e.orders > 0 && e.km != null) mKm += e.km * (o / e.orders);
      }
    }
    return { merchantId: m.id, merchantName: m.name, orders: mOrders, km: Math.round(mKm * 10) / 10, share: orders > 0 ? mOrders / orders : 0 };
  });
  merchants.sort((a, b) => b.orders - a.orders);

  const payout = computePayout(db.rates, activeRiders, km, otHours, orders);
  const exceptions = computeExceptions(db, date, riders, merchants, otHours);

  return {
    date,
    orders,
    km: Math.round(km * 10) / 10,
    kmMissingCount,
    kmPerOrder: orders > 0 ? Math.round((km / orders) * 100) / 100 : 0,
    otHours: Math.round(otHours * 10) / 10,
    otNilCount,
    activeRiders,
    rosterSize: db.riders.length,
    riders,
    merchants,
    payout,
    exceptions,
  };
}

function computeExceptions(
  db: DeliveryStatsDB,
  date: string,
  riders: RiderDayRow[],
  merchants: MerchantDayRow[],
  otHoursTotal: number
): Exception[] {
  const out: Exception[] = [];

  // Dormant merchants: zero orders over the lookback window.
  for (const m of merchants) {
    let allZero = true;
    for (let i = 0; i < DORMANT_LOOKBACK_DAYS; i++) {
      const d = addDays(date, -i);
      const dayEntries = entriesForDate(db, d);
      const total = dayEntries.reduce((s, e) => s + (e.merchantOrders[m.merchantId] ?? 0), 0);
      if (total > 0) allZero = false;
    }
    if (allZero) {
      out.push({
        id: `dormant-${m.merchantId}`,
        kind: "dormant-merchant",
        severity: "critical",
        title: "Dormant merchant",
        subject: m.merchantName,
        detail: `Zero orders in the last ${DORMANT_LOOKBACK_DAYS} days. Escalate to the account manager.`,
      });
    }
  }

  // Long trips
  const validKmPerOrder = riders.filter((r) => r.kmPerOrder != null).map((r) => r.kmPerOrder as number);
  const fleetAvg = validKmPerOrder.length ? validKmPerOrder.reduce((a, b) => a + b, 0) / validKmPerOrder.length : 0;
  for (const r of riders) {
    if (r.kmPerOrder != null && r.kmPerOrder > LONG_TRIP_KM_PER_ORDER) {
      out.push({
        id: `long-trip-${r.riderId}`,
        kind: "long-trip",
        severity: "warning",
        title: "Long trips",
        subject: r.riderName,
        detail: `${r.kmPerOrder.toFixed(1)} km per order against a ${fleetAvg.toFixed(1)} km fleet average. Check routing or a wrong log.`,
      });
    }
  }

  // No-shows
  for (const r of riders) {
    if (r.attendance === "A") {
      const prevDate = addDays(date, -1);
      const prevEntry = db.entries.find((e) => e.date === prevDate && e.riderId === r.riderId);
      out.push({
        id: `no-show-${r.riderId}`,
        kind: "no-show",
        severity: "serious",
        title: "No-show",
        subject: r.riderName,
        detail: prevEntry && prevEntry.orders > 0
          ? `Marked absent, zero orders. Was on ${prevDate.slice(-2)}/${prevDate.slice(5, 7)} with ${prevEntry.orders} order${prevEntry.orders === 1 ? "" : "s"} and ${prevEntry.km ?? 0} km.`
          : `Marked absent, zero orders today.`,
      });
    }
  }

  // OT cluster
  const otRiders = riders.filter((r) => (r.otHours ?? 0) >= OT_FLAG_HOURS);
  if (otRiders.length >= OT_CLUSTER_MIN_RIDERS) {
    out.push({
      id: "ot-cluster",
      kind: "ot-cluster",
      severity: "warning",
      title: "Overtime cluster",
      subject: `${otRiders.length} riders`,
      detail: `${otHoursTotal.toFixed(1)} OT hours across ${otRiders.length} riders on a flat-volume day. Shift start is likely misaligned with the dinner peak.`,
    });
  }

  // Missing km
  for (const r of riders) {
    if (r.attendance === "P" && r.orders > 0 && r.km == null) {
      out.push({
        id: `missing-km-${r.riderId}`,
        kind: "missing-km",
        severity: "serious",
        title: "Missing KM",
        subject: r.riderName,
        detail: `Km recorded as n/a in the source sheet. Payout for that day is understated until it is filled.`,
      });
    }
  }

  return out;
}

export interface TwoDayTrendPoint {
  date: string;
  orders: number;
  km: number;
}

export function computeTrend(db: DeliveryStatsDB, endDate: string, days: number): TwoDayTrendPoint[] {
  const points: TwoDayTrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(endDate, -i);
    const dayEntries = entriesForDate(db, d);
    points.push({
      date: d,
      orders: dayEntries.reduce((s, e) => s + e.orders, 0),
      km: Math.round(dayEntries.reduce((s, e) => s + (e.km ?? 0), 0) * 10) / 10,
    });
  }
  return points;
}

// ---- weekly comparison ----

export interface RiderWeekCell {
  weekStartISO: string;
  orders: number;
  km: number;
  daysActive: number;
  daysInWeek: number;
  isPartial: boolean;
}

export interface RiderWeeklySeries {
  riderId: string;
  riderName: string;
  cells: RiderWeekCell[];
  kmPerOrderLatest: number | null;
  payoutPerDeliveryLatest: number | null;
  changePct: number | null;
}

export function listWeekStarts(endDate: string, numWeeks: number): string[] {
  const latestMonday = weekStart(endDate);
  const out: string[] = [];
  for (let i = numWeeks - 1; i >= 0; i--) {
    out.push(addDays(latestMonday, -7 * i));
  }
  return out;
}

export function computeWeeklySeries(db: DeliveryStatsDB, endDate: string, numWeeks: number): RiderWeeklySeries[] {
  const weeks = listWeekStarts(endDate, numWeeks);
  const todayDate = fromISODate(endDate);

  return db.riders.map((r) => {
    const cells: RiderWeekCell[] = weeks.map((wStart) => {
      let orders = 0;
      let km = 0;
      let daysActive = 0;
      let daysInWeek = 0;
      for (let i = 0; i < 7; i++) {
        const d = addDays(wStart, i);
        if (fromISODate(d) > todayDate) break;
        daysInWeek++;
        const e = db.entries.find((x) => x.date === d && x.riderId === r.id);
        if (e) {
          orders += e.orders;
          km += e.km ?? 0;
          if (e.orders > 0) daysActive++;
        }
      }
      return { weekStartISO: wStart, orders, km: Math.round(km * 10) / 10, daysActive, daysInWeek, isPartial: daysInWeek < 7 };
    });

    const latest = cells[cells.length - 1];
    const prevWeekStart = weeks[weeks.length - 2];
    // Compare like-for-like: when the latest week is partial, only count the same
    // number of leading days from the prior week (mirrors the "(first Nd)" convention).
    let comparablePrevOrders: number | null = null;
    if (prevWeekStart && latest.daysInWeek > 0) {
      comparablePrevOrders = 0;
      for (let i = 0; i < latest.daysInWeek; i++) {
        const d = addDays(prevWeekStart, i);
        const e = db.entries.find((x) => x.date === d && x.riderId === r.id);
        comparablePrevOrders += e?.orders ?? 0;
      }
    }
    const changePct =
      comparablePrevOrders && comparablePrevOrders > 0
        ? Math.round(((latest.orders - comparablePrevOrders) / comparablePrevOrders) * 100)
        : latest.orders > 0
          ? null
          : 0;

    // payout / km-per-order for the latest full data window (all cells combined for stability)
    let totalOrders = 0;
    let totalKm = 0;
    let totalPayout = 0;
    for (const wStart of weeks) {
      for (let i = 0; i < 7; i++) {
        const d = addDays(wStart, i);
        if (fromISODate(d) > todayDate) break;
        const e = db.entries.find((x) => x.date === d && x.riderId === r.id);
        if (e && e.attendance === "P") {
          totalOrders += e.orders;
          totalKm += e.km ?? 0;
          totalPayout += db.rates.baseActiveRider + (e.km ?? 0) * db.rates.perKm + (e.otHours ?? 0) * db.rates.perOtHour;
        }
      }
    }

    return {
      riderId: r.id,
      riderName: r.name,
      cells,
      kmPerOrderLatest: totalOrders > 0 ? Math.round((totalKm / totalOrders) * 10) / 10 : null,
      payoutPerDeliveryLatest: totalOrders > 0 ? Math.round(totalPayout / totalOrders) : null,
      changePct,
    };
  });
}

export function sortByLatestOrders(series: RiderWeeklySeries[]): RiderWeeklySeries[] {
  return [...series].sort((a, b) => b.cells[b.cells.length - 1].orders - a.cells[a.cells.length - 1].orders);
}
