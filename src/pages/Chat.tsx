import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { generate, useEchoStatus } from "../ai/useEcho";
import { acknowledgement, bankQuestion, draftReply, nextFact, questionPrompt, validateQuestion } from "../ai/echoCompose";
import { ECHO_TURNS_PER_ROUND, echoTurnsSinceHuman, nextEchoSpeaker, type EchoSpeaker } from "../ai/echoTurns";
import { MessageBubble, TypingDots } from "../components/chat/MessageBubble";
import { Avatar } from "../components/ui/Avatar";
import { BackButton } from "../components/ui/PageHeader";
import { Sheet } from "../components/ui/Sheet";
import { MATCHES, type Profile } from "../data/profiles";
import { HUMAN_REPLIES } from "../data/scripts";
import { useStore } from "../state/store";
import type { Connection } from "../state/types";

/** Pause between turns so people can read along. */
const ECHO_DELAY_MS = 1500;
const HUMAN_REPLY_DELAY_MS = 2200;

export default function Chat() {
  const { id = "" } = useParams();
  const { state } = useStore();
  const match = MATCHES.find((m) => m.id === id);
  const conn = match ? state.connections[match.id] : undefined;

  if (!match || !conn) return <Navigate to="/chats" replace />;
  if (conn.decision.kind !== "accepted") return <Navigate to={`/match/${match.id}`} replace />;
  return <Conversation match={match} conn={conn} />;
}

