import type { ChatMessage, Connection } from "../state/types";

export type EchoSpeaker = "myEcho" | "theirEcho";

/** Echo-to-Echo turns before the Echoes pause so the people can catch up. */
export const ECHO_TURNS_PER_ROUND = 6;

function spoken(c: Connection): ChatMessage[] {
  return c.messages.filter((m) => m.sender !== "system");
}

/**
 * Decides which Echo (if any) should speak next.
 * - Both Echoes active: they take turns, starting with the match's Echo.
 * - Only the match's Echo active (you joined): it replies when you've said something.
 * - Only your Echo active (the match joined): it replies when the match has said something.
 */
export function nextEchoSpeaker(c: Connection): EchoSpeaker | null {
  if (c.echo.kind !== "on") return null;
  const last = spoken(c).at(-1)?.sender;
  const { myEchoActive, theirEchoActive } = c.echo;
  if (myEchoActive && theirEchoActive) return last === "theirEcho" ? "myEcho" : "theirEcho";
  if (theirEchoActive && last === "me") return "theirEcho";
  if (myEchoActive && last === "them") return "myEcho";
  return null;
}

/** Echo messages since the last thing a person typed (or since Echo chat started). */
export function echoTurnsSinceHuman(c: Connection): number {
  let n = 0;
  for (let i = c.messages.length - 1; i >= 0; i--) {
    const m = c.messages[i];
    if (m.sender === "me" || m.sender === "them") break;
    if (m.sender === "system" && m.text.startsWith("Echo chat is on")) break;
    if (m.sender === "myEcho" || m.sender === "theirEcho") n++;
  }
  return n;
}
