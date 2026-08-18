import type { CSSProperties, ReactNode } from "react";

export function Card({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`bg-[var(--surface-1)] border border-[var(--border)] rounded-lg ${className}`} style={style}>
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="text-[11px] font-semibold tracking-wider uppercase text-[var(--text-muted)]">{children}</div>;
}

export function Delta({ value, suffix = "", invert = false }: { value: number | null; suffix?: string; invert?: boolean }) {
  if (value === null || Number.isNaN(value)) return <span className="text-[var(--text-muted)] text-xs">—</span>;
  const good = invert ? value < 0 : value > 0;
  const flat = value === 0;
  const color = flat ? "var(--text-muted)" : good ? "var(--status-good-text)" : "var(--status-critical)";
  const sign = value > 0 ? "+" : "";
  return (
    <span className="text-xs font-medium tabular-nums" style={{ color }}>
      {sign}
      {value}
      {suffix}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  unit,
  delta,
  deltaSuffix = "",
  invertDelta = false,
  badge,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  delta?: number | null;
  deltaSuffix?: string;
  invertDelta?: boolean;
  badge?: string;
}) {
  return (
    <Card className="px-4 py-3.5 flex-1 min-w-[140px]">
      <div className="flex items-center gap-1.5">
        <SectionLabel>{label}</SectionLabel>
        {badge && (
          <span className="text-[9px] font-semibold px-1 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] tracking-wider">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tabular-nums text-[var(--text-primary)]">{value}</span>
        {unit && <span className="text-xs text-[var(--text-muted)]">{unit}</span>}
      </div>
      {delta !== undefined && (
        <div className="mt-1">
          <Delta value={delta} suffix={deltaSuffix} invert={invertDelta} />
          <span className="text-xs text-[var(--text-muted)] ml-1">vs prior</span>
        </div>
      )}
    </Card>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warning" | "serious" | "critical" }) {
  const tones: Record<string, string> = {
    neutral: "bg-black/5 text-[var(--text-secondary)]",
    good: "bg-[var(--status-good)]/10 text-[var(--status-good-text)]",
    warning: "bg-[var(--status-warning)]/15 text-[#8a5a00]",
    serious: "bg-[var(--status-serious)]/15 text-[#a5401c]",
    critical: "bg-[var(--status-critical)]/10 text-[var(--status-critical)]",
  };
  return <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${tones[tone]}`}>{children}</span>;
}

export function LoadBar({ fraction }: { fraction: number }) {
  return (
    <div className="w-full h-1.5 rounded-full bg-black/5 overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.min(100, Math.round(fraction * 100))}%`, background: "var(--series-1)" }}
      />
    </div>
  );
}
