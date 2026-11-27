/**
 * Scripted lines. Used for:
 * - the match's own messages in Script mode (and when the simulator's model can't run);
 * - fallback replies when on-device AI isn't available ("Demo replies").
 */

/** What the match says when they're typing as themselves, in order. */
export const HUMAN_REPLIES: Record<string, string[]> = {
  alex: [
    "hey! glad we matched 🙂 how's your week going?",
    "haha fair. midterm season is no joke. what are you studying?",
    "oh nice. honestly I'm still figuring out what I want after grad, but I like where I'm at",
    "I'm pretty low-key. I'd rather talk for a bit first and meet when it feels right, if that's ok with you",
    "for sure. what's your go-to way to unwind?",
    "that sounds really nice. I've been meaning to get out more",
  ],
  jordan: [
    "hey hey! what's up",
    "nice. I just finished a really ambitious loaf of bread, it was a disaster",
    "honestly I'm down to meet whenever, coffee this week?",
  ],
  priya: [
    "hi! your profile made me smile",
    "have you been to the AGO's new exhibit yet?",
    "I'm a slow texter sorry 😅 but I'm interested",
  ],
};

/** The match's reply after you send a date invite, picked by the facilitator. */
export const INVITE_RESPONSES = {
  accept: "Sounds great, see you then!",
  reschedule: "I'd love to, but I've got a lab then. Could we do 5pm instead?",
  decline: "Thanks for asking. I'd like to keep chatting a bit longer before we meet, if that's ok.",
} as const;

/** Echo's questions in the setup chat when the AI can't run, in order. The chat has no fixed end. */
export const QUICK_CHAT_FALLBACK = [
  "Hi! I'm Echo. This is a quick setup chat so I can learn how you talk. What do you usually do on a free afternoon?",
  "Nice. If you could plan the perfect low-key date, what would it be?",
  "Got it. How do you usually text, short and quick or long messages?",
  "How would your friends describe you in three words?",
  "What always makes you laugh?",
  "Are you more of a planner or do you like to go with the flow?",
  "What's something you could talk about for hours?",
  "How do you like to unwind after a long week?",
  "What's a small thing that makes your day better?",
  "What matters most to you when you're getting to know someone?",
];

/** Echo's last line once the person has shared a lot. */
export const QUICK_CHAT_ENOUGH = "Thanks, this is plenty to go on. You can finish setup now, and change anything later in your profile.";
