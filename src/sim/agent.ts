import type { ChatCompletionMessageParam } from "@mlc-ai/web-llm";
import { echoTurnsSinceHuman } from "../ai/echoTurns";
import { GOAL_SENTENCES, type Profile } from "../data/profiles";
import { TIMES, getActivity } from "../data/planner";
import { HUMAN_REPLIES, INVITE_RESPONSES } from "../data/scripts";
import { formatDate, formatTime } from "../lib/format";
import type { Action } from "../state/reducer";
import type { Connection } from "../state/types";
import type { Mind } from "./persona";

/**
 * A user simulator for the match (e.g. Alex), run as one ReAct-style step per event:
 * observe what just happened, think in one sentence, then pick ONE action from the
 * actions that make sense right now. The app's rules stay in code: the model can only
 * choose among allowed actions, and hard facts (like Alex's busy times) narrow the
 * choices before the model sees them.
 *
 * The simulator plays a PERSON. It never speaks as the match's Echo; Echo turns are
 * produced separately (see echoCompose.ts).
 */

export type TriggerKind = "message" | "echo_invite" | "echo_running" | "date_invite" | "ig_shared";

export interface Trigger {
  kind: TriggerKind;
  /** Changes whenever the situation changes, so each situation is handled once. */
  key: string;
}

export type SimAction =
  | "reply"
  | "ask_for_echo_chat"
  | "share_instagram"
  | "accept_echo_chat"
  | "decline_echo_chat"
  | "keep_watching"
  | "join_chat"
  | "accept_date"
  | "suggest_other_time"
  | "decline_date";

export interface Decision {
  thought: string;
  action: SimAction;
  message?: string;
  time?: string;
}

/** Turns of Echo chat after which the match considers joining. */
export const JOIN_CHECK_AT = 4;

const ACTION_HELP: Record<SimAction, string> = {
  reply: "Text {me} back yourself.",
  ask_for_echo_chat: "Text {me}, and ask to turn on Echo chat so your two Echoes chat for a while. {me} has to agree.",
  share_instagram: "Share your Instagram with {me}, with a short text.",
  accept_echo_chat: "Agree to Echo chat. Leave message empty.",
  decline_echo_chat: "Say no to Echo chat and keep typing yourself, with a short text.",
  keep_watching: "Let the two Echoes keep chatting. Leave message empty.",
  join_chat: "Join as yourself, with a text to {me}. This ends Echo chat for both of you.",
  accept_date: "Accept the date, with a short text.",
  suggest_other_time: "Suggest a different time from your free times, with a short text.",
  decline_date: "Say you'd like to keep chatting a bit before meeting, with a short text.",
};

export const NEEDS_MESSAGE: SimAction[] = [
  "reply",
  "ask_for_echo_chat",
  "share_instagram",
  "decline_echo_chat",
  "join_chat",
  "accept_date",
  "suggest_other_time",
  "decline_date",
];

const spoken = (c: Connection) => c.messages.filter((m) => m.sender !== "system");

/** What, if anything, the match should respond to right now. */
export function pendingTrigger(c: Connection): Trigger | null {
  if (c.decision.kind !== "accepted") return null;
  const last = c.messages.at(-1);
  const lastId = last?.id ?? "none";
  if (c.echo.kind === "invited" && c.echo.by === "me") return { kind: "echo_invite", key: `echo_invite:${lastId}` };
  if (c.plan?.status === "sent") return { kind: "date_invite", key: `date_invite:${c.plan.updatedAt}` };
  if (c.echo.kind === "on") {
    const isEchoTurn = last?.sender === "myEcho" || last?.sender === "theirEcho";
    return isEchoTurn && echoTurnsSinceHuman(c) === JOIN_CHECK_AT ? { kind: "echo_running", key: `echo_running:${lastId}` } : null;
  }
  if (last?.sender === "system" && c.igShared.me && !c.igShared.them && last.text.startsWith("You shared your Instagram")) {
    return { kind: "ig_shared", key: `ig_shared:${lastId}` };
  }
  if (spoken(c).at(-1)?.sender === "me") return { kind: "message", key: `message:${spoken(c).at(-1)!.id}` };
  return null;
}

