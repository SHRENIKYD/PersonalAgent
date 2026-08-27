import { Task } from './models';
import { WorkoutDay } from './fitness-data';

/**
 * The text of the daily briefs.
 *
 * Assembled here rather than written by a model, deliberately. A brief fires at 7am whether
 * or not there is signal, whether or not a key is set, and whether or not a small on-device
 * model happens to answer well that morning — a notification that sometimes says nothing is
 * worse than no notification. This is arithmetic over data already on the device, so it is
 * also fully testable without a phone.
 *
 * The two briefs do different jobs. Morning is the plan; evening is what is still open. A
 * copy of the same list twice a day would be trained out within a week.
 */

export interface BriefInput {
  today: string;
  workout: WorkoutDay | null;
  tasks: Task[];
  workoutLogged: boolean;
  dietLogged: boolean;
  setsLoggedToday: number;
  proteinTargetG: number;
}

export interface Brief {
  title: string;
  body: string;
}

/** How many tasks a notification can list before it becomes a wall of text. */
const MAX_TASKS = 3;

export function morningBrief(input: BriefInput): Brief {
  const due = dueToday(input.tasks, input.today);
  const overdue = overdueTasks(input.tasks, input.today);

  const session = input.workout ? input.workout.name : 'Rest day';
  const parts: string[] = [session];

  if (overdue.length) {
    parts.push(`${overdue.length} overdue`);
  }
  if (due.length) {
    parts.push(listTasks(due));
  } else if (!overdue.length) {
    parts.push('nothing due today');
  }

  parts.push(`${input.proteinTargetG}g protein`);

  return {
    title: input.workout ? `Today: ${shortName(input.workout.name)}` : 'Today: rest day',
    body: parts.slice(1).join(' · '),
  };
}

/**
 * The evening brief only speaks when something is actually outstanding.
 *
 * Returning null on a finished day is the point: a notification that arrives every evening
 * regardless of whether it has anything to say stops being read, and then the ones that
 * matter go unread with it.
 */
export function eveningBrief(input: BriefInput): Brief | null {
  const open: string[] = [];

  if (input.workout && !input.workoutLogged) {
    open.push(input.setsLoggedToday > 0
      ? `${shortName(input.workout.name)} started, not marked done`
      : `${shortName(input.workout.name)} not done`);
  }
  if (!input.dietLogged) {
    open.push(`diet not logged (${input.proteinTargetG}g protein)`);
  }

  const due = dueToday(input.tasks, input.today);
  if (due.length) open.push(listTasks(due));

  const overdue = overdueTasks(input.tasks, input.today);
  if (overdue.length) open.push(`${overdue.length} overdue`);

  if (open.length === 0) return null;

  return { title: 'Still open today', body: open.join(' · ') };
}

function dueToday(tasks: Task[], today: string): Task[] {
  return tasks.filter(t => !t.done && t.due === today);
}

function overdueTasks(tasks: Task[], today: string): Task[] {
  return tasks.filter(t => !t.done && !!t.due && t.due < today);
}

/** Names the first few and counts the rest, so a long list stays one readable line. */
function listTasks(tasks: Task[]): string {
  const named = tasks.slice(0, MAX_TASKS).map(t => t.title);
  const rest = tasks.length - named.length;
  return rest > 0 ? `${named.join(', ')} +${rest} more` : named.join(', ');
}

/** "Pull A — Back + Biceps" is too long for a notification title; "Pull A" is not. */
function shortName(name: string): string {
  return name.split(/[—–-]/)[0].trim();
}
