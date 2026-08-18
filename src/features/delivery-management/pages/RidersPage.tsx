import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDeliveryStatsDB, todayISO, addRider, removeRider } from "../data/store";
import { computeDayStats } from "../data/aggregate";
import { Card, Pill, SectionLabel } from "../components/ui";

export function RidersPage() {
  const db = useDeliveryStatsDB();
  const today = todayISO();
  const stats = useMemo(() => computeDayStats(db, today), [db, today]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (db.riders.some((r) => r.name.toLowerCase() === trimmed.toLowerCase())) {
      setError(`${trimmed} is already on the roster.`);
      return;
    }
    addRider(trimmed);
    setName("");
    setError(null);
  }

  function handleRemove(riderId: string, riderName: string) {
    const ok = removeRider(riderId);
    if (!ok) setError(`Can't remove ${riderName} — they already have delivery records.`);
    else setError(null);
  }

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
        <SectionLabel>Add a delivery partner</SectionLabel>
        <form onSubmit={handleAdd} className="flex items-center gap-2 mt-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Rider name"
            className="border border-[var(--border)] rounded-md px-2.5 py-2 text-sm bg-[var(--surface-1)] flex-1 max-w-xs"
          />
          <button type="submit" className="px-3 py-2 rounded-md text-sm font-semibold text-white" style={{ background: "var(--series-1)" }}>
            Add rider
          </button>
        </form>
        {error && <p className="text-xs text-[var(--status-critical)] mt-2">{error}</p>}
      </Card>

      <Card className="p-4 mt-4">
        <SectionLabel>{stats.rosterSize} riders on roster</SectionLabel>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {db.riders.map((r) => {
            const row = stats.riders.find((x) => x.riderId === r.id)!;
            return (
              <div key={r.id} className="border border-[var(--border)] rounded-lg p-3 flex items-center justify-between group">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5 tabular-nums">
                    {row.orders} {row.orders === 1 ? "order" : "orders"} today · {row.km != null ? `${row.km.toFixed(1)} km` : "no km logged"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone={row.attendance === "P" ? "good" : "critical"}>{row.attendance === "P" ? "On duty" : "Absent"}</Pill>
                  <button
                    onClick={() => handleRemove(r.id, r.name)}
                    className="text-[var(--text-muted)] hover:text-[var(--status-critical)] opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                    title="Remove rider"
                    aria-label={`Remove ${r.name}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
