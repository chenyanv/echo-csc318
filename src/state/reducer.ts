import { getMatch, type Profile } from "../data/profiles";
import { HUMAN_REPLIES, INVITE_RESPONSES } from "../data/scripts";
import {
  STATE_VERSION,
  UNDO_MS,
  type AppState,
  type ChatMessage,
  type Connection,
  type DatePlan,
  type EchoStatus,
  type Feeling,
  type MatchDecision,
  type Sender,
} from "./types";

export type Side = "me" | "them";

export type Action =
  | { type: "RESET"; state: AppState }
  | { type: "COMPLETE_ONBOARDING"; profile: Profile }
  | { type: "UPDATE_PROFILE"; patch: Partial<Profile> }
  | { type: "QUICK_CHAT_ADD"; sender: "me" | "myEcho"; text: string; demo?: boolean; now: number }
  | { type: "QUICK_CHAT_DONE" }
  | { type: "ADVANCE_DAY" }
  | { type: "MATCH_ACCEPT"; matchId: string; now: number }
  | { type: "MATCH_PASS"; matchId: string; now: number }
  | { type: "MATCH_DECLINE"; matchId: string; now: number }
  | { type: "MATCH_UNDO"; matchId: string; now: number }
  /** Bring back a passed match from "Recently passed". Passing never notifies anyone, so no time limit. */
  | { type: "MATCH_RESTORE"; matchId: string }
  | { type: "SEND_MESSAGE"; matchId: string; text: string; now: number }
  | { type: "RECEIVE_HUMAN_REPLY"; matchId: string; now: number }
  | { type: "ADD_ECHO_MESSAGE"; matchId: string; sender: "myEcho" | "theirEcho"; text: string; demo?: boolean; now: number }
  | { type: "ECHO_INVITE"; matchId: string; by: Side; now: number }
  | { type: "ECHO_RESPOND"; matchId: string; by: Side; accept: boolean; now: number }
  | { type: "ECHO_TAKEOVER"; matchId: string; who: Side; now: number }
  | { type: "ECHO_RESUME"; matchId: string; who: Side; now: number }
  | { type: "ECHO_TURN_OFF"; matchId: string; who: Side; now: number }
  | { type: "PLAN_UPDATE"; matchId: string; patch: Partial<Pick<DatePlan, "activityId" | "place" | "date" | "time">>; now: number }
  | { type: "PLAN_SEND"; matchId: string; now: number }
  | { type: "PLAN_THEIR_RESPONSE"; matchId: string; response: "accept" | "reschedule" | "decline"; now: number }
  | { type: "PLAN_ACCEPT_COUNTER"; matchId: string; now: number }
  | { type: "PLAN_CANCEL"; matchId: string; now: number }
  | { type: "SHARE_IG"; matchId: string; who: Side; now: number }
  | { type: "SAVE_REFLECTION"; matchId: string; feeling?: Feeling; note: string; now: number };

let idCounter = 0;
export function makeId(now: number): string {
  idCounter += 1;
  return `${now.toString(36)}-${idCounter.toString(36)}`;
}

function msg(sender: Sender, text: string, now: number, demo?: boolean): ChatMessage {
  return demo ? { id: makeId(now), sender, text, at: now, demo } : { id: makeId(now), sender, text, at: now };
}

export function newConnection(matchId: string): Connection {
  return {
    matchId,
    decision: { kind: "pending" },
    messages: [],
    echo: { kind: "off" },
    scriptIndex: 0,
    reflection: { note: "" },
    igShared: { me: false, them: false },
  };
}

function updateConnection(state: AppState, matchId: string, fn: (c: Connection) => Connection): AppState {
  const current = state.connections[matchId] ?? newConnection(matchId);
  const next = fn(current);
  if (next === current) return state;
  return { ...state, connections: { ...state.connections, [matchId]: next } };
}

