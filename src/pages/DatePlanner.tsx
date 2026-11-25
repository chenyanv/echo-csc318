import { useState, type ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Sheet } from "../components/ui/Sheet";
import { BackButton } from "../components/ui/PageHeader";
import { ACTIVITIES, DEFAULT_PLAN, TIMES, estimateCost, getActivity } from "../data/planner";
import { MATCHES, type Profile } from "../data/profiles";
import { downloadIcs } from "../lib/ics";
import { formatDate, formatTime, isPast } from "../lib/format";
import { isoDate } from "../state/presets";
import { useStore } from "../state/store";
import type { Connection, DatePlan } from "../state/types";

export default function DatePlanner() {
  const { id = "" } = useParams();
  const { state } = useStore();
  const match = MATCHES.find((m) => m.id === id);
  const conn = match ? state.connections[match.id] : undefined;
  if (!match || !conn) return <Navigate to="/chats" replace />;
  if (conn.decision.kind !== "accepted") return <Navigate to={`/match/${match.id}`} replace />;

  const plan = conn.plan;
  const editing = !plan || plan.status === "draft" || plan.status === "declined" || plan.status === "cancelled";

  return (
    <section>
      <BackButton to={`/match/${match.id}`} label={match.name} />
      {editing ? <PlanForm match={match} conn={conn} /> : <PlanStatus match={match} plan={plan!} />}
    </section>
  );
}

/** Why Echo picked the default, from facts only. */
function suggestionReason(me: Profile, match: Profile): string {
  if (me.interests.includes("Coffee spots") && match.interests.includes("Coffee spots")) {
    return "Echo suggested coffee because you both listed coffee spots. Change anything you like.";
  }
  return "Echo suggested coffee as an easy, low-pressure first date. Change anything you like.";
}

