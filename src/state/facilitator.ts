import { useSyncExternalStore } from "react";

/**
 * Facilitator controls, kept apart from app state so loading a task preset
 * doesn't change how the match behaves.
 */
export interface FacilitatorSettings {
  /**
   * Who plays the match. "simulator": the on-device LLM decides everything the match does,
   * differently each run. "script": the same fixed responses every time (best for A3 sessions,
   * so every participant sees the same match).
   */
  partner: "simulator" | "script";
  /** What the match does when the participant asks to use Echo chat. */
  echoInvite: "accept" | "decline" | "manual";
  /** What the match does with a date invite. */
  dateInvite: "reschedule-then-accept" | "accept" | "decline" | "manual";
}

const KEY = "echo.facilitator";
const DEFAULTS: FacilitatorSettings = { partner: "simulator", echoInvite: "accept", dateInvite: "reschedule-then-accept" };

let settings: FacilitatorSettings = read();
const listeners = new Set<() => void>();

function read(): FacilitatorSettings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

export function setFacilitatorSetting<K extends keyof FacilitatorSettings>(key: K, value: FacilitatorSettings[K]) {
  settings = { ...settings, [key]: value };
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

export function useFacilitatorSettings(): FacilitatorSettings {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => settings,
  );
}
