import type { Profile } from "../../data/profiles";

const SIZES = { sm: "size-10 text-base", md: "size-14 text-xl", lg: "size-24 text-4xl" } as const;

/** Generated avatar: the prototype uses no photos of real people. */
export function Avatar({ profile, size = "md" }: { profile: Pick<Profile, "name" | "avatar">; size?: keyof typeof SIZES }) {
  const [a, b] = profile.avatar;
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full font-semibold text-white ${SIZES[size]}`}
      style={{ backgroundImage: `linear-gradient(135deg, ${a}, ${b})` }}
    >
      {profile.name.charAt(0).toUpperCase()}
    </span>
  );
}
