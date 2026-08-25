import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { MuscleMapComponent } from '../muscle-map/muscle-map.component';
import { RestTimerComponent } from '../rest-timer/rest-timer.component';
import {
  ABS_PROGRAM,
  WEEKLY_SCHEDULE,
  WORKOUT_DAYS,
  WORKOUT_PROGRESS,
  WORKOUT_RULES,
  WorkoutDay,
  musclesFor,
  workoutForDate,
} from '../../fitness-data';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Training only. Split from the old combined Fitness tab because the two halves are used at
 * different times — you open this mid-set with one hand, and the diet tab when planning a
 * meal — and scrolling past seven meal tables to reach the set you are logging was the cost
 * of keeping them together.
 */
@Component({
  selector: 'app-workout',
  standalone: true,
  imports: [CommonModule, MuscleMapComponent, RestTimerComponent],
  template: `
    <section class="panel">
      <div class="fit-hero">
        <div class="fit-hero-copy">
          <h1 class="page-title">Workout</h1>
          <p class="fit-hero-session">{{ todayLabel() }}</p>
          <p class="page-sub">{{ todaySub() }}</p>

          <div class="fit-today-row">
            <label class="fit-check">
              <input type="checkbox" [checked]="checked('workout')" (change)="toggle('workout', $any($event.target).checked)" />
              Workout done
            </label>
            <span class="pill complete">{{ state.fitnessWeekProgress().pct }}% this week</span>
          </div>
        </div>
        <img class="fit-hero-art" src="assets/hero-athlete.webp" alt="" aria-hidden="true" />
      </div>

      <div class="section-head">
        <h2 class="section-title">Muscle focus</h2>
        <button class="ghost-btn" *ngIf="previewing()" (click)="showToday()">Back to today</button>
      </div>
      <div class="fit-focus">
        <app-muscle-map [active]="todayMuscles()" />
        <div class="fit-focus-side">
          <p class="fit-focus-session">
            {{ mapLabel() }}
            <span class="pill" *ngIf="previewing()">preview</span>
          </p>
          <p class="fit-focus-lede">
            {{ todayMuscles().length
                ? (previewing()
                    ? 'Lit groups are what this session loads. Open another day below to compare.'
                    : 'Lit groups are what today actually loads. Open any day below to preview it.')
                : 'Rest day — nothing scheduled. The map stays dark on purpose.' }}
          </p>
          <ul class="fit-key">
            <li *ngFor="let m of todayMuscles()"><i></i>{{ m }}</li>
          </ul>
          <div class="fit-stats">
            <div><b>{{ todayExerciseCount() }}</b><span>exercises</span></div>
            <div><b>{{ todayMuscles().length }}</b><span>groups</span></div>
            <div><b>{{ state.fitnessWeekProgress().pct }}</b><span>% week</span></div>
          </div>
        </div>
      </div>

      <h2 class="section-title">Rest timer</h2>
      <app-rest-timer />

      <h2 class="section-title">Weekly split</h2>
      <div class="fit-table-wrap">
        <table class="fit-table">
          <thead>
            <tr><th>Day</th><th>Time</th><th>Session</th><th>Length</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of schedule">
              <td>{{ r.day }}</td><td>{{ r.time }}</td><td>{{ r.session }}</td><td>{{ r.length }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="prep-topic" *ngFor="let day of workoutDays; let i = index">
        <button class="prep-topic-head" (click)="toggleDay(i)">
          <span class="prep-topic-chevron" [class.open]="isDayOpen(i)">›</span>
          <span class="prep-topic-name">{{ day.name }}</span>
        </button>
        <div class="prep-problem-list" *ngIf="isDayOpen(i)">
          <div class="fit-table-wrap">
            <table class="fit-table">
              <thead><tr><th>Exercise</th><th>Target</th><th>Logged sets</th></tr></thead>
              <tbody>
                <ng-container *ngFor="let ex of day.exercises; let ei = index">
                  <tr *ngIf="isNewGroup(day, ei)"><td colspan="3" class="fit-group-row">{{ ex.group }}</td></tr>
                  <tr>
                    <td>
                      {{ ex.name }}
                      <span class="set-last" *ngIf="lastFor(ex.name) as prev">
                        last {{ prev }}
                      </span>
                    </td>
                    <td>{{ ex.sets }}</td>
                    <td>
                      <div class="set-log">
                        <span class="set-chip" *ngFor="let st of setsToday(ex.name); let si = index"
                              (click)="state.removeSet(today(), ex.name, si)"
                              title="Click to remove">{{ st.weight }}×{{ st.reps }}</span>
                        <input class="set-in" type="number" inputmode="decimal" placeholder="kg"
                               #w (keydown.enter)="add(ex.name, w, r)" />
                        <input class="set-in" type="number" inputmode="numeric" placeholder="reps"
                               #r (keydown.enter)="add(ex.name, w, r)" />
                        <button class="ghost-btn set-add" (click)="add(ex.name, w, r)">+</button>
                      </div>
                    </td>
                  </tr>
                </ng-container>
              </tbody>
            </table>
          </div>
          <p class="fit-note" *ngIf="day.extra">{{ day.extra }}</p>
        </div>
      </div>

      <h2 class="section-title">Abs program</h2>
      <p class="page-sub">One block per training day, paired with that day's session — pick the easier option whenever the main move isn't accessible.</p>
      <div class="prep-topic" *ngFor="let ad of absProgram; let ai = index">
        <button class="prep-topic-head" (click)="toggleAbsDay(ai)">
          <span class="prep-topic-chevron" [class.open]="isAbsDayOpen(ai)">›</span>
          <span class="prep-topic-name">{{ ad.pairedWith }} — {{ ad.focus }}</span>
        </button>
        <div class="prep-problem-list" *ngIf="isAbsDayOpen(ai)">
          <div class="fit-table-wrap">
            <table class="fit-table">
              <thead><tr><th>Exercise</th><th>Sets × Reps</th><th>Easier option</th></tr></thead>
              <tbody>
                <tr *ngFor="let ex of ad.exercises">
                  <td>{{ ex.name }}</td><td>{{ ex.sets }}</td><td>{{ ex.easierOption }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <h2 class="section-title">Training rules</h2>
      <ul class="fit-list">
        <li *ngFor="let r of workoutRules">{{ r }}</li>
      </ul>

      <h2 class="section-title">Expected progress</h2>
      <ul class="fit-list">
        <li *ngFor="let p of workoutProgress">{{ p }}</li>
      </ul>

    </section>
  `,
})
export class WorkoutComponent {
  schedule = WEEKLY_SCHEDULE;
  workoutDays = WORKOUT_DAYS;
  absProgram = ABS_PROGRAM;
  workoutRules = WORKOUT_RULES;
  workoutProgress = WORKOUT_PROGRESS;

