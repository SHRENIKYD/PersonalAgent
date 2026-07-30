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
 * yet); existing data in the browser is never overwritten by this.
 */
export interface MonthSeed {
  theme: string;
  career: [string, string];
  health: [string, string];
  habits: [string, string];
  balance: [string, string];
}

export const MONTH_SEEDS: MonthSeed[] = [
  {
    theme: 'Foundations',
    career: ['Finish the Scalar full-stack course modules for this month', 'Start DSA: complete the Arrays & Strings and Linked List topics (30 problems)'],
    health: ['Follow the workout split 5–6x/week without missing a session', 'Hit daily protein target (130–140 g) at least 5 days/week'],
    habits: ['Log every workout the day it happens', 'No sugar in tea/coffee, all week'],
    balance: ['Block one evening a week fully offline', 'Call one friend or family member you have been meaning to catch up with'],
  },
  {
    theme: 'Momentum',
    career: ['Build one portfolio project using the full-stack skills so far', 'DSA: Trees, Graphs, and Recursion topics (30 problems)'],
    health: ['Add 2.5 kg to your main lifts (squat, bench, deadlift) vs month 1', 'Weigh in 3x/week and track the weekly average'],
    habits: ['8,000+ steps every day, including rest days', "Take supplements on schedule (see Fitness tab) — don't miss a day"],
    balance: ['Plan and take one full rest day with no work or study', 'One real, unhurried conversation with someone close to you'],
  },
  {
    theme: 'Sharpen',
    career: ['CS Fundamentals: finish OS, DBMS, and Networking sections', 'DSA: Dynamic Programming and Greedy topics (30 problems)'],
    health: ['Take progress photos and compare to month 1', 'Hold the free-meal rule — one per week, not a free day'],
    habits: ['Deep-work block on job prep, 5 days a week', 'Sleep 7+ hours at least 5 nights this week'],
    balance: ['Reconnect with an old colleague or mentor — one message, one reply', 'A full day genuinely away from screens'],
  },
  {
    theme: 'System design & mock interviews',
    career: ['System Design: building blocks + 2 case studies', 'Do 3 mock interviews (DSA or system design) with a friend or on a platform'],
    health: ['Increase a weak lift (whichever has stalled) with a deload if needed', 'Keep the oil budget under 15 g/day, tracked'],
    habits: ['Review and adjust the diet plan per the 2-week rule if weight has stalled', 'Stick to the 9:30 PM wind-down for training days'],
    balance: ['Plan something to look forward to next month', 'Check in with someone you have not spoken to in a while'],
  },
  {
    theme: 'Apply',
    career: ['Update resume and LinkedIn with the projects and skills so far', 'Apply to product-based companies — set a weekly application target and hit it'],
    health: ['Compare progress photos and weight trend across the full program', 'Keep training through interview stress — don\'t let prep replace the gym'],
    habits: ['Track every application and follow-up in the Tasks tab', 'Protect sleep during interview weeks — it is not optional'],
    balance: ['Tell someone supportive that you are actively interviewing', 'One low-key day to reset before the next push'],
  },
  {
    theme: 'Close it out',
    career: ['Certificates: finish whichever is closest to done (see Certificates tab)', 'Do a full review pass — DSA/CS/System Design/Web — of anything still shaky'],
    health: ['Set the next 8–10 week training block, or start the deload week', 'Write down what worked and what to change for the next cycle'],
    habits: ['Review the full 26-week habit grid — what stuck, what didn\'t', 'Plan the next 6-month roadmap before this one runs out'],
    balance: ['Do something to mark finishing the program, however small', 'Thank the people who supported you through it'],
  },
];
