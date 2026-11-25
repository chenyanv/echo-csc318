import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

export function BackButton({ to, label = "Back", onBack }: { to?: string; label?: string; onBack?: () => void }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => (onBack ? onBack() : to ? navigate(to) : navigate(-1))}
      className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-[15px] font-medium text-muted hover:text-ink"
    >
      <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12.5 4.5 7 10l5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </button>
  );
}

export function PageTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-6">
      {eyebrow && <p className="text-[13px] font-medium text-accent">{eyebrow}</p>}
      <h1 className="mt-1 text-[26px] leading-tight font-semibold tracking-tight">{title}</h1>
      {children && <div className="mt-2 text-muted">{children}</div>}
    </header>
  );
}
