import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useDeliveryStatsDB, todayISO } from "../data/store";
import { computeDayStats } from "../data/aggregate";
import { Card, Pill, SectionLabel } from "../components/ui";

export function RidersPage() {
  const db = useDeliveryStatsDB();
  const today = todayISO();
  const stats = useMemo(() => computeDayStats(db, today), [db, today]);

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-6">
      <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-semibold">Fleet roster</div>
      <h1 className="text-2xl font-semibold mt-0.5">Riders</h1>
      <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-2xl">
        Roster and today's status at a glance. For day-level orders, distance and payout detail, see{" "}
        <Link to="/delivery/statistics" className="underline">
          Delivery Statistics
        </Link>
        .
      </p>

      <Card className="p-4 mt-5">
        <SectionLabel>{stats.rosterSize} riders on roster</SectionLabel>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {db.riders.map((r) => {
            const row = stats.riders.find((x) => x.riderId === r.id)!;
            return (
              <div key={r.id} className="border border-[var(--border)] rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5 tabular-nums">
                    {row.orders} {row.orders === 1 ? "order" : "orders"} today · {row.km != null ? `${row.km.toFixed(1)} km` : "no km logged"}
                  </div>
                </div>
                <Pill tone={row.attendance === "P" ? "good" : "critical"}>{row.attendance === "P" ? "On duty" : "Absent"}</Pill>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
