import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { chooseDemoReplies, loadEcho, useEchoStatus } from "../ai/useEcho";
import { EchoMark } from "../components/EchoMark";
import { getMatch } from "../data/profiles";
import { HUMAN_REPLIES } from "../data/scripts";
import { setFacilitatorSetting, useFacilitatorSettings, type FacilitatorSettings } from "../state/facilitator";
import { PRESETS, type PresetKey } from "../state/presets";
import { clearLog, exportLog, readLog } from "../state/sessionLog";
import { useStore } from "../state/store";

/** Where each task starts, so the participant lands on the right screen. */
const START_ROUTES: Record<PresetKey, string> = {
  fresh: "/welcome",
  t1: "/",
  t2: "/chats/alex",
  t3: "/match/alex",
  t4: "/chats/alex",
  t5: "/match/alex",
};

/**
 * Facilitator panel for A3 sessions: reset to a task's starting state, play the
 * match's side by hand, choose how the match responds, and export the session log.
 * Reached from Profile → For researchers, or /facilitator.
 */
export default function Facilitator() {
  const navigate = useNavigate();
  const { state, dispatch, loadPreset } = useStore();
  const settings = useFacilitatorSettings();
  const ai = useEchoStatus();
  const [session, setSession] = useState("");
  const [logCount, setLogCount] = useState(() => readLog().length);

  const matchId = "alex";
  const match = getMatch(matchId);
  const c = state.connections[matchId];
  const now = () => Date.now();
  const scriptLeft = c ? (HUMAN_REPLIES[matchId]?.length ?? 0) - c.scriptIndex : 0;

  function start(key: PresetKey) {
    loadPreset(key);
    navigate(START_ROUTES[key]);
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <main className="mx-auto max-w-3xl px-4 py-6 md:py-10">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <EchoMark className="size-8" />
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Facilitator panel</h1>
              <p className="text-sm text-muted">For running A3 sessions. Participants shouldn't see this screen.</p>
            </div>
          </div>
          <Link to="/" className="btn-secondary">
            Back to app
          </Link>
        </header>

        <Panel title="1. Start a task" note="Replaces everything on this device with the task's starting state, then opens its first screen.">
          <div className="grid gap-2 sm:grid-cols-2">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => start(p.key)}
                className="rounded-2xl border border-line bg-surface p-4 text-left hover:border-ink/30"
              >
                <span className="block font-semibold">{p.label}</span>
                <span className="mt-0.5 block text-sm text-muted">{p.description}</span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title={`2. Play ${match.name}'s side`} note="Triggers what the match does. Buttons are only active when the action makes sense right now.">
          <div className="flex flex-wrap gap-2">
            <Act
              disabled={!c || c.decision.kind !== "accepted" || scriptLeft <= 0}
              onClick={() => dispatch({ type: "RECEIVE_HUMAN_REPLY", matchId, now: now() })}
            >
              {match.name} sends next message ({Math.max(scriptLeft, 0)} left)
            </Act>
            <Act
              disabled={!c || c.decision.kind !== "accepted" || c.echo.kind !== "off"}
              onClick={() => dispatch({ type: "ECHO_INVITE", matchId, by: "them", now: now() })}
            >
              {match.name} asks to use Echo chat
            </Act>
            <Act
              disabled={!c || c.echo.kind !== "invited" || c.echo.by !== "me"}
              onClick={() => dispatch({ type: "ECHO_RESPOND", matchId, by: "them", accept: true, now: now() })}
            >
              Agrees to Echo chat
            </Act>
            <Act
              disabled={!c || c.echo.kind !== "invited" || c.echo.by !== "me"}
              onClick={() => dispatch({ type: "ECHO_RESPOND", matchId, by: "them", accept: false, now: now() })}
            >
              Declines Echo chat
            </Act>
            <Act
              disabled={!c || c.echo.kind !== "on" || !c.echo.theirEchoActive}
              onClick={() => dispatch({ type: "ECHO_TAKEOVER", matchId, who: "them", now: now() })}
            >
              {match.name} joins as themself
            </Act>
            <Act
              disabled={c?.plan?.status !== "sent"}
              onClick={() => dispatch({ type: "PLAN_THEIR_RESPONSE", matchId, response: "accept", now: now() })}
            >
              Accepts date
            </Act>
            <Act
              disabled={c?.plan?.status !== "sent"}
              onClick={() => dispatch({ type: "PLAN_THEIR_RESPONSE", matchId, response: "reschedule", now: now() })}
            >
              Suggests 5 pm instead
            </Act>
            <Act
              disabled={c?.plan?.status !== "sent"}
              onClick={() => dispatch({ type: "PLAN_THEIR_RESPONSE", matchId, response: "decline", now: now() })}
            >
              Declines date
            </Act>
            <Act
              disabled={!c || c.decision.kind !== "accepted" || c.igShared.them}
              onClick={() => dispatch({ type: "SHARE_IG", matchId, who: "them", now: now() })}
            >
              Shares Instagram
            </Act>
            <Act onClick={() => dispatch({ type: "ADVANCE_DAY" })}>Skip to next day</Act>
          </div>
          <p className="mt-3 text-sm text-muted">
            Status: {c ? `match ${c.decision.kind}, Echo chat ${c.echo.kind}, date ${c.plan?.status ?? "none"}` : `no connection with ${match.name} yet`}
            {` · day ${state.day + 1}`}
          </p>
        </Panel>

        <Panel title="3. Automatic responses" note={`What ${match.name} does without you. Choose "Wait for me" to control it with the buttons above.`}>
          <Choice
            label={`When asked to use Echo chat, ${match.name}…`}
            value={settings.echoInvite}
            onChange={(v) => setFacilitatorSetting("echoInvite", v as FacilitatorSettings["echoInvite"])}
            options={[
              ["accept", "Agrees after 3 s"],
              ["decline", "Declines after 3 s"],
              ["manual", "Wait for me"],
            ]}
          />
          <Choice
            label={`When sent a date invite, ${match.name}…`}
            value={settings.dateInvite}
            onChange={(v) => setFacilitatorSetting("dateInvite", v as FacilitatorSettings["dateInvite"])}
            options={[
              ["reschedule-then-accept", "Suggests 5 pm, then accepts (default)"],
              ["accept", "Accepts"],
              ["decline", "Declines"],
              ["manual", "Wait for me"],
            ]}
          />
        </Panel>

        <Panel title="4. On-device AI" note="Pre-load the model before the participant arrives, so they don't wait for the download.">
          <p className="text-[15px]">
            Status:{" "}
            <strong>
              {ai.phase === "ready"
                ? ai.demo
                  ? "Loaded, but using demo replies"
                  : "Ready"
                : ai.phase === "loading"
                  ? `Loading ${Math.round(ai.progress * 100)}%`
                  : ai.phase === "unsupported"
                    ? "Not supported on this browser (demo replies)"
                    : ai.phase === "error"
                      ? "Failed to load (demo replies)"
                      : ai.demo
                        ? "Demo replies"
                        : ai.cached
                          ? "Downloaded, not loaded"
                          : "Not downloaded"}
            </strong>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Act disabled={ai.phase !== "idle" && !(ai.demo && ai.phase !== "unsupported")} onClick={() => void loadEcho()}>
              Load model
            </Act>
            <Act disabled={ai.demo} onClick={chooseDemoReplies}>
              Use demo replies
            </Act>
            <Link to="/lab" className="btn-secondary min-h-10 px-4 text-sm">
              Model lab
            </Link>
          </div>
        </Panel>

        <Panel
          title="5. Session log"
          note="Records which screens and actions the participant used, with timings. It never stores what they typed, only how many characters."
        >
          <label className="block max-w-xs">
            <span className="text-sm font-medium">Participant code</span>
            <input
              className="field mt-1.5"
              value={session}
              onChange={(e) => setSession(e.target.value.replace(/[^A-Za-z0-9_-]/g, ""))}
              placeholder="e.g. P03"
            />
          </label>
          <p className="mt-3 text-sm text-muted">{logCount} events recorded on this device.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Act onClick={() => exportLog(session)}>Export log (JSON)</Act>
            <Act
              onClick={() => {
                if (confirm("Clear the session log on this device?")) {
                  clearLog();
                  setLogCount(0);
                }
              }}
            >
              Clear log
            </Act>
            <Act onClick={() => setLogCount(readLog().length)}>Refresh count</Act>
          </div>
        </Panel>
      </main>
    </div>
  );
}

function Panel({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="card mt-5 p-5 md:p-6">
      <h2 className="font-semibold">{title}</h2>
      {note && <p className="mt-0.5 text-sm text-muted">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Act({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="btn-secondary min-h-10 px-4 text-sm">
      {children}
    </button>
  );
}

function Choice({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <fieldset className="mt-3 first:mt-0">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map(([v, text]) => (
          <button
            key={v}
            type="button"
            aria-pressed={value === v}
            onClick={() => onChange(v)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${
              value === v ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-ink/30"
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
