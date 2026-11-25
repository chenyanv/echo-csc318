import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { generate, useEchoStatus } from "../../ai/useEcho";
import { quickChatSystem } from "../../ai/personas";
import { EchoSetupCard } from "../../components/EchoSetupCard";
import { MessageBubble } from "../../components/chat/MessageBubble";
import { BackButton } from "../../components/ui/PageHeader";
import { QUICK_CHAT_FALLBACK } from "../../data/scripts";
import { useStore } from "../../state/store";

/** After this many answers we offer to finish. People can always skip. */
const ANSWERS_TO_FINISH = 3;

export default function QuickChat() {
  const navigate = useNavigate();
  const { state, dispatch } = useStore();
  const ai = useEchoStatus();
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = state.quickChat.messages;
  const answers = messages.filter((m) => m.sender === "me").length;
  const echoTurns = messages.filter((m) => m.sender === "myEcho").length;
  const busy = pending !== null;
  const opener = `Hi ${state.me.name || "there"}! I'm Echo. This quick chat helps me learn how you talk. What do you usually do on a free afternoon?`;

  // Echo always opens with the same line so every participant starts the same way.
  // The ref stops StrictMode's double effect run from adding it twice.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || messages.length > 0) return;
    opened.current = true;
    dispatch({ type: "QUICK_CHAT_ADD", sender: "myEcho", text: opener, now: Date.now() });
  }, [dispatch, messages.length, opener]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, pending]);

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    dispatch({ type: "QUICK_CHAT_ADD", sender: "me", text, now: Date.now() });

    if (answers + 1 >= ANSWERS_TO_FINISH) {
      dispatch({
        type: "QUICK_CHAT_ADD",
        sender: "myEcho",
        text: "Thanks, that's really helpful. That's all I need for now. You can update your profile anytime.",
        demo: ai.phase !== "ready" || ai.demo,
        now: Date.now(),
      });
      return;
    }

    setPending("");
    const history = [...messages, { sender: "me" as const, text }];
    const reply = await generate(
      [
        { role: "system", content: quickChatSystem(state.me) },
        ...history.map((m) => ({ role: m.sender === "me" ? ("user" as const) : ("assistant" as const), content: m.text })),
      ],
      (soFar) => setPending(soFar),
    );
    setPending(null);
    const fallback = QUICK_CHAT_FALLBACK[Math.min(echoTurns, QUICK_CHAT_FALLBACK.length - 2)];
    dispatch({
      type: "QUICK_CHAT_ADD",
      sender: "myEcho",
      text: reply || fallback,
      demo: !reply,
      now: Date.now(),
    });
  }

  function finish() {
    dispatch({ type: "QUICK_CHAT_DONE" });
    dispatch({ type: "COMPLETE_ONBOARDING", profile: state.me });
    navigate("/", { replace: true });
  }

  const done = answers >= ANSWERS_TO_FINISH;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between">
        <BackButton to="/setup" />
        <button type="button" onClick={finish} className="min-h-11 px-2 text-[15px] font-medium text-muted hover:text-ink">
          Skip for now
        </button>
      </div>

      <header className="mt-2">
        <p className="text-[13px] font-medium text-echo">Last step · Setup chat</p>
        <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Chat with Echo</h1>
        <p className="mt-2 rounded-xl bg-echo-soft px-3 py-2 text-sm text-echo-strong">
          You're talking to Echo, an AI, not a person. Nothing here is shared with matches.
        </p>
      </header>

      <div className="mt-4">
        <EchoSetupCard />
      </div>

      <div className="mt-5 flex-1 space-y-4" aria-live="polite">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} echoLabel="Echo" echoOnLeft />
        ))}
        {pending !== null && <MessageBubble message={{ sender: "myEcho", text: pending }} echoLabel="Echo" echoOnLeft streaming />}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 -mx-5 mt-4 border-t border-line bg-canvas/95 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        {done ? (
          <button type="button" className="btn-primary w-full" onClick={finish}>
            Finish setup
          </button>
        ) : (
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input
              className="field flex-1"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Reply to Echo"
              aria-label="Reply to Echo"
              disabled={busy}
              maxLength={300}
            />
            <button className="btn-primary" disabled={busy || !draft.trim()}>
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
