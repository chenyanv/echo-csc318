import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { InterestList, MatchHeader, MatchReasonBlock } from "../components/MatchDetails";
import { BackButton } from "../components/ui/PageHeader";
import { Sheet } from "../components/ui/Sheet";
import { UndoBar } from "../components/ui/UndoBar";
import { MATCHES, type Profile } from "../data/profiles";
import { cleanHandle } from "../lib/instagram";
import { isMatchNotified, isUndoable } from "../state/reducer";
import { useNow, useStore } from "../state/store";
import { formatDate, formatTime, isPast } from "../lib/format";

export default function MatchProfile() {
  const { id = "" } = useParams();
  const { state, dispatch } = useStore();
  const match = MATCHES.find((m) => m.id === id);
  const conn = match ? state.connections[match.id] : undefined;
  const d = conn?.decision;
  const now = useNow(d?.kind === "declined");

  if (!match || !conn || d?.kind === "pending" || d?.kind === "passed") return <Navigate to="/today" replace />;

  if (d?.kind === "declined") {
    const notified = isMatchNotified(d, now);
    return (
      <section>
        <BackButton to="/chats" label="Chats" />
        <h1 className="mt-4 text-[26px] font-semibold tracking-tight">You declined {match.name}</h1>
        <p className="mt-2 text-muted">
          {notified
            ? `${match.name} has been told the connection has ended. Your chat is closed.`
            : `${match.name} will be told in a few seconds unless you undo.`}
        </p>
        {isUndoable(d, now) && (
          <UndoBar
            message={`You declined ${match.name}`}
            until={d.undoUntil}
            onUndo={() => dispatch({ type: "MATCH_UNDO", matchId: match.id, now: Date.now() })}
          />
        )}
      </section>
    );
  }

  const plan = conn.plan;

  return (
    <section>
      <BackButton to="/chats" label="Chats" />

      <div className="mt-3">
        <MatchHeader match={match} />
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-ok-soft px-2.5 py-0.5 text-[13px] font-medium text-ok">
          You matched
        </p>
      </div>

      {plan && plan.status !== "draft" && plan.status !== "cancelled" && (
        <Link to={`/match/${match.id}/plan`} className="card mt-5 flex items-center gap-3 p-4 hover:shadow-sm">
          <span
            className={`size-2.5 shrink-0 rounded-full ${
              plan.status === "confirmed" ? "bg-ok" : plan.status === "declined" ? "bg-muted" : "bg-warn"
            }`}
          />
          <span className="flex-1 text-[15px]">
            {plan.status === "confirmed"
              ? `${isPast(plan.date) ? "Your date was" : "Date confirmed:"} ${formatDate(plan.date)} at ${formatTime(plan.time)}`
              : plan.status === "sent"
                ? `Date invite sent. Waiting for ${match.name}.`
                : plan.status === "counter"
                  ? `${match.name} suggested a different time.`
                  : `${match.name} would rather keep chatting for now.`}
          </span>
          <span className="text-sm font-medium text-muted">View</span>
        </Link>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Link to={`/chats/${match.id}`} className="btn-primary">
          Chat
        </Link>
        <Link to={`/match/${match.id}/plan`} className="btn-secondary">
          Plan a date
        </Link>
      </div>
      <p className="mt-2 text-center text-[13px] text-muted">No rush. Chat as long as you like before planning anything.</p>

      <article className="card mt-6 space-y-6 p-5 md:p-6">
        <p className="text-[15px] leading-relaxed">{match.bio}</p>
        <div className="space-y-4">
          {match.prompts.map((p) => (
            <div key={p.q}>
              <p className="text-[13px] font-medium text-muted">{p.q}</p>
              <p className="mt-0.5 text-[17px]">{p.a}</p>
            </div>
          ))}
        </div>
        <InterestList me={state.me} match={match} />
      </article>

      <InstagramPanel match={match} />

      <details className="card mt-4 p-5 md:p-6">
        <summary className="cursor-pointer font-semibold">Why Echo suggested {match.name}</summary>
        <div className="mt-4">
          <MatchReasonBlock me={state.me} match={match} />
        </div>
      </details>

      <div className="mt-8 border-t border-line pt-6">
        <button
          type="button"
          className="text-[15px] font-medium text-accent-strong hover:underline"
          onClick={() => dispatch({ type: "MATCH_DECLINE", matchId: match.id, now: Date.now() })}
        >
          Decline {match.name}
        </button>
        <p className="mt-1 text-[13px] text-muted">
          Ends the connection and closes your chat. You'll have 10 seconds to undo before {match.name} is told.
        </p>
      </div>
    </section>
  );
}

/** Instagram sharing: each person decides for themselves (team decision, 2026-11-25). */
function InstagramPanel({ match }: { match: Profile }) {
  const { state, dispatch } = useStore();
  const conn = state.connections[match.id];
  const [open, setOpen] = useState(false);
  const [handleDraft, setHandleDraft] = useState("");
  const myHandle = state.me.instagram;
  const replyTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (replyTimer.current) clearTimeout(replyTimer.current);
  }, []);

  function share() {
    let handle = myHandle;
    if (!handle) {
      handle = cleanHandle(handleDraft);
      if (!handle) return;
      dispatch({ type: "UPDATE_PROFILE", patch: { instagram: handle } });
    }
    dispatch({ type: "SHARE_IG", matchId: match.id, who: "me", now: Date.now() });
    setOpen(false);
    // Scripted: the match shares back a moment later, if they have a handle.
    if (match.instagram && !conn.igShared.them) {
      replyTimer.current = window.setTimeout(
        () => dispatch({ type: "SHARE_IG", matchId: match.id, who: "them", now: Date.now() }),
        2500,
      );
    }
  }

  return (
    <div className="card mt-4 p-5 md:p-6">
      <h3 className="font-semibold">Instagram</h3>
      <p className="mt-0.5 text-sm text-muted">Swap handles if you'd like to keep in touch outside Echo.</p>

      <div className="mt-4 space-y-3">
        {conn.igShared.them && match.instagram && <HandleCard label={`${match.name}'s Instagram`} handle={match.instagram} />}
        {conn.igShared.me && myHandle ? (
          <HandleCard label="You shared" handle={myHandle} mine />
        ) : (
          <button type="button" className="btn-secondary w-full" onClick={() => setOpen(true)}>
            Share my Instagram
          </button>
        )}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title={`Share your Instagram with ${match.name}?`}>
        {myHandle ? (
          <HandleCard label="Your handle" handle={myHandle} mine />
        ) : (
          <label className="block">
            <span className="text-sm font-medium">Your Instagram handle</span>
            <div className="mt-2 flex items-center rounded-xl border border-line bg-surface focus-within:border-ink">
              <span className="pl-3.5 text-muted">@</span>
              <input
                className="w-full bg-transparent px-1.5 py-2.5 text-[15px] outline-none"
                value={handleDraft}
                onChange={(e) => setHandleDraft(e.target.value)}
                placeholder="yourhandle"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
              />
            </div>
          </label>
        )}
        <p className="mt-3 text-sm text-muted">
          Only {match.name} will see it. Once shared, {match.name} can copy it, so it can't be taken back.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
            Not now
          </button>
          <button type="button" className="btn-primary" onClick={share} disabled={!myHandle && !cleanHandle(handleDraft)}>
            Share
          </button>
        </div>
      </Sheet>
    </div>
  );
}

function HandleCard({ label, handle, mine }: { label: string; handle: string; mine?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(handle);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-3 ${mine ? "border-line bg-canvas" : "border-accent/20 bg-accent-soft/60"}`}>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-muted">{label}</p>
        <p className="truncate text-[17px] font-semibold">@{handle}</p>
      </div>
      {!mine && (
        <button type="button" className="btn-secondary min-h-9 px-4 text-sm" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      )}
    </div>
  );
}
