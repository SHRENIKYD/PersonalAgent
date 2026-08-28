import { SetEntry } from './models';

/**
 * Turning a training log into something that answers back.
 *
 * All of this is deterministic arithmetic over sets you have already recorded — no model is
 * involved, so it reads the same on every provider and works with no key and no signal. That
 * matters more here than anywhere else in the app: a suggestion to add weight has to be right
 * every time, and a model guessing at it would be worse than nothing.
 */

/** Barbell and machine loads move in 2.5kg steps; leg work takes 5kg comfortably. */
const UPPER_STEP = 2.5;
const LOWER_STEP = 5;

/** Groups where a 5kg jump is a normal week's progress rather than a leap. */
const LOWER_GROUPS = ['legs', 'quads', 'hamstrings', 'glutes', 'calves', 'back'];

export interface RepTarget {
  sets: number;
  low: number;
  high: number;
}

/**
 * Reads "4 × 6–8" into a target. The dash may be an en dash or a hyphen and the cross may be
 * an × or an x, because the plan is written for humans rather than for this parser.
 */
export function parseRepTarget(spec: string): RepTarget | null {
  const m = /(\d+)\s*[×x]\s*(\d+)(?:\s*[–\-]\s*(\d+))?/i.exec(spec ?? '');
  if (!m) return null;
  const sets = Number(m[1]);
  const low = Number(m[2]);
  const high = m[3] ? Number(m[3]) : low;
  return { sets, low, high };
}

export type Advice =
  | { kind: 'up'; weight: number; from: number; text: string }
  | { kind: 'hold'; weight: number; text: string }
  | { kind: 'deload'; weight: number; from: number; text: string }
  | { kind: 'start'; text: string };

/**
 * What to do next, given the last session on this movement.
 *
 * The rule is double progression, which is what the plan's rep ranges imply: work up the
 * range at a fixed weight, and only add load once the top of the range is met on every set.
 * Adding weight the moment a single set hits the top would outrun form, which is the failure
 * mode the plan's "learn the exercises with correct form" goal is guarding against.
 *
 * `failedTwice` triggers a deload rather than a third identical session — repeating a weight
 * that has already stalled twice is how people spend a month on the same number.
 */
export function nextSetAdvice(
  previous: SetEntry[] | null,
  target: RepTarget | null,
  group = '',
  failedTwice = false,
): Advice {
  if (!previous || previous.length === 0) {
    return { kind: 'start', text: 'No history yet — log today and this fills in.' };
  }

  const weight = Math.max(...previous.map(s => s.weight));
  const atWeight = previous.filter(s => s.weight === weight);
  const shown = `${trim(weight)}kg × ${atWeight.map(s => s.reps).join('/')}`;

  if (!target) {
    return { kind: 'hold', weight, text: `Last: ${shown}` };
  }

  const enoughSets = atWeight.length >= target.sets;
  const allAtTop = atWeight.every(s => s.reps >= target.high);

  if (enoughSets && allAtTop) {
    const step = LOWER_GROUPS.includes(group.toLowerCase()) ? LOWER_STEP : UPPER_STEP;
    const next = weight + step;
    return {
      kind: 'up',
      weight: next,
      from: weight,
      text: `Last: ${shown} — all sets at the top of the range, go ${trim(next)}kg`,
    };
  }

  if (failedTwice) {
    // 10% off, rounded to a loadable step, then work back up.
    const step = LOWER_GROUPS.includes(group.toLowerCase()) ? LOWER_STEP : UPPER_STEP;
    const back = Math.max(step, Math.round((weight * 0.9) / step) * step);
    return {
      kind: 'deload',
      weight: back,
      from: weight,
      text: `Stalled twice at ${trim(weight)}kg — drop to ${trim(back)}kg and build back up`,
    };
  }

  return { kind: 'hold', weight, text: `Last: ${shown} — stay at ${trim(weight)}kg for ${target.high} reps` };
}

/**
 * True when the last two sessions on a movement both fell short of the rep target at the
 * same weight. Two is the threshold because one bad session is a bad night's sleep.
 */
export function hasStalledTwice(
  sessions: { sets: SetEntry[] }[],
  target: RepTarget | null,
): boolean {
  if (!target || sessions.length < 2) return false;
  return sessions.slice(-2).every(s => {
    if (s.sets.length === 0) return false;
    const w = Math.max(...s.sets.map(x => x.weight));
    return s.sets.filter(x => x.weight === w).some(x => x.reps < target.high);
  }) && sameTopWeight(sessions.slice(-2));
}

