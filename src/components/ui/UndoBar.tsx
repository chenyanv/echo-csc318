import { useNow } from "../../state/store";

/**
 * "Declined · Undo (8s)" bar. Stays put above the tab bar until the window closes,
 * then calls onExpire once so the screen can move on.
 */
export function UndoBar({
  message,
  until,
  onUndo,
  inline = false,
}: {
  message: string;
  until: number;
  onUndo: () => void;
  /** Sit in the page's pinned bar (above its buttons) instead of floating over the page. */
  inline?: boolean;
}) {
  const now = useNow(true);
  const left = Math.ceil((until - now) / 1000);
  if (left <= 0) return null;
  return (
    <div
      role="status"
      className={`${inline ? "mb-3" : "absolute inset-x-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 shadow-lg"} flex items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-white`}
    >
      <span className="text-[15px]">{message}</span>
      <button type="button" onClick={onUndo} className="min-h-10 shrink-0 rounded-full bg-white/15 px-4 text-sm font-semibold hover:bg-white/25">
        Undo ({left}s)
      </button>
    </div>
  );
}
