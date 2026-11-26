import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { BackButton } from "../components/ui/PageHeader";
import { getActivity } from "../data/planner";
import { MATCHES } from "../data/profiles";
import { formatDate } from "../lib/format";
import { useStore } from "../state/store";
import type { Feeling } from "../state/types";

const FEELINGS: { value: Feeling; label: string; hint: string }[] = [
  { value: "yes", label: "Yes", hint: "I'd like to see them again" },
  { value: "maybe", label: "Not sure yet", hint: "I need a bit more time" },
  { value: "no", label: "No", hint: "I don't think we're a match" },
];

/**
 * After-date reflection (FR5). Answers are private and never trigger anything on their own:
 * choosing "No" doesn't decline, and "Yes" doesn't book another date.
 */
export default function Reflection() {
  const { id = "" } = useParams();
  const { state, dispatch } = useStore();
  const match = MATCHES.find((m) => m.id === id);
  const conn = match ? state.connections[match.id] : undefined;
  const [feeling, setFeeling] = useState<Feeling | undefined>(conn?.reflection.feeling);
  const [note, setNote] = useState(conn?.reflection.note ?? "");
  const [saved, setSaved] = useState(Boolean(conn?.reflection.savedAt));
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  if (!match || !conn || conn.decision.kind !== "accepted") return <Navigate to="/chats" replace />;
  if (conn.plan?.status !== "confirmed") return <Navigate to={`/match/${match.id}`} replace />;

  const plan = conn.plan;

  function save() {
    dispatch({ type: "SAVE_REFLECTION", matchId: match!.id, feeling, note: note.trim(), now: Date.now() });
    setSaved(true);
  }

  function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    dispatch({ type: "SEND_MESSAGE", matchId: match!.id, text: message, now: Date.now() });
    setMessage("");
    setSent(true);
  }

  return (
    <section>
      <BackButton to={`/match/${match.id}`} label={match.name} />
      <h1 className="mt-3 text-[26px] font-semibold tracking-tight">How did it go with {match.name}?</h1>
      <p className="mt-1 text-muted">
        {getActivity(plan.activityId).label} · {formatDate(plan.date)}
      </p>

      <div className="card mt-6 p-5">
        <div className="flex items-center gap-2 text-[13px] font-medium text-muted">
          <LockIcon /> Private. Only you can see this. {match.name} never sees your answers or notes.
        </div>

        <fieldset className="mt-5">
          <legend className="font-semibold">Would you like to see {match.name} again?</legend>
          <div className="mt-3 grid gap-2" role="radiogroup">
            {FEELINGS.map((f) => (
              <button
                key={f.value}
                type="button"
                role="radio"
                aria-checked={feeling === f.value}
                onClick={() => {
                  setFeeling(f.value);
                  setSaved(false);
                }}
                className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                  feeling === f.value ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-ink/30"
                }`}
              >
                <span className="block font-semibold">{f.label}</span>
                <span className="block text-sm text-muted">{f.hint}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="mt-6 block">
          <span className="font-semibold">Notes for yourself</span>
          <span className="mt-0.5 block text-sm text-muted">What stood out? What do you want to remember?</span>
          <textarea
            className="field mt-3 min-h-28 resize-y"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setSaved(false);
            }}
            placeholder="Only you will see this"
            maxLength={1000}
          />
        </label>

        <button type="button" className="btn-primary mt-4 w-full" onClick={save} disabled={!feeling && !note.trim()}>
          {saved ? "Saved" : "Save privately"}
        </button>
        {saved && (
          <p className="mt-2 text-sm text-ok" role="status">
            Saved. Nothing was sent to {match.name}.
          </p>
        )}
      </div>

      {saved && feeling && (
        <div className="card mt-4 p-5">
          <h2 className="font-semibold">What would you like to do next?</h2>
          <p className="mt-1 text-sm text-muted">Up to you. Nothing happens unless you choose it.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {feeling !== "no" && (
              <Link to={`/match/${match.id}/plan`} className="btn-secondary">
                Plan another date
              </Link>
            )}
            {feeling === "yes" && (
              <Link to={`/match/${match.id}`} className="btn-secondary">
                Swap Instagrams
              </Link>
            )}
            <Link to={`/chats/${match.id}`} className="btn-secondary">
              Open chat
            </Link>
            {feeling === "no" && (
              <Link to={`/match/${match.id}`} className="btn-secondary">
                End the connection
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="card mt-4 p-5">
        <h2 className="font-semibold">Send {match.name} a message</h2>
        <p className="mt-1 text-sm text-muted">This goes to your chat with {match.name}, written by you, not Echo.</p>
        {sent ? (
          <p className="mt-3 text-[15px]" role="status">
            Sent.{" "}
            <Link to={`/chats/${match.id}`} className="font-medium text-accent hover:underline">
              View in chat
            </Link>
          </p>
        ) : (
          <form className="mt-3 flex items-end gap-2" onSubmit={sendMessage}>
            <input
              className="field flex-1"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`e.g. Thanks for today!`}
              aria-label={`Message ${match.name}`}
              maxLength={500}
            />
            <button className="btn-primary" disabled={!message.trim()}>
              Send
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  );
}
