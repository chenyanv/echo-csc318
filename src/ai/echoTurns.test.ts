import { describe, expect, it } from "vitest";
import { echoTurnsSinceHuman, nextEchoSpeaker } from "./echoTurns";
import { bankQuestion, draftReply, echoFacts, nextFact, validateQuestion } from "./echoCompose";
import { reducer } from "../state/reducer";
import { buildPreset } from "../state/presets";
import { getMatch, SAMPLE_USER } from "../data/profiles";

const T = 1_800_000_000_000;
const alex = getMatch("alex");
const sam = { ...SAMPLE_USER, name: "Sam" };
const on = () =>
  reducer(buildPreset("t4", T), { type: "ECHO_RESPOND", matchId: "alex", by: "me", accept: true, now: T }).connections.alex;

describe("Echo turn taking", () => {
  it("is silent while Echo chat is off", () => {
    expect(nextEchoSpeaker(buildPreset("t2", T).connections.alex)).toBeNull();
  });

  it("alternates between the two Echoes, starting with the match's", () => {
    const c = on();
    expect(nextEchoSpeaker(c)).toBe("theirEcho");
    const after = { ...c, messages: [...c.messages, { id: "x", sender: "theirEcho" as const, text: "hi", at: T }] };
    expect(nextEchoSpeaker(after)).toBe("myEcho");
    expect(echoTurnsSinceHuman(after)).toBe(1);
  });

  it("stops for good once either person joins", () => {
    let s = reducer(buildPreset("t4", T), { type: "ECHO_RESPOND", matchId: "alex", by: "me", accept: true, now: T });
    s = reducer(s, { type: "ECHO_TAKEOVER", matchId: "alex", who: "me", now: T });
    expect(nextEchoSpeaker(s.connections.alex)).toBeNull();
    s = reducer(s, { type: "SEND_MESSAGE", matchId: "alex", text: "hey!", now: T });
    expect(nextEchoSpeaker(s.connections.alex)).toBeNull();
  });
});

describe("Help me reply", () => {
  it("only mentions an interest you really share, then asks a question", () => {
    const shared = alex.interests.find((i) => sam.interests.includes(i));
    const d = draftReply(sam, alex, []);
    if (shared) {
      expect(d.opening).toBe(`I saw you're into ${shared.toLowerCase()} too!`);
    } else {
      expect(d.opening).toBe("");
    }
    expect(d.question).toMatch(/\?$/);
  });

  it("doesn't repeat a shared interest you already brought up", () => {
    const shared = alex.interests.find((i) => sam.interests.includes(i));
    if (!shared) return;
    expect(draftReply(sam, alex, [`I love ${shared} too`]).opening).not.toContain(shared.toLowerCase());
  });
});

describe("what an Echo says about its person", () => {
  it("only states facts from the profile, by name, with no guessed pronouns", () => {
    const facts = echoFacts(sam).map((f) => f.statement);
    expect(facts).toContain("Sam is really into hiking.");
    expect(facts).toContain("Sam is looking for a long-term relationship.");
    expect(facts).toContain("Honest communication matters a lot to Sam.");
    expect(facts).toContain("Sam likes to chat for a while before meeting.");
    for (const f of facts) expect(f).not.toMatch(/\b(he|she|they|his|her|their|them)\b/i);
  });

  it("says so when the other side mentions a shared interest", () => {
    expect(nextFact(sam, 3, "Alex is really into indie music.").statement).toBe("Sam is into indie music too!");
  });

  it("doesn't bounce a shared interest back and forth", () => {
    expect(nextFact(sam, 3, "Alex is into indie music too!").statement).not.toContain("too!");
    const past = ["Sam is into indie music too! What does Alex like to do for fun?"];
    expect(nextFact(sam, 3, "Alex is really into indie music.", past).statement).not.toContain("indie music");
  });

  it("cycles through the facts in order", () => {
    const n = echoFacts(sam).length;
    expect(nextFact(sam, 0).statement).toBe(nextFact(sam, n).statement);
  });

  it("has a safe question for every kind of fact", () => {
    for (const f of echoFacts(sam)) {
      const q = bankQuestion(f, alex);
      expect(q).toMatch(/\?$/);
      expect(q).toContain("Alex");
    }
  });
});

describe("validating the model's question", () => {
  it("allows 'you' only when talking to the person directly", () => {
    expect(validateQuestion("What kind of coffee do you like?", alex, sam, true)).toBe("What kind of coffee do you like?");
    expect(validateQuestion("What kind of coffee does Sam like?", alex, sam, true)).toBeNull();
    expect(bankQuestion(echoFacts(alex)[0], sam, 0, true)).toBe("Are you into bouldering too?");
  });

  it("keeps a single short question about the other person", () => {
    expect(validateQuestion('"What kind of music is Alex into lately?"', sam, alex)).toBe("What kind of music is Alex into lately?");
    expect(validateQuestion("That's cool. What does Alex do for fun? Also hi", sam, alex)).toBe("What does Alex do for fun?");
  });

  it("rejects anything that speaks as or about the represented person", () => {
    expect(validateQuestion("I love hiking too, do you?", sam, alex)).toBeNull();
    expect(validateQuestion("Does Alex know Sam loves poetry?", sam, alex)).toBeNull();
    expect(validateQuestion("Sam really likes hiking.", sam, alex)).toBeNull();
    expect(validateQuestion("Why?", sam, alex)).toBeNull();
    expect(validateQuestion("Are you a thrill-seeker?", sam, alex)).toBeNull();
    // Seen on the live site: the model guessed a pronoun.
    expect(validateQuestion("How does Alex get their coffee fix?", sam, alex)).toBeNull();
    expect(validateQuestion("What does Alex like about his job?", sam, alex)).toBeNull();
    expect(validateQuestion("What's the best café near campus?", sam, alex)).toBeNull();
  });
});
