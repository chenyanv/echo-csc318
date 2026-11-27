import { INTERESTS, VALUES, getMatch, type Goal, type Interest, type Profile, type Value } from "./profiles";

/**
 * The matches are fictional, so each one is built around the participant: a set amount of
 * overlap with their profile, plus the match's own interests. Everything downstream (match
 * reasons, Echo chat facts, Help me reply, the LLM simulator) reads this profile, so it all
 * stays consistent. A connection keeps a snapshot, so a match doesn't change mid-chat if the
 * participant edits their profile later.
 *
 * Same input, same match: there's no randomness, so A3 participants who pick the same things
 * see the same people.
 */

interface TailorSpec {
  /** How many of the participant's interests the match shares. */
  sharedInterests: number;
  /** How many of the participant's values the match shares. */
  sharedValues: number;
  /** Same relationship goal as the participant, or keep the match's own. */
  sameGoal: boolean;
  /** Interests the match always has (their scripted lines mention them). */
  core: Interest[];
  /** The match's own interests, in order of preference, used to fill up to five. */
  own: Interest[];
  /** The match's own values, in order of preference, used to fill up to three. */
  ownValues: Value[];
  /** [shared, own] interests → bio. */
  bio: (shared: string, own: string) => string;
  /** One of the match's own interests → "A perfect Sunday" answer. */
  sunday: (own: string) => string;
  /** "I'm looking for" answer, by the match's goal. Omit to keep the written one. */
  lookingFor?: Record<Goal, string>;
  instagram?: string;
}

/** How each interest reads in a sentence ("Usually at the climbing gym"). */
const DOING: Record<Interest, string> = {
  Hiking: "out on a trail",
  Bouldering: "at the climbing gym",
  "Indie music": "digging for new indie music",
  "Indie films": "at a small indie film screening",
  Cooking: "cooking something new",
  "Coffee spots": "hunting for a good flat white",
  "Board games": "losing at board games",
  Reading: "buried in a book",
  Running: "out for a run",
  Museums: "wandering a museum",
  Photography: "out taking photos",
  "Live music": "at a live show",
  Baking: "baking something ambitious",
  "Video games": "playing video games",
  Yoga: "at a yoga class",
  Thrifting: "thrifting",
};

/** An interest in a sentence. Ones the participant typed under "Other" read as "busy with pottery". */
const doing = (i: string) => (DOING as Record<string, string>)[i] ?? `busy with ${i.toLowerCase()}`;

const isListed = (i: string) => (INTERESTS as readonly string[]).includes(i);

const SPECS: Record<string, TailorSpec> = {
  // Today's first match: a strong fit, so the tasks are about getting to know someone.
  alex: {
    sharedInterests: 2,
    sharedValues: 1,
    sameGoal: true,
    core: [],
    own: ["Bouldering", "Coffee spots", "Indie films", "Reading", "Indie music", "Photography", "Running"],
    ownValues: ["Honest communication", "Respecting boundaries", "Humour", "Curiosity"],
    bio: (a, b) => `Usually ${doing(a)} or ${doing(b)}. Slow to warm up, fast to laugh.`,
    sunday: (a) => `Long brunch, then an afternoon ${doing(a)}.`,
    lookingFor: {
      "long-term": "Someone who's easy to talk to and doesn't mind taking it slow.",
      "open-to-see": "Someone easy to talk to. Happy to see where things go.",
      casual: "Someone fun and easy to talk to. Nothing too serious for now.",
    },
    instagram: "alex.r.uoft",
  },
  // A medium fit, with a different relationship goal to show the "Worth knowing" section.
  jordan: {
    sharedInterests: 1,
    sharedValues: 1,
    sameGoal: false,
    core: ["Baking"],
    own: ["Board games", "Video games", "Live music", "Hiking", "Cooking", "Running"],
    ownValues: ["Kindness", "Humour", "Curiosity", "Ambition"],
    bio: (a, b) => `Will absolutely bring snacks. Usually ${doing(a)} or ${doing(b)}.`,
    sunday: (a) => `Sleep in, make pancakes, then an afternoon ${doing(a)}.`,
    instagram: "jordan.k.uoft",
  },
  // A lighter fit.
  priya: {
    sharedInterests: 1,
    sharedValues: 0,
    sameGoal: true,
    core: ["Museums"],
    own: ["Thrifting", "Photography", "Yoga", "Coffee spots", "Reading", "Live music"],
    ownValues: ["Independence", "Curiosity", "Honest communication", "Family"],
    bio: (a, b) => `Sketchbook always in my bag. Usually ${doing(a)} or ${doing(b)}.`,
    sunday: (a) => `Morning sketching, then an afternoon ${doing(a)}.`,
  },
};

function fill<T>(start: T[], pool: T[], avoid: T[], size: number): T[] {
  const out = [...start];
  for (const x of pool) {
    if (out.length >= size) break;
    if (!out.includes(x) && !avoid.includes(x)) out.push(x);
  }
  return out;
}

export function tailorMatch(base: Profile, me: Profile): Profile {
  const spec = SPECS[base.id];
  // Nothing to build around yet (setup skipped): show the match as written.
  if (!spec || me.interests.length === 0) return base;

  // Share the participant's listed interests first; typed-in ones only if there aren't enough.
  const shared = [...me.interests.filter(isListed), ...me.interests.filter((i) => !isListed(i))].slice(0, spec.sharedInterests);
  const withCore = fill<string>(shared, spec.core, [], shared.length + spec.core.length);
  // If the participant picked most of the match's own list, top up from everything else.
  const interests = fill<string>(fill<string>(withCore, spec.own, me.interests, 5), [...INTERESTS], me.interests, 5);

  const isListedValue = (v: string) => (VALUES as readonly string[]).includes(v);
  const sharedValues = [...me.values.filter(isListedValue), ...me.values.filter((v) => !isListedValue(v))].slice(0, spec.sharedValues);
  const values = fill<string>(fill<string>(sharedValues, spec.ownValues, me.values, 3), [...VALUES], me.values, 3);

  // The bio mentions one shared interest and one of their own; Sunday uses another of their own.
  const own = interests.filter((i) => !me.interests.includes(i));
  const goal = spec.sameGoal ? me.goal : base.goal;
  const bio = spec.bio(shared[0] ?? own[0], shared[0] ? own[0] : own[1]);
  const sunday = spec.sunday(own[1] ?? own[0]);

  return {
    ...base,
    interests,
    values,
    goal,
    bio,
    prompts: base.prompts.map((p) =>
      p.q === "A perfect Sunday" ? { ...p, a: sunday } : p.q === "I'm looking for" && spec.lookingFor ? { ...p, a: spec.lookingFor[goal] } : p,
    ),
    instagram: spec.instagram ?? base.instagram,
  };
}

/**
 * The match as this participant sees them: the snapshot saved with the connection if
 * there is one, otherwise built from the participant's current profile.
 */
export function matchFor(
  state: { me: Profile; connections: Record<string, { profile?: Profile }> },
  id: string,
): Profile {
  return state.connections[id]?.profile ?? tailorMatch(getMatch(id), state.me);
}
