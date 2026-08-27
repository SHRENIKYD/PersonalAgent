import { Injectable, computed, signal } from '@angular/core';
import { StorageService } from './storage.service';
import {
  Habit,
  MonthPlan,
  Note,
  Priority,
  RoadmapState,
  SetEntry,
  SetLog,
  SyncPayload,
  Task,
  TrackKey,
} from '../models';
import { GOALS_PER_TRACK, MONTH_SEEDS, TRACKS, generateMonthNames } from '../growth-data';

const KEYS = {
  tasks: 'assistant-tasks-v1',
  notes: 'assistant-notes-v1',
  roadmap: 'assistant-roadmap-v1',
  fitness: 'assistant-fitness-v1',
  weight: 'assistant-weight-v1',
  sets: 'assistant-sets-v1',
};

const HABIT_WEEKS = 26;

function seededTrack(triple: [string, string, string]): { text: string; done: boolean }[] {
  return triple.map(text => ({ text, done: false }));
}

/** Pads a track's goal list up to GOALS_PER_TRACK with empty rows — never removes any. */
function padTrack(goals: { text: string; done: boolean }[]): { text: string; done: boolean }[] {
  const next = [...goals];
  while (next.length < GOALS_PER_TRACK) next.push({ text: '', done: false });
  return next;
}

function defaultRoadmap(): RoadmapState {
  const months: MonthPlan[] = generateMonthNames(6).map((name, i) => {
    const seed = MONTH_SEEDS[i];
    return {
      name,
      theme: seed?.theme ?? '',
      tracks: {
        career: seededTrack(seed?.career ?? ['', '', '']),
        health: seededTrack(seed?.health ?? ['', '', '']),
        habits: seededTrack(seed?.habits ?? ['', '', '']),
        balance: seededTrack(seed?.balance ?? ['', '', '']),
      },
    };
  });
  const habits: Habit[] = [
    { name: 'Sleep 7+ hours', weeks: new Array(HABIT_WEEKS).fill(false) },
    { name: 'Deep work block', weeks: new Array(HABIT_WEEKS).fill(false) },
    { name: 'Workout per plan (see Fitness tab)', weeks: new Array(HABIT_WEEKS).fill(false) },
    { name: 'On-diet (see Fitness tab)', weeks: new Array(HABIT_WEEKS).fill(false) },
    { name: 'Connect with someone', weeks: new Array(HABIT_WEEKS).fill(false) },
  ];
  return { months, habits };
}

/** Migration for roadmaps saved before a 3rd goal slot per track existed. */
function padRoadmapTracks(roadmap: RoadmapState): RoadmapState {
  roadmap.months.forEach(m => {
    (['career', 'health', 'habits', 'balance'] as TrackKey[]).forEach(key => {
      m.tracks[key] = padTrack(m.tracks[key]);
    });
  });
  return roadmap;
}

function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Owns every piece of the user's data. Nothing here ever leaves the browser —
 * the agent reaches this state only through the tool handlers in AgentService.
 */
@Injectable({ providedIn: 'root' })
export class StateService {
  tasks = signal<Task[]>([]);
  notes = signal<Note[]>([]);
  roadmap = signal<RoadmapState>(defaultRoadmap());
  /** key = `${YYYY-MM-DD}:${workoutDayName}` or `${YYYY-MM-DD}:diet` -> done */
  fitnessLog = signal<Record<string, boolean>>({});

  /**
   * Body weight by ISO date, one reading per day. Keyed by date rather than appended to a
   * list so weighing twice in a morning corrects the day instead of skewing it.
   */
  weightLog = signal<Record<string, number>>({});
  setLog = signal<SetLog>({});
  saveStatus = signal<string>('');

