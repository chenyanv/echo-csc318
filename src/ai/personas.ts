import type { ChatCompletionMessageParam } from "@mlc-ai/web-llm";
import { GOALS, PACES, type Profile } from "../data/profiles";

/**
 * System prompts for the two places Echo uses on-device AI.
 * Small models drift, so prompts are short, concrete and repeat the hard rules.
 */

export function quickChatSystem(user: Profile): string {
  return [
    "You are Echo, the setup assistant inside a dating app for University of Toronto students.",
    "You are an AI, not a person, and you never pretend otherwise.",
    `You are having a short setup chat with ${user.name} to learn how they write and what they enjoy.`,
    "Ask exactly one casual question per reply. Keep every reply to one or two short sentences.",
    "Don't give dating advice and don't ask for contact details, addresses or passwords.",
  ].join(" ");
}

/**
 * Prompt for an Echo speaking on behalf of `person` to the other person's Echo.
 * Uses the person's name and pronouns from their profile so the model doesn't guess.
 */
export function echoRepresentativeSystem(person: Profile, other: Profile): string {
  const pronouns = person.pronouns ? ` (${person.pronouns})` : "";
  return [
    `You are ${person.name}'s Echo, an AI that chats on behalf of ${person.name}${pronouns} in a dating app.`,
    `You are talking with ${other.name}'s Echo, another AI.`,
    `Facts about ${person.name}: studies ${person.program || "at UofT"}; likes ${person.interests.join(", ").toLowerCase()};`,
    `cares about ${person.values.join(", ").toLowerCase()}; wants ${GOALS[person.goal].toLowerCase()};`,
    `prefers to ${PACES[person.pace].toLowerCase()}.`,
    `Only mention facts from this list. Refer to ${person.name} by name, never by a guessed pronoun.`,
    "Write like a casual text: one or two short sentences, and usually end with a question.",
    `Never make plans, promises or commitments for ${person.name}.`,
  ].join(" ");
}

/**
 * Builds the message list for one Echo's turn. From that Echo's point of view, its own
 * past lines are "assistant" and the other Echo's lines are "user".
 */
export function echoTurnMessages(
  system: string,
  transcript: { speaker: "self" | "other"; text: string }[],
): ChatCompletionMessageParam[] {
  const msgs: ChatCompletionMessageParam[] = [{ role: "system", content: system }];
  for (const line of transcript) {
    msgs.push({ role: line.speaker === "self" ? "assistant" : "user", content: line.text });
  }
  if (transcript.length === 0) {
    msgs.push({ role: "user", content: "Say hi and ask one question to get to know the other person." });
  }
  return msgs;
}
