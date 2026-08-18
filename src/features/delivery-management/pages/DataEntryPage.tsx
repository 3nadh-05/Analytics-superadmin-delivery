import { useEffect, useMemo, useState } from "react";
import { useDeliveryStatsDB, todayISO, upsertEntry, setDayClosed, getDayMeta } from "../data/store";
import type { Attendance, DailyEntry } from "../data/types";
import { formatLong } from "../data/dates";
import { Card, Pill, SectionLabel } from "../components/ui";

interface DraftRow {
  riderId: string;
  riderName: string;
  attendance: Attendance;
  merchantOrders: Record<string, number | "">;
  km: number | "";
  otHours: number | "";
  payoutMod: boolean;
}

function buildDraft(db: ReturnType<typeof useDeliveryStatsDB>, date: string): DraftRow[] {
  return db.riders.map((r) => {
    const e = db.entries.find((x) => x.date === date && x.riderId === r.id);
    const merchantOrders: Record<string, number | ""> = {};
    for (const m of db.merchants) merchantOrders[m.id] = e?.merchantOrders[m.id] ?? "";
    return {
      riderId: r.id,
      riderName: r.name,
      attendance: e?.attendance ?? "P",
      merchantOrders,
      km: e?.km ?? "",
      otHours: e?.otHours ?? "",
      payoutMod: e?.payoutMod ?? false,
    };
  });
}

