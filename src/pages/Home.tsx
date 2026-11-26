import { Link } from "react-router-dom";
import { EchoMark } from "../components/EchoMark";
import { EchoSetupCard } from "../components/EchoSetupCard";
import { Avatar } from "../components/ui/Avatar";
import { getMatch } from "../data/profiles";
import { newConnection, todayMatchId } from "../state/reducer";
import { useStore } from "../state/store";

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const { state } = useStore();
  const todayId = todayMatchId(state);
  const today = getMatch(todayId);
  const todayConn = state.connections[todayId] ?? newConnection(todayId);
  const matched = Object.values(state.connections).filter((c) => c.decision.kind === "accepted");

  return (
    <section>
      <header className="flex items-center gap-2">
        <EchoMark className="size-7" />
        <span className="text-lg font-semibold tracking-tight">Echo</span>
      </header>

      <h1 className="mt-6 text-[28px] leading-tight font-semibold tracking-tight">
        {greeting(new Date().getHours())}, {state.me.name}
      </h1>

      <div className="mt-6">
        <EchoSetupCard compact />
      </div>

      <TodayCard name={today.name} decision={todayConn.decision.kind} matchId={todayId} />

      <h2 className="mt-10 font-semibold">Your matches</h2>
      {matched.length === 0 ? (
        <p className="mt-2 text-[15px] text-muted">When you and someone are both interested, they'll show up here.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {matched.map((c) => {
            const m = getMatch(c.matchId);
            const last = [...c.messages].reverse().find((x) => x.sender !== "system");
            return (
              <li key={c.matchId}>
                <Link to={`/match/${c.matchId}`} className="card flex items-center gap-3 p-3 hover:shadow-sm">
                  <Avatar profile={m} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{m.name}</p>
                    <p className="truncate text-sm text-muted">
                      {c.plan?.status === "confirmed" ? "Date planned" : last ? last.text : "Say hi when you're ready"}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function TodayCard({ name, decision, matchId }: { name: string; decision: string; matchId: string }) {
  if (decision === "pending") {
    return (
      <Link to="/today" className="card mt-4 block p-5 transition-shadow hover:shadow-md">
        <p className="text-[13px] font-medium text-accent">Today's match</p>
        <p className="mt-1 text-lg font-semibold">Echo found someone for you</p>
        <p className="mt-1 text-sm text-muted">You get one match a day, so take your time with it.</p>
        <span className="btn-primary mt-4">See today's match</span>
      </Link>
    );
  }
  if (decision === "passed") {
    return (
      <Link to="/today" className="card mt-4 block p-5">
        <p className="text-[13px] font-medium text-muted">Today's match</p>
        <p className="mt-1 font-semibold">You passed on {name} today.</p>
        <p className="mt-1 text-sm text-muted">Your next match arrives tomorrow. Changed your mind? You can bring {name} back.</p>
      </Link>
    );
  }
  return (
    <Link to={`/match/${matchId}`} className="card mt-4 block p-5">
      <p className="text-[13px] font-medium text-muted">Today's match</p>
      <p className="mt-1 font-semibold">
        {decision === "accepted" ? `You and ${name} matched.` : `You declined ${name}.`}
      </p>
      <p className="mt-1 text-sm text-muted">Your next match arrives tomorrow.</p>
    </Link>
  );
}
