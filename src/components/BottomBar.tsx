import { createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * A page's main actions, pinned to the bottom of the phone frame (above the tab bar).
 * Layouts leave an empty slot between the scrolling page and the tab bar and provide it
 * through BottomBarSlot; <BottomBar> renders into it, so the buttons never cover content
 * and never float mid-screen, whatever the page's length or the phone's height.
 */
export const BottomBarSlot = createContext<HTMLElement | null>(null);

export function BottomBar({ children }: { children: ReactNode }) {
  const slot = useContext(BottomBarSlot);
  const bar = <div className="border-t border-line bg-canvas px-[var(--page-px,1rem)] py-3">{children}</div>;
  // Before the layout has mounted its slot (first render), show nothing rather than a flash inline.
  return slot ? createPortal(bar, slot) : null;
}
