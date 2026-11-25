import { Outlet } from "react-router-dom";

/** Full-screen layout for sign-up and setup: no tab bar, one readable column. */
export default function OnboardingLayout() {
  return (
    <div className="min-h-dvh bg-canvas">
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] md:pt-14">
        <Outlet />
      </main>
    </div>
  );
}
