import { describe, expect, it } from "vitest";
import { isMatchNotified, reducer, speakerModes, todayMatchId, type Action } from "../reducer";
import { buildPreset } from "../presets";
import { UNDO_MS, type AppState } from "../types";

const T = 1_800_000_000_000;
const run = (s: AppState, ...actions: Action[]) => actions.reduce(reducer, s);
const alex = (s: AppState) => s.connections.alex;
const lastLine = (s: AppState) => alex(s).messages[alex(s).messages.length - 1]?.text;

describe("daily match decisions", () => {
  it("lets you undo 'Not for me' within 10 seconds, not after", () => {
    const s = run(buildPreset("t1", T), { type: "MATCH_PASS", matchId: "alex", now: T });
    expect(alex(s).decision.kind).toBe("passed");
    expect(alex(run(s, { type: "MATCH_UNDO", matchId: "alex", now: T + UNDO_MS - 1 })).decision.kind).toBe("pending");
    expect(alex(run(s, { type: "MATCH_UNDO", matchId: "alex", now: T + UNDO_MS })).decision.kind).toBe("passed");
  });

  it("only tells the match about a decline once the undo window closes", () => {
    const s = run(buildPreset("t2", T), { type: "MATCH_DECLINE", matchId: "alex", now: T });
    expect(isMatchNotified(alex(s).decision, T + 5_000)).toBe(false);
    expect(isMatchNotified(alex(s).decision, T + UNDO_MS)).toBe(true);
    const undone = run(s, { type: "MATCH_UNDO", matchId: "alex", now: T + 5_000 });
    expect(alex(undone).decision.kind).toBe("accepted");
  });

  it("can bring back a passed match from Recently passed at any time", () => {
    const s = run(buildPreset("t1", T), { type: "MATCH_PASS", matchId: "alex", now: T }, { type: "MATCH_RESTORE", matchId: "alex" });
    expect(alex(s).decision.kind).toBe("pending");
  });

  it("offers one match per day, in queue order", () => {
    const s = buildPreset("t1", T);
    expect(todayMatchId(s)).toBe("alex");
    expect(todayMatchId(run(s, { type: "ADVANCE_DAY" }))).toBe("jordan");
  });
});

describe("Echo chat needs both people to agree", () => {
  it("starts off, with both people typing as themselves", () => {
    expect(speakerModes(alex(buildPreset("t2", T)).echo)).toEqual({ me: "Human", them: "Human" });
  });

  it("doesn't turn on when only one side asks", () => {
    const s = run(buildPreset("t2", T), { type: "ECHO_INVITE", matchId: "alex", by: "me", now: T });
    expect(alex(s).echo).toEqual({ kind: "invited", by: "me" });
    // You can't accept your own invite.
    const self = run(s, { type: "ECHO_RESPOND", matchId: "alex", by: "me", accept: true, now: T });
    expect(alex(self).echo.kind).toBe("invited");
    // Echo messages are ignored until it's on.
    const ignored = run(s, { type: "ADD_ECHO_MESSAGE", matchId: "alex", sender: "myEcho", text: "hi", now: T });
    expect(alex(ignored).messages).toHaveLength(alex(s).messages.length);
  });

  it("turns on when the other side agrees, and each side can take over", () => {
    let s = run(
      buildPreset("t4", T),
      { type: "ECHO_RESPOND", matchId: "alex", by: "me", accept: true, now: T },
    );
    expect(speakerModes(alex(s).echo)).toEqual({ me: "Echo", them: "Echo" });

    s = run(s, { type: "ECHO_TAKEOVER", matchId: "alex", who: "me", now: T });
    expect(speakerModes(alex(s).echo)).toEqual({ me: "Human", them: "Echo" });
    expect(lastLine(s)).toBe("You joined. Your Echo is paused.");

    s = run(s, { type: "ECHO_TAKEOVER", matchId: "alex", who: "them", now: T });
    expect(alex(s).echo.kind).toBe("off");
  });

  it("treats typing your own message as joining", () => {
    const s = run(
      buildPreset("t4", T),
      { type: "ECHO_RESPOND", matchId: "alex", by: "me", accept: true, now: T },
      { type: "SEND_MESSAGE", matchId: "alex", text: "hey it's actually me", now: T },
    );
    expect(speakerModes(alex(s).echo).me).toBe("Human");
    const senders = alex(s).messages.slice(-2).map((m) => m.sender);
    expect(senders).toEqual(["system", "me"]);
  });

  it("declining keeps it off", () => {
    const s = run(buildPreset("t4", T), { type: "ECHO_RESPOND", matchId: "alex", by: "me", accept: false, now: T });
    expect(alex(s).echo.kind).toBe("off");
  });
});

describe("date planning", () => {
  const draft = (s: AppState) =>
    run(s, {
      type: "PLAN_UPDATE",
      matchId: "alex",
      patch: { activityId: "coffee", place: "Café on Harbord Street", date: "2026-12-01", time: "15:00" },
      now: T,
    });

  it("is only confirmed after the match accepts", () => {
    let s = run(draft(buildPreset("t3", T)), { type: "PLAN_SEND", matchId: "alex", now: T });
    expect(alex(s).plan?.status).toBe("sent");
    s = run(s, { type: "PLAN_THEIR_RESPONSE", matchId: "alex", response: "accept", now: T });
    expect(alex(s).plan?.status).toBe("confirmed");
  });

  it("handles a reschedule as a counter-offer you must accept", () => {
    let s = run(
      draft(buildPreset("t3", T)),
      { type: "PLAN_SEND", matchId: "alex", now: T },
      { type: "PLAN_THEIR_RESPONSE", matchId: "alex", response: "reschedule", now: T },
    );
    expect(alex(s).plan?.status).toBe("counter");
    expect(alex(s).plan?.time).toBe("15:00");
    s = run(s, { type: "PLAN_ACCEPT_COUNTER", matchId: "alex", now: T });
    expect(alex(s).plan).toMatchObject({ status: "confirmed", time: "17:00" });
  });

  it("can't edit a plan once it's been sent", () => {
    const sent = run(draft(buildPreset("t3", T)), { type: "PLAN_SEND", matchId: "alex", now: T });
    const s = run(sent, { type: "PLAN_UPDATE", matchId: "alex", patch: { time: "11:00" }, now: T });
    expect(alex(s).plan?.time).toBe("15:00");
  });
});

describe("human replies are scripted", () => {
  it("plays Alex's lines in order and stops at the end", () => {
    let s = buildPreset("t2", T);
    const start = alex(s).scriptIndex;
    s = run(s, { type: "RECEIVE_HUMAN_REPLY", matchId: "alex", now: T });
    expect(alex(s).scriptIndex).toBe(start + 1);
    expect(alex(s).messages.at(-1)?.sender).toBe("them");
    for (let i = 0; i < 20; i++) s = run(s, { type: "RECEIVE_HUMAN_REPLY", matchId: "alex", now: T });
    expect(alex(s).scriptIndex).toBe(6);
  });
});

describe("sharing Instagram", () => {
  it("is per side and only announced once", () => {
    let s = run(buildPreset("t5", T), { type: "SHARE_IG", matchId: "alex", who: "me", now: T });
    s = run(s, { type: "SHARE_IG", matchId: "alex", who: "me", now: T });
    expect(alex(s).igShared).toEqual({ me: true, them: false });
    expect(alex(s).messages.filter((m) => m.text.includes("Instagram"))).toHaveLength(1);
  });
});
