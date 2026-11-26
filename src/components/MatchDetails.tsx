import type { Profile } from "../data/profiles";
import { buildMatchReason } from "../lib/matchReason";
import { Avatar } from "./ui/Avatar";

export function MatchHeader({ match }: { match: Profile }) {
  const meta = [match.pronouns, [match.program, match.year].filter(Boolean).join(", ")].filter(Boolean);
  return (
    <div className="flex items-center gap-4">
      <Avatar profile={match} size="lg" />
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{match.name}</h2>
        <p className="mt-0.5 text-[15px] text-muted">{meta.join(" · ")}</p>
      </div>
    </div>
  );
}

/**
 * What the two profiles have in common, and where they differ. Built from both profiles by
 * rules, not by the AI, and it says so, so people know these lines are facts rather than guesses.
 * (Not "why Echo suggested them": the order of daily matches isn't based on these.)
 */
export function MatchReasonBlock({ me, match, hideTitle }: { me: Profile; match: Profile; hideTitle?: boolean }) {
  const r = buildMatchReason(me, match);
  return (
    <div className="space-y-5">
      <Section
        title={hideTitle ? undefined : `What you and ${match.name} have in common`}
        note="Based only on what you both wrote in your profiles."
      >
        {r.inCommon.length > 0 ? (
          <Bullets items={r.inCommon} tone="ok" />
        ) : (
          <p className="text-[15px] text-muted">You don't have much listed in common, which can be a good thing too.</p>
        )}
      </Section>

      {r.differences.length > 0 && (
        <Section title="Worth knowing">
          <Bullets items={r.differences} tone="warn" />
        </Section>
      )}

      <Section title="What Echo can't know yet">
        <Bullets items={r.unknown} tone="muted" />
      </Section>
    </div>
  );
}

export function InterestList({ me, match }: { me: Profile; match: Profile }) {
  return (
    <div className="flex flex-wrap gap-2">
      {match.interests.map((i) => {
        const shared = me.interests.includes(i);
        return (
          <span
            key={i}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm ${
              shared ? "border-ok/30 bg-ok-soft text-ok" : "border-line bg-surface"
            }`}
          >
            {shared && <span className="sr-only">Shared:</span>}
            {i}
          </span>
        );
      })}
    </div>
  );
}

function Section({ title, note, children }: { title?: string; note?: string; children: React.ReactNode }) {
  return (
    <section>
      {title && <h3 className="font-semibold">{title}</h3>}
      {note && <p className={`${title ? "mt-0.5" : ""} text-[13px] text-muted`}>{note}</p>}
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Bullets({ items, tone }: { items: string[]; tone: "ok" | "warn" | "muted" }) {
  const dot = tone === "ok" ? "bg-ok" : tone === "warn" ? "bg-warn" : "bg-muted/50";
  return (
    <ul className="space-y-1.5">
      {items.map((t) => (
        <li key={t} className="flex gap-2.5 text-[15px] leading-snug">
          <span className={`mt-2 size-1.5 shrink-0 rounded-full ${dot}`} />
          {t}
        </li>
      ))}
    </ul>
  );
}
