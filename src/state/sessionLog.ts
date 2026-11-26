import type { Action } from "./reducer";

/**
 * A local log of what happened in a study session, for the observer.
 * Stores action types, screens and timings only. Never what the participant typed:
 * messages and notes are recorded as a character count.
 */
export interface LogEntry {
  t: number;
  path: string;
  action: string;
  matchId?: string;
  detail?: string;
}

const KEY = "echo.log";
const MAX = 2000;

function describe(a: Action): string | undefined {
  switch (a.type) {
    case "SEND_MESSAGE":
      return `${a.text.trim().length} chars${a.assisted ? ", started from Echo draft" : ""}`;
    case "QUICK_CHAT_ADD":
      return `${a.sender}, ${a.text.length} chars${a.demo ? ", demo" : ""}`;
    case "ADD_ECHO_MESSAGE":
      return `${a.sender}${a.demo ? ", demo" : ""}`;
    case "SAVE_REFLECTION":
      return `feeling=${a.feeling ?? "none"}, note ${a.note.length} chars`;
    case "ECHO_INVITE":
      return `by ${a.by}`;
    case "ECHO_RESPOND":
      return `by ${a.by}, ${a.accept ? "accept" : "decline"}`;
    case "ECHO_TAKEOVER":
    case "ECHO_TURN_OFF":
    case "SHARE_IG":
      return `who ${a.who}`;
    case "PLAN_UPDATE":
      return Object.keys(a.patch).join(",");
    case "PLAN_THEIR_RESPONSE":
      return a.response;
    case "RESET":
      return "preset loaded";
    default:
      return undefined;
  }
}

export function logAction(a: Action) {
  // Profile edits and resets carry personal details; record only that they happened.
  const entry: LogEntry = {
    t: Date.now(),
    path: window.location.pathname,
    action: a.type,
    ...("matchId" in a ? { matchId: a.matchId } : {}),
    ...(describe(a) ? { detail: describe(a) } : {}),
  };
  try {
    const log = readLog();
    log.push(entry);
    localStorage.setItem(KEY, JSON.stringify(log.slice(-MAX)));
  } catch {
    // ignore
  }
}

export function readLog(): LogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function clearLog() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function exportLog(sessionLabel: string) {
  const blob = new Blob([JSON.stringify({ session: sessionLabel, exportedAt: new Date().toISOString(), entries: readLog() }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `echo-session-${sessionLabel || "log"}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
