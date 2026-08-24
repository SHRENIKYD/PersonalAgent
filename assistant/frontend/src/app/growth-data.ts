import { TrackKey } from './models';

export const TRACKS: { key: TrackKey; label: string }[] = [
  { key: 'career', label: 'Career & Skills' },
  { key: 'health', label: 'Health & Energy' },
  { key: 'habits', label: 'Habits & Systems' },
  { key: 'balance', label: 'Balance & Relationships' },
];

export const GOAL_PLACEHOLDERS: Record<TrackKey, string> = {
  career: 'e.g. Finish one course module',
  health: 'e.g. Move your body 4x this week',
  habits: 'e.g. Stick to a consistent wind-down routine',
  balance: 'e.g. Have one real conversation with someone you love',
};

/** Goal slots per track, per month. Every track on every month has this many rows. */
export const GOALS_PER_TRACK = 3;

/**
 * Six month labels starting from the current month — computed at call time rather than
 * hardcoded, so the roadmap never goes stale the way a fixed "August 2026" would.
 */
export function generateMonthNames(count = 6): string[] {
  const names: string[] = [];
  const start = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    names.push(d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }));
  }
  return names;
}

/**
 * Starter content for a fresh 6-month roadmap — a product-based-company job search built
 * on top of the Scalar full-stack course already underway, paired with the recomposition
 * plan on the Fitness tab. Only seeds a brand-new profile (no saved `assistant-roadmap-v1`
 * yet); existing data in the browser is never overwritten by this — use the "Fill empty
 * goals with suggested plan" button on the Growth tab to pull it into an existing roadmap.
 */
export interface MonthSeed {
  theme: string;
  career: [string, string, string];
  health: [string, string, string];
  habits: [string, string, string];
  balance: [string, string, string];
}

export const MONTH_SEEDS: MonthSeed[] = [
  {
    theme: 'Foundations',
    career: [
      'Finish the Scalar full-stack course modules for this month',
      'Start DSA: complete the Arrays & Strings and Linked List topics (30 problems)',
      'Set up a public GitHub with at least one repo pinned',
    ],
    health: [
      'Follow the workout split 5–6x/week without missing a session',
      'Hit daily protein target (130–140 g) at least 5 days/week',
      'Learn the exercises with correct form before adding weight',
    ],
    habits: [
      'Log every workout the day it happens',
      'No sugar in tea/coffee, all week',
      '500 ml water on waking, before the gym',
    ],
    balance: [
      'Block one evening a week fully offline',
      'Call one friend or family member you have been meaning to catch up with',
      'Get 7+ hours of sleep at least 5 nights this week',
    ],
  },
  {
    theme: 'Momentum',
    career: [
      'Build one portfolio project using the full-stack skills so far',
      'DSA: Trees, Graphs, and Recursion topics (30 problems)',
      'Write a short README for your portfolio project explaining the stack and decisions',
    ],
    health: [
      'Add 2.5 kg to your main lifts (squat, bench, deadlift) vs month 1',
      'Weigh in 3x/week and track the weekly average',
      'Hit 8,000+ steps on at least 5 days this week',
    ],
    habits: [
      '8,000+ steps every day, including rest days',
      "Take supplements on schedule (see Fitness tab) — don't miss a day",
      'Meal-prep at least one day\'s worth of food in advance',
    ],
    balance: [
      'Plan and take one full rest day with no work or study',
      'One real, unhurried conversation with someone close to you',
      'Do one thing purely for fun, unrelated to career or fitness',
    ],
  },
  {
    theme: 'Sharpen',
    career: [
      'CS Fundamentals: finish OS, DBMS, and Networking sections',
      'DSA: Dynamic Programming and Greedy topics (30 problems)',
      'Time yourself solving 5 DSA problems under interview conditions',
    ],
    health: [
      'Take progress photos and compare to month 1',
      'Hold the free-meal rule — one per week, not a free day',
      'Adjust the diet per the 2-week rule if weight has stalled',
    ],
    habits: [
      'Deep-work block on job prep, 5 days a week',
      'Sleep 7+ hours at least 5 nights this week',
      'No phone in the first 30 minutes after waking',
    ],
    balance: [
      'Reconnect with an old colleague or mentor — one message, one reply',
      'A full day genuinely away from screens',
      'Say no to one thing that would crowd out training or prep this month',
    ],
  },
  {
    theme: 'System design & mock interviews',
    career: [
      'System Design: building blocks + 2 case studies',
      'Do 3 mock interviews (DSA or system design) with a friend or on a platform',
      'Review CS Fundamentals weak spots flagged from mock interviews',
    ],
    health: [
      'Increase a weak lift (whichever has stalled) with a deload if needed',
      'Keep the oil budget under 15 g/day, tracked',
      'Keep training through a busy prep week rather than skipping it',
    ],
    habits: [
      'Review and adjust the diet plan per the 2-week rule if weight has stalled',
      'Stick to the 9:30 PM wind-down for training days',
      'Write down one interview takeaway after every mock',
    ],
    balance: [
      'Plan something to look forward to next month',
      'Check in with someone you have not spoken to in a while',
      'Keep at least one evening a week completely unscheduled',
    ],
  },
  {
    theme: 'Apply',
    career: [
      'Update resume and LinkedIn with the projects and skills so far',
      'Apply to product-based companies — set a weekly application target and hit it',
      'Ask for one referral or warm intro at a company you want',
    ],
    health: [
      'Compare progress photos and weight trend across the full program',
      "Keep training through interview stress — don't let prep replace the gym",
      'Protect the workout schedule even on interview days',
    ],
    habits: [
      'Track every application and follow-up in the Tasks tab',
      'Protect sleep during interview weeks — it is not optional',
      'Debrief after every interview: what went well, what to fix',
    ],
    balance: [
      'Tell someone supportive that you are actively interviewing',
      'One low-key day to reset before the next push',
      'Celebrate every interview landed, regardless of outcome',
    ],
  },
  {
    theme: 'Close it out',
    career: [
      'Finish whichever certification you have closest to done',
      'Do a full review pass — DSA/CS/System Design/Web — of anything still shaky',
      'Negotiate or evaluate any offer against your own baseline, not just the number',
    ],
    health: [
      'Set the next 8–10 week training block, or start the deload week',
      'Write down what worked and what to change for the next cycle',
      'Take a final round of progress photos for the program',
    ],
    habits: [
      "Review the full 26-week habit grid — what stuck, what didn't",
      'Plan the next 6-month roadmap before this one runs out',
      'Keep the diet/workout habits going regardless of job-search outcome',
    ],
    balance: [
      'Do something to mark finishing the program, however small',
      'Thank the people who supported you through it',
      'Take one full weekend off before starting the next roadmap',
    ],
  },
];