export function DataEntryPage() {
  const db = useDeliveryStatsDB();
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [rows, setRows] = useState<DraftRow[]>(() => buildDraft(db, date));
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const meta = getDayMeta(date);

  useEffect(() => {
    setRows(buildDraft(db, date));
    setSavedAt(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const totals = useMemo(() => {
    let orders = 0;
    let km = 0;
    let otHours = 0;
    let active = 0;
    for (const row of rows) {
      const rowOrders = Object.values(row.merchantOrders).reduce((s: number, v) => s + (v === "" ? 0 : v), 0);
      orders += rowOrders;
      if (row.attendance === "P") active++;
      km += row.km === "" ? 0 : row.km;
      otHours += row.otHours === "" ? 0 : row.otHours;
    }
    return { orders, km: Math.round(km * 10) / 10, otHours: Math.round(otHours * 10) / 10, active };
  }, [rows]);

  function updateRow(riderId: string, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((r) => (r.riderId === riderId ? { ...r, ...patch } : r)));
  }

  function updateMerchant(riderId: string, merchantId: string, value: string) {
    const num = value === "" ? "" : Math.max(0, Number(value));
    setRows((prev) =>
      prev.map((r) => (r.riderId === riderId ? { ...r, merchantOrders: { ...r.merchantOrders, [merchantId]: num } } : r))
    );
  }

  function saveDay() {
    for (const row of rows) {
      const merchantOrders: Record<string, number> = {};
      let orders = 0;
      for (const [mId, v] of Object.entries(row.merchantOrders)) {
        if (v !== "" && v > 0) {
          merchantOrders[mId] = v;
          orders += v;
        }
      }
      const entry: DailyEntry = {
        date,
        riderId: row.riderId,
        attendance: row.attendance,
        orders: row.attendance === "A" ? 0 : orders,
        km: row.attendance === "A" ? null : row.km === "" ? null : row.km,
        otHours: row.attendance === "A" ? null : row.otHours === "" ? null : row.otHours,
        merchantOrders: row.attendance === "A" ? {} : merchantOrders,
        payoutMod: row.payoutMod,
      };
      upsertEntry(entry);
    }
    setSavedAt(Date.now());
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-semibold">Manual entry</div>
          <h1 className="text-2xl font-semibold mt-0.5">Enter delivery data</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-xl">
            Enter each rider's orders per merchant, distance and overtime for the day. Saving writes this to the
            fleet's daily record so it feeds Delivery Statistics and week-on-week Comparison.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className="border border-[var(--border)] rounded-md px-2.5 py-2 text-sm bg-[var(--surface-1)]"
          />
          {meta.closed && <Pill tone="warning">Day closed — editing will reopen it</Pill>}
        </div>
      </div>

      <Card className="p-4 mt-5">
        <div className="flex items-center justify-between mb-2">
          <SectionLabel>{formatLong(date)}</SectionLabel>
          <span className="text-xs text-[var(--text-muted)]">Rider × merchant orders — leave a cell blank for none</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[1000px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                <th className="py-1.5 pr-3 font-semibold sticky left-0 bg-[var(--surface-1)]">Rider</th>
                <th className="py-1.5 px-2 font-semibold text-center">Att.</th>
                {db.merchants.map((m) => (
                  <th key={m.id} className="py-1.5 px-2 font-semibold text-right whitespace-nowrap" title={m.name}>
                    {shortName(m.name)}
                  </th>
                ))}
                <th className="py-1.5 px-2 font-semibold text-right">Orders</th>
                <th className="py-1.5 px-2 font-semibold text-right">KM</th>
                <th className="py-1.5 px-2 font-semibold text-right">OT hrs</th>
                <th className="py-1.5 pl-2 font-semibold text-center">MOD</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const rowOrders = Object.values(row.merchantOrders).reduce((s: number, v) => s + (v === "" ? 0 : v), 0);
                const disabled = row.attendance === "A";
                return (
                  <tr key={row.riderId} className="border-t border-[var(--gridline)]">
                    <td className="py-1.5 pr-3 font-medium whitespace-nowrap sticky left-0 bg-[var(--surface-1)]">{row.riderName}</td>
                    <td className="py-1.5 px-2 text-center">
                      <select
                        value={row.attendance}
                        onChange={(e) => updateRow(row.riderId, { attendance: e.target.value as Attendance })}
                        className="border border-[var(--border)] rounded px-1 py-0.5 text-xs bg-[var(--surface-1)]"
                      >
                        <option value="P">P</option>
                        <option value="A">A</option>
                      </select>
                    </td>
                    {db.merchants.map((m) => (
                      <td key={m.id} className="py-1.5 px-2 text-right">
                        <input
                          type="number"
                          min={0}
                          disabled={disabled}
                          value={row.merchantOrders[m.id]}
                          onChange={(e) => updateMerchant(row.riderId, m.id, e.target.value)}
                          className="w-14 text-right border border-[var(--border)] rounded px-1.5 py-0.5 tabular-nums disabled:bg-black/5 disabled:text-[var(--text-muted)]"
                        />
                      </td>
                    ))}
                    <td className="py-1.5 px-2 text-right tabular-nums font-medium">{disabled ? 0 : rowOrders}</td>
                    <td className="py-1.5 px-2 text-right">
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        disabled={disabled}
                        placeholder="n/a"
                        value={row.km}
                        onChange={(e) => updateRow(row.riderId, { km: e.target.value === "" ? "" : Number(e.target.value) })}
                        className="w-16 text-right border border-[var(--border)] rounded px-1.5 py-0.5 tabular-nums disabled:bg-black/5 disabled:text-[var(--text-muted)]"
                      />
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        disabled={disabled}
                        placeholder="nil"
                        value={row.otHours}
                        onChange={(e) => updateRow(row.riderId, { otHours: e.target.value === "" ? "" : Number(e.target.value) })}
                        className="w-14 text-right border border-[var(--border)] rounded px-1.5 py-0.5 tabular-nums disabled:bg-black/5 disabled:text-[var(--text-muted)]"
                      />
                    </td>
                    <td className="py-1.5 pl-2 text-center">
                      <input
                        type="checkbox"
                        checked={row.payoutMod}
                        onChange={(e) => updateRow(row.riderId, { payoutMod: e.target.checked })}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--baseline)] font-semibold">
                <td className="py-2 pr-3">Total</td>
                <td className="py-2 px-2 text-center tabular-nums">{totals.active}/{rows.length}</td>
                {db.merchants.map((m) => (
                  <td key={m.id} />
                ))}
                <td className="py-2 px-2 text-right tabular-nums">{totals.orders}</td>
                <td className="py-2 px-2 text-right tabular-nums">{totals.km.toFixed(1)}</td>
                <td className="py-2 px-2 text-right tabular-nums">{totals.otHours.toFixed(1)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button onClick={saveDay} className="px-4 py-2 rounded-md text-sm font-semibold text-white" style={{ background: "var(--series-1)" }}>
            Save day
          </button>
          {!meta.closed && date !== today && (
            <button
              onClick={() => {
                saveDay();
                setDayClosed(date, true);
              }}
              className="px-4 py-2 rounded-md text-sm font-semibold border border-[var(--border)]"
            >
              Save & close day
            </button>
          )}
          {savedAt && <span className="text-xs text-[var(--status-good-text)]">Saved — Delivery Statistics and Comparison are up to date.</span>}
        </div>
      </Card>
    </div>
  );
}

function shortName(name: string): string {
  const map: Record<string, string> = {
    "The Fort Royal Biryani": "Fort",
    "Fusion Street": "Fusion",
    "Dhanush Super Market": "Dhanush",
    "Fine Snacks": "Fine",
    Momesta: "Momesta",
    "Neha's Kitchen": "Neha's",
  };
  return map[name] ?? name;
}
