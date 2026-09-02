/**
 * What the launch screen says about you.
 *
 * Kept as a pure function over plain data rather than a method on a component, because the
 * interesting part is the selection — which two or three facts out of everything logged are
 * worth a person's attention at the moment they open the app — and that deserves tests that
 * do not need Angular.
 *
 * Rules that shape it:
 *
 * - Never more than three lines. This screen is read in about two seconds, and a fourth line
 *   turns a glance into a task.
 * - Never a zero. "0 sets logged" and "no tasks due" are true but they are noise; a line
 *   earns its place only when it says something happened.
 * - Never a lie on day one. A fresh install has nothing to report, and inventing encouraging
 *   filler ("Ready to start your journey!") is exactly the tone this app does not have — so
 *   an empty history gets one honest line instead.
 */

export interface SetEntry {
  weight: number;
  reps: number;
}

export interface LaunchInput {
  /** Keyed "YYYY-MM-DD|Exercise name", as the set log is stored. */
  setLog: Record<string, SetEntry[]>;
  /** Body weight readings keyed by ISO date. */
  weightLog: Record<string, number>;
  tasks: { done: boolean; due: string }[];
  /** Today, as an ISO date. Passed in so the output is testable on a fixed day. */
  today: string;
}

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];

/** Small numbers read better as words at this size; past nine, digits are clearer. */
function count(n: number): string {
  return n < WORDS.length ? WORDS[n] : String(n);
}

function daysBetween(a: string, b: string): number {
  const ms = Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z');
  return Math.round(ms / 86400000);
}

/** "27.5" rather than "27.500000000000004", and "40" rather than "40.0". */
function kg(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}

/**
 * The most recent session, as a sentence.
 *
 * The heaviest set of that session is the one named: a session is usually three sets at the
 * same load, and when it is not, the top set is the one a person remembers doing.
 */
function lastSession(input: LaunchInput): string | null {
  const keys = Object.keys(input.setLog).filter(k => input.setLog[k]?.length);
  if (!keys.length) return null;

  // Keys sort lexicographically by date because the date leads and is zero-padded.
  keys.sort();
  const key = keys[keys.length - 1];
  const cut = key.indexOf('|');
  const date = key.slice(0, cut);
  const exercise = key.slice(cut + 1);
  const sets = input.setLog[key];

  let top = sets[0];
  for (const s of sets) if (s.weight > top.weight) top = s;

  const gap = daysBetween(date, input.today);
  const when = gap <= 0 ? 'Today you' : gap === 1 ? 'Yesterday you' : `${gap} days ago you`;
  const name = exercise.charAt(0).toLowerCase() + exercise.slice(1);

  return `${when} did ${name}, ${kg(top.weight)} × ${top.reps}.`;
}

/**
 * Body weight and which way it is going.
 *
 * The comparison reading is the newest one at least five days old, not "the reading five
 * days ago" — people weigh themselves irregularly, and requiring an exact date would make
 * this line vanish for anyone who skips a day. Under five days apart the difference is
 * mostly water, so no direction is claimed.
 */
function weight(input: LaunchInput): string | null {
  const dates = Object.keys(input.weightLog).sort();
  if (!dates.length) return null;

  const latest = dates[dates.length - 1];
  const now = input.weightLog[latest];

  const earlier = dates.filter(d => daysBetween(d, latest) >= 5).pop();
  if (!earlier) return `You weigh ${kg(now)} kg.`;

  const delta = now - input.weightLog[earlier];
  if (Math.abs(delta) < 0.2) return `You are holding at ${kg(now)} kg.`;
  const dir = delta > 0 ? 'up' : 'down';
  return `You are ${kg(now)} kg, ${dir} ${kg(Math.abs(delta))}.`;
}

/** Tasks still open, overdue ones called out because they are the ones that matter. */
function tasks(input: LaunchInput): string | null {
  const open = input.tasks.filter(t => !t.done);
  if (!open.length) return null;

  const overdue = open.filter(t => t.due && t.due < input.today).length;
  if (overdue) {
    return `${count(overdue)} ${overdue === 1 ? 'task is' : 'tasks are'} overdue.`;
  }
  const dueToday = open.filter(t => t.due === input.today).length;
  if (dueToday) {
    return `${count(dueToday)} ${dueToday === 1 ? 'task is' : 'tasks are'} due today.`;
  }
  return `${count(open.length)} ${open.length === 1 ? 'task is' : 'tasks are'} waiting.`;
}

/**
 * Up to three lines, most personal first, and never an empty screen.
 */
export function launchLines(input: LaunchInput): string[] {
  const lines = [lastSession(input), weight(input), tasks(input)]
    .filter((l): l is string => l !== null);

  // Nothing logged yet — say so plainly rather than manufacturing a milestone.
  if (!lines.length) return ['Nothing logged yet.', 'Everything you record stays on this phone.'];

  return lines.slice(0, 3);
}
