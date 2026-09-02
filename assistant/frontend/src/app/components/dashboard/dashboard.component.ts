import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { UiService } from '../../services/ui.service';
import { ExerciseLibraryService } from '../../services/exercise-library.service';
import { groupForExercise } from '../../exercise-search';
import { volumeByGroup } from '../../fitness-progress';
import { WORKOUT_DAYS, workoutForDate, musclesFor, todayIso } from '../../fitness-data';

/**
 * Today.
 *
 * Rebuilt to the Bloom mockup. The screen used to open on a progress ring reading "0 of 88
 * items complete" — a number that is the same every morning and tells you nothing about what
 * to do next. This opens on the session you are actually doing, what it loads, and what is
 * still owed: the three things worth knowing before the phone goes back in a pocket.
 *
 * Every figure is read from the log rather than passed in, so the screen is a view of state
 * and not a second copy of it.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="panel">
      <p class="today-date">{{ dateLabel }}</p>
      <h1 class="page-title">{{ sessionName() }}</h1>
      <p class="page-sub">{{ sessionSub() }}</p>

      <div class="chip-row" *ngIf="muscles().length">
        <span class="chip-accent" *ngFor="let m of muscles()">{{ m }}</span>
      </div>

      <div class="stat-card">
        <button class="stat-cell" (click)="ui.setTab('workout')">
          <span class="stat-figure">{{ exerciseCount() }}</span>
          <span class="stat-name">Exercises</span>
        </button>
        <button class="stat-cell" (click)="ui.setTab('workout')">
          <span class="stat-figure">{{ muscles().length }}</span>
          <span class="stat-name">Groups</span>
        </button>
        <button class="stat-cell" (click)="ui.setTab('workout')">
          <span class="stat-figure accent">{{ weekPct() }}%</span>
          <span class="stat-name">Of week</span>
        </button>
      </div>

      <div class="card card-accent">
        <div class="card-head">
          <span class="card-label">Open today</span>
          <span class="card-count">{{ open().length }}</span>
        </div>
        <p *ngIf="open().length === 0" class="empty">
          Nothing due. <a (click)="ui.setTab('chat')">Ask the assistant</a> to plan something.
        </p>
        <ul class="task-list">
          <li *ngFor="let t of open()" class="task-row">
            <input type="checkbox" [checked]="t.done" (change)="state.toggleTask(t.id, true)" />
            <span class="task-title grow">{{ t.title }}</span>
            <span class="pill" [ngClass]="t.priority">{{ t.priority }}</span>
          </li>
        </ul>
      </div>

      <div class="card">
        <div class="card-head">
          <span class="card-label">This week</span>
          <span class="card-value">{{ week().done }} / {{ week().total }} logged</span>
        </div>
        <div class="overall-progress-track">
          <div class="overall-progress-fill" [style.width.%]="weekPct()"></div>
        </div>
      </div>

      <div class="card" *ngIf="volume().length">
        <span class="card-label">Volume this week</span>
        <div class="vol-row" *ngFor="let v of volume()">
          <div class="vol-head">
            <span>{{ v.group }}</span>
            <span class="vol-count">{{ v.sets }} sets</span>
          </div>
          <div class="overall-progress-track">
            <div class="overall-progress-fill" [style.width.%]="volPct(v.sets)"></div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class DashboardComponent {
  /** "Thursday 27 August" — the mockup's date line. */
  readonly dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  constructor(
    public state: StateService,
    public ui: UiService,
    // Injected but deliberately NOT loaded here. byName() reads an empty list until the Body
    // tab loads the library, so this costs nothing on a screen that opens every launch, and
    // still counts library sets once they are available.
    private library: ExerciseLibraryService,
  ) {}

  private session = computed(() => workoutForDate());

  sessionName = computed(() => this.session()?.name ?? 'Rest day');
  sessionSub = computed(() =>
    this.session()
      ? 'Check it off as you go.'
      : 'Nothing scheduled. Recovery is part of the programme, not a gap in it.');
  muscles = computed(() => { const d = this.session(); return d ? musclesFor(d) : []; });
  exerciseCount = computed(() => this.session()?.exercises.length ?? 0);

  week = computed(() => this.state.fitnessWeekProgress());
  weekPct = computed(() => this.week().pct);

  open = computed(() => this.state.dueToday().filter(t => !t.done));

  /**
   * Sets per group over the last seven days.
   *
   * The bar is scaled against the busiest group rather than a fixed target: the plan has no
   * per-group set quota, so any absolute denominator would be invented. Relative bars still
   * answer the question the screen is for — which groups are behind the others.
   */
  volume = computed(() =>
    volumeByGroup(this.state.setLog(), name => this.groupOf(name),
      new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10), todayIso())
      .slice(0, 4));

  private peak = computed(() =>
    this.volume().reduce((m, v) => Math.max(m, v.sets), 0) || 1);

  volPct(sets: number): number {
    return Math.round((sets / this.peak()) * 100);
  }

  /** Exercise name to muscle group: the plan first, the library as a fallback. */
  private groupOf(name: string): string | undefined {
    for (const day of WORKOUT_DAYS) {
      const hit = day.exercises.find(e => e.name === name);
      if (hit) return hit.group;
    }
    const fromLibrary = this.library.byName(name);
    return fromLibrary ? groupForExercise(fromLibrary) ?? undefined : undefined;
  }
}
