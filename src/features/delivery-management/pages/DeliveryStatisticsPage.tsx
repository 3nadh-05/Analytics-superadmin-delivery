import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDeliveryStatsDB, todayISO, setDayClosed, getDayMeta } from "../data/store";
import { computeDayStats, computeTrend } from "../data/aggregate";
import { addDays, formatLong, formatShort, fromISODate } from "../data/dates";
import { Card, Delta, KpiCard, LoadBar, Pill, SectionLabel } from "../components/ui";
import { BarTrend } from "../components/BarTrend";

const TREND_DAYS = 7;

export function DeliveryStatisticsPage() {
  const db = useDeliveryStatsDB();
  const today = todayISO();
  const [date, setDate] = useState(today);

  const isToday = date === today;
  const meta = getDayMeta(date);
  const stats = useMemo(() => computeDayStats(db, date), [db, date]);
  const prevDate = addDays(date, -1);
  const prevStats = useMemo(() => computeDayStats(db, prevDate), [db, prevDate]);
  const trend = useMemo(() => computeTrend(db, date, TREND_DAYS), [db, date]);

  const idleRiders = stats.rosterSize - stats.riders.filter((r) => r.orders > 0).length;
  const prevIdleRiders = prevStats.rosterSize - prevStats.riders.filter((r) => r.orders > 0).length;

  const ordersPerRider = stats.activeRiders > 0 ? Math.round((stats.orders / stats.activeRiders) * 10) / 10 : 0;
  const prevOrdersPerRider = prevStats.activeRiders > 0 ? Math.round((prevStats.orders / prevStats.activeRiders) * 10) / 10 : 0;

  const canFuture = fromISODate(date) < fromISODate(today);

  function exportCsv() {
    const header = ["Rider", "Orders", "KM", "KM/Order", "OT Hrs", "Attendance", "Payout"];
    const rows = stats.riders.map((r) => [
      r.riderName,
      r.orders,
      r.km ?? "",
      r.kmPerOrder ?? "",
      r.otHours ?? "",
      r.attendance,
      r.payout ?? "",
    ]);
    const csv = [header, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `delivery-summary-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-6">
      {/* header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] uppercase tracking-wide font-semibold">
            <span>{meta.closed ? "Closed day" : isToday ? "Live" : "Open"}</span>
            <span>·</span>
            <span>{formatLong(date)}</span>
          </div>
          <h1 className="text-2xl font-semibold mt-0.5">Delivery statistics</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-[var(--border)] overflow-hidden">
            <button
              className="px-2.5 py-1.5 text-sm hover:bg-black/5"
              onClick={() => setDate((d) => addDays(d, -1))}
              aria-label="Previous day"
            >
              ←
            </button>
            <span className="px-2 text-sm font-medium tabular-nums border-x border-[var(--border)] py-1.5">{formatShort(date)}</span>
            <button
              className="px-2.5 py-1.5 text-sm hover:bg-black/5 disabled:opacity-30"
              onClick={() => canFuture && setDate((d) => addDays(d, 1))}
              disabled={!canFuture}
              aria-label="Next day"
            >
              →
            </button>
          </div>
          <Link to="/delivery/comparison" className="px-3 py-2 rounded-md border border-[var(--border)] text-sm font-medium hover:bg-black/5">
            Compare weeks
          </Link>
          <button onClick={exportCsv} className="px-3 py-2 rounded-md border border-[var(--border)] text-sm font-medium hover:bg-black/5">
            Export sheet
          </button>
          <button
            onClick={() => setDayClosed(date, !meta.closed)}
            className="px-3 py-2 rounded-md text-sm font-semibold text-white"
            style={{ background: meta.closed ? "var(--text-muted)" : "var(--series-1)" }}
          >
            {meta.closed ? "Reopen day" : "Close the day"}
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="flex gap-3 mt-5 flex-wrap">
        <KpiCard label="Orders delivered" value={stats.orders} unit="orders" delta={stats.orders - prevStats.orders} />
        <KpiCard label="Distance" value={stats.km.toFixed(1)} unit="km" delta={Math.round((stats.km - prevStats.km) * 10) / 10} />
        <KpiCard label="Orders / rider" value={ordersPerRider} unit="avg" delta={Math.round((ordersPerRider - prevOrdersPerRider) * 10) / 10} />
        <KpiCard
          label="Idle riders"
          badge="MOD"
          value={`${idleRiders} of ${stats.rosterSize}`}
          delta={idleRiders - prevIdleRiders}
          invertDelta
        />
        <KpiCard
          label="Cost / delivery"
          badge="MOD"
          value={`₹${Math.round(stats.payout.perDelivery)}`}
          delta={Math.round(stats.payout.perDelivery - prevStats.payout.perDelivery)}
          invertDelta
        />
      </div>

      {/* body */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4 mt-5">
        <div className="flex flex-col gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <SectionLabel>Rider × merchant · orders delivered</SectionLabel>
              <span className="text-xs text-[var(--text-muted)]">{stats.riders.length} on roster · {stats.activeRiders} active</span>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                    <th className="py-1.5 pr-3 font-semibold">Rider</th>
                    <th className="py-1.5 px-3 font-semibold">Orders</th>
                    <th className="py-1.5 px-3 font-semibold w-28">Load</th>
                    <th className="py-1.5 px-3 font-semibold text-right">KM</th>
                    <th className="py-1.5 px-3 font-semibold text-right">KM/Ord</th>
                    <th className="py-1.5 px-3 font-semibold text-right">OT</th>
                    <th className="py-1.5 px-3 font-semibold text-center">Att</th>
                    <th className="py-1.5 pl-3 font-semibold text-right">Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.riders.map((r) => {
                    const longTrip = r.kmPerOrder != null && r.kmPerOrder > 20;
                    const otFlag = (r.otHours ?? 0) >= 1.5;
                    return (
                      <tr key={r.riderId} className="border-t border-[var(--gridline)]">
                        <td className="py-2 pr-3 font-medium whitespace-nowrap">{r.riderName}</td>
                        <td className="py-2 px-3 tabular-nums">{r.orders}</td>
                        <td className="py-2 px-3">
                          <LoadBar fraction={r.loadFraction} />
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-[var(--text-secondary)]">
                          {r.km != null ? r.km.toFixed(1) : <span className="text-[var(--status-serious)]">n/a</span>}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums" style={{ color: longTrip ? "var(--status-serious)" : "var(--text-secondary)", fontWeight: longTrip ? 600 : 400 }}>
                          {r.kmPerOrder ?? "—"}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums" style={{ color: otFlag ? "var(--status-warning-text, #8a5a00)" : "var(--text-secondary)", fontWeight: otFlag ? 600 : 400 }}>
                          {r.otHours ?? (r.attendance === "P" ? "nil" : "—")}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Pill tone={r.attendance === "P" ? "good" : "critical"}>{r.attendance}</Pill>
                        </td>
                        <td className="py-2 pl-3 text-right tabular-nums font-medium">{r.payout != null ? `₹${r.payout}` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--baseline)] font-semibold">
                    <td className="py-2 pr-3">Total</td>
                    <td className="py-2 px-3 tabular-nums">{stats.orders}</td>
                    <td />
                    <td className="py-2 px-3 text-right tabular-nums">{stats.km.toFixed(1)}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{stats.kmPerOrder.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{stats.otHours.toFixed(1)}</td>
                    <td className="py-2 px-3 text-center tabular-nums">
                      {stats.activeRiders}/{stats.rosterSize}
                    </td>
                    <td className="py-2 pl-3 text-right tabular-nums">₹{stats.payout.total}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          <Card className="p-4">
            <SectionLabel>Trend · last {TREND_DAYS} days</SectionLabel>
            <div className="grid grid-cols-2 gap-6 mt-3">
              <div>
                <div className="text-xs text-[var(--text-secondary)] mb-2">Orders</div>
                <BarTrend
                  points={trend.map((p) => ({ label: formatShort(p.date), value: p.orders, sublabel: formatLong(p.date) }))}
                  color="var(--series-1)"
                  valueFormat={(v) => `${v} orders`}
                />
              </div>
              <div>
                <div className="text-xs text-[var(--text-secondary)] mb-2">Distance (km)</div>
                <BarTrend
                  points={trend.map((p) => ({ label: formatShort(p.date), value: p.km, sublabel: formatLong(p.date) }))}
                  color="var(--series-2)"
                  valueFormat={(v) => `${v.toFixed(1)} km`}
                />
              </div>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <SectionLabel>Exceptions</SectionLabel>
              <span className="text-xs text-[var(--text-muted)]">{stats.exceptions.length}</span>
            </div>
            <div className="mt-3 flex flex-col gap-3">
              {stats.exceptions.length === 0 && <div className="text-sm text-[var(--text-muted)]">No exceptions today.</div>}
              {stats.exceptions.map((ex) => (
                <div key={ex.id} className="border-l-2 pl-3" style={{ borderColor: severityColor(ex.severity) }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: severityColor(ex.severity) }}>
                      {ex.title}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] uppercase">{ex.subject}</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-snug">{ex.detail}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <SectionLabel>Merchant split</SectionLabel>
            <div className="mt-3 flex flex-col gap-2.5">
              {stats.merchants.map((m) => (
                <div key={m.merchantId}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className={m.orders === 0 ? "text-[var(--text-muted)]" : "font-medium"}>{m.merchantName}</span>
                    <span className="tabular-nums text-[var(--text-secondary)]">{m.orders}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-black/5 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.round(m.share * 100)}%`, background: m.orders === 0 ? "var(--status-critical)" : "var(--series-1)" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <SectionLabel>Payout preview</SectionLabel>
            <div className="mt-3 flex flex-col gap-1.5 text-sm">
              <Row label={`Base · ${stats.activeRiders} active × ₹${db.rates.baseActiveRider}`} value={`₹${stats.payout.base}`} />
              <Row label={`Distance · ${stats.km.toFixed(1)} km × ₹${db.rates.perKm}`} value={`₹${stats.payout.distance}`} />
              <Row label={`Overtime · ${stats.otHours.toFixed(1)} hr × ₹${db.rates.perOtHour}`} value={`₹${stats.payout.overtime}`} />
              <div className="border-t border-[var(--gridline)] my-1" />
              <Row label="Day total" value={`₹${stats.payout.total}`} bold />
              <div className="text-xs text-[var(--text-muted)]">₹{Math.round(stats.payout.perDelivery)} per delivery</div>
            </div>
          </Card>

          <Card className="p-4">
            <SectionLabel>Data quality</SectionLabel>
            <div className="mt-3 flex flex-col gap-1.5 text-sm">
              <Row label="Rows reconciled" value={`${stats.riders.filter((r) => r.attendance === "P").length + stats.riders.filter((r) => r.attendance === "A").length}/${stats.rosterSize}`} />
              <Row label="KM missing" value={String(stats.kmMissingCount)} tone={stats.kmMissingCount > 0 ? "warn" : undefined} />
              <Row label="OT logged as nil" value={String(stats.otNilCount)} />
              <Row label="Status" value={<Delta value={0} />} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold, tone }: { label: string; value: React.ReactNode; bold?: boolean; tone?: "warn" }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span
        className={`tabular-nums ${bold ? "font-semibold text-base" : "font-medium"}`}
        style={{ color: tone === "warn" ? "var(--status-serious)" : undefined }}
      >
        {value}
      </span>
    </div>
  );
}

function severityColor(sev: "warning" | "serious" | "critical") {
  if (sev === "critical") return "var(--status-critical)";
  if (sev === "serious") return "var(--status-serious)";
  return "var(--status-warning)";
}
