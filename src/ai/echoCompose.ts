import type { ChatCompletionMessageParam } from "@mlc-ai/web-llm";
import { GOAL_SENTENCES, interestPhrase, type Profile } from "../data/profiles";

/**
 * How an Echo turn is written.
 *
 * In testing, Llama 3.2 1B invented details whenever it described a person (a favourite
 * band, "poetry", family), even when told to share one fact. That is exactly the
 * misrepresentation A1 respondents feared (16/20). So:
 *   - every statement about a person is templated from their real profile facts;
 *   - the model only writes the follow-up question, which can't misstate anything;
 *   - the question is validated, with a question bank as a fallback.
 */

export type FactKind = "interest" | "goal" | "value" | "pace";

export interface EchoFact {
  kind: FactKind;
  /** The profile value, e.g. "Hiking". */
  value: string;
  /** A true, natural sentence about the person. */
  statement: string;
  /** True when reacting to an interest the other side just mentioned. */
  shared?: boolean;
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function echoFacts(person: Profile): EchoFact[] {
  const n = person.name;
  return [
    ...person.interests.map((i) => ({ kind: "interest" as const, value: i, statement: `${n} is really into ${interestPhrase(i)}.` })),
    { kind: "goal", value: person.goal, statement: GOAL_SENTENCES[person.goal].about(n) },
    ...person.values.map((v) => ({ kind: "value" as const, value: v, statement: `${lower(v).replace(/^./, (c) => c.toUpperCase())} matters a lot to ${n}.` })),
    {
      kind: "pace",
      value: person.pace,
      statement: person.pace === "chat-first" ? `${n} likes to chat for a while before meeting.` : `${n} would rather meet fairly soon than text for weeks.`,
    },
  ];
}

/**
 * Picks what to share this turn. If the other side just mentioned an interest this person
 * also has, say so ("Sam is into that too!"); otherwise go through the facts in order.
 */
export function nextFact(person: Profile, turnIndex: number, lastFromOther?: string, ownPast: string[] = []): EchoFact {
  const said = (lastFromOther ?? "").toLowerCase();
  const mine = ownPast.join(" ").toLowerCase();
  // React only to an interest the other side newly stated ("is really into X"),
  // and only once, so the two Echoes don't bounce "too!" back and forth.
  const shared = person.interests.find(
    (i) => said.includes(`really into ${interestPhrase(i)}`) && !mine.includes(interestPhrase(i)),
  );
  if (shared) {
    return { kind: "interest", value: shared, statement: `${person.name} is into ${interestPhrase(shared)} too!`, shared: true };
  }
  // Skip facts this Echo has already shared (e.g. one it reacted to with "too!").
  const facts = echoFacts(person);
  for (let k = 0; k < facts.length; k++) {
    const f = facts[(turnIndex + k) % facts.length];
    if (f.kind !== "interest" || !mine.includes(interestPhrase(f.value))) return f;
  }
  return facts[turnIndex % facts.length];
}

/** Safe follow-up questions about the other person, used when the model's question fails checks. */
export function bankQuestion(fact: EchoFact, other: Profile, variant = 0, direct = false): string {
  if (direct) {
    // Talking to the person themself (they joined), so "you" is clear.
    const bank: Record<FactKind, string[]> = {
      interest: fact.shared
        ? ["What else are you into?", "What's something you've been enjoying lately?"]
        : [`Are you into ${interestPhrase(fact.value)} too?`, "What do you like to do for fun?", "What does a good weekend look like for you?"],
      goal: ["What are you hoping to find on here?", "What kind of connection are you looking for?"],
      value: ["What matters most to you in a relationship?", "What's a green flag for you?", "What do you value in the people you're close to?"],
      pace: ["How do you feel about meeting up?", "Do you like to text a lot, or meet sooner?"],
    };
    const options = bank[fact.kind];
    return options[variant % options.length];
  }
  const o = other.name;
  if (fact.shared) {
    return [`What else is ${o} into?`, `How did ${o} get into ${interestPhrase(fact.value)}?`][variant % 2];
  }
  const bank: Record<FactKind, string[]> = {
    interest: [`Is ${o} into ${interestPhrase(fact.value)} too?`, `What does ${o} like to do for fun?`, `What does a good weekend look like for ${o}?`],
    goal: [`What is ${o} hoping to find on here?`, `What kind of connection is ${o} looking for?`],
    value: [`What matters most to ${o} in a relationship?`, `What's a green flag for ${o}?`, `What does ${o} value most in a friend?`],
    pace: [`How does ${o} feel about meeting up?`, `Does ${o} like to text a lot or meet sooner?`],
  };
  const options = bank[fact.kind];
  return options[variant % options.length];
}

const OPENERS = ["Nice!", "Love that.", "Oh, fun.", "Good to know.", "That's great."];

/** Short acknowledgement of the other side's last message, so turns read like a conversation. */
export function acknowledgement(turnIndex: number, hasPrevious: boolean, offset = 0): string {
  return hasPrevious ? OPENERS[(turnIndex * 2 + offset) % OPENERS.length] + " " : "Hi! ";
}

/**
 * What the person typed in the setup chat, used only as a tone sample for their Echo's
 * wording. The validator still blocks any statement about them, so nothing here can be
 * repeated as a fact.
 */
export function toneSamples(texts: string[]): string[] {
  return texts
    .map((t) => t.trim().replace(/\s+/g, " "))
    .filter((t) => t.length >= 2)
    .slice(0, 3)
    .map((t) => (t.length > 140 ? t.slice(0, 140) + "…" : t));
}

/** Prompt that asks the model for one follow-up question and nothing else. */
export function questionPrompt(
  speakerFor: Profile,
  other: Profile,
  statement: string,
  lastFromOther?: string,
  direct = false,
  /** How the represented person texts (from the setup chat), for tone only. */
  tone: string[] = [],
): ChatCompletionMessageParam[] {
  return [
    {
      role: "system",
      content: [
        `Write one short, friendly question that ${speakerFor.name}'s AI assistant asks in a dating app chat, to learn about ${other.name}.`,
        `It comes right after this sentence: "${statement}"`,
        direct
          ? `You are talking to ${other.name} directly, so address them as "you". Do not say anything about ${speakerFor.name}.`
          : `Ask about ${other.name}, using the name "${other.name}". Do not say anything about ${speakerFor.name}.`,
        tone.length
          ? `Match the tone of how ${speakerFor.name} texts (casual or formal, short or long). Tone only: don't mention anything from these. ${tone.map((t) => `"${t}"`).join(" / ")}`
          : "",
        "Reply with the question only, under 15 words. No quotes, no emojis.",
      ]
        .filter(Boolean)
        .join(" "),
    },
    { role: "user", content: lastFromOther ? `The last message was: "${lastFromOther}"` : "Write the question." },
  ];
}

/**
 * Accepts the model's question only if it's a single short question that doesn't speak
 * as or about the represented person. Returns the cleaned question or null.
 */
export function validateQuestion(raw: string, speakerFor: Profile, other: Profile, direct = false): string | null {
  let q = raw.trim().replace(/^["'“”]+|["'“”]+$/g, "").split("\n")[0].trim();
  // Keep only the first question if the model wrote more than one sentence.
  const firstQ = q.indexOf("?");
  if (firstQ === -1) return null;
  q = q.slice(0, firstQ + 1);
  const lastStop = Math.max(q.lastIndexOf(". "), q.lastIndexOf("! "));
  if (lastStop !== -1) q = q.slice(lastStop + 2);
  const words = q.split(/\s+/).length;
  if (words < 3 || words > 18) return null;
  if (/\b(I|I'm|I've|me|my|mine|we|our)\b/.test(q)) return null;
  // Never guess anyone's pronouns: use names instead.
  if (/\b(he|she|they|him|her|them|his|hers|their|theirs|himself|herself|themself|themselves)\b/i.test(q)) return null;
  // "you" is ambiguous when the other side might be an Echo, so the question must name the person.
  if (!direct) {
    if (/\b(you|your|you're|yours)\b/i.test(q)) return null;
    if (!new RegExp(`\\b${other.name}\\b`).test(q)) return null;
  } else if (!/\b(you|your)\b/i.test(q)) {
    return null;
  }
  // (An empty name would match everything, so only check a real one.)
  if (speakerFor.name.trim() && new RegExp(`\\b${speakerFor.name}\\b`, "i").test(q)) return null;
  return q.charAt(0).toUpperCase() + q.slice(1);
}

/**
 * "Help me reply" in a direct chat: Echo drafts, the person edits and sends it themself.
 * Same rule as Echo turns: nothing about anyone is invented. The draft only mentions an
 * interest the two really share (from both profiles) and asks the match a question.
 */
/** `mySidePast`: what you and your Echo have already said in this chat. */
export function draftReply(me: Profile, match: Profile, mySidePast: string[]): { opening: string; topic: string; question: string } {
  const said = mySidePast.join(" ").toLowerCase();
  const shared = match.interests.find((i) => me.interests.includes(i) && !said.includes(i.toLowerCase()));
  if (shared) {
    return {
      opening: `I saw you're into ${interestPhrase(shared)} too!`,
      topic: `${me.name} and ${match.name} are both into ${interestPhrase(shared)}.`,
      question: `How did you get into ${interestPhrase(shared)}?`,
    };
  }
  const facts = echoFacts(match);
  const f = facts[mySidePast.length % facts.length];
  const question: Record<FactKind, string> = {
    interest: `How did you get into ${interestPhrase(f.value)}?`,
    goal: "What are you hoping to find on here?",
    value: "What matters most to you in a relationship?",
    pace: "How do you feel about meeting up?",
  };
  return { opening: "", topic: f.statement, question: question[f.kind] };
}
