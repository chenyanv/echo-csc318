import { useSyncExternalStore } from "react";
import { TIMES } from "../data/planner";

/**
 * The simulated match's hidden personality. A new one is rolled for every new connection
 * (each task preset or new match), so the match behaves differently from run to run.
 * The app never shows this to the participant; the facilitator panel does.
 */
export interface Mind {
  /** Which connection this belongs to: `${matchId}@${acceptedAt}`. */
  key: string;
  texting: string;
  mood: string;
  echoView: string;
  /** Times this person can't do on the proposed day. */
  busy: string[];
}

const TEXTING = [
  "short, lowercase texts with the odd emoji",
  "warm and chatty, in full sentences",
  "dry humour and short replies",
  "a little shy; asks a lot of questions back",
];

const MOOD = [
  "keen on this match and enjoying the chat",
  "interested, but taking it slow",
  "a bit distracted by midterms, but still interested",
];

const ECHO_VIEW = [
  "You think Echo chat is a fun, low-pressure way to break the ice.",
  "You're unsure about letting an AI chat for you, but you're open to trying it.",
  "You'd rather type yourself. An AI chatting for you feels a bit weird.",
];

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

export function rollMind(key: string): Mind {
  const times = [...TIMES].sort(() => Math.random() - 0.5);
  return {
    key,
    texting: pick(TEXTING),
    mood: pick(MOOD),
    echoView: pick(ECHO_VIEW),
    busy: times.slice(0, 1 + Math.floor(Math.random() * 2)).sort(),
  };
}

const STORE_KEY = "echo.sim.minds";
let minds: Record<string, Mind> = read();
const listeners = new Set<() => void>();

function read(): Record<string, Mind> {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(minds));
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

/** The mind for this connection, rolling a new one if the connection is new. */
export function mindFor(matchId: string, acceptedAt: number): Mind {
  const key = `${matchId}@${acceptedAt}`;
  const current = minds[matchId];
  if (current?.key === key) return current;
  minds = { ...minds, [matchId]: rollMind(key) };
  save();
  return minds[matchId];
}

/** Facilitator: give the match a new personality now. */
export function rerollMind(matchId: string, acceptedAt: number): void {
  minds = { ...minds, [matchId]: rollMind(`${matchId}@${acceptedAt}`) };
  save();
}

export function useMind(matchId: string): Mind | undefined {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => minds[matchId],
  );
}
