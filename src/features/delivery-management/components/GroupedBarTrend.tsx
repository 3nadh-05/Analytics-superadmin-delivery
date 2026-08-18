import { useState } from "react";

export interface GroupedPoint {
  label: string;
  a: number;
  b: number;
  sublabel?: string;
}

/** Two-series grouped bar chart for A/B rider or merchant comparison. */
export function GroupedBarTrend({
  points,
  colorA = "var(--series-1)",
  colorB = "var(--series-3)",
  nameA,
  nameB,
  height = 140,
}: {
  points: GroupedPoint[];
  colorA?: string;
  colorB?: string;
  nameA: string;
  nameB: string;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => Math.max(p.a, p.b)));

  return (
    <div>
      <div className="flex items-center gap-4 mb-2 text-xs">
        <LegendDot color={colorA} label={nameA} />
        <LegendDot color={colorB} label={nameB} />
      </div>
      <div className="relative">
        <div className="flex items-end gap-3" style={{ height }}>
          {points.map((p, i) => {
            const ha = Math.max(2, (p.a / max) * (height - 4));
            const hb = Math.max(2, (p.b / max) * (height - 4));
            const isHover = hover === i;
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center justify-end h-full"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover((h) => (h === i ? null : h))}
              >
                <div className="flex items-end gap-[3px] w-full justify-center flex-1">
                  <div
                    className="flex-1 max-w-[18px] rounded-t-[4px] self-end"
                    style={{ height: ha, background: colorA, opacity: hover === null || isHover ? 1 : 0.4 }}
                  />
                  <div
                    className="flex-1 max-w-[18px] rounded-t-[4px] self-end"
                    style={{ height: hb, background: colorB, opacity: hover === null || isHover ? 1 : 0.4 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="h-px bg-[var(--baseline)] mt-0.5" />
        <div className="flex gap-3 mt-1">
          {points.map((p, i) => (
            <div key={i} className="flex-1 text-center text-[10px] text-[var(--text-muted)] truncate">
              {p.label}
            </div>
          ))}
        </div>
        {hover !== null && (
          <div
            className="absolute -top-1 -translate-y-full px-2 py-1 rounded bg-[var(--shell-bg)] text-white text-[11px] shadow-lg pointer-events-none whitespace-nowrap z-10"
            style={{ left: `${((hover + 0.5) / points.length) * 100}%`, transform: "translate(-50%, -100%)" }}
          >
            <div className="tabular-nums">{nameA}: {points[hover].a}</div>
            <div className="tabular-nums">{nameB}: {points[hover].b}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
      <span className="w-2 h-2 rounded-sm inline-block" style={{ background: color }} />
      {label}
    </span>
  );
}
