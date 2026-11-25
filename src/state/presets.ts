import { MATCHES, SAMPLE_USER } from "../data/profiles";
import { DEFAULT_PLAN } from "../data/planner";
import { HUMAN_REPLIES } from "../data/scripts";
import { initialState, makeId, newConnection } from "./reducer";
import type { AppState, ChatMessage, Connection } from "./types";

/**
 * Starting states for each A3 task, so every participant begins from the same place.
 * The facilitator panel (M5) jumps between these.
 */

export type PresetKey = "fresh" | "t1" | "t2" | "t3" | "t4" | "t5";

export const PRESETS: { key: PresetKey; label: string; description: string }[] = [
  { key: "fresh", label: "New user", description: "Signed out. Starts at sign-up and setup." },
  { key: "t1", label: "T1 · Today's match", description: "Set up and ready to see today's match (Alex)." },
  { key: "t2", label: "T2 · Get to know Alex", description: "Matched with Alex, a couple of messages in." },
  { key: "t3", label: "T3 · Plan a date", description: "Chatting with Alex and ready to suggest a date." },
  { key: "t4", label: "T4 · Echo chat request", description: "Alex has asked to turn on Echo chat." },
  { key: "t5", label: "T5 · After the date", description: "The date with Alex happened yesterday." },
];

export const DEFAULT_QUEUE = MATCHES.map((m) => m.id);

export function isoDate(daysFromNow: number, now: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() + daysFromNow);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function line(sender: ChatMessage["sender"], text: string, at: number): ChatMessage {
  return { id: makeId(at), sender, text, at };
}

/** A short, believable opening exchange with Alex. */
function openingChat(now: number): { messages: ChatMessage[]; scriptIndex: number } {
  const alex = HUMAN_REPLIES.alex;
  const t = now - 60 * 60 * 1000;
  return {
    messages: [
      line("them", alex[0], t),
      line("me", "hey! pretty good, just survived a midterm haha", t + 60_000),
      line("them", alex[1], t + 120_000),
    ],
    scriptIndex: 2,
  };
}

function onboarded(now: number): AppState {
  const s = initialState(SAMPLE_USER, DEFAULT_QUEUE);
  return {
    ...s,
    onboarded: true,
    quickChat: {
      done: true,
      messages: [
        line("myEcho", "Hi! I'm Echo. This is a quick setup chat so I can learn how you talk. What do you usually do on a free afternoon?", now),
        line("me", "probably go for a walk or try a new recipe", now),
      ],
    },
  };
}

function withAlex(state: AppState, fn: (c: Connection) => Connection): AppState {
  return { ...state, connections: { ...state.connections, alex: fn(newConnection("alex")) } };
}

export function buildPreset(key: PresetKey, now: number = Date.now()): AppState {
  switch (key) {
    case "fresh":
      return initialState(SAMPLE_USER, DEFAULT_QUEUE);

    case "t1":
      return onboarded(now);

    case "t2":
    case "t3":
      return withAlex(onboarded(now), (c) => ({
        ...c,
        decision: { kind: "accepted", at: now - 2 * 60 * 60 * 1000 },
        ...openingChat(now),
      }));

    case "t4":
      return withAlex(onboarded(now), (c) => {
        const chat = openingChat(now);
        return {
          ...c,
          decision: { kind: "accepted", at: now - 2 * 60 * 60 * 1000 },
          ...chat,
          echo: { kind: "invited", by: "them" },
          messages: [
            ...chat.messages,
            line("system", "Alex asked to turn on Echo chat. Nothing changes unless you agree.", now - 60_000),
          ],
        };
      });

    case "t5":
      return withAlex(onboarded(now), (c) => {
        const chat = openingChat(now - 4 * 24 * 60 * 60 * 1000);
        return {
          ...c,
          decision: { kind: "accepted", at: now - 5 * 24 * 60 * 60 * 1000 },
          ...chat,
          messages: [
            ...chat.messages,
            line("system", "Your date is confirmed.", now - 3 * 24 * 60 * 60 * 1000),
          ],
          plan: {
            activityId: DEFAULT_PLAN.activityId,
            place: DEFAULT_PLAN.place,
            date: isoDate(-1, now),
            time: DEFAULT_PLAN.time,
            status: "confirmed",
            updatedAt: now - 3 * 24 * 60 * 60 * 1000,
          },
        };
      });
  }
}
