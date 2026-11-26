import { NavLink, Outlet, useLocation, useMatch } from "react-router-dom";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { PhoneFrame } from "./PhoneFrame";

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
 * Phone-sized shell: pages scroll inside the frame, the labelled tab bar is pinned at the bottom.
 * The chat screen manages its own scrolling (header, messages, composer), so it gets no padding.
 */
export default function AppShell() {
  const { pathname } = useLocation();
  const isChat = Boolean(useMatch("/chats/:id"));
  const scrollRef = useRef<HTMLElement>(null);

  // Each new screen starts at the top.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <PhoneFrame>
      <main
        id="scroll-root"
        ref={scrollRef}
        className={
          isChat
            ? "flex min-h-0 flex-1 flex-col"
            : "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-6"
        }
      >
        <Outlet />
      </main>

      <nav aria-label="Main" className="z-20 shrink-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
        <ul className="grid grid-cols-4">
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
    </PhoneFrame>
  );
}
