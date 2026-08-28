import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FoldComponent } from '../fold/fold.component';
import { StateService } from '../../services/state.service';
import {
  Advice,
  hasStalledTwice,
  nextSetAdvice,
  parseRepTarget,
  rollingAverage,
  goalStatus,
  detectPr,
  personalRecords,
  estimated1RM,
  volumeByGroup,
  weeklyChange,
} from '../../fitness-progress';
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
  imports: [CommonModule, MuscleMapComponent, RestTimerComponent, FoldComponent],
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

      <app-fold label="Body weight" [note]="latestWeight() ? latestWeight() + ' kg' : 'not logged'">

      <p class="setting-note">
        Day to day this is mostly water — the line is the 7-day average, which is the only
        part that tracks what your training is actually doing.
      </p>

      <div class="weight-row" *ngIf="latestWeight() as w">
        <span class="weight-now">{{ w }} kg</span>
        <!--
          Coloured by whether the trend moves toward the goal, not by its sign. Without a
          goal set there is nothing to be right or wrong about, so it stays neutral rather
          than assuming a cut.
        -->
        <span class="weight-delta" *ngIf="weeklyDelta() !== null"
              [class.good]="deltaIsGood() === true"
              [class.bad]="deltaIsGood() === false">
          {{ weeklyDelta()! > 0 ? '+' : '' }}{{ weeklyDelta() }} kg / week
        </span>
      </div>

      <p class="setting-note goal-line-note" *ngIf="goal() as g">
        <ng-container [ngSwitch]="g.direction">
          <span *ngSwitchCase="'reached'">At target.</span>
          <span *ngSwitchDefault>
            {{ g.remainingKg }} kg to {{ g.direction === 'cut' ? 'lose' : 'gain' }}<span
              *ngIf="g.weeksToGoal"> · about {{ g.weeksToGoal }} week{{ g.weeksToGoal === 1 ? '' : 's' }} at this rate</span><span
              *ngIf="g.movingToward === false"> · currently moving away</span>
          </span>
        </ng-container>
      </p>

      <svg class="weight-chart" *ngIf="trendPath() as d" viewBox="0 0 300 90"
           preserveAspectRatio="none" role="img" aria-label="Body weight trend">
        <!-- The goal, drawn only when it falls inside the plotted range; a target far
             outside the last few weeks would otherwise pin to an edge and read as data. -->
        <line *ngIf="goalY() as gy" x1="0" [attr.y1]="gy" x2="300" [attr.y2]="gy"
              stroke="var(--ok)" stroke-width="1" stroke-dasharray="4 4"
              vector-effect="non-scaling-stroke" />
        <path [attr.d]="d" fill="none" stroke="var(--accent)" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
      </svg>
      <p class="weight-empty" *ngIf="!trendPath()">
        Two or more readings draw a trend line.
      </p>

      <div class="add-row">
        <input class="grow" type="number" inputmode="decimal" step="0.1"
               placeholder="today's weight in kg" #wkg />
        <button (click)="saveWeight(wkg)">Log weight</button>
      </div>

      <div class="add-row">
        <input class="grow" type="number" inputmode="decimal" step="0.1"
               placeholder="target weight in kg" [value]="state.weightGoal() || ''" #gkg />
        <button class="ghost-btn" (click)="saveGoal(gkg)">Set target</button>
      </div>
      </app-fold>
<app-fold label="This week's volume">

      <p class="setting-note">
        Hard sets per group over the last 7 days — what you actually did, not what the plan
        says. A group sitting at zero is the one to look at.
      </p>
      <div class="muscle-tags" *ngIf="weekVolume().length; else noVolume">
        <span class="muscle-tag" *ngFor="let v of weekVolume()">
          <span class="muscle-dot"></span>{{ v.group }} — {{ v.sets }}
        </span>
      </div>
      <ng-template #noVolume>
        <p class="weight-empty">No sets logged in the last 7 days.</p>
      </ng-template>
</app-fold>
<app-fold label="Rest timer">

      <app-rest-timer />
</app-fold>
<app-fold label="Weekly split">

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
      </app-fold>

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
                      <span class="set-advice" *ngIf="adviceFor(ex) as a"
                            [class.up]="a.kind === 'up'"
                            [class.deload]="a.kind === 'deload'">{{ a.text }}</span>
                      <span class="pr-badge" *ngIf="prFor(ex.name) as p">{{ p }}</span>
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

<app-fold label="Abs program">

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
</app-fold>
<app-fold label="Training rules">

      <ul class="fit-list">
        <li *ngFor="let r of workoutRules">{{ r }}</li>
      </ul>
</app-fold>
<app-fold label="Expected progress">

      <ul class="fit-list">
        <li *ngFor="let p of workoutProgress">{{ p }}</li>
      </ul>
