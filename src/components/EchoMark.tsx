export function EchoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" className="fill-accent" />
      <path
        d="M10 16a6 6 0 0 1 6-6M7 16a9 9 0 0 1 9-9M16 22a6 6 0 0 0 6-6M16 25a9 9 0 0 0 9-9"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
