import { NavLink, Outlet } from "react-router-dom";
import type { ReactNode } from "react";
import { EchoMark } from "./EchoMark";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const NAV: NavItem[] = [
  {
    to: "/",
    label: "Home",
    icon: (
      <svg viewBox="0 0 24 24" className="size-6" {...stroke}>
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />
      </svg>
    ),
  },
  {
    to: "/today",
    label: "Today",
    icon: (
      <svg viewBox="0 0 24 24" className="size-6" {...stroke}>
        <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
      </svg>
    ),
  },
  {
    to: "/chats",
    label: "Chats",
    icon: (
      <svg viewBox="0 0 24 24" className="size-6" {...stroke}>
        <path d="M5 18.5V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8z" />
      </svg>
    ),
  },
  {
    to: "/profile",
    label: "Profile",
    icon: (
      <svg viewBox="0 0 24 24" className="size-6" {...stroke}>
        <circle cx="12" cy="8.5" r="3.5" />
        <path d="M5 20c.8-3.5 3.6-5.5 7-5.5s6.2 2 7 5.5" />
      </svg>
    ),
  },
];

/**
 * Responsive shell:
 * - phones: content fills the screen, labelled tab bar at the bottom
 * - md and up: labelled sidebar on the left, content in a readable column
 */
export default function AppShell() {
  return (
    <div className="min-h-full md:flex">
      <aside className="hidden md:sticky md:top-0 md:flex md:h-dvh md:w-60 md:shrink-0 md:flex-col md:border-r md:border-line md:bg-surface md:px-4 md:py-6">
        <div className="mb-8 flex items-center gap-2 px-2">
          <EchoMark className="size-8" />
          <span className="text-xl font-semibold tracking-tight">Echo</span>
        </div>
        <nav className="flex flex-col gap-1" aria-label="Main">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors ${
                  isActive ? "bg-accent-soft text-accent-strong" : "text-muted hover:bg-canvas hover:text-ink"
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="mx-auto w-full max-w-2xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-28 md:px-8 md:pt-10 md:pb-12">
        <Outlet />
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                    isActive ? "text-accent" : "text-muted"
                  }`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
