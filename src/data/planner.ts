/**
 * Options for the date planner. Places are general areas around UTSG rather than
 * specific businesses, so the prototype doesn't recommend a real venue.
 */

export interface Activity {
  id: string;
  label: string;
  /** Typical spend per person, in CAD. */
  costPerPerson: number;
  durationMin: number;
  places: string[];
}

export const ACTIVITIES: Activity[] = [
  {
    id: "coffee",
    label: "Grab a coffee",
    costPerPerson: 7,
    durationMin: 60,
    places: ["Café on Harbord Street", "Café near Robarts Library", "Café in Kensington Market"],
  },
  {
    id: "walk",
    label: "Walk and talk",
    costPerPerson: 0,
    durationMin: 60,
    places: ["Philosopher's Walk", "Queen's Park", "Trinity Bellwoods Park"],
  },
  {
    id: "museum",
    label: "Visit a museum",
    costPerPerson: 0,
    durationMin: 90,
    places: ["Art Gallery of Ontario (free for under 25s)", "Royal Ontario Museum"],
  },
  {
    id: "food",
    label: "Grab a bite",
    costPerPerson: 18,
    durationMin: 75,
    places: ["Spot on Baldwin Street", "Spot in Chinatown on Spadina", "Food court at Hart House"],
  },
  {
    id: "games",
    label: "Board game café",
    costPerPerson: 12,
    durationMin: 120,
    places: ["Board game café on Bloor Street"],
  },
];

export const TIMES = ["11:00", "13:00", "15:00", "17:00", "19:00"] as const;

export const DEFAULT_PLAN = {
  activityId: "coffee",
  place: ACTIVITIES[0].places[0],
  time: "15:00",
  /** Days from today. */
  dayOffset: 3,
};

export function getActivity(id: string): Activity {
  const a = ACTIVITIES.find((x) => x.id === id);
  if (!a) throw new Error(`Unknown activity: ${id}`);
  return a;
}

export function estimateCost(activityId: string): string {
  const per = getActivity(activityId).costPerPerson;
  return per === 0 ? "Free" : `About $${per} each`;
}
