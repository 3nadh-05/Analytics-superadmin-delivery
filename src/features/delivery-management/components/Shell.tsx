import { NavLink, Outlet } from "react-router-dom";

const TABS = [
  { to: "statistics", label: "Delivery Statistics", isNew: true },
  { to: "riders", label: "Riders" },
  { to: "merchants", label: "Merchants" },
  { to: "payouts", label: "Payouts" },
];

export function Shell() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-[var(--shell-bg)] text-[var(--shell-text)] border-b border-[var(--shell-border)]">
        <div className="flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-[var(--shell-accent)]" />
              <span className="font-semibold tracking-wide text-sm">FLEET OPS</span>
            </div>
            <nav className="flex items-center gap-1">
              {TABS.map((t) => (
                <NavLink
                  key={t.to}
                  to={`/delivery/${t.to}`}
                  className={({ isActive }) =>
                    [
                      "px-3 py-1.5 rounded text-xs font-semibold tracking-wide uppercase transition-colors",
                      isActive
                        ? "bg-[var(--shell-bg-raised)] text-white"
                        : "text-[var(--shell-text-muted)] hover:text-white hover:bg-white/5",
                    ].join(" ")
                  }
                >
                  {t.label}
                  {t.isNew && (
                    <span className="ml-1.5 align-middle rounded-sm bg-[var(--shell-accent)]/20 text-[var(--shell-accent)] text-[9px] px-1 py-0.5 tracking-wider">
                      NEW
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--shell-text-muted)]">
            <span>Zone: Guindy · Shift: Full day</span>
            <NavLink
              to="/delivery/entry"
              className="px-3 py-1.5 rounded bg-[var(--shell-accent)] text-[#0f1b26] font-semibold text-xs hover:brightness-110 transition"
            >
              Enter today's data
            </NavLink>
          </div>
        </div>
      </header>
      <main className="flex-1 bg-[var(--page-plane)]">
        <Outlet />
      </main>
    </div>
  );
}
