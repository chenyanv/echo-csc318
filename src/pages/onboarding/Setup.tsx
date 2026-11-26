import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Chip } from "../../components/ui/Chip";
import { BackButton } from "../../components/ui/PageHeader";
import { GOALS, INTERESTS, PACES, VALUES, type Goal, type Interest, type Pace, type Value } from "../../data/profiles";
import { cleanHandle } from "../../lib/instagram";
import { scrollPageToTop } from "../../components/PhoneFrame";
import { useStore } from "../../state/store";

const PRONOUNS = ["she/her", "he/him", "they/them"];
const YEARS = ["1st year", "2nd year", "3rd year", "4th year", "Grad student"];
const MIN_INTERESTS = 3;
const MAX_INTERESTS = 6;
const MAX_VALUES = 3;

export default function Setup() {
  const navigate = useNavigate();
  const { state, dispatch } = useStore();
  const me = state.me;

  const [step, setStep] = useState(0);
  const [name, setName] = useState(me.name);
  const [pronouns, setPronouns] = useState(me.pronouns);
  const [program, setProgram] = useState(me.program);
  const [year, setYear] = useState(me.year);
  const [goal, setGoal] = useState<Goal | null>(me.interests.length ? me.goal : null);
  const [pace, setPace] = useState<Pace | null>(me.interests.length ? me.pace : null);
  const [interests, setInterests] = useState<Interest[]>(me.interests);
  const [values, setValues] = useState<Value[]>(me.values);
  const [instagram, setInstagram] = useState(me.instagram ?? "");

  const steps = [
    { title: "About you", valid: name.trim().length > 0 },
    { title: "What you're looking for", valid: goal !== null && pace !== null },
    { title: "What you're into", valid: interests.length >= MIN_INTERESTS && values.length > 0 },
    { title: "Instagram (optional)", valid: true },
  ];
  const current = steps[step];

  function toggle<T>(list: T[], item: T, max: number): T[] {
    if (list.includes(item)) return list.filter((x) => x !== item);
    return list.length >= max ? list : [...list, item];
  }

  function next() {
    if (step < steps.length - 1) {
      setStep(step + 1);
      scrollPageToTop();
      return;
    }
    const handle = cleanHandle(instagram);
    dispatch({
      type: "UPDATE_PROFILE",
      patch: {
        name: name.trim(),
        pronouns,
        program: program.trim(),
        year,
        goal: goal!,
        pace: pace!,
        interests,
        values,
        instagram: handle || undefined,
      },
    });
    navigate(state.onboarded ? "/profile" : "/setup/chat");
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between">
        <BackButton to={step === 0 ? (state.onboarded ? "/profile" : "/welcome") : undefined} onBack={step === 0 ? undefined : () => setStep(step - 1)} />
        <span className="text-sm text-muted">
          Step {step + 1} of {steps.length}
        </span>
      </div>

      <div className="mt-3 flex gap-1.5" aria-hidden="true">
        {steps.map((s, i) => (
          <span key={s.title} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-line"}`} />
        ))}
      </div>

      <h1 className="mt-6 text-[26px] font-semibold tracking-tight">{current.title}</h1>

      <div className="mt-6 flex-1 space-y-7">
        {step === 0 && (
          <>
            <Field label="First name">
              <input aria-label="First name" className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" maxLength={30} />
            </Field>
            <Field label="Pronouns" hint="Optional. Echo uses these when it mentions you.">
              <div className="flex flex-wrap gap-2">
                {PRONOUNS.map((p) => (
                  <Chip key={p} selected={pronouns === p} onClick={() => setPronouns(pronouns === p ? "" : p)}>
                    {p}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="Program" hint="Optional">
              <input aria-label="Program" className="field" value={program} onChange={(e) => setProgram(e.target.value)} placeholder="e.g. Psychology" maxLength={40} />
            </Field>
            <Field label="Year" hint="Optional">
              <div className="flex flex-wrap gap-2">
                {YEARS.map((y) => (
                  <Chip key={y} selected={year === y} onClick={() => setYear(year === y ? "" : y)}>
                    {y}
                  </Chip>
                ))}
              </div>
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="I'm looking for">
              <Options options={GOALS} value={goal} onChange={setGoal} />
            </Field>
            <Field label="Before a first date, I'd rather">
              <Options options={PACES} value={pace} onChange={setPace} />
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <Field label="Interests" hint={`Pick ${MIN_INTERESTS} to ${MAX_INTERESTS}. Echo uses these to explain matches. (${interests.length}/${MAX_INTERESTS})`}>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((i) => (
                  <Chip
                    key={i}
                    selected={interests.includes(i)}
                    disabled={!interests.includes(i) && interests.length >= MAX_INTERESTS}
                    onClick={() => setInterests(toggle(interests, i, MAX_INTERESTS))}
                  >
                    {i}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="What matters most to you" hint={`Pick up to ${MAX_VALUES}.`}>
              <div className="flex flex-wrap gap-2">
                {VALUES.map((v) => (
                  <Chip
                    key={v}
                    selected={values.includes(v)}
                    disabled={!values.includes(v) && values.length >= MAX_VALUES}
                    onClick={() => setValues(toggle(values, v, MAX_VALUES))}
                  >
                    {v}
                  </Chip>
                ))}
              </div>
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <p className="text-[15px] text-muted">
              Add your handle if you'd like the option to swap Instagrams with a match later. It stays private until you
              choose to share it with a specific person.
            </p>
            <Field label="Instagram handle">
              <div className="flex items-center rounded-xl border border-line bg-surface focus-within:border-ink">
                <span className="pl-3.5 text-muted">@</span>
                <input
                  className="w-full bg-transparent px-1.5 py-2.5 text-[15px] outline-none"
                  aria-label="Instagram handle"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="yourhandle"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={60}
                />
              </div>
            </Field>
          </>
        )}
      </div>

      <button type="button" className="btn-primary mt-8 w-full" disabled={!current.valid} onClick={next}>
        {step === steps.length - 1
          ? state.onboarded
            ? "Save changes"
            : cleanHandle(instagram)
              ? "Continue"
              : "Skip for now"
          : "Continue"}
      </button>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-medium">{label}</p>
      {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Options<K extends string>({
  options,
  value,
  onChange,
}: {
  options: Record<K, string>;
  value: K | null;
  onChange: (k: K) => void;
}) {
  return (
    <div className="space-y-2" role="radiogroup">
      {(Object.keys(options) as K[]).map((k) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={value === k}
          onClick={() => onChange(k)}
          className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left text-[15px] transition-colors ${
            value === k ? "border-accent bg-accent-soft font-medium" : "border-line bg-surface hover:border-ink/30"
          }`}
        >
          {options[k]}
          <span
            className={`grid size-5 place-items-center rounded-full border-2 ${value === k ? "border-accent" : "border-line"}`}
          >
            {value === k && <span className="size-2.5 rounded-full bg-accent" />}
          </span>
        </button>
      ))}
    </div>
  );
}
