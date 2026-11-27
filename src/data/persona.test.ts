import { describe, expect, it } from "vitest";
import { bankQuestion, draftReply, echoFacts, nextFact } from "../ai/echoCompose";
import { buildMatchReason } from "../lib/matchReason";
import { HUMAN_REPLIES } from "../data/scripts";
import { GOALS, INTERESTS, MATCHES, PACES, SAMPLE_USER, VALUES, type Goal, type Pace, type Profile } from "./profiles";
import { tailorMatch } from "./tailor";

/**
 * Sweeps many participant profiles (every goal and pace, 3–6 interests, 1–3 values) and
 * checks that every line a match card or chat can show reads well and fits the match.
 */

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    return seed / 2 ** 32;
  };
}

function makeUsers(n: number): Profile[] {
  const r = rng(42);
  const pick = <T,>(xs: readonly T[], k: number) => [...xs].sort(() => r() - 0.5).slice(0, k);
  const users: Profile[] = [];
  for (let k = 0; k < n; k++) {
    users.push({
      ...SAMPLE_USER,
      name: "Sam",
      interests: pick(INTERESTS, 3 + Math.floor(r() * 4)),
      values: pick(VALUES, 1 + Math.floor(r() * 3)),
      goal: (Object.keys(GOALS) as Goal[])[k % 3],
      pace: (Object.keys(PACES) as Pace[])[Math.floor(k / 3) % 2],
    });
  }
  return users;
}

/** Problems a sentence shouldn't have. Returns what's wrong, or null. */
function languageProblem(text: string): string | null {
  if (/undefined|null|NaN|\[object/.test(text)) return "placeholder leaked";
  if (/ {2}|\s[.,!?]/.test(text)) return "spacing";
  if (!/[.!?)]$/.test(text.trim())) return "no ending punctuation";
  if (/\blooking for (open|a something)\b/i.test(text)) return "goal grammar";
  if (/\binto coffee spots\b/i.test(text)) return "awkward 'into coffee spots'";
  if (/\b(\w+) \1\b/i.test(text)) return "repeated word";
  // "Someone with their own…" is about nobody in particular; anything else must use names.
  if (!/^Someone\b/.test(text) && /\b(he|she|they|him|her|them|his|their)\b/i.test(text)) return "guessed pronoun";
  return null;
}

const users = makeUsers(300);

