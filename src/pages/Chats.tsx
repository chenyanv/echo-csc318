import { Link } from "react-router-dom";
import { Avatar } from "../components/ui/Avatar";
import { PageTitle } from "../components/ui/PageHeader";
import { getMatch } from "../data/profiles";
import { speakerModes } from "../state/reducer";
import { useStore } from "../state/store";

export default function Chats() {
  const { state } = useStore();
  const list = Object.values(state.connections).filter((c) => c.decision.kind === "accepted");

  return (
    <section>
      <PageTitle title="Chats" />
      {list.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="font-medium">No chats yet</p>
          <p className="mt-1 text-sm text-muted">Once you match with someone, you can chat with them here.</p>
          <Link to="/today" className="btn-primary mt-4">
            See today's match
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((c) => {
            const m = getMatch(c.matchId);
            const last = [...c.messages].reverse().find((x) => x.sender !== "system");
            const modes = speakerModes(c.echo);
            const echoOn = modes.me === "Echo" || modes.them === "Echo";
            const who =
              last?.sender === "me" ? "You: " : last?.sender === "myEcho" ? "Your Echo: " : last?.sender === "theirEcho" ? `${m.name}'s Echo: ` : "";
            return (
              <li key={c.matchId}>
                <Link to={`/chats/${c.matchId}`} className="card flex items-center gap-3 p-3 hover:shadow-sm">
                  <Avatar profile={m} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-medium">
                      {m.name}
                      {echoOn && <span className="rounded-full bg-echo-soft px-2 py-px text-[11px] font-medium text-echo">Echo chat on</span>}
                      {c.echo.kind === "invited" && c.echo.by === "them" && (
                        <span className="rounded-full bg-accent-soft px-2 py-px text-[11px] font-medium text-accent-strong">Request</span>
                      )}
                    </p>
                    <p className="truncate text-sm text-muted">{last ? who + last.text : "Say hi when you're ready"}</p>
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
