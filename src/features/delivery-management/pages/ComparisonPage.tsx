import { useMemo, useState } from "react";
import { useDeliveryStatsDB, todayISO } from "../data/store";
import { computeWeeklySeries, sortByLatestOrders } from "../data/aggregate";
import { formatWeekLabel } from "../data/dates";
import { Card, Delta, SectionLabel } from "../components/ui";
import { Sparkline } from "../components/BarTrend";
import { GroupedBarTrend } from "../components/GroupedBarTrend";

const NUM_WEEKS = 6;

export function ComparisonPage() {
  const db = useDeliveryStatsDB();
  const today = todayISO();
  const series = useMemo(() => sortByLatestOrders(computeWeeklySeries(db, today, NUM_WEEKS)), [db, today]);
  const weekLabels = series[0]?.cells.map((c) => formatWeekLabel(c.weekStartISO)) ?? [];
  const latestCell = series[0]?.cells[series[0].cells.length - 1];
  const latestIsPartial = latestCell?.isPartial;

  const [riderAId, setRiderAId] = useState(series[0]?.riderId);
  const [riderBId, setRiderBId] = useState(series[1]?.riderId);
  const riderA = series.find((s) => s.riderId === riderAId) ?? series[0];
  const riderB = series.find((s) => s.riderId === riderBId) ?? series[1];

  const groupedPoints = riderA && riderB
    ? riderA.cells.map((c, i) => ({ label: formatWeekLabel(c.weekStartISO), a: c.orders, b: riderB.cells[i].orders }))
    : [];

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-semibold">Rider vs rider · week on week</div>
          <h1 className="text-2xl font-semibold mt-0.5">Comparison</h1>
        </div>
        <div className="text-xs text-[var(--text-muted)] self-center">
          {weekLabels[weekLabels.length - 1]} vs {weekLabels[0]}
          {latestIsPartial && (
            <span className="ml-2 px-1.5 py-0.5 rounded border border-[var(--border)]">
              Partial · first {latestCell?.daysInWeek} of 7 days
            </span>
          )}
        </div>
      </div>

      <Card className="p-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>Riders · orders per week</SectionLabel>
          <span className="text-xs text-[var(--text-muted)]">Cell shade = share of busiest cell</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[900px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                <th className="py-1.5 pr-3 font-semibold sticky left-0 bg-[var(--surface-1)]">Rider</th>
                {weekLabels.map((w, i) => (
                  <th key={i} className="py-1.5 px-2 font-semibold text-right whitespace-nowrap">
                    {w}
                  </th>
                ))}
                <th className="py-1.5 px-3 font-semibold">Trend</th>
                <th className="py-1.5 px-2 font-semibold text-right">Change</th>
                <th className="py-1.5 px-2 font-semibold text-right">KM/Ord</th>
                <th className="py-1.5 pl-2 font-semibold text-right">₹/Del</th>
              </tr>
            </thead>
            <tbody>
              {series.map((s) => {
                const max = Math.max(...s.cells.map((c) => c.orders), 1);
                return (
                  <tr key={s.riderId} className="border-t border-[var(--gridline)]">
                    <td className="py-2 pr-3 font-medium whitespace-nowrap sticky left-0 bg-[var(--surface-1)]">{s.riderName}</td>
                    {s.cells.map((c, i) => (
                      <td
                        key={i}
                        className="py-2 px-2 text-right tabular-nums"
                        style={{ background: `rgba(42,120,214,${0.06 + (c.orders / max) * 0.22})` }}
                      >
                        {c.orders}
                      </td>
                    ))}
                    <td className="py-2 px-3">
                      <Sparkline values={s.cells.map((c) => c.orders)} />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <Delta value={s.changePct} suffix="%" />
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-[var(--text-secondary)]">{s.kmPerOrderLatest ?? "—"}</td>
                    <td className="py-2 pl-2 text-right tabular-nums font-medium">{s.payoutPerDeliveryLatest != null ? `₹${s.payoutPerDeliveryLatest}` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-3 leading-snug">
          Read the gap, not the level: a rider who holds a steady order count every week is a scheduling asset; one who
          swings week to week is a rostering problem.
        </p>
      </Card>

      {riderA && riderB && (
        <Card className="p-4 mt-4">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <SectionLabel>Rider vs rider · deep dive</SectionLabel>
            <div className="flex items-center gap-2">
              <RiderSelect value={riderAId} onChange={setRiderAId} options={series} />
              <span className="text-xs text-[var(--text-muted)]">vs</span>
              <RiderSelect value={riderBId} onChange={setRiderBId} options={series} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <RiderKpiBlock series={riderA} rank={series.findIndex((s) => s.riderId === riderA.riderId) + 1} color="var(--series-1)" />
            <RiderKpiBlock series={riderB} rank={series.findIndex((s) => s.riderId === riderB.riderId) + 1} color="var(--series-3)" />
          </div>

          <GroupedBarTrend
            points={groupedPoints}
            nameA={riderA.riderName}
            nameB={riderB.riderName}
            colorA="var(--series-1)"
            colorB="var(--series-3)"
          />
        </Card>
      )}
    </div>
  );
}

function RiderSelect({
  value,
  onChange,
  options,
}: {
  value: string | undefined;
  onChange: (id: string) => void;
  options: { riderId: string; riderName: string }[];
}) {
  return (
    <select
      className="border border-[var(--border)] rounded-md px-2 py-1.5 text-sm bg-[var(--surface-1)]"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.riderId} value={o.riderId}>
          {o.riderName}
        </option>
      ))}
    </select>
  );
}

function RiderKpiBlock({
  series,
  rank,
  color,
}: {
  series: ReturnType<typeof computeWeeklySeries>[number];
  rank: number;
  color: string;
}) {
  const latest = series.cells[series.cells.length - 1];
  const daysActive = series.cells.reduce((s, c) => s + c.daysActive, 0);
  return (
    <div className="border border-[var(--border)] rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: color }} />
          <span className="font-semibold">{series.riderName}</span>
        </div>
        <span className="text-xs text-[var(--text-muted)]">RANK #{rank}</span>
      </div>
      <div className="text-2xl font-semibold tabular-nums mt-1">
        {latest.orders} <span className="text-xs font-normal text-[var(--text-muted)]">orders this week</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
        <MiniStat label="KM/ORD" value={series.kmPerOrderLatest ?? "—"} />
        <MiniStat label="DAYS ACTIVE" value={`${daysActive}`} />
        <MiniStat label="₹/DEL" value={series.payoutPerDeliveryLatest != null ? `₹${series.payoutPerDeliveryLatest}` : "—"} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[var(--text-muted)] tracking-wide">{label}</div>
      <div className="font-medium tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