function Conversation({ match, conn }: { match: Profile; conn: Connection }) {
  const { state, dispatch } = useStore();
  const ai = useEchoStatus();
  const [draft, setDraft] = useState("");
  /** Set while the composer holds text Echo drafted ("Help me reply"). */
  const [assisted, setAssisted] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [pendingEcho, setPendingEcho] = useState<{ speaker: EchoSpeaker; text: string } | null>(null);
  const [themTyping, setThemTyping] = useState(false);
  const [extraRounds, setExtraRounds] = useState(0);
  const [askOpen, setAskOpen] = useState(false);
  /** Bumped after each Echo turn so the next one is re-checked even if nothing else changed. */
  const [tick, setTick] = useState(0);
  const busy = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const echoOn = conn.echo.kind === "on";
  const roundLimit = ECHO_TURNS_PER_ROUND * (extraRounds + 1);
  const pausedForCatchUp = echoOn && echoTurnsSinceHuman(conn) >= roundLimit;
  const lastSpoken = conn.messages.filter((m) => m.sender !== "system").at(-1);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [conn.messages.length, pendingEcho?.text, themTyping]);

  // Reset the catch-up pause whenever Echo chat ends.
  useEffect(() => {
    if (!echoOn) setExtraRounds(0);
  }, [echoOn]);

  // Echo-to-Echo turns (only while Echo chat is on; Echoes never talk to a person).
  useEffect(() => {
    const speaker = nextEchoSpeaker(conn);
    if (!speaker || busy.current || pausedForCatchUp) return;
    const timer = window.setTimeout(async () => {
      busy.current = true;
      const [self, other] = speaker === "myEcho" ? [state.me, match] : [match, state.me];
      const otherSide = speaker === "myEcho" ? ["them", "theirEcho"] : ["me", "myEcho"];
      const turn = conn.messages.filter((m) => m.sender === speaker).length;
      const lastFromOther = [...conn.messages].reverse().find((m) => otherSide.includes(m.sender))?.text;
      // The statement is always a real profile fact; the model only writes the question.
      const ownPast = conn.messages.filter((m) => m.sender === speaker).map((m) => m.text);
      const fact = nextFact(self, turn, lastFromOther, ownPast);
      const statement = acknowledgement(turn, Boolean(lastFromOther), speaker === "myEcho" ? 1 : 0) + fact.statement;
      setPendingEcho({ speaker, text: statement });
      // Not streamed: the question is only shown after it passes validation.
      const raw = await generate(questionPrompt(self, other, fact.statement, lastFromOther), undefined, 40, 0.5);
      const question = (raw && validateQuestion(raw, self, other)) || bankQuestion(fact, other, turn);
      const text = `${statement} ${question}`;
      setPendingEcho(null);
      busy.current = false;
      setTick((n) => n + 1);
      dispatch({ type: "ADD_ECHO_MESSAGE", matchId: match.id, sender: speaker, text, demo: raw === null, now: Date.now() });
    }, ECHO_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [conn, tick, pausedForCatchUp, dispatch, match, state.me]);

  // The match's own replies are scripted, so a "Human" label is never an AI.
  const theirTurn =
    lastSpoken?.sender === "me" &&
    !echoOn &&
    conn.scriptIndex < (HUMAN_REPLIES[match.id]?.length ?? 0);
  useEffect(() => {
    if (!theirTurn) return;
    setThemTyping(true);
    const timer = window.setTimeout(() => {
      setThemTyping(false);
      dispatch({ type: "RECEIVE_HUMAN_REPLY", matchId: match.id, now: Date.now() });
    }, HUMAN_REPLY_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      setThemTyping(false);
    };
  }, [theirTurn, lastSpoken?.id, dispatch, match.id]);

  const waitingForThem = conn.echo.kind === "invited" && conn.echo.by === "me";

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    dispatch({ type: "SEND_MESSAGE", matchId: match.id, text: draft, now: Date.now(), assisted });
    setDraft("");
    setAssisted(false);
  }

  /** Echo drafts a reply into the composer. Nothing is sent until you press Send. */
  async function helpMeReply() {
    if (drafting) return;
    setDrafting(true);
    // Skip anything already said on your side, by you or by your Echo earlier.
    const mine = conn.messages.filter((m) => m.sender === "me" || m.sender === "myEcho").map((m) => m.text);
    const lastFromThem = [...conn.messages].reverse().find((m) => m.sender === "them")?.text;
    const d = draftReply(state.me, match, mine);
    const raw = await generate(questionPrompt(state.me, match, d.topic, lastFromThem, true), undefined, 40, 0.6);
    const question = (raw && validateQuestion(raw, state.me, match, true)) || d.question;
    setDraft([d.opening, question].filter(Boolean).join(" "));
    setAssisted(true);
    setDrafting(false);
  }

  const act = (type: "ECHO_TAKEOVER" | "ECHO_TURN_OFF") =>
    dispatch({ type, matchId: match.id, who: "me", now: Date.now() });

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      {/* Header: who is speaking on each side, always visible */}
      <div className="shrink-0 border-b border-line bg-canvas px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-3">
        <div className="flex items-center gap-2">
          <BackButton to="/chats" label="" />
          <Link to={`/match/${match.id}`} className="flex min-w-0 flex-1 items-center gap-2.5">
            <Avatar profile={match} size="sm" />
            <span className="truncate text-[17px] font-semibold">{match.name}</span>
          </Link>
          <Link to={`/match/${match.id}/plan`} className="btn-secondary min-h-9 px-3.5 text-sm">
            Plan a date
          </Link>
        </div>
        <ModeBar echoOn={echoOn} name={match.name} />
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4" aria-live="polite">
        {conn.messages.length === 0 && (
          <p className="py-8 text-center text-[15px] text-muted">
            You matched with {match.name}. Say hi, or ask to use Echo chat if you'd like a hand getting started.
          </p>
        )}
        {conn.messages.map((m) => (
          <MessageBubble key={m.id} message={m} matchName={match.name} />
        ))}
        {pendingEcho && (
          <MessageBubble message={{ sender: pendingEcho.speaker, text: pendingEcho.text }} matchName={match.name} streaming />
        )}
        {themTyping && (
          <div className="flex flex-col items-start">
            <span className="mb-1 text-[12px] font-medium text-muted">{match.name}</span>
            <div className="rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-2.5 text-muted">
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-line bg-canvas px-4 pt-3 pb-3">
        {conn.echo.kind === "invited" && conn.echo.by === "them" && (
          <div className="mb-3 rounded-2xl border border-echo/25 bg-echo-soft p-4">
            <p className="font-semibold text-echo-strong">{match.name} asked to use Echo chat</p>
            <p className="mt-1 text-sm text-ink/80">
              Your Echo and {match.name}'s Echo would chat for you both. Every message shows who wrote it. Either of you
              can join at any time, and then it's just the two of you. Nothing changes unless you agree.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => dispatch({ type: "ECHO_RESPOND", matchId: match.id, by: "me", accept: false, now: Date.now() })}
              >
                Keep chatting myself
              </button>
              <button
                type="button"
                className="btn-echo"
                onClick={() => dispatch({ type: "ECHO_RESPOND", matchId: match.id, by: "me", accept: true, now: Date.now() })}
              >
                Turn on Echo chat
              </button>
            </div>
          </div>
        )}

        {echoOn ? (
          <div>
            <p className="flex items-center gap-2 text-sm text-echo-strong">
              <span className="size-2 animate-pulse rounded-full bg-echo" />
              {pausedForCatchUp ? "The Echoes paused so you can catch up." : `Your Echo and ${match.name}'s Echo are chatting.`}
              {ai.demo && <span className="text-muted">(demo replies)</span>}
            </p>
            <div className={`mt-3 grid gap-2 ${pausedForCatchUp ? "grid-cols-2" : ""}`}>
              <button type="button" className="btn-primary" onClick={() => act("ECHO_TAKEOVER")}>
                Join as yourself
              </button>
              {pausedForCatchUp && (
                <button type="button" className="btn-secondary" onClick={() => setExtraRounds((n) => n + 1)}>
                  Let them keep going
                </button>
              )}
            </div>
            <p className="mt-2 text-center text-[13px] text-muted">
              Joining ends Echo chat for both of you, so it's just you and {match.name}.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {conn.echo.kind === "off" && (
                <>
                  <button
                    type="button"
                    className="font-medium text-echo hover:underline disabled:opacity-50"
                    onClick={() => void helpMeReply()}
                    disabled={drafting}
                  >
                    {drafting ? "Echo is drafting…" : "Help me reply"}
                  </button>
                  <button type="button" className="font-medium text-muted hover:text-ink hover:underline" onClick={() => setAskOpen(true)}>
                    Use Echo chat
                  </button>
                </>
              )}
              {waitingForThem && (
                <>
                  <span className="text-muted">Waiting for {match.name} to agree to Echo chat…</span>
                  <button type="button" className="font-medium text-muted underline" onClick={() => act("ECHO_TURN_OFF")}>
                    Withdraw
                  </button>
                </>
              )}
            </div>
            <form className="flex items-end gap-2" onSubmit={send}>
              <input
                className="field flex-1"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  if (!e.target.value) setAssisted(false);
                }}
                placeholder={`Message ${match.name}`}
                aria-label={`Message ${match.name}`}
                maxLength={500}
              />
              <button className="btn-primary" disabled={!draft.trim()}>
                Send
              </button>
            </form>
            {assisted && draft && (
              <p className="mt-1.5 text-[13px] text-muted">
                Echo drafted this. Edit it however you like. It's only sent when you press Send, as you.
              </p>
            )}
          </>
        )}
      </div>

      <Sheet open={askOpen} onClose={() => setAskOpen(false)} title="Use Echo chat?">
        <ul className="space-y-2.5 text-[15px]">
          <li>Your Echo and {match.name}'s Echo chat for you both, based on your profiles.</li>
          <li>It only starts if {match.name} agrees too.</li>
          <li>Every message shows whether a person or an Echo wrote it.</li>
          <li>Either of you can join at any time. Then Echo chat ends for both of you, and it's just the two of you.</li>
        </ul>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" className="btn-secondary" onClick={() => setAskOpen(false)}>
            Not now
          </button>
          <button
            type="button"
            className="btn-echo"
            onClick={() => {
              dispatch({ type: "ECHO_INVITE", matchId: match.id, by: "me", now: Date.now() });
              setAskOpen(false);
            }}
          >
            Ask {match.name}
          </button>
        </div>
      </Sheet>
    </section>
  );
}

/** One shared mode for the whole chat: two Echoes, or two people. Never a mix. */
function ModeBar({ echoOn, name }: { echoOn: boolean; name: string }) {
  return (
    <div
      className={`mt-2 flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[13px] ${
        echoOn ? "border-echo/30 bg-echo-soft text-echo-strong" : "border-line bg-surface text-ink"
      }`}
      aria-label="Who is chatting"
    >
      <span className="font-semibold">{echoOn ? "Echo chat (AI)" : "Direct chat"}</span>
      <span aria-hidden="true" className="text-muted">·</span>
      <span className={echoOn ? "" : "text-muted"}>
        {echoOn ? `Your Echo and ${name}'s Echo are talking` : `Every message is typed by you or ${name}`}
      </span>
    </div>
  );
}
