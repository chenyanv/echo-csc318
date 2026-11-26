import type { ReactNode } from "react";

/**
 * Echo is a phone app. On a phone this fills the screen; on a laptop it shows the same
 * layout in a centred, phone-sized frame, so participants see one consistent design.
 * `relative` makes this the anchor for sheets and undo bars, so they stay inside the frame.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#ebe6e1] md:flex md:items-center md:justify-center md:py-6">
      <div className="relative isolate mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-canvas md:h-[min(900px,calc(100dvh-3rem))] md:rounded-[2.25rem] md:border md:border-black/5 md:shadow-2xl">
        {children}
      </div>
    </div>
  );
}

/** Scrolls the page area of the frame back to the top (window.scrollTo doesn't reach it). */
export function scrollPageToTop() {
  document.getElementById("scroll-root")?.scrollTo({ top: 0 });
}