</app-fold>
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

  /**
   * What to do on this movement today, from what was actually lifted last time.
   *
   * Nothing shows until there is history, because "no history yet" on every row of a fresh
   * install is noise. The advice itself is arithmetic, not a model — a wrong instruction to
   * add weight would be worse than no instruction at all.
   */
  /** The most recent reading, or null before anything is logged. */
  latestWeight = computed(() => {
    const e = this.state.weightEntries();
    return e.length ? e[e.length - 1].kg : null;
  });

  weeklyDelta = computed(() => weeklyChange(this.state.weightEntries()));

  goal = computed(() => goalStatus(this.state.weightEntries(), this.state.weightGoal()));

  /** true = moving toward the target, false = away, null = no target or too flat to say. */
  deltaIsGood = computed<boolean | null>(() => this.goal()?.movingToward ?? null);

  /**
   * The goal's y position in the chart's coordinate space, or null when it sits outside the
   * plotted range. Recomputes the same min/max the path does — worth the duplication, since
   * a goal line drawn against a different scale than the curve is actively misleading.
   */
  goalY = computed<number | null>(() => {
    const target = this.state.weightGoal();
    if (!target) return null;
    const avg = rollingAverage(this.state.weightEntries());
    if (avg.length < 2) return null;
    const values = avg.map(a => a.kg);
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (target < min || target > max) return null;
    const span = Math.max(max - min, 1);
    return 85 - ((target - min) / span) * 80;
  });

  /** The averaged line as an SVG path, or null until two readings exist to join. */
  trendPath = computed<string | null>(() => {
    const avg = rollingAverage(this.state.weightEntries());
    if (avg.length < 2) return null;
    const values = avg.map(a => a.kg);
    const min = Math.min(...values);
    const max = Math.max(...values);
    // A flat run would divide by zero and, worse, draw a line at the top of the box; a
    // minimum span keeps a steady week looking steady rather than dramatic.
    const span = Math.max(max - min, 1);
    return values
      .map((v, i) => {
        const x = (i / (values.length - 1)) * 300;
        const y = 85 - ((v - min) / span) * 80;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  });

  saveGoal(input: HTMLInputElement) {
    this.state.setWeightGoal(parseFloat(input.value));
  }

  weekVolume = computed(() => {
    const to = todayIso();
    const from = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
    return volumeByGroup(this.state.setLog(), name => this.groupOf(name), from, to);
  });

  /** Exercise name back to its muscle group, from the plan rather than from the log. */
  private groupOf(name: string): string | undefined {
    for (const day of this.workoutDays) {
      const hit = day.exercises.find(e => e.name === name);
      if (hit) return hit.group;
    }
    return undefined;
  }

  saveWeight(input: HTMLInputElement) {
    const kg = Number(input.value);
    if (!Number.isFinite(kg) || kg <= 0) return;
    this.state.logWeight(todayIso(), kg);
    input.value = '';
  }

  adviceFor(ex: { name: string; group?: string; sets: string }): Advice | null {
    const prev = this.state.lastSession(ex.name, todayIso());
    if (!prev) return null;
    const target = parseRepTarget(ex.sets);
    const stalled = hasStalledTwice(this.state.recentSessions(ex.name, todayIso()), target);
    return nextSetAdvice(prev.sets, target, ex.group ?? '', stalled);
  }

  /**
   * Which movements just produced a personal record, and what kind.
   *
   * Held in a signal rather than derived, because a PR is an event — it happened when the set
   * was logged. Recomputing it from the log would make the badge permanent, and a badge that
   * never goes away stops meaning "you just did something".
   */
  private prFlash = signal<Record<string, string>>({});

  prFor(exercise: string): string | null {
    return this.prFlash()[exercise] ?? null;
  }

  add(exercise: string, w: HTMLInputElement, r: HTMLInputElement) {
    const weight = Number(w.value);
    const reps = Number(r.value);
    if (!Number.isFinite(weight) || !Number.isFinite(reps) || reps <= 0) return;

    // Checked against history *before* the set is written. Comparing afterwards would make
    // every set its own record and fire the badge on all of them.
    const pr = detectPr({ weight, reps }, this.state.allSets(exercise));
    if (pr.any) {
      const label = pr.heaviest ? 'PR · heaviest'
        : pr.reps ? 'PR · reps'
        : `PR · est ${estimated1RM({ weight, reps })}kg`;
      this.prFlash.update(m => ({ ...m, [exercise]: label }));
      // Long enough to notice between sets, short enough that it is gone next session.
      setTimeout(() => this.prFlash.update(m => {
        const { [exercise]: _drop, ...rest } = m;
        return rest;
      }), 8000);
    }

    this.state.logSet(todayIso(), exercise, weight, reps);
    // Reps usually repeat across sets while weight holds, so clearing only reps means the
    // common case is one number to type instead of two.
    r.value = '';
    r.focus();
  }
}
