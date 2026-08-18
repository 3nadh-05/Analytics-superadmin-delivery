import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDeliveryStatsDB, todayISO, addMerchant, removeMerchant } from "../data/store";
import { computeDayStats } from "../data/aggregate";
import { Card, SectionLabel } from "../components/ui";

export function MerchantsPage() {
  const db = useDeliveryStatsDB();
  const today = todayISO();
  const stats = useMemo(() => computeDayStats(db, today), [db, today]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (db.merchants.some((m) => m.name.toLowerCase() === trimmed.toLowerCase())) {
      setError(`${trimmed} is already a merchant account.`);
      return;
    }
    addMerchant(trimmed);
    setName("");
    setError(null);
  }

  function handleRemove(merchantId: string, merchantName: string) {
    const ok = removeMerchant(merchantId);
    if (!ok) setError(`Can't remove ${merchantName} — it already has delivery records.`);
    else setError(null);
  }

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
        <SectionLabel>Add a merchant</SectionLabel>
        <form onSubmit={handleAdd} className="flex items-center gap-2 mt-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Merchant name"
            className="border border-[var(--border)] rounded-md px-2.5 py-2 text-sm bg-[var(--surface-1)] flex-1 max-w-xs"
          />
          <button type="submit" className="px-3 py-2 rounded-md text-sm font-semibold text-white" style={{ background: "var(--series-1)" }}>
            Add merchant
          </button>
        </form>
        {error && <p className="text-xs text-[var(--status-critical)] mt-2">{error}</p>}
      </Card>

      <Card className="p-4 mt-4">
        <SectionLabel>{db.merchants.length} merchant accounts</SectionLabel>
        <div className="mt-3 flex flex-col divide-y divide-[var(--gridline)]">
          {stats.merchants.map((m) => (
            <div key={m.merchantId} className="py-3 flex items-center justify-between group">
              <div>
                <div className="font-medium">{m.merchantName}</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5 tabular-nums">{m.km.toFixed(1)} km today</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-lg font-semibold tabular-nums">{m.orders}</div>
                  <div className="text-xs text-[var(--text-muted)]">orders today</div>
                </div>
                <button
                  onClick={() => handleRemove(m.merchantId, m.merchantName)}
                  className="text-[var(--text-muted)] hover:text-[var(--status-critical)] opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                  title="Remove merchant"
                  aria-label={`Remove ${m.merchantName}`}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
