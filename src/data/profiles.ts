/**
 * Fictional people for the prototype. Nobody here is real.
 * Interests and values use the shared vocab below so match reasons can be computed,
 * not generated (small on-device models invent facts).
 */

export const INTERESTS = [
  "Hiking",
  "Bouldering",
  "Indie music",
  "Indie films",
  "Cooking",
  "Coffee spots",
  "Board games",
  "Reading",
  "Running",
  "Museums",
  "Photography",
  "Live music",
  "Baking",
  "Video games",
  "Yoga",
  "Thrifting",
] as const;
export type Interest = (typeof INTERESTS)[number];

export const VALUES = [
  "Honest communication",
  "Respecting boundaries",
  "Kindness",
  "Ambition",
  "Family",
  "Humour",
  "Curiosity",
  "Independence",
] as const;
export type Value = (typeof VALUES)[number];

export const GOALS = {
  "long-term": "A long-term relationship",
  "open-to-see": "Open to seeing where it goes",
  "casual": "Something casual for now",
} as const;
export type Goal = keyof typeof GOALS;

/** Goals in a sentence. The labels above are answers ("Open to seeing where it goes"), not noun phrases. */
export const GOAL_SENTENCES: Record<Goal, { about: (name: string) => string; both: string }> = {
  "long-term": { about: (n) => `${n} is looking for a long-term relationship.`, both: "You're both looking for a long-term relationship." },
  "open-to-see": { about: (n) => `${n} is open to seeing where things go.`, both: "You're both open to seeing where things go." },
  casual: { about: (n) => `${n} is looking for something casual for now.`, both: "You're both looking for something casual for now." },
};

/** An interest as it reads in a sentence ("into finding good coffee spots", not "into coffee spots"). */
export function interestPhrase(i: string): string {
  return i === "Coffee spots" ? "finding good coffee spots" : i.toLowerCase();
}

export const PACES = {
  "chat-first": "Chat for a while before meeting",
  "meet-soon": "Meet fairly soon after a short chat",
} as const;
export type Pace = keyof typeof PACES;

export interface Profile {
  id: string;
  name: string;
  pronouns: string;
  age: number;
  program: string;
  year: string;
  bio: string;
  /** From INTERESTS, plus any the person typed under "Other". */
  interests: string[];
  /** From VALUES, plus any the person typed under "Other". */
  values: string[];
  goal: Goal;
  pace: Pace;
  /** Short Q&A shown on the full profile. */
  prompts: { q: string; a: string }[];
  /** Two colours for the generated avatar (no photos in the prototype). */
  avatar: [string, string];
  /** Only shown to the other person after this user chooses to share it. */
  instagram?: string;
}

export const MATCHES: Profile[] = [
  {
    id: "alex",
    name: "Alex",
    pronouns: "they/them",
    age: 21,
    program: "Psychology",
    year: "3rd year",
    bio: "Usually at a climbing gym or hunting for a good flat white. Slow to warm up, fast to laugh.",
    interests: ["Bouldering", "Indie films", "Coffee spots", "Indie music", "Reading"],
    values: ["Honest communication", "Respecting boundaries", "Humour"],
    goal: "long-term",
    pace: "chat-first",
    prompts: [
      { q: "A perfect Sunday", a: "Morning climb, long brunch, then a movie I've never heard of." },
      { q: "I'm looking for", a: "Someone who's easy to talk to and doesn't mind taking it slow." },
      { q: "Green flag", a: "You text back when you say you will." },
    ],
    avatar: ["#f97066", "#fdb022"],
    instagram: "alex.climbs.uoft",
  },
  {
    id: "jordan",
    name: "Jordan",
    pronouns: "he/him",
    age: 22,
    program: "Computer Science",
    year: "4th year",
    bio: "Board game collector, amateur baker, will absolutely bring snacks.",
    interests: ["Board games", "Baking", "Video games", "Hiking", "Live music"],
    values: ["Kindness", "Humour", "Curiosity"],
    goal: "open-to-see",
    pace: "meet-soon",
    prompts: [
      { q: "A perfect Sunday", a: "Bake something ambitious, then lose at Catan." },
      { q: "I'm looking for", a: "Someone curious who likes trying new things." },
      { q: "Green flag", a: "You're nice to servers." },
    ],
    avatar: ["#7a5af8", "#36bffa"],
    instagram: "jordan.bakes",
  },
  {
    id: "priya",
    name: "Priya",
    pronouns: "she/her",
    age: 20,
    program: "Architecture",
    year: "2nd year",
    bio: "Sketchbook always in my bag. Big fan of museums, thrift stores and long walks with no plan.",
    interests: ["Museums", "Thrifting", "Photography", "Coffee spots", "Yoga"],
    values: ["Independence", "Curiosity", "Honest communication"],
    goal: "long-term",
    pace: "chat-first",
    prompts: [
      { q: "A perfect Sunday", a: "AGO in the morning, Kensington Market in the afternoon." },
      { q: "I'm looking for", a: "Someone with their own passions who wants to share them." },
      { q: "Green flag", a: "You ask follow-up questions." },
    ],
    avatar: ["#12b76a", "#a6ef67"],
  },
];

export function getMatch(id: string): Profile {
  const match = MATCHES.find((m) => m.id === id);
  if (!match) throw new Error(`Unknown match: ${id}`);
  return match;
}

/** Starting point for the participant's own profile in task presets. */
export const SAMPLE_USER: Profile = {
  id: "me",
  name: "Sam",
  pronouns: "",
  age: 21,
  program: "",
  year: "",
  bio: "",
  interests: ["Hiking", "Indie music", "Cooking", "Coffee spots", "Indie films"],
  values: ["Honest communication", "Respecting boundaries", "Kindness"],
  goal: "long-term",
  pace: "chat-first",
  prompts: [],
  avatar: ["#e5484d", "#f76b15"],
};

/** Empty profile for a brand-new participant. Setup fills it in. */
export const BLANK_USER: Profile = {
  ...SAMPLE_USER,
  name: "",
  pronouns: "",
  interests: [],
  values: [],
};
