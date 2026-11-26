import { useEffect, useRef } from "react";
import { canUseModel, generate, generateJson, useEchoStatus } from "../ai/useEcho";
import { getMatch } from "../data/profiles";
import { useFacilitatorSettings } from "../state/facilitator";
import { useStore } from "../state/store";
import type { Connection } from "../state/types";
import {
  allowedActions,
  buildPrompt,
  checkDecision,
  cleanMessage,
  messagePrompt,
  NEEDS_MESSAGE,
  decisionSchema,
  freeTimes,
  pendingTrigger,
  scriptDecision,
  toActions,
  type Decision,
  type Trigger,
} from "./agent";
import { mindFor } from "./persona";
import { addSimLog, setPartnerTyping } from "./simStores";

/** How long before the match reacts, so it feels like a person picking up their phone. */
const DELAY_MS: Record<Trigger["kind"], number> = {
  message: 700,
  echo_invite: 2500,
  echo_running: 400,
  date_invite: 3000,
  ig_shared: 1500,
};
/** Minimum "typing…" time before a message appears. */
const MIN_TYPING_MS = 1800;

/**
 * Plays the match's side, app-wide, so they respond even when the participant is on
 * another screen. In Simulator mode the on-device LLM decides each step (see agent.ts);
 * in Script mode, or when the model can't run, the fixed script does.
 */
export function Partner() {
  const { state, dispatch } = useStore();
  const settings = useFacilitatorSettings();
  const ai = useEchoStatus();
  const stateRef = useRef(state);
  stateRef.current = state;
  /** Trigger keys already being handled, so each situation gets one response. */
  const handled = useRef(new Set<string>());

  const pending = Object.values(state.connections)
    .map((c) => ({ c, t: pendingTrigger(c) }))
    .filter((x): x is { c: Connection; t: Trigger } => x.t !== null);
  const pendingKey = pending.map((x) => x.t.key).join("|");
  const modelReady = ai.phase === "ready" && !ai.demo;

  useEffect(() => {
    const timers: number[] = [];
    const scheduled: string[] = [];
    for (const { c, t } of pending) {
      if (handled.current.has(t.key)) continue;
      handled.current.add(t.key);
      scheduled.push(t.key);
      timers.push(
        window.setTimeout(() => {
          scheduled.splice(scheduled.indexOf(t.key), 1);
          void respond(c.matchId, t);
        }, DELAY_MS[t.kind]),
      );
    }
    return () => {
      timers.forEach(clearTimeout);
      // Timers that never fired can be scheduled again (React StrictMode re-runs effects).
      scheduled.forEach((k) => handled.current.delete(k));
    };
    // pending is derived from pendingKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingKey, settings.partner, settings.echoInvite, settings.dateInvite, modelReady]);

  async function respond(matchId: string, trigger: Trigger) {
    const c = stateRef.current.connections[matchId];
    if (!c || c.decision.kind !== "accepted") return;
    // "Wait for me": the facilitator plays these moments by hand, in either mode.
    if (trigger.kind === "echo_invite" && settings.echoInvite === "manual") return;
    if (trigger.kind === "date_invite" && settings.dateInvite === "manual") return;
    const me = stateRef.current.me;
    const match = getMatch(matchId);
    const started = Date.now();
    const typing = trigger.kind === "message" || trigger.kind === "ig_shared";

    let decision: Decision | null = null;
    let source: "model" | "script" = "script";
    let note: string | undefined;

    if (settings.partner === "simulator" && canUseModel()) {
      const mind = mindFor(matchId, c.decision.at);
      const allowed = allowedActions(trigger, c, mind);
      if (typing) setPartnerTyping(matchId, true);
      // Step 1 (reason + act): pick an allowed action.
      const raw = await generateJson<Partial<Decision>>(
        buildPrompt(trigger, c, me, match, mind, allowed),
        decisionSchema(allowed, freeTimes(mind, c.plan?.time)),
        160,
        0.9,
      );
      const picked = checkDecision(raw, allowed, c, me, match, mind);
      // Step 2: write the text for that action.
      let written: string | null = null;
      if (picked && NEEDS_MESSAGE.includes(picked.action)) {
        written = await generate(messagePrompt(picked, c, me, match, mind), undefined, 60, 0.8);
      }
      decision = picked && checkDecision(raw, allowed, c, me, match, mind, written);
      if (decision && written && decision.message !== cleanMessage(written, me, match, c)) {
        note = "The model's text couldn't be used, so a scripted line was sent.";
      }
      if (decision) source = "model";
      else note = "The model's answer couldn't be used, so the script decided.";
    } else if (settings.partner === "simulator") {
      note = "On-device AI isn't loaded, so the script decided.";
    }

    if (!decision) {
      decision = scriptDecision(trigger, c, settings);
      if (decision && typing) setPartnerTyping(matchId, true);
    }

    if (!decision) {
      setPartnerTyping(matchId, false);
      return;
    }

    if (typing) {
      const wait = MIN_TYPING_MS - (Date.now() - started);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    }
    setPartnerTyping(matchId, false);

    // Only act if nothing changed while the match was thinking.
    const now = stateRef.current.connections[matchId];
    if (!now || pendingTrigger(now)?.key !== trigger.key) return;

    addSimLog({ at: Date.now(), matchId, trigger: trigger.kind, thought: decision.thought, action: decision.action, message: decision.message, source, note });
    for (const a of toActions(decision, now, Date.now())) dispatch(a);
  }

  return null;
}
