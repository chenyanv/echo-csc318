import { useNavigate } from "react-router-dom";
import { Avatar } from "../components/ui/Avatar";
import { Chip } from "../components/ui/Chip";
import { PageTitle } from "../components/ui/PageHeader";
import { GOALS, PACES } from "../data/profiles";
import { useStore } from "../state/store";
import { useState } from "react";
import { loadEcho, removeEchoFromDevice, useEchoStatus, ECHO_DOWNLOAD_MB } from "../ai/useEcho";
import { modelExpiresAt, modelSavedAt, MODEL_TTL_DAYS } from "../ai/modelCache";

export default function Profile() {
  const { state } = useStore();
  const navigate = useNavigate();
  const me = state.me;

  return (
    <section>
      <PageTitle title="Profile" />
      <div className="card p-5">
        <div className="flex items-center gap-4">
          <Avatar profile={me} />
          <div>
            <p className="text-lg font-semibold">{me.name}</p>
            <p className="text-sm text-muted">{[me.pronouns, me.program, me.year].filter(Boolean).join(" · ") || "UofT student"}</p>
          </div>
        </div>
        <dl className="mt-5 space-y-4 text-[15px]">
          <Row label="Looking for">{GOALS[me.goal]}</Row>
          <Row label="Before a first date">{PACES[me.pace]}</Row>
          <Row label="Interests">
            <div className="flex flex-wrap gap-1.5">{me.interests.map((i) => <Chip key={i}>{i}</Chip>)}</div>
          </Row>
          <Row label="What matters">{me.values.join(", ")}</Row>
          <Row label="Instagram">{me.instagram ? `@${me.instagram} (private until you share it)` : "Not added"}</Row>
        </dl>
        <button type="button" className="btn-secondary mt-5" onClick={() => navigate("/setup")}>
          Edit profile
        </button>
      </div>

      <EchoOnDevice />

    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[13px] font-medium text-muted">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}

function EchoOnDevice() {
  const ai = useEchoStatus();
  const [removing, setRemoving] = useState(false);
  const [removed, setRemoved] = useState(false);
  const saved = modelSavedAt();
  const expires = modelExpiresAt();
  const fmt = (t: number) => new Date(t).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  const onDevice = ai.cached || ai.phase === "ready";
  const pct = Math.round(ai.progress * 100);

  return (
    <div className="card mt-4 p-5">
      <p className="font-semibold">Echo on this device</p>
      <p className="mt-1 text-sm text-muted">
        Echo's AI runs in your browser, so your chats with Echo stay on this device.
      </p>

      {ai.phase === "loading" ? (
        <>
          <p className="mt-3 text-[15px]">
            {ai.cached ? "Loading Echo from this device…" : "Downloading Echo…"} {pct}%
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-canvas">
            <div className="h-full rounded-full bg-echo transition-[width]" style={{ width: `${pct}%` }} />
          </div>
        </>
      ) : ai.phase === "unsupported" || ai.phase === "error" || ai.phase === "checking" ? (
        <p className="mt-3 text-[15px] text-muted">
          {ai.phase === "checking"
            ? "Checking whether Echo can run on this device…"
            : `${ai.phase === "error" ? "Echo couldn't load on this device." : ai.reason} Echo uses demo replies here. Chrome or Edge on a laptop works best.`}
        </p>
      ) : onDevice ? (
        <>
          <p className="mt-3 text-[15px]">
            The model (about {ECHO_DOWNLOAD_MB} MB) is saved here
            {saved && expires ? `. Downloaded ${fmt(saved)}, removed automatically on ${fmt(expires)}.` : "."}
            {ai.demo && " Echo is using demo replies for now."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ai.demo && (
              <button type="button" className="btn-echo" onClick={() => void loadEcho()}>
                Use on-device AI
              </button>
            )}
            <button
              type="button"
              className="btn-secondary"
              disabled={removing}
              onClick={async () => {
                setRemoving(true);
                await removeEchoFromDevice();
                setRemoving(false);
                setRemoved(true);
              }}
            >
              {removing ? "Removing…" : "Remove from this device"}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-3 text-[15px] text-muted">
            {removed ? "Removed. Echo uses demo replies until you download it again." : "Not downloaded. Echo uses demo replies for now."}
          </p>
          <p className="mt-1 text-[13px] text-muted">
            One-time download, about {ECHO_DOWNLOAD_MB} MB. Best on Wi-Fi. Kept for {MODEL_TTL_DAYS} days.
          </p>
          <button type="button" className="btn-echo mt-3" onClick={() => void loadEcho()}>
            Download Echo
          </button>
        </>
      )}
    </div>
  );
}
