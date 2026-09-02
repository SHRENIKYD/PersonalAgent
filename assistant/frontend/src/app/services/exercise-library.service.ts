import { Injectable, signal } from '@angular/core';
import { LibraryExercise } from '../exercise-search';

/**
 * The exercise library, loaded on demand.
 *
 * 873 movements from the free-exercise-db (public domain, The Unlicense), trimmed to the
 * fields this app uses. The photographs that come with that dataset are deliberately not
 * bundled: they run to roughly 90MB, which is more than twenty times the whole APK, to
 * illustrate movements most people already know how to do. The written steps are kept, since
 * those are what actually answer "how does this one go".
 *
 * Fetched from assets at runtime rather than imported, so 766KB of JSON never enters the
 * JavaScript bundle and never delays a launch for someone who only wants to log a set. It
 * loads the first time the library is opened and is held for the rest of the session.
 */
@Injectable({ providedIn: 'root' })
export class ExerciseLibraryService {
  readonly all = signal<LibraryExercise[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');

  private started = false;

  /** Loads once. Safe to call on every open — later calls are a no-op. */
  async load(): Promise<void> {
    if (this.started) return;
    this.started = true;
    this.loading.set(true);
    try {
      // Relative, not absolute: the app is served from a sub-path on GitHub Pages and from
      // the file root inside the Android WebView, and a leading slash breaks one of the two.
      const res = await fetch('assets/exercises.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as LibraryExercise[];
      if (!Array.isArray(data)) throw new Error('unexpected shape');
      this.all.set(data);
      this.error.set('');
    } catch (e) {
      // A failed load must not take the page down — the plan and the set log work without
      // the library, and this is the one part of the app that is purely a reference.
      this.started = false;
      this.error.set(message(e));
    } finally {
      this.loading.set(false);
    }
  }

  byName(name: string): LibraryExercise | null {
    const target = name.toLowerCase();
    return this.all().find(e => e.name.toLowerCase() === target) ?? null;
  }
}

function message(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return String(e);
}
