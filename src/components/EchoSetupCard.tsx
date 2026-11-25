import { ECHO_DOWNLOAD_MB, loadEcho, chooseDemoReplies, useEchoStatus } from "../ai/useEcho";
import { MODEL_TTL_DAYS } from "../ai/modelCache";

/**
 * Explains on-device AI and lets the person download the model or use demo replies.
 * Renders nothing once Echo is ready or the person has picked demo replies.
 */
export function EchoSetupCard({ compact = false }: { compact?: boolean }) {
  const ai = useEchoStatus();

  if (ai.phase === "checking") {
    return <div className="card p-4 text-sm text-muted">Checking whether Echo can run on this device…</div>;
  }

  if (ai.phase === "unsupported" || ai.phase === "error") {
    return (
      <div className="card border-warn/30 bg-warn-soft p-4 text-sm">
        <p className="font-semibold text-warn">Using demo replies</p>
        <p className="mt-1 text-ink/80">
          {ai.phase === "error" ? "Echo couldn't load on this device." : ai.reason} Echo's messages will be pre-written
          examples. For the full experience, try Chrome or Edge on a laptop.
        </p>
      </div>
    );
  }

  if (ai.phase === "ready" || ai.demo) return null;

  if (ai.phase === "loading") {
    const pct = Math.round(ai.progress * 100);
    return (
      <div className="card border-echo/20 bg-echo-soft/50 p-4">
        <p className="font-semibold text-echo-strong">Setting up Echo on your device… {pct}%</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-echo transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-sm text-muted">
          {ai.cached
            ? "Loading from this device."
            : `Downloading once. It stays on this device for ${MODEL_TTL_DAYS} days. You can keep using Echo meanwhile.`}
        </p>
      </div>
    );
  }

  return (
    <div className="card border-echo/20 bg-echo-soft/50 p-4">
      <p className="flex items-center gap-2 font-semibold text-echo-strong">
        <ShieldIcon /> Private by design: Echo runs on your device
      </p>
      {!compact && (
        <p className="mt-1.5 text-sm text-ink/80">
          Echo's AI runs right here in your browser, not on a server. What you tell Echo is processed on this device
          and never sent anywhere.
        </p>
      )}
      <p className="mt-1.5 text-[13px] text-muted">
        One-time download, about {ECHO_DOWNLOAD_MB} MB. Best on Wi-Fi. It's removed automatically after {MODEL_TTL_DAYS}{" "}
        days, or remove it anytime from your profile.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn-echo" onClick={() => void loadEcho()}>
          Download Echo
        </button>
        <button type="button" className="btn-secondary" onClick={chooseDemoReplies}>
          Use demo replies
        </button>
      </div>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M10 2.5 4 5v4.5c0 3.7 2.6 6.8 6 8 3.4-1.2 6-4.3 6-8V5z" strokeLinejoin="round" />
      <path d="m7.5 10 1.8 1.8 3.4-3.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
