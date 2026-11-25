import { useParams } from "react-router-dom";
import { BackButton } from "../components/ui/PageHeader";
import { MessageBubble } from "../components/chat/MessageBubble";
import { getMatch } from "../data/profiles";
import { useStore } from "../state/store";

/** Read-only chat until M3 builds the real conversation screen. */
export default function ChatPlaceholder() {
  const { id = "" } = useParams();
  const { state } = useStore();
  const conn = state.connections[id];
  const match = getMatch(id);
  return (
    <section>
      <BackButton to="/chats" label="Chats" />
      <h1 className="mt-3 text-xl font-semibold">{match.name}</h1>
      <div className="mt-6 space-y-4">
        {conn?.messages.map((m) => <MessageBubble key={m.id} message={m} matchName={match.name} />)}
      </div>
      <p className="card mt-8 border-dashed p-4 text-center text-sm text-muted">Sending messages and Echo chat arrive in M3.</p>
    </section>
  );
}
