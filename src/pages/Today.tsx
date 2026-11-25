import { Link, Navigate } from "react-router-dom";
import { InterestList, MatchHeader, MatchReasonBlock } from "../components/MatchDetails";
import { UndoBar } from "../components/ui/UndoBar";
import { Avatar } from "../components/ui/Avatar";
import { getMatch } from "../data/profiles";
import { isUndoable, newConnection, todayMatchId } from "../state/reducer";
import { useNow, useStore } from "../state/store";

export default function Today() {
  const { state, dispatch } = useStore();
  const matchId = todayMatchId(state);
  const match = getMatch(matchId);
  const conn = state.connections[matchId] ?? newConnection(matchId);
  const d = conn.decision;
  const now = useNow(d.kind === "passed");

  if (d.kind === "accepted" || d.kind === "declined") {
    return <Navigate to={`/match/${matchId}`} replace />;
  }

  if (d.kind === "passed") {
    return (
      <section>
        <p className="text-[13px] font-medium text-accent">Today's match</p>
        <h1 className="mt-1 text-[26px] font-semibold tracking-tight">You passed on {match.name}</h1>
        <p className="mt-2 text-muted">That was today's match. Your next one arrives tomorrow.</p>

        <RecentlyPassed />

        {isUndoable(d, now) && (
          <UndoBar
            message={`You passed on ${match.name}`}
            until={d.undoUntil}
            onUndo={() => dispatch({ type: "MATCH_UNDO", matchId, now: Date.now() })}
          />
        )}
      </section>
    );
  }

  return (
    <section>
      <p className="text-[13px] font-medium text-accent">Today's match</p>

      <div
        role="note"
        className="mt-3 flex items-start gap-2.5 rounded-2xl border border-accent/20 bg-accent-soft px-4 py-3 text-[15px] text-accent-strong"
      >
        <svg viewBox="0 0 20 20" className="mt-0.5 size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <circle cx="10" cy="10" r="7.5" />
          <path d="M10 6v4.5M10 13.5v.5" strokeLinecap="round" />
        </svg>
        <span>
          <strong className="font-semibold">This is your only match today.</strong> If you pass, your next match arrives
          tomorrow.
        </span>
      </div>

      <article className="card mt-4 p-5 md:p-6">
        <MatchHeader match={match} />
        <p className="mt-4 text-[15px] leading-relaxed">{match.bio}</p>

        <div className="mt-5">
          <InterestList me={state.me} match={match} />
        </div>

        <hr className="my-6 border-line" />
        <MatchReasonBlock me={state.me} match={match} />
      </article>

      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] -mx-4 mt-5 grid grid-cols-2 gap-3 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0">
        <button type="button" className="btn-secondary" onClick={() => dispatch({ type: "MATCH_PASS", matchId, now: Date.now() })}>
          Not for me
        </button>
        <button type="button" className="btn-primary" onClick={() => dispatch({ type: "MATCH_ACCEPT", matchId, now: Date.now() })}>
          I'm interested
        </button>
      </div>
    </section>
  );
}

/** Passed matches stay here so a mis-tap is never permanent (A2 finding 2). */
export function RecentlyPassed() {
  const { state, dispatch } = useStore();
  const passed = Object.values(state.connections).filter((c) => c.decision.kind === "passed");
  if (passed.length === 0) return null;
  return (
    <div className="mt-8">
      <h2 className="font-semibold">Recently passed</h2>
      <p className="mt-0.5 text-sm text-muted">Passing doesn't notify anyone. You can bring someone back.</p>
      <ul className="mt-3 space-y-2">
        {passed.map((c) => {
          const m = getMatch(c.matchId);
          return (
            <li key={c.matchId} className="card flex items-center gap-3 p-3">
              <Avatar profile={m} size="sm" />
              <span className="flex-1 font-medium">{m.name}</span>
              <button
                type="button"
                className="btn-secondary min-h-9 px-4 text-sm"
                onClick={() => dispatch({ type: "MATCH_RESTORE", matchId: c.matchId })}
              >
                Bring back
              </button>
            </li>
          );
        })}
      </ul>
      <Link to="/" className="mt-6 inline-block text-[15px] font-medium text-muted hover:text-ink">
        Back to home
      </Link>
    </div>
  );
}