function PlanForm({ match, conn }: { match: Profile; conn: Connection }) {
  const { state, dispatch } = useStore();
  const now = Date.now();
  const start = conn.plan;
  const reopened = start?.status === "declined" || start?.status === "cancelled";

  const [activityId, setActivityId] = useState(start?.activityId ?? DEFAULT_PLAN.activityId);
  const [place, setPlace] = useState(start?.place || DEFAULT_PLAN.place);
  const [date, setDate] = useState(start?.date || isoDate(DEFAULT_PLAN.dayOffset, now));
  const [time, setTime] = useState(start?.time || DEFAULT_PLAN.time);

  const activity = getActivity(activityId);
  const today = isoDate(0, now);

  function changeActivity(next: string) {
    setActivityId(next);
    const a = getActivity(next);
    if (!a.places.includes(place)) setPlace(a.places[0]);
  }

  function send() {
    dispatch({ type: "PLAN_UPDATE", matchId: match.id, patch: { activityId, place, date, time }, now: Date.now() });
    dispatch({ type: "PLAN_SEND", matchId: match.id, now: Date.now() });
  }

  return (
    <>
      <h1 className="mt-3 text-[26px] font-semibold tracking-tight">Plan a date with {match.name}</h1>
      <p className="mt-2 text-muted">
        {reopened
          ? start?.status === "declined"
            ? `${match.name} wanted to keep chatting first. You can suggest something else whenever you're ready.`
            : "You cancelled your last plan. Want to suggest something new?"
          : suggestionReason(state.me, match)}
      </p>

      <div className="card mt-6 space-y-5 p-5 md:p-6">
        <Field label="Activity">
          <Select value={activityId} onChange={changeActivity} label="Activity">
            {ACTIVITIES.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Where">
          <Select value={place} onChange={setPlace} label="Where">
            {activity.places.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
          <p className="mt-1.5 text-[13px] text-muted">Public places only, for a comfortable first meet.</p>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Day">
            <input
              type="date"
              aria-label="Day"
              className="field"
              value={date}
              min={today}
              onChange={(e) => e.target.value && setDate(e.target.value)}
            />
          </Field>
          <Field label="Time">
            <Select value={time} onChange={setTime} label="Time">
              {TIMES.map((t) => (
                <option key={t} value={t}>
                  {formatTime(t)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-canvas px-4 py-3 text-[15px]">
          <span className="text-muted">Estimated cost</span>
          <span className="font-medium">{estimateCost(activityId)}</span>
        </div>
      </div>

      <div className="card mt-4 p-4 text-[15px]">
        <p className="font-medium">
          {activity.label} · {formatDate(date)} at {formatTime(time)}
        </p>
        <p className="text-muted">{place}</p>
      </div>

      <button type="button" className="btn-primary mt-5 w-full" onClick={send} disabled={!date || date < today}>
        Send invite to {match.name}
      </button>
      <p className="mt-2 text-center text-[13px] text-muted">
        Nothing is booked until {match.name} accepts. They can also suggest a different time.
      </p>
    </>
  );
}

function PlanStatus({ match, plan }: { match: Profile; plan: DatePlan }) {
  const { dispatch } = useStore();
  const [cancelOpen, setCancelOpen] = useState(false);
  const activity = getActivity(plan.activityId);
  const revise = () => dispatch({ type: "PLAN_REVISE", matchId: match.id, now: Date.now() });

  const badge =
    plan.status === "confirmed"
      ? { text: `Confirmed by you and ${match.name}`, cls: "bg-ok-soft text-ok" }
      : plan.status === "sent"
        ? { text: `Waiting for ${match.name}`, cls: "bg-warn-soft text-warn" }
        : { text: `${match.name} suggested a change`, cls: "bg-accent-soft text-accent-strong" };

  const happened = plan.status === "confirmed" && isPast(plan.date);

  return (
    <>
      <h1 className="mt-3 text-[26px] font-semibold tracking-tight">
        {plan.status === "confirmed" ? (happened ? `Your date with ${match.name}` : "Upcoming date") : "Your invite"}
      </h1>

      <article className="card mt-5 p-5 md:p-6">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold ${badge.cls}`}>{badge.text}</span>
        <dl className="mt-4 space-y-3 text-[15px]">
          <Row label="What">{activity.label}</Row>
          <Row label="Where">{plan.place}</Row>
          <Row label="When">
            {plan.status === "counter" && plan.counter?.time ? (
              <>
                <span className="text-muted line-through">
                  {formatDate(plan.date)}, {formatTime(plan.time)}
                </span>
                <br />
                <span className="font-semibold">
                  {formatDate(plan.counter.date ?? plan.date)}, {formatTime(plan.counter.time)}
                </span>{" "}
                <span className="text-sm text-accent-strong">suggested by {match.name}</span>
              </>
            ) : (
              <>
                {formatDate(plan.date, true)}, {formatTime(plan.time)}
              </>
            )}
          </Row>
          <Row label="Cost">{estimateCost(plan.activityId)}</Row>
        </dl>

        {plan.status === "counter" && plan.counter && (
          <blockquote className="mt-4 rounded-xl border border-line bg-canvas px-4 py-3 text-[15px]">
            <span className="text-[12px] font-medium text-muted">{match.name}</span>
            <p className="mt-0.5">{plan.counter.note}</p>
          </blockquote>
        )}
      </article>

      {plan.status === "sent" && (
        <>
          <p className="mt-4 flex items-center gap-2 text-[15px] text-muted">
            <span className="size-2 animate-pulse rounded-full bg-warn" />
            Sent. It's confirmed once {match.name} accepts.
          </p>
          <button type="button" className="btn-secondary mt-4 w-full" onClick={revise}>
            Edit invite
          </button>
        </>
      )}

      {plan.status === "counter" && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button type="button" className="btn-primary" onClick={() => dispatch({ type: "PLAN_ACCEPT_COUNTER", matchId: match.id, now: Date.now() })}>
            Accept {plan.counter?.time ? formatTime(plan.counter.time) : "change"}
          </button>
          <button type="button" className="btn-secondary" onClick={revise}>
            Suggest something else
          </button>
        </div>
      )}

      {plan.status === "confirmed" && !happened && (
        <>
          <button
            type="button"
            className="btn-primary mt-5 w-full"
            onClick={() =>
              downloadIcs({
                uid: `${match.id}-${plan.date}-${plan.time}`,
                title: `${activity.label} with ${match.name}`,
                location: plan.place,
                description: `Planned on Echo. Confirmed by you and ${match.name}.`,
                date: plan.date,
                time: plan.time,
                durationMin: activity.durationMin,
              })
            }
          >
            <CalendarIcon /> Add to calendar
          </button>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button type="button" className="btn-secondary" onClick={revise}>
              Change plan
            </button>
            <button type="button" className="btn-secondary" onClick={() => setCancelOpen(true)}>
              Cancel date
            </button>
          </div>
          <p className="mt-3 text-center text-[13px] text-muted">
            Changed your plans? Update your calendar too.
          </p>
        </>
      )}

      {happened && (
        <Link to={`/match/${match.id}/reflect`} className="btn-primary mt-5 w-full">
          How did it go?
        </Link>
      )}

      <Link to={`/chats/${match.id}`} className="mt-6 block text-center text-[15px] font-medium text-muted hover:text-ink">
        Back to chat
      </Link>

      <Sheet open={cancelOpen} onClose={() => setCancelOpen(false)} title={`Cancel your date with ${match.name}?`}>
        <p className="text-[15px] text-muted">
          {match.name} will be told the date is off. You can still keep chatting, and plan something new later.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" className="btn-secondary" onClick={() => setCancelOpen(false)}>
            Keep the date
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              dispatch({ type: "PLAN_CANCEL", matchId: match.id, now: Date.now() });
              setCancelOpen(false);
            }}
          >
            Cancel date
          </button>
        </div>
      </Sheet>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-muted">{label}</p>
      {children}
    </div>
  );
}

/** Native select with a visible arrow, so it's obviously changeable (A2: "Do I pull this?"). */
function Select({ value, onChange, label, children }: { value: string; onChange: (v: string) => void; label: string; children: ReactNode }) {
  return (
    <div className="relative">
      <select aria-label={label} className="field appearance-none pr-10" value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
      <svg
        viewBox="0 0 20 20"
        className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <path d="m5.5 8 4.5 4.5L14.5 8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-3">
      <dt className="text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="3" y="4.5" width="14" height="12" rx="2" />
      <path d="M3 8.5h14M7 3v3M13 3v3" strokeLinecap="round" />
    </svg>
  );
}
