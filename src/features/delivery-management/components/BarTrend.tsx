import { useState } from "react";

export interface BarTrendPoint {
  label: string;
  value: number;
  sublabel?: string;
}

/** Small single-series bar chart: thin bars, rounded data-ends, hairline baseline, hover tooltip. */
export function BarTrend({
  points,
  color = "var(--series-1)",
  height = 96,
  valueFormat = (v: number) => String(v),
}: {
  points: BarTrendPoint[];
  color?: string;
  height?: number;
  valueFormat?: (v: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.value));
  const barGapPx = 4;

  return (
    <div className="relative">
      <div className="flex items-end gap-1" style={{ height }}>
        {points.map((p, i) => {
          const h = Math.max(2, (p.value / max) * (height - 4));
          const isHover = hover === i;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end h-full cursor-default"
              style={{ gap: barGapPx }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h2) => (h2 === i ? null : h2))}
            >
              <div className="flex-1 w-full flex items-end">
                <div
                  className="w-full rounded-t-[4px] transition-opacity"
                  style={{
                    height: h,
                    background: color,
                    opacity: hover === null || isHover ? 1 : 0.45,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="h-px bg-[var(--baseline)] mt-0.5" />
      <div className="flex gap-1 mt-1">
        {points.map((p, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-[var(--text-muted)] truncate">
            {p.label}
          </div>
        ))}
      </div>
      {hover !== null && (
        <div
          className="absolute -top-1 -translate-y-full px-2 py-1 rounded bg-[var(--shell-bg)] text-white text-[11px] shadow-lg pointer-events-none whitespace-nowrap z-10"
          style={{
            left: `${((hover + 0.5) / points.length) * 100}%`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="font-semibold tabular-nums">{valueFormat(points[hover].value)}</div>
          {points[hover].sublabel && <div className="text-[var(--shell-text-muted)]">{points[hover].sublabel}</div>}
        </div>
      )}
    </div>
  );
}

/** Tiny inline sparkline bar chart for table cells (no axis, no hover). */
export function Sparkline({ values, color = "var(--series-1)", width = 72, height = 22 }: { values: number[]; color?: string; width?: number; height?: number }) {
  const max = Math.max(1, ...values);
  const barW = width / values.length - 2;
  return (
    <svg width={width} height={height} className="overflow-visible">
      {values.map((v, i) => {
        const h = Math.max(1.5, (v / max) * (height - 2));
        return (
          <rect
            key={i}
            x={i * (barW + 2)}
            y={height - h}
            width={Math.max(1, barW)}
            height={h}
            rx={1.5}
            fill={color}
            opacity={i === values.length - 1 ? 1 : 0.5}
          />
        );
      })}
    </svg>
  );
}
