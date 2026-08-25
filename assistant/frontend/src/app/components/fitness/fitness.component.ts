import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { MuscleMapComponent } from '../muscle-map/muscle-map.component';
import { RestTimerComponent } from '../rest-timer/rest-timer.component';
import {
  ABS_PROGRAM,
  DIET_RULES,
  DIET_TARGETS,
  MEDICAL_DISCLAIMER,
  NONVEG_MEALS,
  SUPPLEMENTS,
  VEG_MEALS,
  WEEKLY_SCHEDULE,
  WORKOUT_DAYS,
  WORKOUT_PROGRESS,
  WORKOUT_RULES,
  MACRO_TARGETS,
  WorkoutDay,
  mealTotals,
  musclesFor,
  workoutForDate,
} from '../../fitness-data';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

@Component({
  selector: 'app-fitness',
  standalone: true,
  imports: [CommonModule, MuscleMapComponent, RestTimerComponent],
  template: `
    <section class="panel">
      <div class="fit-hero">
        <div class="fit-hero-copy">
          <h1 class="page-title">Fitness &amp; Diet</h1>
          <p class="fit-hero-session">{{ todayLabel() }}</p>
          <p class="page-sub">{{ todaySub() }}</p>

          <div class="fit-today-row">
            <label class="fit-check">
              <input type="checkbox" [checked]="checked('workout')" (change)="toggle('workout', $any($event.target).checked)" />
              Workout done
            </label>
            <label class="fit-check">
              <input type="checkbox" [checked]="checked('diet')" (change)="toggle('diet', $any($event.target).checked)" />
              On-plan with diet
            </label>
            <span class="pill complete">{{ state.fitnessWeekProgress().pct }}% this week</span>
          </div>
        </div>
        <img class="fit-hero-art" src="assets/hero-athlete.webp" alt="" aria-hidden="true" />
      </div>

      <h2 class="section-title">Muscle focus</h2>
      <div class="fit-focus">
        <app-muscle-map [active]="todayMuscles()" />
        <div class="fit-focus-side">
          <p class="fit-focus-lede">
            {{ todayMuscles().length
                ? 'Lit groups are what today actually loads, read from the session below.'
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

      <h2 class="section-title">Today's macros</h2>
      <p class="page-sub">
        Targets from the plan, against what the {{ vegDay() ? 'veg' : 'non-veg' }} day adds up
        to as written — not what you actually ate, which the app doesn't track per meal.
      </p>
      <div class="macro-grid">
        <div class="macro" *ngFor="let m of macroRows()" [class.over]="m.over">
          <div class="macro-head">
            <b>{{ m.label }}</b>
            <span *ngIf="m.tracked">{{ m.have }} / {{ m.target }}{{ m.unit }}</span>
            <span *ngIf="!m.tracked">target {{ m.target }}{{ m.unit }}</span>
          </div>
          <div class="macro-bar" *ngIf="m.tracked"><i [style.width.%]="m.pct"></i></div>
          <p class="macro-note" *ngIf="m.over">
            Plan as written runs {{ m.have - m.target }}{{ m.unit }} over target.
          </p>
          <p class="macro-note" *ngIf="!m.tracked">Not itemised per meal in the plan.</p>
        </div>
      </div>
      <button class="ghost-btn" (click)="vegDay.set(!vegDay())">
        Show {{ vegDay() ? 'non-veg' : 'veg' }} day
      </button>

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

      <h2 class="section-title">Daily targets</h2>
      <p class="page-sub">{{ dietTargets }}</p>

      <h2 class="section-title">Non-veg day</h2>
      <div class="fit-table-wrap">
        <table class="fit-table">
          <thead><tr><th>Meal</th><th>Food &amp; quantity</th><th>Protein</th><th>Calories</th></tr></thead>
          <tbody>
            <tr *ngFor="let m of nonvegMeals">
              <td>{{ m.meal }}</td><td>{{ m.food }}</td><td>{{ m.protein }}</td><td>{{ m.calories }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 class="section-title">Veg day</h2>
      <div class="fit-table-wrap">
        <table class="fit-table">
          <thead><tr><th>Meal</th><th>Food &amp; quantity</th><th>Protein</th><th>Calories</th></tr></thead>
          <tbody>
            <tr *ngFor="let m of vegMeals">
              <td>{{ m.meal }}</td><td>{{ m.food }}</td><td>{{ m.protein }}</td><td>{{ m.calories }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 class="section-title">Supplement schedule</h2>
      <div class="fit-table-wrap">
        <table class="fit-table">
          <thead><tr><th>Supplement</th><th>When</th><th>Notes</th></tr></thead>
          <tbody>
            <tr *ngFor="let s of supplements">
              <td>{{ s.supplement }}</td><td>{{ s.when }}</td><td>{{ s.notes }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 class="section-title">Diet rules</h2>
      <ul class="fit-list">
        <li *ngFor="let r of dietRules">{{ r }}</li>
      </ul>

      <p class="footnote">{{ medicalDisclaimer }}</p>
    </section>
  `,
})
export class FitnessComponent {
  schedule = WEEKLY_SCHEDULE;
  workoutDays = WORKOUT_DAYS;
  absProgram = ABS_PROGRAM;
  workoutRules = WORKOUT_RULES;
  workoutProgress = WORKOUT_PROGRESS;
  dietTargets = DIET_TARGETS;
  nonvegMeals = NONVEG_MEALS;
  vegMeals = VEG_MEALS;
  supplements = SUPPLEMENTS;
  dietRules = DIET_RULES;
  medicalDisclaimer = MEDICAL_DISCLAIMER;

