import { useNow } from "../../state/store";

/**
 * "Declined · Undo (8s)" bar. Stays put above the tab bar until the window closes,
 * then calls onExpire once so the screen can move on.
 */
export function UndoBar({
  message,
  until,
  onUndo,
}: {
  message: string;
  until: number;
  onUndo: () => void;
}) {
  const now = useNow(true);
  const left = Math.ceil((until - now) / 1000);
  if (left <= 0) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-lg md:bottom-8"
    >
      <span className="text-[15px]">{message}</span>
      <button type="button" onClick={onUndo} className="min-h-10 shrink-0 rounded-full bg-white/15 px-4 text-sm font-semibold hover:bg-white/25">
        Undo ({left}s)
      </button>
    </div>
  );
}