function addSystem(c: Connection, text: string, now: number): Connection {
  return { ...c, messages: [...c.messages, msg("system", text, now)] };
}

export function isUndoable(decision: MatchDecision, now: number): boolean {
  return (decision.kind === "passed" || decision.kind === "declined") && now < decision.undoUntil;
}

/** The match only hears about a decline once the undo window has closed. */
export function isMatchNotified(decision: MatchDecision, now: number): boolean {
  return decision.kind === "declined" && now >= decision.undoUntil;
}

export function todayMatchId(state: AppState): string {
  return state.matchQueue[state.day % state.matchQueue.length];
}

/** Labels for the chat header, e.g. "You: Human | Alex: Echo". */
export function speakerModes(echo: EchoStatus): { me: "Human" | "Echo"; them: "Human" | "Echo" } {
  if (echo.kind !== "on") return { me: "Human", them: "Human" };
  return { me: echo.myEchoActive ? "Echo" : "Human", them: echo.theirEchoActive ? "Echo" : "Human" };
}

function echoReducer(c: Connection, action: Action, name: string): Connection {
  const now = "now" in action ? action.now : Date.now();
  switch (action.type) {
    case "ECHO_INVITE": {
      if (c.echo.kind !== "off") return c;
      const line =
        action.by === "me"
          ? `You asked ${name} to turn on Echo chat. It only starts if ${name} agrees.`
          : `${name} asked to turn on Echo chat. Nothing changes unless you agree.`;
      return addSystem({ ...c, echo: { kind: "invited", by: action.by } }, line, now);
    }
    case "ECHO_RESPOND": {
      // Only the person who was invited can answer.
      if (c.echo.kind !== "invited" || c.echo.by === action.by) return c;
      if (!action.accept) {
        const line = action.by === "me" ? "You kept Echo chat off." : `${name} would rather keep chatting directly.`;
        return addSystem({ ...c, echo: { kind: "off" } }, line, now);
      }
      return addSystem(
        { ...c, echo: { kind: "on", myEchoActive: true, theirEchoActive: true } },
        `Echo chat is on. Your Echo and ${name}'s Echo are chatting. Either of you can join at any time.`,
        now,
      );
    }
    case "ECHO_TAKEOVER": {
      if (c.echo.kind !== "on") return c;
      const active = action.who === "me" ? c.echo.myEchoActive : c.echo.theirEchoActive;
      if (!active) return c;
      const echo = {
        ...c.echo,
        ...(action.who === "me" ? { myEchoActive: false } : { theirEchoActive: false }),
      };
      const line = action.who === "me" ? "You joined. Your Echo is paused." : `${name} joined. ${name}'s Echo is paused.`;
      let next = addSystem({ ...c, echo }, line, now);
      if (!echo.myEchoActive && !echo.theirEchoActive) {
        next = addSystem({ ...next, echo: { kind: "off" } }, "Echo chat is off. You're both typing as yourselves.", now);
      }
      return next;
    }
    case "ECHO_RESUME": {
      if (c.echo.kind !== "on") return c;
      const active = action.who === "me" ? c.echo.myEchoActive : c.echo.theirEchoActive;
      if (active) return c;
      const echo = {
        ...c.echo,
        ...(action.who === "me" ? { myEchoActive: true } : { theirEchoActive: true }),
      };
      const line =
        action.who === "me" ? "You handed the chat back to your Echo." : `${name} handed the chat back to ${name}'s Echo.`;
      return addSystem({ ...c, echo }, line, now);
    }
    case "ECHO_TURN_OFF": {
      if (c.echo.kind === "off") return c;
      if (c.echo.kind === "invited") {
        // Withdrawing your own invite.
        if (c.echo.by !== action.who) return c;
        const line = action.who === "me" ? "You withdrew the Echo chat request." : `${name} withdrew the Echo chat request.`;
        return addSystem({ ...c, echo: { kind: "off" } }, line, now);
      }
      const line = action.who === "me" ? "You turned off Echo chat." : `${name} turned off Echo chat.`;
      return addSystem({ ...c, echo: { kind: "off" } }, line, now);
    }
    default:
      return c;
  }
}

