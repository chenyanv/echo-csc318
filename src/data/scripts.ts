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

/** Fallback lines for the Quick Chat setup when AI can't run. */
export const QUICK_CHAT_FALLBACK = [
  "Hi! I'm Echo. This is a quick setup chat so I can learn how you talk. What do you usually do on a free afternoon?",
  "Nice. If you could plan the perfect low-key date, what would it be?",
  "Got it. Last one: how do you usually text, short and quick or long messages?",
  "Thanks! That's all I need for now. You can change anything later in your profile.",
];
