import { useState } from "react";
import type { Profile } from "../../data/profiles";

const SIZES = { sm: "size-10 text-base", md: "size-14 text-xl", lg: "size-24 text-4xl" } as const;

/** Illustrated avatar when the profile has one, otherwise the initial on a gradient. Never a photo of a real person. */
export function Avatar({
  profile,
  size = "md",
}: {
  profile: Pick<Profile, "name" | "avatar" | "picture">;
  size?: keyof typeof SIZES;
}) {
  const [a, b] = profile.avatar;
  const [broken, setBroken] = useState(false);

  if (profile.picture && !broken) {
    return (
      <span
        aria-hidden="true"
        className={`block shrink-0 overflow-hidden rounded-full ${SIZES[size]}`}
        style={{ backgroundImage: `linear-gradient(135deg, ${a}33, ${b}40)` }}
      >
        <img src={profile.picture} alt="" className="size-full object-cover" onError={() => setBroken(true)} />
      </span>
    );
  }

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
