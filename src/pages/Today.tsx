import { Link, useNavigate } from "react-router-dom";
import { InterestList, MatchHeader, MatchReasonBlock } from "../components/MatchDetails";
import { UndoBar } from "../components/ui/UndoBar";
import { Avatar } from "../components/ui/Avatar";
import { isUndoable, matchesLeftAfter, pendingToday, todayMatchId, todayQueue } from "../state/reducer";
import { useNow, useStore } from "../state/store";
import { matchFor } from "../data/tailor";
import { BottomBar } from "../components/BottomBar";

export default function Today() {
  const { state, dispatch } = useStore();
  const navigate = useNavigate();
  const pending = pendingToday(state);
  const matchId = pending[0] ?? todayMatchId(state);
  const match = matchFor(state, matchId);
  // Someone just passed on stays undoable while the next match (or the summary) is on screen.
  const justPassed = Object.values(state.connections).find(
    (c) => c.decision.kind === "passed" && c.decision.undoUntil > Date.now(),
  );
  const now = useNow(!!justPassed);
  const left = matchesLeftAfter(state, matchId);
  const undo =
    justPassed && justPassed.decision.kind === "passed" && isUndoable(justPassed.decision, now)
      ? {
          message: `You passed on ${matchFor(state, justPassed.matchId).name}`,
          until: justPassed.decision.undoUntil,
          onUndo: () => dispatch({ type: "MATCH_UNDO", matchId: justPassed.matchId, now: Date.now() }),
        }
      : null;

  if (pending.length === 0) {
    const matchedToday = todayQueue(state).filter((id) => state.connections[id]?.decision.kind === "accepted");
    return (
      <section>
        <p className="text-[13px] font-medium text-accent">Today's matches</p>
        <h1 className="mt-1 text-[26px] font-semibold tracking-tight">That's everyone for today</h1>
        <p className="mt-2 text-muted">Your next matches arrive tomorrow.</p>

        {matchedToday.length > 0 && (
          <div className="mt-8">
            <h2 className="font-semibold">You matched with</h2>
            <ul className="mt-3 space-y-2">
              {matchedToday.map((id) => {
                const m = matchFor(state, id);
                return (
                  <li key={id}>
                    <Link to={`/match/${id}`} className="card flex items-center gap-3 p-3 hover:shadow-sm">
                      <Avatar profile={m} size="sm" />
                      <span className="flex-1 font-medium">{m.name}</span>
                      <span className="text-sm font-medium text-muted">Open</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <RecentlyPassed />

        {undo && <UndoBar {...undo} />}
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
          {left > 0 ? (
            <>
              <strong className="font-semibold">
                {left === 1 ? "1 more match" : `${left} more matches`} after this one today.
              </strong>{" "}
              Passing doesn't notify anyone, and matching doesn't stop you seeing the rest.
            </>
          ) : (
            <>
              <strong className="font-semibold">This is your last match today.</strong> Your next matches arrive
              tomorrow.
            </>
          )}
        </span>
      </div>

      <article className="card mt-4 p-5">
        <MatchHeader match={match} />
        <p className="mt-4 text-[15px] leading-relaxed">{match.bio}</p>

        <div className="mt-5">
          <InterestList me={state.me} match={match} />
        </div>

        <hr className="my-6 border-line" />
        <MatchReasonBlock me={state.me} match={match} />
      </article>

      <BottomBar>
        {undo && <UndoBar inline {...undo} />}
        <div className="grid grid-cols-2 gap-3">
        <button type="button" className="btn-secondary" onClick={() => dispatch({ type: "MATCH_PASS", matchId, now: Date.now() })}>
          Not for me
        </button>
        <button type="button" className="btn-primary" onClick={() => {
            dispatch({ type: "MATCH_ACCEPT", matchId, now: Date.now() });
            navigate(`/match/${matchId}`);
          }}>
          I'm interested
        </button>
        </div>
      </BottomBar>
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
          const m = matchFor(state, c.matchId);
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
