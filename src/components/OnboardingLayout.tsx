import { Outlet } from "react-router-dom";
import { PhoneFrame } from "./PhoneFrame";

/** Sign-up and setup: same phone frame, no tab bar. */
export default function OnboardingLayout() {
  return (
    <PhoneFrame>
      <main
        id="scroll-root"
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <Outlet />
      </main>
    </PhoneFrame>
  );
}