function sameTopWeight(sessions: { sets: SetEntry[] }[]): boolean {
  const tops = sessions.map(s => (s.sets.length ? Math.max(...s.sets.map(x => x.weight)) : NaN));
  return tops.every(t => t === tops[0] && !Number.isNaN(t));
}

// ---------------- body weight ----------------

/**
 * A rolling average over the trailing window, one point per recorded day.
 *
 * Day-to-day body weight is mostly water and gut content — swings of a kilo mean nothing, and
 * reading them as progress is how people abandon a plan that is working. The average is the
 * only line worth looking at, so it is what gets drawn.
 */
export function rollingAverage(
  entries: { date: string; kg: number }[],
  window = 7,
): { date: string; kg: number }[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((_, i) => {
    const slice = sorted.slice(Math.max(0, i - window + 1), i + 1);
    const mean = slice.reduce((sum, e) => sum + e.kg, 0) / slice.length;
    return { date: sorted[i].date, kg: Math.round(mean * 100) / 100 };
  });
}

/**
 * Change per week implied by the trend, comparing the current average against the one a week
 * back. Returns null until there is enough history for the comparison to mean anything.
 */
export function weeklyChange(entries: { date: string; kg: number }[]): number | null {
  const avg = rollingAverage(entries);
  if (avg.length < 8) return null;
  const now = avg[avg.length - 1];
  const then = avg[Math.max(0, avg.length - 8)];
  return Math.round((now.kg - then.kg) * 100) / 100;
}

// ---------------- weekly volume ----------------

/**
 * Hard sets per muscle group over a date range.
 *
 * Sets, not tonnage: set count is what training volume research actually tracks, and tonnage
 * would rank a heavy low-rep day far above a productive higher-rep one.
 */
export function volumeByGroup(
  log: Record<string, SetEntry[]>,
  groupOf: (exercise: string) => string | undefined,
  fromDate: string,
  toDate: string,
): { group: string; sets: number }[] {
  const totals = new Map<string, number>();
  Object.entries(log).forEach(([key, sets]) => {
    const bar = key.indexOf('|');
    const date = key.slice(0, bar);
    if (date < fromDate || date > toDate) return;
    const group = groupOf(key.slice(bar + 1));
    if (!group) return;
    totals.set(group, (totals.get(group) ?? 0) + sets.length);
  });
  return [...totals.entries()]
    .map(([group, sets]) => ({ group, sets }))
    .sort((a, b) => b.sets - a.sets);
}