function planReducer(c: Connection, action: Action, name: string): Connection {
  switch (action.type) {
    case "PLAN_UPDATE": {
      if (!c.plan || c.plan.status === "draft" || c.plan.status === "declined" || c.plan.status === "cancelled") {
        const base: DatePlan = c.plan && c.plan.status === "draft"
          ? c.plan
          : { activityId: "coffee", place: "", date: "", time: "", status: "draft", updatedAt: action.now };
        return { ...c, plan: { ...base, ...action.patch, status: "draft", counter: undefined, updatedAt: action.now } };
      }
      return c;
    }
    case "PLAN_SEND": {
      if (!c.plan || c.plan.status !== "draft") return c;
      return addSystem(
        { ...c, plan: { ...c.plan, status: "sent", updatedAt: action.now } },
        `You sent ${name} a date invite. It's confirmed once ${name} accepts.`,
        action.now,
      );
    }
    case "PLAN_THEIR_RESPONSE": {
      if (!c.plan || c.plan.status !== "sent") return c;
      const text = INVITE_RESPONSES[action.response];
      const withReply = { ...c, messages: [...c.messages, msg("them", text, action.now)] };
      if (action.response === "accept") {
        return addSystem(
          { ...withReply, plan: { ...c.plan, status: "confirmed", updatedAt: action.now } },
          "Your date is confirmed.",
          action.now,
        );
      }
      if (action.response === "decline") {
        return { ...withReply, plan: { ...c.plan, status: "declined", updatedAt: action.now } };
      }
      return addSystem(
        {
          ...withReply,
          plan: { ...c.plan, status: "counter", counter: { time: "17:00", note: text }, updatedAt: action.now },
        },
        `${name} suggested a different time. Nothing is confirmed until you both agree.`,
        action.now,
      );
    }
    case "PLAN_ACCEPT_COUNTER": {
      if (!c.plan || c.plan.status !== "counter" || !c.plan.counter) return c;
      const { counter, ...rest } = c.plan;
      const next: DatePlan = {
        ...rest,
        ...(counter.time ? { time: counter.time } : {}),
        ...(counter.date ? { date: counter.date } : {}),
        ...(counter.place ? { place: counter.place } : {}),
        status: "confirmed",
        updatedAt: action.now,
      };
      return addSystem({ ...c, plan: next }, "You accepted the new time. Your date is confirmed.", action.now);
    }
    case "PLAN_CANCEL": {
      if (!c.plan || c.plan.status === "cancelled" || c.plan.status === "draft") return c;
      return addSystem(
        { ...c, plan: { ...c.plan, status: "cancelled", counter: undefined, updatedAt: action.now } },
        `You cancelled the date. ${name} has been told.`,
        action.now,
      );
    }
    default:
      return c;
  }
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "RESET":
      return action.state;

    case "COMPLETE_ONBOARDING":
      return { ...state, onboarded: true, me: action.profile };

    case "UPDATE_PROFILE":
      return { ...state, me: { ...state.me, ...action.patch } };

    case "QUICK_CHAT_ADD":
      return {
        ...state,
        quickChat: {
          ...state.quickChat,
          messages: [...state.quickChat.messages, msg(action.sender, action.text, action.now, action.demo)],
        },
      };

    case "QUICK_CHAT_DONE":
      return { ...state, quickChat: { ...state.quickChat, done: true } };

    case "ADVANCE_DAY":
      return { ...state, day: state.day + 1 };

    case "MATCH_ACCEPT":
      return updateConnection(state, action.matchId, (c) =>
        c.decision.kind === "pending" ? { ...c, decision: { kind: "accepted", at: action.now } } : c,
      );

    case "MATCH_PASS":
      return updateConnection(state, action.matchId, (c) =>
        c.decision.kind === "pending"
          ? { ...c, decision: { kind: "passed", at: action.now, undoUntil: action.now + UNDO_MS } }
          : c,
      );

    case "MATCH_DECLINE":
      return updateConnection(state, action.matchId, (c) =>
        c.decision.kind === "accepted"
          ? { ...c, decision: { kind: "declined", at: action.now, undoUntil: action.now + UNDO_MS } }
          : c,
      );

    case "MATCH_UNDO":
      return updateConnection(state, action.matchId, (c) => {
        const d = c.decision;
        if (d.kind === "passed" && isUndoable(d, action.now)) return { ...c, decision: { kind: "pending" } };
        if (d.kind === "declined" && isUndoable(d, action.now)) return { ...c, decision: { kind: "accepted", at: d.at } };
        return c;
      });

    case "MATCH_RESTORE":
      return updateConnection(state, action.matchId, (c) =>
        c.decision.kind === "passed" ? { ...c, decision: { kind: "pending" } } : c,
      );

    case "SEND_MESSAGE":
      return updateConnection(state, action.matchId, (c) => {
        const text = action.text.trim();
        if (!text) return c;
        // Typing yourself while your Echo is active counts as joining.
        const joined =
          c.echo.kind === "on" && c.echo.myEchoActive
            ? echoReducer(c, { type: "ECHO_TAKEOVER", matchId: action.matchId, who: "me", now: action.now }, getMatch(c.matchId).name)
            : c;
        return { ...joined, messages: [...joined.messages, msg("me", text, action.now)] };
      });

    case "RECEIVE_HUMAN_REPLY":
      return updateConnection(state, action.matchId, (c) => {
        const lines = HUMAN_REPLIES[c.matchId] ?? [];
        if (c.scriptIndex >= lines.length) return c;
        return {
          ...c,
          scriptIndex: c.scriptIndex + 1,
          messages: [...c.messages, msg("them", lines[c.scriptIndex], action.now)],
        };
      });

    case "ADD_ECHO_MESSAGE":
      return updateConnection(state, action.matchId, (c) => {
        if (c.echo.kind !== "on") return c;
        const active = action.sender === "myEcho" ? c.echo.myEchoActive : c.echo.theirEchoActive;
        if (!active) return c;
        return { ...c, messages: [...c.messages, msg(action.sender, action.text, action.now, action.demo)] };
      });

    case "ECHO_INVITE":
    case "ECHO_RESPOND":
    case "ECHO_TAKEOVER":
    case "ECHO_RESUME":
    case "ECHO_TURN_OFF":
      return updateConnection(state, action.matchId, (c) => echoReducer(c, action, getMatch(c.matchId).name));

    case "PLAN_UPDATE":
    case "PLAN_SEND":
    case "PLAN_THEIR_RESPONSE":
    case "PLAN_ACCEPT_COUNTER":
    case "PLAN_CANCEL":
      return updateConnection(state, action.matchId, (c) => planReducer(c, action, getMatch(c.matchId).name));

    case "SHARE_IG":
      return updateConnection(state, action.matchId, (c) => {
        if (c.igShared[action.who]) return c;
        const name = getMatch(c.matchId).name;
        const next = { ...c, igShared: { ...c.igShared, [action.who]: true } };
        return addSystem(
          next,
          action.who === "me" ? `You shared your Instagram with ${name}.` : `${name} shared an Instagram handle with you.`,
          action.now,
        );
      });

    case "SAVE_REFLECTION":
      return updateConnection(state, action.matchId, (c) => ({
        ...c,
        reflection: { feeling: action.feeling, note: action.note, savedAt: action.now },
      }));
  }
}

export function initialState(me: Profile, matchQueue: string[]): AppState {
  return {
    version: STATE_VERSION,
    onboarded: false,
    me,
    quickChat: { messages: [], done: false },
    day: 0,
    matchQueue,
    connections: {},
  };
}