  private openDays = signal<Set<number>>(new Set());
  private openAbsDays = signal<Set<number>>(new Set());

  vegDay = signal(false);

  /** Today's session, or null on the rest day. */
  todaySession = computed<WorkoutDay | null>(() => workoutForDate());

  todayMuscles = computed(() => {
    const day = this.todaySession();
    return day ? musclesFor(day) : [];
  });

  todayExerciseCount = computed(() => this.todaySession()?.exercises.length ?? 0);

  todayLabel = computed(() => this.todaySession()?.name ?? 'Rest day');

  todaySub = computed(() =>
    this.todaySession()
      ? "Your recomposition plan — build muscle, lose belly fat. Check today's work off as you go."
      : 'Nothing scheduled today. Recovery is part of the program, not a gap in it.'
  );

  /**
   * Macro progress against target. `have` is what the day's plan totals as written rather
   * than what was actually eaten — the app tracks adherence as a single daily tick, not
   * per-meal, so claiming to know real intake would be a lie. Protein and calories come
   * from the meal table; carbs and fat are not itemised per meal in the plan, so they show
   * the target as the figure and no progress claim.
   */
  macroRows = computed(() => {
    const meals = this.vegDay() ? this.vegMeals : this.nonvegMeals;
    const totals = mealTotals(meals);
    const row = (label: string, have: number, target: number, unit: string) => ({
      label, have, target, unit,
      pct: Math.min(100, Math.round((have / target) * 100)),
      over: have > target,
      tracked: true,
    });
    return [
      row('Calories', totals.calories, MACRO_TARGETS.kcal, ' kcal'),
      row('Protein', totals.protein, MACRO_TARGETS.protein, ' g'),
      // Carbs and fat are not itemised per meal anywhere in the plan, so there is no honest
      // "have" to show. These render as the target alone rather than a bar that would imply
      // a measurement nobody took.
      { label: 'Carbs', have: 0, target: MACRO_TARGETS.carbs, unit: ' g', pct: 0, over: false, tracked: false },
      { label: 'Fat', have: 0, target: MACRO_TARGETS.fat, unit: ' g', pct: 0, over: false, tracked: false },
    ];
  });

  constructor(public state: StateService) {}

  today(): string { return todayIso(); }

  setsToday(exercise: string) {
    return this.state.setsFor(todayIso(), exercise);
  }

  /** "60 kg × 7, 60 × 6" from the previous session, or null when there isn't one. */
  lastFor(exercise: string): string | null {
    const prev = this.state.lastSession(exercise, todayIso());
    if (!prev) return null;
    return prev.sets.map(s => `${s.weight}×${s.reps}`).join(', ');
  }

  add(exercise: string, w: HTMLInputElement, r: HTMLInputElement) {
    const weight = Number(w.value);
    const reps = Number(r.value);
    if (!Number.isFinite(weight) || !Number.isFinite(reps) || reps <= 0) return;
    this.state.logSet(todayIso(), exercise, weight, reps);
    // Reps usually repeat across sets while weight holds; clearing only reps means the
    // common case (same weight, next set) is one number to type instead of two.
    r.value = '';
    r.focus();
  }

  checked(kind: 'workout' | 'diet'): boolean {
    return this.state.isFitnessLogged(`${todayIso()}:${kind}`);
  }

  toggle(kind: 'workout' | 'diet', value: boolean) {
    this.state.toggleFitnessLog(`${todayIso()}:${kind}`, value);
  }

  isDayOpen(i: number): boolean {
    return this.openDays().has(i);
  }

  toggleDay(i: number) {
    this.openDays.update(set => {
      const next = new Set(set);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  /** True when this exercise starts a new muscle-group block, so a header row prints once. */
  isNewGroup(day: WorkoutDay, ei: number): boolean {
    const ex = day.exercises[ei];
    if (!ex.group) return false;
    return ei === 0 || day.exercises[ei - 1].group !== ex.group;
  }

  isAbsDayOpen(i: number): boolean {
    return this.openAbsDays().has(i);
  }

  toggleAbsDay(i: number) {
    this.openAbsDays.update(set => {
      const next = new Set(set);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }
}
