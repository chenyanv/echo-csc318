import { useState, type CSSProperties } from "react";
import { Outlet } from "react-router-dom";
import { BottomBarSlot } from "./BottomBar";
import { PhoneFrame } from "./PhoneFrame";

/** Sign-up and setup: same phone frame, no tab bar. */
export default function OnboardingLayout() {
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);
  return (
    <PhoneFrame>
      <BottomBarSlot.Provider value={slot}>
      <main
        id="scroll-root"
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <Outlet />
      </main>
      {/* Pages' pinned actions (<BottomBar>) render here, above the phone's home indicator. */}
      <div
        ref={setSlot}
        className="shrink-0 pb-[env(safe-area-inset-bottom)] empty:hidden"
        style={{ "--page-px": "1.25rem" } as CSSProperties}
      />
      </BottomBarSlot.Provider>
    </PhoneFrame>
  );
}