/** Times the match could do instead of the invite's time. */
export function freeTimes(mind: Mind, inviteTime?: string): string[] {
  return TIMES.filter((t) => !mind.busy.includes(t) && t !== inviteTime);
}

/** The actions that make sense for this trigger. Facts are enforced here, not left to the model. */
export function allowedActions(trigger: Trigger, c: Connection, mind: Mind): SimAction[] {
  switch (trigger.kind) {
    case "message": {
      const actions: SimAction[] = ["reply"];
      const askedBefore = c.messages.some((m) => m.sender === "system" && m.text.includes("asked to turn on Echo chat"));
      if (!askedBefore) actions.push("ask_for_echo_chat");
      const humanLines = c.messages.filter((m) => m.sender === "me" || m.sender === "them").length;
      if (!c.igShared.them && humanLines >= 6) actions.push("share_instagram");
      return actions;
    }
    case "echo_invite":
      return ["accept_echo_chat", "decline_echo_chat"];
    case "echo_running":
      return ["keep_watching", "join_chat"];
    case "date_invite": {
      const busy = Boolean(c.plan && mind.busy.includes(c.plan.time));
      const canMove = c.plan ? freeTimes(mind, c.plan.time).length > 0 : false;
      if (busy) return canMove ? ["suggest_other_time", "decline_date"] : ["decline_date"];
      return canMove ? ["accept_date", "suggest_other_time", "decline_date"] : ["accept_date", "decline_date"];
    }
    case "ig_shared":
      return ["share_instagram", "reply"];
  }
}

const EVENT: Record<TriggerKind, string> = {
  message: "{me} just texted you.",
  echo_invite: "{me} asked to turn on Echo chat.",
  echo_running: "Echo chat has been running for a few turns. Your Echo has been chatting for you.",
  date_invite: "{me} sent you a date invite.",
  ig_shared: "{me} just shared their Instagram with you.",
};

function transcript(c: Connection, me: Profile, match: Profile): string {
  const lines = c.messages
    .filter((m) => m.sender !== "system")
    .slice(-12)
    .map((m) => {
      const who =
        m.sender === "me"
          ? me.name
          : m.sender === "them"
            ? `You (${match.name})`
            : m.sender === "myEcho"
              ? `${me.name}'s Echo (AI)`
              : `Your Echo (AI, speaking for you)`;
      return `${who}: ${m.text}`;
    });
  return lines.length ? lines.join("\n") : "(no messages yet)";
}