  /**
   * One open day at a time. A Set here would let every session expand at once, which on a
   * phone means scrolling past six full exercise tables to reach the one you are doing. It
   * also folds the map's focus and the open panel into a single piece of state, so the
   * figure can never disagree with what is on screen.
   */
  private openDay = signal<number | null>(null);
  private openAbsDay = signal<number | null>(null);

  /** Today's session, or null on the rest day. */
  todaySession = computed<WorkoutDay | null>(() => workoutForDate());

  /** The session the map is drawing — the open day, else today. */
  mapSession = computed<WorkoutDay | null>(() => {
    const i = this.openDay();
    return i === null ? this.todaySession() : this.workoutDays[i] ?? null;
  });

  previewing = computed(() => this.openDay() !== null);
  todayMuscles = computed(() => { const d = this.mapSession(); return d ? musclesFor(d) : []; });
  todayExerciseCount = computed(() => this.mapSession()?.exercises.length ?? 0);
  todayLabel = computed(() => this.todaySession()?.name ?? 'Rest day');
  mapLabel = computed(() => this.mapSession()?.name ?? 'Rest day');

  todaySub = computed(() =>
    this.todaySession()
      ? "Your recomposition plan — build muscle, lose belly fat. Check today's work off as you go."
      : 'Nothing scheduled today. Recovery is part of the program, not a gap in it.'
  );

  constructor(public state: StateService) {}

  today(): string { return todayIso(); }

  checked(kind: 'workout' | 'diet'): boolean {
    return this.state.isFitnessLogged(`${todayIso()}:${kind}`);
  }

  toggle(kind: 'workout' | 'diet', value: boolean) {
    this.state.toggleFitnessLog(`${todayIso()}:${kind}`, value);
  }

  isDayOpen(i: number): boolean { return this.openDay() === i; }

  /** Opening a day closes whichever was open, and drives the map with the same signal. */
  toggleDay(i: number) { this.openDay.update(cur => (cur === i ? null : i)); }

  showToday() { this.openDay.set(null); }

  /** True when this exercise starts a new muscle-group block, so a header row prints once. */
  isNewGroup(day: WorkoutDay, ei: number): boolean {
    const ex = day.exercises[ei];
    if (!ex.group) return false;
    return ei === 0 || day.exercises[ei - 1].group !== ex.group;
  }

  isAbsDayOpen(i: number): boolean { return this.openAbsDay() === i; }
  toggleAbsDay(i: number) { this.openAbsDay.update(cur => (cur === i ? null : i)); }

  setsToday(exercise: string) { return this.state.setsFor(todayIso(), exercise); }

  /** "60x7, 60x6" from the previous session, or null when there isn't one. */
  lastFor(exercise: string): string | null {
    const prev = this.state.lastSession(exercise, todayIso());
    return prev ? prev.sets.map(s => `${s.weight}\u00d7${s.reps}`).join(', ') : null;
  }

  add(exercise: string, w: HTMLInputElement, r: HTMLInputElement) {
    const weight = Number(w.value);
    const reps = Number(r.value);
    if (!Number.isFinite(weight) || !Number.isFinite(reps) || reps <= 0) return;
    this.state.logSet(todayIso(), exercise, weight, reps);
    // Reps usually repeat across sets while weight holds, so clearing only reps means the
    // common case is one number to type instead of two.
    r.value = '';
    r.focus();
  }
}
