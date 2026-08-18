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
}

export interface DeliveryStatsDB {
  version: 1;
  riders: Rider[];
  merchants: Merchant[];
  entries: DailyEntry[];
  days: DayMeta[];
  rates: PayoutRates;
}
