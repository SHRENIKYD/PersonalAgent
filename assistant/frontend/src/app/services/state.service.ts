import { Injectable, computed, signal } from '@angular/core';
import { StorageService } from './storage.service';
import {
  CertEarned,
  CertTodo,
  CertsState,
  Habit,
  MonthPlan,
  Note,
  PrepCategoryKey,
  PrepState,
  Priority,
  RoadmapState,
  Task,
  TrackKey,
} from '../models';
import { MONTH_SEEDS, TRACKS, generateMonthNames } from '../growth-data';
import { DSA_TOPICS } from '../prep-dsa-data';
import { CS_TOPICS, SYSDESIGN_TOPICS, WEB_TOPICS } from '../prep-concept-data';

const KEYS = {
  tasks: 'assistant-tasks-v1',
  notes: 'assistant-notes-v1',
  roadmap: 'assistant-roadmap-v1',
  prep: 'assistant-prep-v1',
  certs: 'assistant-certs-v1',
  fitness: 'assistant-fitness-v1',
};

const HABIT_WEEKS = 26;

/**
 * Item counts per topic, used only for progress percentages — DSA topics count problems,
 * concept topics count items. Both are just "how many checkable rows does this topic have."
 */
const PREP_TOPIC_SIZES: Record<PrepCategoryKey, number[]> = {
  dsa: DSA_TOPICS.map(t => t.problems.length),
  cs: CS_TOPICS.map(t => t.items.length),
  sysdesign: SYSDESIGN_TOPICS.map(t => t.items.length),
  web: WEB_TOPICS.map(t => t.items.length),
};

function seededTrack(pair: [string, string]): [{ text: string; done: boolean }, { text: string; done: boolean }] {
  return [{ text: pair[0], done: false }, { text: pair[1], done: false }];
}

function defaultRoadmap(): RoadmapState {
  const months: MonthPlan[] = generateMonthNames(6).map((name, i) => {
    const seed = MONTH_SEEDS[i];
    return {
      name,
      theme: seed?.theme ?? '',
      tracks: {
        career: seededTrack(seed?.career ?? ['', '']),
        health: seededTrack(seed?.health ?? ['', '']),
        habits: seededTrack(seed?.habits ?? ['', '']),
        balance: seededTrack(seed?.balance ?? ['', '']),
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

function defaultPrep(): PrepState {
  return { dsa: {}, cs: {}, sysdesign: {}, web: {} };
}

function defaultCerts(): CertsState {
  return { todo: [], earned: [] };
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
  prep = signal<PrepState>(defaultPrep());
  certs = signal<CertsState>(defaultCerts());
  /** key = `${YYYY-MM-DD}:${workoutDayName}` or `${YYYY-MM-DD}:diet` -> done */
  fitnessLog = signal<Record<string, boolean>>({});
  saveStatus = signal<string>('');

  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private storage: StorageService) {
    this.tasks.set(this.storage.get<Task[]>(KEYS.tasks, []));
    this.notes.set(this.storage.get<Note[]>(KEYS.notes, []));
    this.roadmap.set(this.storage.get<RoadmapState>(KEYS.roadmap, defaultRoadmap()));
    this.prep.set(this.storage.get<PrepState>(KEYS.prep, defaultPrep()));
    this.certs.set(this.storage.get<CertsState>(KEYS.certs, defaultCerts()));
    this.fitnessLog.set(this.storage.get<Record<string, boolean>>(KEYS.fitness, {}));
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

  /** Combined total/done across tasks, growth roadmap, all four prep categories, and certs. */
  overallProgress = computed(() => {
    const parts = [
      this.progress(),
      this.roadmapProgress(),
      this.categoryProgress('dsa'),
      this.categoryProgress('cs'),
      this.categoryProgress('sysdesign'),
      this.categoryProgress('web'),
      this.certsProgress(),
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

  // ---------------- interview prep ----------------

  categoryProgress(cat: PrepCategoryKey) {
    let total = 0, done = 0;
    const state = this.prep();
    PREP_TOPIC_SIZES[cat].forEach((size, ti) => {
      for (let ii = 0; ii < size; ii++) {
        total++;
        if (state[cat]?.[ti]?.[ii]) done++;
      }
    });
    return { total, done, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
  }

  topicProgress(cat: PrepCategoryKey, ti: number) {
    const size = PREP_TOPIC_SIZES[cat][ti] ?? 0;
    const state = this.prep();
    let done = 0;
    for (let ii = 0; ii < size; ii++) {
      if (state[cat]?.[ti]?.[ii]) done++;
    }
    return { total: size, done };
  }

  toggleItem(cat: PrepCategoryKey, ti: number, ii: number, checked: boolean) {
    this.prep.update(s => {
      const next = structuredClone(s);
      if (!next[cat][ti]) next[cat][ti] = {};
      next[cat][ti][ii] = checked;
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

  // ---------------- certificates ----------------

  certsProgress = computed(() => {
    const c = this.certs();
    const total = c.todo.filter(x => x.name.trim()).length;
    const done = c.todo.filter(x => x.done).length;
    return { total, done, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
  });

  addCertTodo() {
    this.certs.update(s => {
      const next = structuredClone(s);
      next.todo.push({ name: '', target: '', link: '', done: false });
      return next;
    });
    this.scheduleSave();
  }

  updateCertTodo(i: number, field: keyof Omit<CertTodo, 'done'>, value: string) {
    this.certs.update(s => {
      const next = structuredClone(s);
      next.todo[i][field] = value;
      return next;
    });
    this.scheduleSave();
  }

  toggleCertTodoDone(i: number, done: boolean) {
    this.certs.update(s => {
      const next = structuredClone(s);
      next.todo[i].done = done;
      return next;
    });
    this.scheduleSave();
  }

  removeCertTodo(i: number) {
    this.certs.update(s => {
      const next = structuredClone(s);
      next.todo.splice(i, 1);
      return next;
    });
    this.scheduleSave();
  }

  addCertEarned() {
    this.certs.update(s => {
      const next = structuredClone(s);
      next.earned.push({ name: '', issuer: '', date: '', link: '' });
      return next;
    });
    this.scheduleSave();
  }

  updateCertEarned(i: number, field: keyof CertEarned, value: string) {
    this.certs.update(s => {
      const next = structuredClone(s);
      next.earned[i][field] = value;
      return next;
    });
    this.scheduleSave();
  }

  removeCertEarned(i: number) {
    this.certs.update(s => {
      const next = structuredClone(s);
      next.earned.splice(i, 1);
      return next;
    });
    this.scheduleSave();
  }

  // ---------------- persistence ----------------

  private scheduleSave() {
    this.saveStatus.set('Saving…');
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      const ok1 = this.storage.set(KEYS.tasks, this.tasks());
      const ok2 = this.storage.set(KEYS.notes, this.notes());
      const ok3 = this.storage.set(KEYS.roadmap, this.roadmap());
      const ok4 = this.storage.set(KEYS.prep, this.prep());
      const ok5 = this.storage.set(KEYS.certs, this.certs());
      const ok6 = this.storage.set(KEYS.fitness, this.fitnessLog());
      this.saveStatus.set(
        ok1 && ok2 && ok3 && ok4 && ok5 && ok6
          ? 'Saved'
          : 'Save failed — check browser storage settings'
      );
    }, 400);
  }
}
