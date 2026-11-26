import type { Profile } from "../data/profiles";

/** Bump when the shape changes so stale localStorage is discarded. */
export const STATE_VERSION = 2;

/** Undo window for "Not for me" and "Decline" (A2 finding 2). */
export const UNDO_MS = 10_000;

export type Sender =
  | "me" // the participant, typing as themselves
  | "them" // the match, typing as themselves (always scripted, never AI)
  | "myEcho" // the participant's Echo
  | "theirEcho" // the match's Echo
  | "system"; // status lines like "You joined, so Echo chat is now off."

export interface ChatMessage {
  id: string;
  sender: Sender;
  text: string;
  at: number;
  /** True when the text came from scripted fallback rather than the on-device model. */
  demo?: boolean;
}

/**
 * The whole chat is in one mode at a time, shared by both people (team decision, 2026-11-25):
 * either two Echoes are talking, or two people are. A person never talks to an Echo that is
 * speaking for someone who isn't there (A2 finding 1; A1 misrepresentation concerns).
 * - off: direct chat, both people type as themselves (the default)
 * - invited: one side asked to turn Echo chat on and is waiting for the other
 * - on: both agreed; the two Echoes chat until either person joins, which ends it for both
 */
export type EchoStatus =
  | { kind: "off" }
  | { kind: "invited"; by: "me" | "them" }
  | { kind: "on" };

export type MatchDecision =
  | { kind: "pending" } // match shown, no decision yet
  | { kind: "accepted"; at: number }
  | { kind: "passed"; at: number; undoUntil: number }
  | { kind: "declined"; at: number; undoUntil: number };

export type PlanStatus =
  | "draft"
  | "sent" // waiting for the match
  | "counter" // the match proposed a change; waiting for the participant
  | "confirmed"
  | "declined" // the match declined the invite
  | "cancelled";

export interface DatePlan {
  activityId: string;
  place: string;
  /** ISO date, yyyy-mm-dd. */
  date: string;
  /** 24h, hh:mm. */
  time: string;
  status: PlanStatus;
  /** Last change the match proposed, when status is "counter". */
  counter?: { time?: string; date?: string; place?: string; note: string };
  updatedAt: number;
}

export type Feeling = "yes" | "maybe" | "no";

export interface Reflection {
  feeling?: Feeling;
  /** Private: never shown to the match. */
  note: string;
  savedAt?: number;
}

export interface Connection {
  matchId: string;
  decision: MatchDecision;
  messages: ChatMessage[];
  echo: EchoStatus;
  /** Index into the match's scripted human replies. */
  scriptIndex: number;
  plan?: DatePlan;
  reflection: Reflection;
  /** Instagram handles each side has chosen to share in this connection. */
  igShared: { me: boolean; them: boolean };
}

export interface QuickChatState {
  messages: ChatMessage[];
  done: boolean;
}

export interface AppState {
  version: number;
  onboarded: boolean;
  me: Profile;
  quickChat: QuickChatState;
  /** Prototype "day" counter; one match per day. Advanced by the facilitator. */
  day: number;
  /** Order in which matches are offered, one per day. */
  matchQueue: string[];
  connections: Record<string, Connection>;
}