  /**
   * Bumped on every local mutation (see scheduleSave). SyncService watches this to know when
   * to push — a plain counter rather than the data itself, since it only needs to know
   * "something changed," not what.
   */
  lastLocalChange = signal<number>(0);

  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private storage: StorageService) {
    this.tasks.set(this.storage.get<Task[]>(KEYS.tasks, []));
    this.notes.set(this.storage.get<Note[]>(KEYS.notes, []));
    this.roadmap.set(padRoadmapTracks(this.storage.get<RoadmapState>(KEYS.roadmap, defaultRoadmap())));
    this.fitnessLog.set(this.storage.get<Record<string, boolean>>(KEYS.fitness, {}));
    this.weightLog.set(this.storage.get<Record<string, number>>(KEYS.weight, {}));
    this.setLog.set(this.storage.get<SetLog>(KEYS.sets, {}));
  }

  // ---------------- derived views ----------------

  openTasks = computed(() => this.tasks().filter(t => !t.done));
  doneTasks = computed(() => this.tasks().filter(t => t.done));

  /** Anything undone and dated today or earlier. */
  dueToday = computed(() => {
    const cutoff = today();
    return this.openTasks().filter(t => t.due !== '' && t.due <= cutoff);
  });

  progress = computed(() => {
    const total = this.tasks().length;
    const done = this.doneTasks().length;
    return { total, done, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
  });

  /** Combined total/done across tasks, the growth roadmap, and fitness adherence. */
  overallProgress = computed(() => {
    const parts = [
      this.progress(),
      this.roadmapProgress(),
      this.fitnessWeekProgress(),
    ];
    const total = parts.reduce((sum, p) => sum + p.total, 0);
    const done = parts.reduce((sum, p) => sum + p.done, 0);
    return { total, done, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
  });

  // ---------------- task mutations ----------------

  addTask(title: string, due = '', priority: Priority = 'normal'): Task {
    const task: Task = {
      id: newId(),
      title: title.trim(),
      due,
      priority,
      done: false,
      created: new Date().toISOString(),
    };
    this.tasks.update(list => [...list, task]);
    this.scheduleSave();
    return task;
  }

  toggleTask(id: string, done: boolean) {
    this.tasks.update(list => list.map(t => (t.id === id ? { ...t, done } : t)));
    this.scheduleSave();
  }

  updateTaskTitle(id: string, title: string) {
    this.tasks.update(list => list.map(t => (t.id === id ? { ...t, title } : t)));
    this.scheduleSave();
  }

  /** Pass '' to clear the date and leave the task undated. */
  updateTaskDue(id: string, due: string) {
    this.tasks.update(list => list.map(t => (t.id === id ? { ...t, due } : t)));
    this.scheduleSave();
  }

  removeTask(id: string) {
    this.tasks.update(list => list.filter(t => t.id !== id));
    this.scheduleSave();
  }

  /**
   * Open, dated tasks falling inside an inclusive ISO-date range. Plain string
   * comparison is correct for YYYY-MM-DD, which is why there's no date library here.
   */
  tasksInRange(from: string, to: string): Task[] {
    return this.openTasks().filter(t => t.due !== '' && t.due >= from && t.due <= to);
  }

  /** Case-insensitive title match — how the agent resolves "the lease task". */
  findTasks(query: string): Task[] {
    const q = query.trim().toLowerCase();
    if (q === '') return [];
    return this.tasks().filter(t => t.title.toLowerCase().includes(q));
  }

  // ---------------- note mutations ----------------

  addNote(title: string, body: string): Note {
    const note: Note = {
      id: newId(),
      title: title.trim(),
      body,
      updated: new Date().toISOString(),
    };
    this.notes.update(list => [note, ...list]);
    this.scheduleSave();
    return note;
  }

  updateNote(id: string, fields: Partial<Pick<Note, 'title' | 'body'>>) {
    this.notes.update(list =>
      list.map(n => (n.id === id ? { ...n, ...fields, updated: new Date().toISOString() } : n))
    );
    this.scheduleSave();
  }

  removeNote(id: string) {
    this.notes.update(list => list.filter(n => n.id !== id));
    this.scheduleSave();
  }

  /** Searches titles and bodies both, so the agent can recall by content. */
  findNotes(query: string): Note[] {
    const q = query.trim().toLowerCase();
    if (q === '') return [];
    return this.notes().filter(
      n => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
    );
  }

  // ---------------- growth tracker (roadmap + habits) ----------------

  roadmapProgress = computed(() => {
    let total = 0, done = 0;
    this.roadmap().months.forEach(m => {
      TRACKS.forEach(t => m.tracks[t.key].forEach(g => {
        if (g.text.trim() !== '') { total++; if (g.done) done++; }
      }));
    });
    return { total, done, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
  });

  /**
   * Fills in only the still-empty goal slots with the suggested starter plan — never
   * overwrites anything already typed, and never touches the checked/unchecked state.
   * Exists because `defaultRoadmap()`'s seed only ever reaches a brand-new profile; anyone
   * with an existing (even entirely blank) saved roadmap needs an explicit way to pull it in.
   */
  applySuggestedRoadmap() {
    this.roadmap.update(s => {
      const next = structuredClone(s);
      next.months.forEach((m, mi) => {
        const seed = MONTH_SEEDS[mi];
        if (!seed) return;
        if (m.theme.trim() === '') m.theme = seed.theme;
        (['career', 'health', 'habits', 'balance'] as TrackKey[]).forEach(key => {
          const seedPair = seed[key];
          m.tracks[key].forEach((goal, gi) => {
            if (goal.text.trim() === '' && seedPair[gi]) goal.text = seedPair[gi];
          });
        });
      });
      return next;
    });
    this.scheduleSave();
  }

  monthComplete(m: MonthPlan): boolean {
    let has = false, all = true;
    TRACKS.forEach(t => m.tracks[t.key].forEach(g => {
      if (g.text.trim() !== '') { has = true; if (!g.done) all = false; }
    }));
    return has && all;
  }

  updateTheme(monthIndex: number, value: string) {
    this.roadmap.update(s => {
      const next = structuredClone(s);
      next.months[monthIndex].theme = value;
      return next;
    });
    this.scheduleSave();
  }

  updateGoalText(monthIndex: number, trackKey: TrackKey, goalIndex: number, value: string) {
    this.roadmap.update(s => {
      const next = structuredClone(s);
      next.months[monthIndex].tracks[trackKey][goalIndex].text = value;
      return next;
    });
    this.scheduleSave();
  }

  toggleGoal(monthIndex: number, trackKey: TrackKey, goalIndex: number, done: boolean) {
    this.roadmap.update(s => {
      const next = structuredClone(s);
      next.months[monthIndex].tracks[trackKey][goalIndex].done = done;
      return next;
    });
    this.scheduleSave();
  }

  toggleHabitWeek(habitIndex: number, weekIndex: number) {
    this.roadmap.update(s => {
      const next = structuredClone(s);
      next.habits[habitIndex].weeks[weekIndex] = !next.habits[habitIndex].weeks[weekIndex];
      return next;
    });
    this.scheduleSave();
  }

  updateHabitName(habitIndex: number, value: string) {
    this.roadmap.update(s => {
      const next = structuredClone(s);
      next.habits[habitIndex].name = value;
      return next;
    });
    this.scheduleSave();
  }

  addHabit() {
    this.roadmap.update(s => {
      const next = structuredClone(s);
      next.habits.push({ name: '', weeks: new Array(HABIT_WEEKS).fill(false) });
      return next;
    });
    this.scheduleSave();
  }

  removeHabit(i: number) {
    this.roadmap.update(s => {
      const next = structuredClone(s);
      next.habits.splice(i, 1);
      return next;
    });
    this.scheduleSave();
  }

  // ---------------- fitness (workout + diet adherence) ----------------

  isFitnessLogged(key: string): boolean {
    return !!this.fitnessLog()[key];
  }

  toggleFitnessLog(key: string, value: boolean) {
    this.fitnessLog.update(log => ({ ...log, [key]: value }));
    this.scheduleSave();
  }

  // ---------------- strength log (per-set weight and reps) ----------------

  /** `${isoDate}|${exercise}` — see SetEntry. */
  private setKey(date: string, exercise: string) { return `${date}|${exercise}`; }

  setsFor(date: string, exercise: string): SetEntry[] {
    return this.setLog()[this.setKey(date, exercise)] ?? [];
  }

  logSet(date: string, exercise: string, weight: number, reps: number) {
    const key = this.setKey(date, exercise);
    this.setLog.update(log => ({ ...log, [key]: [...(log[key] ?? []), { weight, reps }] }));
    this.scheduleSave();
  }

  removeSet(date: string, exercise: string, index: number) {
    const key = this.setKey(date, exercise);
    this.setLog.update(log => {
      const sets = (log[key] ?? []).filter((_, i) => i !== index);
      const next = { ...log };
      // Drop the key entirely when its last set goes, so the log doesn't accumulate empty
      // arrays for every exercise ever tapped into and abandoned.
      if (sets.length) next[key] = sets; else delete next[key];
      return next;
    });
    this.scheduleSave();
  }

  /**
   * The most recent day this exercise was logged, before `beforeDate`. This is what powers
   * "last time: 60 kg × 7" — progressive overload needs the previous session, not the best
   * ever, so this walks back by date rather than reducing over the whole log.
   */
  lastSession(exercise: string, beforeDate: string): { date: string; sets: SetEntry[] } | null {
    const log = this.setLog();
    const dates = Object.keys(log)
      .filter(k => k.endsWith(`|${exercise}`))
      .map(k => k.slice(0, k.indexOf('|')))
      .filter(d => d < beforeDate)
      .sort();
    const date = dates.pop();
    return date ? { date, sets: log[this.setKey(date, exercise)] } : null;
  }

  // ---------------- body weight ----------------

  /** Readings oldest first, which is what every chart and average here expects. */
  weightEntries = computed(() =>
    Object.entries(this.weightLog())
      .map(([date, kg]) => ({ date, kg }))
      .sort((a, b) => a.date.localeCompare(b.date))
  );

  logWeight(date: string, kg: number) {
    if (!Number.isFinite(kg) || kg <= 0) return;
    this.weightLog.update(log => ({ ...log, [date]: Math.round(kg * 10) / 10 }));
    this.scheduleSave();
  }

  removeWeight(date: string) {
    this.weightLog.update(log => {
      const next = { ...log };
      delete next[date];
      return next;
    });
    this.scheduleSave();
  }

  /**
   * The last few sessions on a movement, oldest first — what a stall check needs, since one
   * short session is a bad night's sleep and two is a pattern.
   */
  recentSessions(exercise: string, beforeDate: string, count = 3): { date: string; sets: SetEntry[] }[] {
    const log = this.setLog();
    return Object.keys(log)
      .filter(k => k.endsWith(`|${exercise}`))
      .map(k => k.slice(0, k.indexOf('|')))
      .filter(d => d < beforeDate)
      .sort()
      .slice(-count)
      .map(date => ({ date, sets: log[this.setKey(date, exercise)] }));
  }

  /** Heaviest single set ever recorded for an exercise — the number worth beating. */
  personalBest(exercise: string): SetEntry | null {
    const log = this.setLog();
    let best: SetEntry | null = null;
    Object.entries(log).forEach(([k, sets]) => {
      if (!k.endsWith(`|${exercise}`)) return;
      sets.forEach(s => { if (!best || s.weight > best.weight) best = s; });
    });
    return best;
  }

  /** Adherence over the last 7 calendar days, across both workout and diet checks. */
  fitnessWeekProgress = computed(() => {
    const log = this.fitnessLog();
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    let total = 0, done = 0;
    days.forEach(d => {
      total += 2;
      if (log[`${d}:workout`]) done++;
      if (log[`${d}:diet`]) done++;
    });
    return { total, done, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
  });

  // ---------------- cross-device sync (see SyncService) ----------------

  /** Everything that syncs — the full contents of one device's data. */
  exportAll(): SyncPayload {
    return {
      tasks: this.tasks(),
      notes: this.notes(),
      roadmap: this.roadmap(),
      fitnessLog: this.fitnessLog(),
      weightLog: this.weightLog(),
      setLog: this.setLog(),
    };
  }

  /**
   * Applies a remote payload wholesale (this is the "last edit wins" sync model — the whole
   * blob is replaced, not merged field-by-field). `suppressChangeSignal` is set first so this
   * doesn't itself look like a local edit and bounce straight back to SyncService as
   * something to push.
   */
  importAll(payload: SyncPayload) {
    this.suppressChangeSignal = true;
    this.tasks.set(payload.tasks ?? []);
    this.notes.set(payload.notes ?? []);
    this.roadmap.set(payload.roadmap ? padRoadmapTracks(payload.roadmap) : defaultRoadmap());
    this.fitnessLog.set(payload.fitnessLog ?? {});
    this.weightLog.set(payload.weightLog ?? {});
    this.setLog.set(payload.setLog ?? {});
    this.scheduleSave();
    this.suppressChangeSignal = false;
  }

  // ---------------- persistence ----------------

  private suppressChangeSignal = false;

  private scheduleSave() {
    this.saveStatus.set('Saving…');
    if (!this.suppressChangeSignal) this.lastLocalChange.set(Date.now());
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      const ok1 = this.storage.set(KEYS.tasks, this.tasks());
      const ok2 = this.storage.set(KEYS.notes, this.notes());
      const ok3 = this.storage.set(KEYS.roadmap, this.roadmap());
      const ok4 = this.storage.set(KEYS.fitness, this.fitnessLog());
      const ok6 = this.storage.set(KEYS.weight, this.weightLog());
      const ok5 = this.storage.set(KEYS.sets, this.setLog());
      this.saveStatus.set(
        ok1 && ok2 && ok3 && ok4 && ok5 && ok6
          ? 'Saved'
          : 'Save failed — check browser storage settings'
      );
    }, 400);
  }
}
