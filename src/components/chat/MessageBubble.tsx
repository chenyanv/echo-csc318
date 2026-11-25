import type { ChatMessage } from "../../state/types";

/**
 * One message with a visible sender label (A2 finding 1: every message says who wrote it).
 * Human messages are coral or white; anything an Echo wrote is violet and labelled "AI".
 */
export function MessageBubble({
  message,
  matchName,
  echoLabel,
  echoOnLeft,
  streaming,
}: {
  message: Pick<ChatMessage, "sender" | "text" | "demo">;
  matchName?: string;
  /** Overrides the label for the participant's Echo (e.g. "Echo" in the setup chat). */
  echoLabel?: string;
  /** In the setup chat Echo is the other party, so its messages sit on the left. */
  echoOnLeft?: boolean;
  streaming?: boolean;
}) {
  const { sender, text, demo } = message;

  if (sender === "system") {
    return (
      <p className="mx-auto max-w-[90%] py-1 text-center text-[13px] leading-snug text-muted" role="note">
        {text}
      </p>
    );
  }

  const mine = sender === "me" || (sender === "myEcho" && !echoOnLeft);
  const isEcho = sender === "myEcho" || sender === "theirEcho";
  const label =
    sender === "me"
      ? "You"
      : sender === "them"
        ? matchName
        : sender === "myEcho"
          ? (echoLabel ?? "Your Echo")
          : `${matchName}'s Echo`;

  const bubble = isEcho
    ? `border border-echo/25 bg-echo-soft text-ink ${mine ? "rounded-br-md" : "rounded-bl-md"}`
    : mine
      ? "rounded-br-md bg-accent text-white"
      : "rounded-bl-md border border-line bg-surface text-ink";

  return (
    <div className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
      <span className={`mb-1 flex items-center gap-1.5 text-[12px] font-medium ${isEcho ? "text-echo" : "text-muted"}`}>
        {isEcho && <EchoDot />}
        {label}
        {isEcho && <span className="rounded bg-echo/10 px-1 py-px text-[10px] font-semibold tracking-wide">AI</span>}
        {demo && <span className="font-normal text-muted">· demo reply</span>}
      </span>
      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap ${bubble}`}>
        {text || (streaming ? <TypingDots /> : "")}
      </div>
    </div>
  );
}

function EchoDot() {
  return (
    <svg viewBox="0 0 12 12" className="size-3" aria-hidden="true">
      <path d="M3 6a3 3 0 0 1 3-3M1.5 6A4.5 4.5 0 0 1 6 1.5M6 9a3 3 0 0 0 3-3M6 10.5A4.5 4.5 0 0 0 10.5 6" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function TypingDots() {
  return (
    <span className="inline-flex gap-1 py-1" aria-label="Typing">
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-1.5 animate-bounce rounded-full bg-current opacity-50" style={{ animationDelay: `${i * 120}ms` }} />
      ))}
    </span>
  );
}
