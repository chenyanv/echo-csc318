import { useEffect } from "react";
import { INVITE_RESPONSES } from "../data/scripts";
import { useStore } from "./store";

/** How long the match "takes" to respond. */
const ECHO_ACCEPT_MS = 3000;
const INVITE_RESPONSE_MS = 4000;

/**
 * Plays the match's side of the story, app-wide, so responses arrive even if the
 * participant has moved to another screen.
 * - Agrees when asked to use Echo chat.
 * - The first date invite gets a reschedule (A3 task 3 includes handling one);
 *   any later invite is accepted.
 * The facilitator panel (M5) will be able to override these.
 */
export function ScriptedPartner() {
  const { state, dispatch } = useStore();

  const pendingEcho = Object.values(state.connections).filter((c) => c.echo.kind === "invited" && c.echo.by === "me");
  const pendingInvites = Object.values(state.connections).filter((c) => c.plan?.status === "sent");
  const echoKey = pendingEcho.map((c) => c.matchId).join(",");
  const inviteKey = pendingInvites.map((c) => `${c.matchId}@${c.plan?.updatedAt}`).join(",");

  useEffect(() => {
    if (!echoKey) return;
    const timers = echoKey.split(",").map((matchId) =>
      window.setTimeout(
        () => dispatch({ type: "ECHO_RESPOND", matchId, by: "them", accept: true, now: Date.now() }),
        ECHO_ACCEPT_MS,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [echoKey, dispatch]);

  useEffect(() => {
    if (!inviteKey) return;
    const timers = pendingInvites.map((c) => {
      const alreadyRescheduled = c.messages.some((m) => m.sender === "them" && m.text === INVITE_RESPONSES.reschedule);
      return window.setTimeout(
        () =>
          dispatch({
            type: "PLAN_THEIR_RESPONSE",
            matchId: c.matchId,
            response: alreadyRescheduled ? "accept" : "reschedule",
            now: Date.now(),
          }),
        INVITE_RESPONSE_MS,
      );
    });
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteKey, dispatch]);

  return null;
}
