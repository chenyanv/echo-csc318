import { describe, expect, it } from "vitest";
import { getMatch, SAMPLE_USER } from "../data/profiles";
import { INVITE_RESPONSES } from "../data/scripts";
import { buildPreset } from "../state/presets";
import { reducer, type Action } from "../state/reducer";
import type { AppState } from "../state/types";
import { allowedActions, buildPrompt, checkDecision, pendingTrigger, scriptDecision, toActions, type Trigger } from "./agent";
import type { Mind } from "./persona";

const T = 1_800_000_000_000;
const alex = getMatch("alex");
const me = { ...SAMPLE_USER, name: "Sam" };
const run = (s: AppState, ...a: Action[]) => a.reduce(reducer, s);
const mind = (busy: string[]): Mind => ({ key: "k", texting: "short texts", mood: "keen", echoView: "curious", busy });
const settings = { echoInvite: "accept", dateInvite: "reschedule-then-accept" } as const;

function invited(time: string) {
  return run(
    buildPreset("t3", T),
    { type: "PLAN_UPDATE", matchId: "alex", patch: { activityId: "coffee", place: "Café on Harbord Street", date: "2026-12-01", time }, now: T },
    { type: "PLAN_SEND", matchId: "alex", now: T },
  ).connections.alex;
}

describe("what the simulated match responds to", () => {
  it("responds to your message, an Echo request, and a date invite", () => {
    let s = run(buildPreset("t2", T), { type: "SEND_MESSAGE", matchId: "alex", text: "hi", now: T });
    expect(pendingTrigger(s.connections.alex)?.kind).toBe("message");
    s = run(s, { type: "ECHO_INVITE", matchId: "alex", by: "me", now: T });
    expect(pendingTrigger(s.connections.alex)?.kind).toBe("echo_invite");
    expect(pendingTrigger(invited("15:00"))?.kind).toBe("date_invite");
  });

  it("does nothing when it's your turn", () => {
    const s = run(buildPreset("t2", T), { type: "RECEIVE_HUMAN_REPLY", matchId: "alex", text: "hey", now: T });
    expect(pendingTrigger(s.connections.alex)).toBeNull();
  });
});

describe("the rules stay in code", () => {
  it("can't accept a date at a time the match is busy", () => {
    const c = invited("15:00");
    const t = pendingTrigger(c)!;
    expect(allowedActions(t, c, mind(["15:00"]))).toEqual(["suggest_other_time", "decline_date"]);
    expect(allowedActions(t, c, mind(["19:00"]))).toContain("accept_date");
  });

  it("rejects actions that aren't allowed right now", () => {
    const c = invited("15:00");
    const raw = { thought: "sure", action: "accept_date" as const, message: "see you!" };
    expect(checkDecision(raw, ["suggest_other_time", "decline_date"], c, me, alex, mind(["15:00"]))).toBeNull();
  });

  it("only suggests a free time, and the text must name it", () => {
    const c = invited("15:00");
    const m = mind(["15:00"]);
    const d = checkDecision(
      { thought: "lab clash", action: "suggest_other_time", time: "15:00", message: "could we do 7pm?" },
      ["suggest_other_time", "decline_date"],
      c,
      me,
      alex,
      m,
    )!;
    expect(d.time).not.toBe("15:00");
    expect(d.message).toContain("Could we do");
    const [a] = toActions(d, c, T);
    expect(a).toMatchObject({ type: "PLAN_THEIR_RESPONSE", response: "reschedule", time: d.time });
  });

  it("never lets the match say it's an AI", () => {
    const c = run(buildPreset("t2", T), { type: "SEND_MESSAGE", matchId: "alex", text: "hi", now: T }).connections.alex;
    const d = checkDecision({ thought: "x", action: "reply", message: "As an AI, I enjoy climbing." }, ["reply"], c, me, alex, mind([]))!;
    expect(d.message).not.toMatch(/AI/);
  });

  it("replaces a text that doesn't do what the action says", () => {
    const c = invited("15:00");
    const d = checkDecision(
      { thought: "too soon", action: "decline_date" },
      ["accept_date", "suggest_other_time", "decline_date"],
      c,
      me,
      alex,
      mind([]),
      "I've got a ton of questions, what do you think about indie films?",
    )!;
    expect(d.message).toBe(INVITE_RESPONSES.decline);
    const ok = checkDecision({ thought: "", action: "decline_date" }, ["decline_date"], c, me, alex, mind([]), "can we keep chatting a bit longer first?")!;
    expect(ok.message).toBe("can we keep chatting a bit longer first?");
  });

  it("asking for Echo chat sends a text, then the request", () => {
    const c = run(buildPreset("t2", T), { type: "SEND_MESSAGE", matchId: "alex", text: "hi", now: T }).connections.alex;
    const kinds = toActions({ thought: "", action: "ask_for_echo_chat", message: "try Echo chat?" }, c, T).map((a) => a.type);
    expect(kinds).toEqual(["RECEIVE_HUMAN_REPLY", "ECHO_INVITE"]);
  });

  it("tells the model what happened and only lists allowed actions", () => {
    const c = invited("15:00");
    const t: Trigger = pendingTrigger(c)!;
    const prompt = buildPrompt(t, c, me, alex, mind(["15:00"]), ["suggest_other_time", "decline_date"]);
    const text = prompt.map((p) => p.content).join("\n");
    expect(text).toContain("Sam sent you a date invite");
    expect(text).toContain("busy that day at 3:00 pm");
    expect(text).not.toContain("- accept_date");
  });
});

describe("the script fallback", () => {
  it("matches the old fixed behaviour", () => {
    const c = invited("15:00");
    const d = scriptDecision(pendingTrigger(c)!, c, settings)!;
    const after = run({ ...buildPreset("t3", T), connections: { alex: c } }, ...toActions(d, c, T)).connections.alex;
    expect(after.plan?.status).toBe("counter");
    expect(after.plan?.counter?.time).toBe("17:00");
    expect(after.messages.at(-2)?.text).toBe(INVITE_RESPONSES.reschedule);
  });
});