describe("match cards and chats across 300 participant profiles", () => {
  it("every match has five interests and three values, including the planned overlap", () => {
    for (const me of users) {
      for (const base of MATCHES) {
        const m = tailorMatch(base, me);
        expect(new Set(m.interests).size).toBe(5);
        expect(new Set(m.values).size).toBe(3);
        const shared = m.interests.filter((i) => me.interests.includes(i)).length;
        expect(shared).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("the bio and Sunday answer only mention the match's own interests, without repeating", () => {
    const DOING_WORDS: Record<string, RegExp> = {
      Hiking: /trail/, Bouldering: /climbing gym/, "Indie music": /indie music/, "Indie films": /indie film/,
      Cooking: /cooking/, "Coffee spots": /flat white/, "Board games": /board games/, Reading: /buried in a book/,
      Running: /run\b/, Museums: /museum/, Photography: /photos/, "Live music": /live show/, Baking: /baking/,
      "Video games": /video games/, Yoga: /yoga/, Thrifting: /thrifting/,
    };
    for (const me of users) {
      for (const base of MATCHES) {
        const m = tailorMatch(base, me);
        const sunday = m.prompts.find((p) => p.q === "A perfect Sunday")!.a;
        for (const text of [m.bio, sunday]) {
          const mentioned = Object.entries(DOING_WORDS).filter(([, re]) => re.test(text)).map(([i]) => i);
          for (const i of mentioned) expect(m.interests, `${m.name}: "${text}"`).toContain(i);
        }
        const bioMentions = Object.entries(DOING_WORDS).filter(([, re]) => re.test(m.bio)).map(([i]) => i);
        expect(new Set(bioMentions).size, m.bio).toBe(2);
      }
    }
  });

  it("every line on the card and in the chat reads cleanly", () => {
    const problems = new Set<string>();
    for (const me of users) {
      for (const base of MATCHES) {
        const m = tailorMatch(base, me);
        const r = buildMatchReason(me, m);
        const lines = [
          m.bio,
          ...m.prompts.map((p) => p.a),
          ...r.inCommon,
          ...r.differences,
          ...echoFacts(m).map((f) => f.statement),
          ...echoFacts(me).map((f) => f.statement),
          ...echoFacts(m).flatMap((f) => [0, 1, 2].map((v) => bankQuestion(f, me, v))),
          ...echoFacts(me).flatMap((f) => [0, 1, 2].map((v) => bankQuestion(f, m, v, true))),
        ];
        const reaction = nextFact(me, 0, echoFacts(m)[0].statement);
        lines.push(reaction.statement, bankQuestion(reaction, m, 0), bankQuestion(reaction, m, 1));
        const d = draftReply(me, m, []);
        lines.push([d.opening, d.question].filter(Boolean).join(" "));
        for (const line of lines) {
          const p = languageProblem(line);
          if (p) problems.add(`${p}: ${line}`);
        }
      }
    }
    expect([...problems]).toEqual([]);
  });

  it("the match's card agrees with what their scripted lines say", () => {
    for (const me of users) {
      // Alex says "I'd rather talk for a bit first", so Alex always likes to chat first.
      expect(tailorMatch(MATCHES[0], me).pace).toBe("chat-first");
      // Jordan's lines mention baking; Priya's mention the AGO.
      expect(tailorMatch(MATCHES[1], me).interests).toContain("Baking");
      expect(tailorMatch(MATCHES[2], me).interests).toContain("Museums");
    }
    // Scripted lines don't claim anything about the participant.
    for (const lines of Object.values(HUMAN_REPLIES)) {
      for (const l of lines) expect(l).not.toMatch(/\byou (like|love|listed|'re into)\b/i);
    }
  });

  it("the match's Echo reacts to a shared interest once, in plain words", () => {
    const me = { ...SAMPLE_USER, interests: ["Coffee spots", "Yoga", "Running"] } as Profile;
    const alex = tailorMatch(MATCHES[0], me);
    const said = echoFacts(alex).find((f) => f.value === "Coffee spots")!.statement;
    expect(said).toBe("Alex is really into finding good coffee spots.");
    expect(nextFact(me, 3, said).statement).toBe("Sam is into finding good coffee spots too!");
  });

  it("reads cleanly with interests and values typed under Other", () => {
    const mixed = { ...SAMPLE_USER, name: "Sam", interests: ["Pottery", "Hiking", "Salsa dancing"], values: ["Loyalty", "Kindness"] } as Profile;
    const onlyOwn = { ...SAMPLE_USER, name: "Sam", interests: ["Pottery", "Salsa dancing", "Chess"], values: ["Loyalty"] } as Profile;
    for (const me of [mixed, onlyOwn]) {
      for (const base of MATCHES) {
        const m = tailorMatch(base, me);
        expect(new Set(m.interests).size).toBe(5);
        expect(m.interests.filter((i) => me.interests.includes(i)).length).toBeGreaterThanOrEqual(1);
        const r = buildMatchReason(me, m);
        const d = draftReply(me, m, []);
        const lines = [m.bio, ...m.prompts.map((p) => p.a), ...r.inCommon, ...r.differences, ...echoFacts(me).map((f) => f.statement), [d.opening, d.question].filter(Boolean).join(" ")];
        for (const line of lines) expect(languageProblem(line), line).toBeNull();
      }
    }
    // Listed interests are shared first, so the bio uses a natural phrase.
    expect(tailorMatch(MATCHES[1], mixed).bio).toContain("out on a trail");
    expect(tailorMatch(MATCHES[0], onlyOwn).bio).toContain("busy with pottery");
  });
});
