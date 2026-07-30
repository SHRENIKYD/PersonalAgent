import { Injectable, computed, signal } from '@angular/core';
import { StorageService } from './storage.service';
import { Note, Priority, Task } from '../models';

const KEYS = {
  tasks: 'assistant-tasks-v1',
  notes: 'assistant-notes-v1',
};

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
  saveStatus = signal<string>('');

  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private storage: StorageService) {
    this.tasks.set(this.storage.get<Task[]>(KEYS.tasks, []));
    this.notes.set(this.storage.get<Note[]>(KEYS.notes, []));
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

  // ---------------- persistence ----------------

  private scheduleSave() {
    this.saveStatus.set('Saving…');
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      const ok1 = this.storage.set(KEYS.tasks, this.tasks());
      const ok2 = this.storage.set(KEYS.notes, this.notes());
      this.saveStatus.set(ok1 && ok2 ? 'Saved' : 'Save failed — check browser storage settings');
    }, 400);
  }
}
