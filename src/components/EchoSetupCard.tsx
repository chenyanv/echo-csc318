import { ECHO_DOWNLOAD_MB, loadEcho, chooseDemoReplies, useEchoStatus } from "../ai/useEcho";

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
          {ai.cached ? "Loading from your browser." : "This only happens once. You can keep using Echo while it downloads."}
        </p>
      </div>
    );
  }

  return (
    <div className="card border-echo/20 bg-echo-soft/50 p-4">
      <p className="font-semibold text-echo-strong">Run Echo on your device</p>
      {!compact && (
        <p className="mt-1 text-sm text-ink/80">
          Echo's AI runs in your browser, so what you tell it stays on this device. It's a one-time download of about{" "}
          {ECHO_DOWNLOAD_MB} MB, best on Wi-Fi.
        </p>
      )}
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