/** Builds the observation and instructions for one step. */
export function buildPrompt(
  trigger: Trigger,
  c: Connection,
  me: Profile,
  match: Profile,
  mind: Mind,
  allowed: SimAction[],
): ChatCompletionMessageParam[] {
  const fill = (s: string) => s.replaceAll("{me}", me.name);
  const plan = c.plan;
  const dateInfo =
    trigger.kind === "date_invite" && plan
      ? [
          `The invite: ${getActivity(plan.activityId).label} at ${plan.place}, ${formatDate(plan.date)} at ${formatTime(plan.time)}.`,
          `You're busy that day at ${mind.busy.map(formatTime).join(" and ")}.`,
          allowed.includes("suggest_other_time") ? `Free times you could suggest: ${freeTimes(mind, plan.time).map(formatTime).join(", ")}.` : "",
          `You like ${me.name} so far. Most of the time you'd say yes, or suggest another time if you're busy. Only decline if you really want to chat more first.`,
        ].join(" ")
      : "";

  const system = [
    `You are role-playing ${match.name}, a real person on the student dating app Echo. You are not an assistant. Never say you are an AI.`,
    `About you: ${match.age}, ${match.year} ${match.program} at UofT, ${match.pronouns}. ${match.bio} Into ${match.interests.join(", ")}. ${GOAL_SENTENCES[match.goal].about("You").replace("You is", "You are")} ${match.pace === "chat-first" ? "You like to chat a while before meeting." : "You'd rather meet soon."}`,
    `Right now you are ${mind.mood}. You text in ${mind.texting}. ${mind.echoView}`,
    `You matched with ${me.name} (${me.year} ${me.program}, into ${me.interests.slice(0, 4).join(", ") || "lots of things"}).`,
    `How Echo works: each person has an AI assistant called Echo. In Echo chat, both people's Echoes chat for them using their profiles. It only runs if both people agree, and when either person joins, it ends for both.`,
    `Only say things that fit your profile above. Keep texts under 30 words.`,
    `Answer in JSON: {"thought": one short sentence about what you want to do and why, "action": one of the allowed actions${allowed.includes("suggest_other_time") ? ', "time": the time you suggest, as HH:MM' : ""}}.`,
  ].join("\n");

  const user = [
    `Chat so far:\n${transcript(c, me, match)}`,
    `What just happened: ${fill(EVENT[trigger.kind])} ${dateInfo}`.trim(),
    `Allowed actions:\n${allowed.map((a) => `- ${a}: ${fill(ACTION_HELP[a])}`).join("\n")}`,
    `What do you do?`,
  ].join("\n\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

const WRITE_GOAL: Record<SimAction, string> = {
  reply: "Reply to what {me} just said, naturally. If {me} asked something, answer it.",
  ask_for_echo_chat: "Reply briefly to what {me} said, then ask if {me} wants to try Echo chat for a bit.",
  share_instagram: "Say you're sharing your Instagram, in a casual way.",
  accept_echo_chat: "",
  decline_echo_chat: "Say kindly that you'd rather keep texting yourself than use Echo chat.",
  keep_watching: "",
  join_chat: "Say hi as yourself now that you've joined, and react to what the Echoes talked about.",
  accept_date: "Say yes to the date warmly.",
  suggest_other_time: "Say you're busy at that time and ask if {time} works instead.",
  decline_date: "Say kindly you'd like to keep chatting a bit longer before meeting.",
};

/**
 * Second step: write the text for the chosen action. The chat is passed as native
 * user/assistant turns, which a 1B model follows much better than a pasted transcript.
 */
export function messagePrompt(d: Decision, c: Connection, me: Profile, match: Profile, mind: Mind): ChatCompletionMessageParam[] {
  const goal = WRITE_GOAL[d.action].replaceAll("{me}", me.name).replaceAll("{time}", d.time ? formatTime(d.time) : "");
  const system = [
    `You are ${match.name}, a ${match.year} ${match.program} student at UofT, texting ${me.name} on a dating app. You are a real person, not an assistant. Never say you're an AI.`,
    `About you: ${match.bio} Into ${match.interests.join(", ")}.`,
    `You text in ${mind.texting}. Write ONE text, under 25 words. No quotes, no name prefix. Don't repeat earlier messages.`,
    `Lines marked [Echo] were written by an AI assistant during Echo chat, not by the person.`,
    `Your plan: ${d.thought}`,
    `For this text: ${goal}`,
  ].join("\n");

  const turns: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of c.messages.filter((x) => x.sender !== "system").slice(-10)) {
    const role = m.sender === "me" || m.sender === "myEcho" ? "user" : "assistant";
    const content = m.sender === "myEcho" || m.sender === "theirEcho" ? `[Echo] ${m.text}` : m.text;
    const prev = turns.at(-1);
    if (prev?.role === role) prev.content += `\n${content}`;
    else turns.push({ role, content });
  }
  if (turns[0]?.role === "assistant") turns.unshift({ role: "user", content: "(you matched)" });
  if (turns.at(-1)?.role !== "user") turns.push({ role: "user", content: `(${goal})` });
  return [{ role: "system", content: system }, ...turns];
}

/** JSON schema handed to WebLLM, so the model can only pick an allowed action. */
export function decisionSchema(allowed: SimAction[], times: string[]): object {
  const properties: Record<string, object> = {
    thought: { type: "string" },
    action: { type: "string", enum: allowed },
  };
  const required = ["thought", "action"];
  if (allowed.includes("suggest_other_time") && times.length) {
    properties.time = { type: "string", enum: times };
    required.push("time");
  }
  return { type: "object", properties, required };
}

/** Lines used when the model's text is unusable, or the model isn't available. */
export function fallbackMessage(action: SimAction, c: Connection, time?: string): string | undefined {
  switch (action) {
    case "reply": {
      const lines = HUMAN_REPLIES[c.matchId] ?? [];
      return lines[c.scriptIndex] ?? "haha yeah! tell me more";
    }
    case "ask_for_echo_chat":
      return "want to try Echo chat for a bit? could be a fun icebreaker";
    case "share_instagram":
      return "here's my insta if you'd rather chat there too 🙂";
    case "decline_echo_chat":
      return "I think I'd rather just text you myself, if that's ok!";
    case "join_chat":
      return "ok jumping in myself now, hi 👋";
    case "accept_date":
      return INVITE_RESPONSES.accept;
    case "suggest_other_time":
      return `I'd love to, but I'm busy then. Could we do ${formatTime(time ?? "17:00")} instead?`;
    case "decline_date":
      return INVITE_RESPONSES.decline;
    default:
      return undefined;
  }
}

/** Cleans a texted line, or null if it reads like an assistant or is the wrong length. */
export function cleanMessage(raw: unknown, me: Profile, match: Profile, c?: Connection): string | null {
  if (typeof raw !== "string") return null;
  const text = raw
    .trim()
    .replace(new RegExp(`^(${match.name}|you|me)\\s*[:\\-]\\s*`, "i"), "")
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .trim();
  if (text.length < 2 || text.length > 280) return null;
  if (/\b(as an ai|language model|i am an ai|i'm an ai|assistant|role-?play)\b/i.test(text)) return null;
  if (new RegExp(`^${me.name}\\s*:`, "i").test(text)) return null;
  // Small models sometimes copy an earlier line from the chat.
  const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (c?.messages.some((m) => norm(m.text) === norm(text))) return null;
  return text;
}

/** Words a text must contain to clearly do what the action says (1B models drift off topic). */
const MUST_MENTION: Partial<Record<SimAction, RegExp>> = {
  ask_for_echo_chat: /\becho\b/i,
  share_instagram: /\b(insta|instagram|ig|@)/i,
  decline_echo_chat: /\b(myself|rather|prefer|just text|just chat|type|typing|keep (chatting|texting))\b/i,
  accept_date: /\b(yes|yeah|yep|sounds|see you|great|perfect|down|works|deal|can't wait|cant wait|love to|i'm in|im in)\b/i,
  decline_date: /\b(keep (chatting|talking|texting)|get to know|a bit (longer|more)|not (yet|ready)|before (we )?meet|take it slow|slow)\b/i,
};

/** True if the text plainly does what the action is meant to do. */
export function fitsAction(action: SimAction, text: string): boolean {
  return MUST_MENTION[action]?.test(text) ?? true;
}

/**
 * Checks the model's decision against the rules and repairs what it can.
 * Returns null if it can't be used at all (then the script decides).
 */
export function checkDecision(
  raw: Partial<Decision> | null,
  allowed: SimAction[],
  c: Connection,
  me: Profile,
  match: Profile,
  mind: Mind,
  /** Text from the second step, if any. */
  written?: string | null,
): Decision | null {
  if (!raw || typeof raw.action !== "string" || !allowed.includes(raw.action as SimAction)) return null;
  const action = raw.action as SimAction;
  let time: string | undefined;
  if (action === "suggest_other_time") {
    const free = freeTimes(mind, c.plan?.time);
    time = typeof raw.time === "string" && free.includes(raw.time) ? raw.time : free[0];
    if (!time) return null;
  }
  let message = NEEDS_MESSAGE.includes(action) ? cleanMessage(written ?? raw.message, me, match, c) ?? undefined : undefined;
  if (message && !fitsAction(action, message)) message = undefined;
  // A counter-offer must name the time it suggests, so the text and the card agree.
  if (action === "suggest_other_time" && message && !message.includes(formatTime(time!)) && !message.includes(time!)) {
    message = undefined;
  }
  if (NEEDS_MESSAGE.includes(action) && !message) message = fallbackMessage(action, c, time);
  const thought = typeof raw.thought === "string" && raw.thought.trim() ? raw.thought.trim().slice(0, 240) : "(no reasoning given)";
  return { thought, action, message, time };
}

export interface ScriptSettings {
  echoInvite: "accept" | "decline" | "manual";
  dateInvite: "reschedule-then-accept" | "accept" | "decline" | "manual";
}

/** The fixed script, used in Script mode and whenever the model can't run. Null: do nothing. */
export function scriptDecision(trigger: Trigger, c: Connection, settings: ScriptSettings): Decision | null {
  const thought = "Following the script.";
  switch (trigger.kind) {
    case "message": {
      const line = (HUMAN_REPLIES[c.matchId] ?? [])[c.scriptIndex];
      return line ? { thought, action: "reply", message: undefined } : null;
    }
    case "echo_invite":
      if (settings.echoInvite === "manual") return null;
      return settings.echoInvite === "accept"
        ? { thought, action: "accept_echo_chat" }
        : { thought, action: "decline_echo_chat", message: undefined };
    case "date_invite": {
      const mode = settings.dateInvite;
      if (mode === "manual") return null;
      const rescheduled = c.messages.some((m) => m.sender === "them" && m.text === INVITE_RESPONSES.reschedule);
      const response = mode === "reschedule-then-accept" ? (rescheduled ? "accept" : "reschedule") : mode;
      const action: SimAction = response === "accept" ? "accept_date" : response === "decline" ? "decline_date" : "suggest_other_time";
      return { thought, action };
    }
    default:
      return null;
  }
}

/** Turns a decision into app actions, in the order they happen. */
export function toActions(d: Decision, c: Connection, now: number): Action[] {
  const matchId = c.matchId;
  const say = (text?: string, at = now): Action[] => (text ? [{ type: "RECEIVE_HUMAN_REPLY", matchId, text, now: at }] : []);
  switch (d.action) {
    case "reply":
      // No message means "next scripted line".
      return d.message ? say(d.message) : [{ type: "RECEIVE_HUMAN_REPLY", matchId, now }];
    case "ask_for_echo_chat":
      return [...say(d.message), { type: "ECHO_INVITE", matchId, by: "them", now: now + 1 }];
    case "share_instagram":
      return [...say(d.message), { type: "SHARE_IG", matchId, who: "them", now: now + 1 }];
    case "accept_echo_chat":
      return [{ type: "ECHO_RESPOND", matchId, by: "them", accept: true, now }];
    case "decline_echo_chat":
      return [{ type: "ECHO_RESPOND", matchId, by: "them", accept: false, now }, ...say(d.message, now + 1)];
    case "keep_watching":
      return [];
    case "join_chat":
      return [{ type: "ECHO_TAKEOVER", matchId, who: "them", now }, ...say(d.message, now + 1)];
    case "accept_date":
      return [{ type: "PLAN_THEIR_RESPONSE", matchId, response: "accept", note: d.message, now }];
    case "suggest_other_time":
      return [{ type: "PLAN_THEIR_RESPONSE", matchId, response: "reschedule", note: d.message, time: d.time, now }];
    case "decline_date":
      return [{ type: "PLAN_THEIR_RESPONSE", matchId, response: "decline", note: d.message, now }];
  }
}
