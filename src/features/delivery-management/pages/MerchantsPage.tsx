import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useDeliveryStatsDB, todayISO } from "../data/store";
import { computeDayStats } from "../data/aggregate";
import { Card, SectionLabel } from "../components/ui";

export function MerchantsPage() {
  const db = useDeliveryStatsDB();
  const today = todayISO();
  const stats = useMemo(() => computeDayStats(db, today), [db, today]);

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-6">
      <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-semibold">Merchant accounts</div>
      <h1 className="text-2xl font-semibold mt-0.5">Merchants</h1>
      <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-2xl">
        Account list and today's order share. Dormant-merchant escalations surface automatically on{" "}
        <Link to="/delivery/statistics" className="underline">
          Delivery Statistics
        </Link>
        .
      </p>

      <Card className="p-4 mt-5">
        <SectionLabel>{db.merchants.length} merchant accounts</SectionLabel>
        <div className="mt-3 flex flex-col divide-y divide-[var(--gridline)]">
          {stats.merchants.map((m) => (
            <div key={m.merchantId} className="py-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{m.merchantName}</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5 tabular-nums">{m.km.toFixed(1)} km today</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold tabular-nums">{m.orders}</div>
                <div className="text-xs text-[var(--text-muted)]">orders today</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
