import { useSyncExternalStore } from "react";

/** Small app-wide stores for the simulated match: who is typing, and why they did what they did. */

function createStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next: T) {
      value = next;
      listeners.forEach((l) => l());
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

const typing = createStore<Record<string, boolean>>({});

export function setPartnerTyping(matchId: string, on: boolean) {
  if (Boolean(typing.get()[matchId]) === on) return;
  typing.set({ ...typing.get(), [matchId]: on });
}

export function usePartnerTyping(matchId: string): boolean {
  return useSyncExternalStore(typing.subscribe, () => Boolean(typing.get()[matchId]));
}

export interface SimLogEntry {
  at: number;
  matchId: string;
  trigger: string;
  thought: string;
  action: string;
  message?: string;
  /** "model": the on-device LLM decided. "script": scripted fallback. */
  source: "model" | "script";
  note?: string;
}

const log = createStore<SimLogEntry[]>([]);

export function addSimLog(entry: SimLogEntry) {
  log.set([entry, ...log.get()].slice(0, 30));
}

export function clearSimLog() {
  log.set([]);
}

export function useSimLog(): SimLogEntry[] {
  return useSyncExternalStore(log.subscribe, log.get);
}
