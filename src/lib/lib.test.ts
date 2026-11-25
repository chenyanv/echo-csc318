import { describe, expect, it } from "vitest";
import { buildMatchReason } from "./matchReason";
import { buildIcs } from "./ics";
import { getMatch, SAMPLE_USER } from "../data/profiles";

describe("match reasons", () => {
  it("only states facts both profiles contain", () => {
    const r = buildMatchReason(SAMPLE_USER, getMatch("alex"));
    expect(r.sharedInterests).toEqual(["Indie music", "Coffee spots", "Indie films"]);
    expect(r.inCommon).toContain("You both listed indie music, coffee spots and indie films.");
    expect(r.inCommon).toContain("You're both looking for a long-term relationship.");
    expect(r.differences).toEqual([]);
    expect(r.unknown.length).toBeGreaterThan(0);
  });

  it("calls out differences instead of hiding them", () => {
    const r = buildMatchReason(SAMPLE_USER, getMatch("jordan"));
    expect(r.differences.join(" ")).toMatch(/Jordan said "Open to seeing where it goes"/);
    expect(r.differences.join(" ")).toMatch(/Jordan prefers to meet fairly soon/);
  });
});

describe("calendar export", () => {
  it("writes a valid event with escaped text", () => {
    const ics = buildIcs(
      {
        uid: "alex-1",
        title: "Coffee with Alex",
        location: "Café on Harbord Street, Toronto",
        description: "Planned on Echo; see you there",
        date: "2026-12-01",
        time: "15:00",
        durationMin: 60,
      },
      new Date("2026-11-25T12:00:00Z"),
    );
    expect(ics).toContain("DTSTART:20261201T150000");
    expect(ics).toContain("DTEND:20261201T160000");
    expect(ics).toContain("LOCATION:Café on Harbord Street\\, Toronto");
    expect(ics).toContain("DESCRIPTION:Planned on Echo\; see you there");
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
  });
});
