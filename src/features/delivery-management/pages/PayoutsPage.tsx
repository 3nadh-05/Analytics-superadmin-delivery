import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useDeliveryStatsDB, todayISO } from "../data/store";
import { computeDayStats } from "../data/aggregate";
import { Card, SectionLabel } from "../components/ui";

export function PayoutsPage() {
  const db = useDeliveryStatsDB();
  const today = todayISO();
  const stats = useMemo(() => computeDayStats(db, today), [db, today]);

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-6">
      <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-semibold">Rider payouts</div>
      <h1 className="text-2xl font-semibold mt-0.5">Payouts</h1>
      <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-2xl">
        Today's modelled payout by rider (base + distance + overtime). Rates are shared with{" "}
        <Link to="/delivery/statistics" className="underline">
          Delivery Statistics
        </Link>
        .
      </p>

      <Card className="p-4 mt-5">
        <div className="flex items-center justify-between">
          <SectionLabel>Today · ₹{stats.payout.total} total</SectionLabel>
          <span className="text-xs text-[var(--text-muted)]">
            Base ₹{db.rates.baseActiveRider}/rider · ₹{db.rates.perKm}/km · ₹{db.rates.perOtHour}/OT hr
          </span>
        </div>
        <table className="w-full text-sm border-collapse mt-3">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              <th className="py-1.5 pr-3 font-semibold">Rider</th>
              <th className="py-1.5 px-3 font-semibold text-right">Orders</th>
              <th className="py-1.5 px-3 font-semibold text-right">KM</th>
              <th className="py-1.5 px-3 font-semibold text-right">OT hrs</th>
              <th className="py-1.5 pl-3 font-semibold text-right">Payout</th>
            </tr>
          </thead>
          <tbody>
            {stats.riders.map((r) => (
              <tr key={r.riderId} className="border-t border-[var(--gridline)]">
                <td className="py-2 pr-3 font-medium">{r.riderName}</td>
                <td className="py-2 px-3 text-right tabular-nums">{r.orders}</td>
                <td className="py-2 px-3 text-right tabular-nums">{r.km != null ? r.km.toFixed(1) : "—"}</td>
                <td className="py-2 px-3 text-right tabular-nums">{r.otHours ?? "—"}</td>
                <td className="py-2 pl-3 text-right tabular-nums font-medium">{r.payout != null ? `₹${r.payout}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