/** Drops a trailing .0 so 62.5kg and 60kg both read naturally. */
function trim(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

// ---------------- personal records ----------------

/*
 * PR detection, borrowed from openGym.
 *
 * The app already had a personalBest, but it compared weight alone — which quietly gets the
 * answer wrong. 60kg × 10 is a bigger lift than 62.5kg × 3 by any strength measure, yet only
 * the second would ever have counted. A log that congratulates the wrong set is worse than
 * one that says nothing, because it teaches you to chase the number it rewards.
 *
 * So three records are tracked rather than one, and they genuinely differ:
 *
 *   heaviest   — the most weight moved for any number of reps. What most people mean by a PR.
 *   best1RM    — the largest estimated one-rep max. Catches rep PRs at a lighter load.
 *   mostReps   — the most reps at the heaviest weight you have used. Catches the session where
 *                the load did not move but you got two more out of it, which is exactly what
 *                double progression is waiting for.
 */

/**
 * Epley: 1RM ≈ w × (1 + reps/30).
 *
 * Chosen over Brzycki because Brzycki's denominator collapses toward zero past about 12 reps
 * and returns absurd numbers on a set of 20; Epley just drifts high, which is the safer
 * failure for something shown next to a suggestion to add weight. Both are estimates and
 * neither is worth more than one decimal place.
 */
export function estimated1RM(set: SetEntry): number {
  if (set.weight <= 0 || set.reps <= 0) return 0;
  return Math.round(set.weight * (1 + set.reps / 30) * 10) / 10;
}

export interface PersonalRecords {
  heaviest: SetEntry | null;
  best1RM: SetEntry | null;
  /** Most reps achieved at the heaviest weight ever used for this movement. */
  mostRepsAtTopWeight: SetEntry | null;
}

export function personalRecords(sets: SetEntry[]): PersonalRecords {
  const valid = sets.filter(s => s.weight > 0 && s.reps > 0);
  if (!valid.length) return { heaviest: null, best1RM: null, mostRepsAtTopWeight: null };

  let heaviest = valid[0];
  let best1RM = valid[0];
  for (const s of valid) {
    // Ties break toward more reps: same weight for more reps is the better set.
    if (s.weight > heaviest.weight || (s.weight === heaviest.weight && s.reps > heaviest.reps)) {
      heaviest = s;
    }
    if (estimated1RM(s) > estimated1RM(best1RM)) best1RM = s;
  }

  const topWeight = heaviest.weight;
  let mostReps = valid.filter(s => s.weight === topWeight)[0] ?? null;
  for (const s of valid) {
    if (s.weight === topWeight && (!mostReps || s.reps > mostReps.reps)) mostReps = s;
  }

  return { heaviest, best1RM, mostRepsAtTopWeight: mostReps };
}

export interface PrResult {
  /** True if the set beats the most weight ever moved on this movement. */
  heaviest: boolean;
  /** True if it beats the best estimated one-rep max. */
  best1RM: boolean;
  /** True if it beats the rep count at the heaviest weight previously used. */
  reps: boolean;
  /** Any of the above — what the UI shows a badge for. */
  any: boolean;
}

const NO_PR: PrResult = { heaviest: false, best1RM: false, reps: false, any: false };

/**
 * Whether a set just logged beats what came before it.
 *
 * `history` must be the sets from *before* this one. Passing the full log including the
 * candidate makes every set its own record and the badge fires on everything, which is the
 * obvious way to get this wrong.
 *
 * A first-ever set on a movement is deliberately not a PR. Technically it beats an empty
 * history, but celebrating the first set of an exercise you have never done is noise, and it
 * would fire on every movement the first week of a new programme.
 */
export function detectPr(set: SetEntry, history: SetEntry[]): PrResult {
  if (set.weight <= 0 || set.reps <= 0) return NO_PR;
  const prior = history.filter(s => s.weight > 0 && s.reps > 0);
  if (!prior.length) return NO_PR;

  const before = personalRecords(prior);
  const heaviest = !!before.heaviest && set.weight > before.heaviest.weight;
  const best1RM = !!before.best1RM && estimated1RM(set) > estimated1RM(before.best1RM);
  const reps =
    !!before.mostRepsAtTopWeight &&
    set.weight === before.mostRepsAtTopWeight.weight &&
    set.reps > before.mostRepsAtTopWeight.reps;

  return { heaviest, best1RM, reps, any: heaviest || best1RM || reps };
}

// ---------------- body-weight goal ----------------

/*
 * A goal line for the weight chart, also from openGym.
 *
 * The interesting half is not the line, it is what the line does to the delta colouring.
 * Until now "+0.3 kg / week" was painted as bad and "−0.3" as good, which silently assumes
 * everyone is cutting. On a bulk that is exactly backwards, and the app was quietly
 * discouraging the thing the user was trying to do. With a goal, direction is knowable:
 * moving toward it is good whichever way the number went.
 */

export type GoalDirection = 'cut' | 'gain' | 'reached';

export interface GoalStatus {
  direction: GoalDirection;
  /** Kilos still to go. Always positive; direction says which way. */
  remainingKg: number;
  /** True when the recent trend moves toward the goal, false when away, null when flat or
   *  when there is not enough data to say. */
  movingToward: boolean | null;
  /** Weeks to arrival at the current rate, or null when that cannot be projected. */
  weeksToGoal: number | null;
}

/** Within this much of the goal counts as arrived, so the readout stops nagging at 0.2kg. */
const GOAL_TOLERANCE_KG = 0.3;

export function goalStatus(
  entries: { date: string; kg: number }[],
  goalKg: number,
): GoalStatus | null {
  if (!entries.length || !(goalKg > 0)) return null;

  // The smoothed value, not the last reading — day-to-day body weight swings by more than a
  // week of real progress, so a raw last-reading comparison flips direction on a salty meal.
  const avg = rollingAverage(entries);
  const current = avg.length ? avg[avg.length - 1].kg : entries[entries.length - 1].kg;
  const gap = current - goalKg;

  if (Math.abs(gap) <= GOAL_TOLERANCE_KG) {
    return { direction: 'reached', remainingKg: 0, movingToward: null, weeksToGoal: 0 };
  }

  const direction: GoalDirection = gap > 0 ? 'cut' : 'gain';
  const perWeek = weeklyChange(entries);

  let movingToward: boolean | null = null;
  let weeksToGoal: number | null = null;
  if (perWeek !== null && Math.abs(perWeek) > 0.05) {
    movingToward = direction === 'cut' ? perWeek < 0 : perWeek > 0;
    if (movingToward) {
      weeksToGoal = Math.max(1, Math.round(Math.abs(gap) / Math.abs(perWeek)));
    }
  }

  return {
    direction,
    remainingKg: Math.round(Math.abs(gap) * 10) / 10,
    movingToward,
    weeksToGoal,
  };
}
