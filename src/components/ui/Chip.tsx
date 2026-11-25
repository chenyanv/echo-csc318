import type { ReactNode } from "react";

interface ChipProps {
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
  tone?: "accent" | "neutral";
}

export function Chip({ selected, onClick, disabled, children, tone = "accent" }: ChipProps) {
  const on = tone === "accent" ? "border-accent bg-accent-soft text-accent-strong" : "border-ink bg-ink text-white";
  if (!onClick) {
    return <span className="inline-flex rounded-full border border-line bg-surface px-3 py-1 text-sm">{children}</span>;
  }
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors ${
        selected ? on : "border-line bg-surface text-ink hover:border-ink/30"
      } disabled:opacity-40`}
    >
      {selected && (
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {children}
    </button>
  );
}
