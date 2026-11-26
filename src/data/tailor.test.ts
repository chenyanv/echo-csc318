import { describe, expect, it } from "vitest";
import { buildMatchReason } from "../lib/matchReason";
import { buildPreset } from "../state/presets";
import { reducer } from "../state/reducer";
import { BLANK_USER, SAMPLE_USER, getMatch, type Profile } from "./profiles";
import { matchFor, tailorMatch } from "./tailor";

const T = 1_800_000_000_000;
const me: Profile = {
  ...SAMPLE_USER,
  interests: ["Yoga", "Running", "Baking", "Thrifting"],
  values: ["Family", "Ambition"],
  goal: "casual",
  pace: "meet-soon",
};
const shared = <T,>(a: T[], b: T[]) => a.filter((x) => b.includes(x));

describe("matches built around the participant", () => {
  it("Alex shares two interests, one value and the goal, and keeps their own pace", () => {
    const alex = tailorMatch(getMatch("alex"), me);
    expect(shared(alex.interests, me.interests)).toEqual(["Yoga", "Running"]);
    expect(alex.interests).toHaveLength(5);
    expect(shared(alex.values, me.values)).toEqual(["Family"]);
    expect(alex.goal).toBe("casual");
    // Alex's scripted lines say they like to chat first, so that stays.
    expect(alex.pace).toBe("chat-first");
  });

  it("gives match reasons that are true for this participant, including a difference", () => {
    const r = buildMatchReason(me, tailorMatch(getMatch("alex"), me));
    expect(r.inCommon).toContain("You both listed yoga and running.");
    expect(r.inCommon).toContain("You both care about family.");
    expect(r.differences.some((d) => d.includes("Alex prefers to chat"))).toBe(true);
  });

  it("keeps interests the match's scripted lines rely on", () => {
    expect(tailorMatch(getMatch("jordan"), { ...me, interests: ["Yoga"] }).interests).toContain("Baking");
    expect(tailorMatch(getMatch("priya"), me).interests).toContain("Museums");
  });

  it("writes a bio and Sunday answer only from the match's own interests", () => {
    for (const id of ["alex", "jordan", "priya"]) {
      const m = tailorMatch(getMatch(id), me);
      expect(m.bio).not.toContain("undefined");
      expect(m.prompts.map((p) => p.a).join(" ")).not.toContain("undefined");
    }
    expect(tailorMatch(getMatch("alex"), me).bio).toContain("at a yoga class");
  });

  it("shows the match as written when there's nothing to build around", () => {
    expect(tailorMatch(getMatch("alex"), BLANK_USER)).toEqual(getMatch("alex"));
  });

  it("is the same every time for the same profile", () => {
    expect(tailorMatch(getMatch("alex"), me)).toEqual(tailorMatch(getMatch("alex"), me));
  });

  it("doesn't change mid-chat when the participant edits their profile", () => {
    let s = buildPreset("t1", T);
    s = reducer(s, { type: "MATCH_ACCEPT", matchId: "alex", now: T });
    const before = matchFor(s, "alex");
    s = reducer(s, { type: "UPDATE_PROFILE", patch: { interests: ["Video games"] } });
    expect(matchFor(s, "alex")).toEqual(before);
    // A match you haven't met yet follows your profile.
    expect(matchFor(s, "jordan").interests).toContain("Video games");
  });
});
