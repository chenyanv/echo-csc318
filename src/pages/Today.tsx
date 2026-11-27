import { Link, useNavigate } from "react-router-dom";
import { MatchReasonBlock, ProfileCard } from "../components/MatchDetails";
import { UndoBar } from "../components/ui/UndoBar";
import { Avatar } from "../components/ui/Avatar";
import { activeMatchId, isUndoable, pendingToday, todayMatchId } from "../state/reducer";
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
  const undo =
    justPassed && justPassed.decision.kind === "passed" && isUndoable(justPassed.decision, now)
      ? {
          message: `You passed on ${matchFor(state, justPassed.matchId).name}`,
          until: justPassed.decision.undoUntil,
          onUndo: () => dispatch({ type: "MATCH_UNDO", matchId: justPassed.matchId, now: Date.now() }),
        }
      : null;

  const active = activeMatchId(state);
  if (active) {
    const m = matchFor(state, active);
    return (
      <section>
        <p className="text-[13px] font-medium text-accent">Today's matches</p>
        <h1 className="mt-1 text-[26px] font-semibold tracking-tight">You're getting to know {m.name}</h1>
        <p className="mt-2 text-muted">
          Echo is one person at a time, so you can give each match your full attention. To see other matches, decline{" "}
          {m.name} first. You can do that from their profile.
        </p>
        <Link to={`/match/${active}`} className="card mt-6 flex items-center gap-3 p-3 hover:shadow-sm">
          <Avatar profile={m} size="sm" />
          <span className="flex-1 font-medium">{m.name}</span>
          <span className="text-sm font-medium text-muted">Open</span>
        </Link>
      </section>
    );
  }

  if (pending.length === 0) {
    return (
      <section>
        <p className="text-[13px] font-medium text-accent">Today's matches</p>
        <h1 className="mt-1 text-[26px] font-semibold tracking-tight">That's everyone for today</h1>
        <p className="mt-2 text-muted">Your next matches arrive tomorrow.</p>

        <RecentlyPassed />

        {undo && <UndoBar {...undo} />}
      </section>
    );
  }

  return (
    <section>
      <p className="text-[13px] font-medium text-accent">Today's match</p>

      <div className="mt-3">
        <ProfileCard me={state.me} match={match} withHeader>
          <MatchReasonBlock me={state.me} match={match} />
        </ProfileCard>
      </div>

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
