export type Attendance = "P" | "A";

export interface Rider {
  id: string;
  name: string;
}

export interface Merchant {
  id: string;
  name: string;
}

/** One rider's manually-entered numbers for one calendar day. */
export interface DailyEntry {
  date: string; // YYYY-MM-DD
  riderId: string;
  attendance: Attendance;
  orders: number;
  /** km is null when not yet logged by the rider (shown as a gap, never coerced to 0). */
  km: number | null;
  /** OT hours is null when the source sheet logs "nil" for that day. */
  otHours: number | null;
  /** clock-in, 24hr "HH:MM"; null when not logged. */
  reportingTime: string | null;
  /** clock-out, 24hr "HH:MM"; null when not logged. */
  exitTime: string | null;
  /** total minutes actually spent on deliveries (picked up from delivery ETAs) — the working portion of the shift, as opposed to idle time between orders. Null when not logged. */
  activeMinutes: number | null;
  /** orders attributed to each merchant; values should sum to `orders`. */
  merchantOrders: Record<string, number>;
  /** manual payout override flag ("MOD" badge in the source screens). */
  payoutMod: boolean;
  notes?: string;
}

export interface DayMeta {
  date: string;
  closed: boolean;
  sourceFile?: string;
  lastUpload?: string; // ISO timestamp
}

export interface PayoutRates {
  baseActiveRider: number; // ₹ per active rider per day
  perKm: number; // ₹ per km
  perOtHour: number; // ₹ per OT hour
  /** the shift length the flat base pay assumes a rider is working, in hours. */
  standardShiftHours: number;
}

export interface DeliveryStatsDB {
  version: 1;
  riders: Rider[];
  merchants: Merchant[];
  entries: DailyEntry[];
  days: DayMeta[];
  rates: PayoutRates;
}
