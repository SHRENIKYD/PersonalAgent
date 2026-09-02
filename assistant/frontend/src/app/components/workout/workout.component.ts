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
import { ExerciseLibraryService } from '../../services/exercise-library.service';
import {
  LibraryExercise,
  equipmentOptions,
  groupForExercise,
  muscleOptions,
  searchExercises,
} from '../../exercise-search';
import {
  ABS_PROGRAM,
  WEEKLY_SCHEDULE,
  WORKOUT_DAYS,
  WORKOUT_PROGRESS,
  WORKOUT_RULES,
  WorkoutDay,
  musclesFor,
  workoutForDate,
  todayIso,
} from '../../fitness-data';

/**
 * Training only. Split from the old combined Fitness tab because the two halves are used at
 * different times — you open this mid-set with one hand, and the diet tab when planning a
 * meal — and scrolling past seven meal tables to reach the set you are logging was the cost
 * of keeping them together.
 */
@Component({
  selector: 'app-workout',
  standalone: true,
  imports: [CommonModule, FoldComponent],
  template: `
    <section class="panel">
      <h1 class="page-title">{{ todayLabel() }}</h1>
      <p class="page-sub">{{ todaySub() }}</p>

      <div class="card">
        <div class="card-head" style="margin-bottom: 0">
          <label class="fit-check">
            <input type="checkbox" [checked]="checked('workout')"
                   (change)="toggle('workout', $any($event.target).checked)" />
            Workout done
          </label>
          <span class="card-count">{{ state.fitnessWeekProgress().pct }}% this week</span>
        </div>
      </div>

      <!-- One card per movement: the photo the library carries for it, its target, the sets
           you have already put in, and the two fields to add another. -->
      <div class="card" *ngFor="let ex of exercises()">
        <div class="ex-head">
          <div class="lib-demo ex-photo" *ngIf="photosFor(ex.name) as pics">
            <img *ngFor="let src of pics" [src]="'assets/exercise-images/' + src"
                 [alt]="ex.name" loading="lazy" decoding="async" />
          </div>
          <div class="ex-main">
            <span class="ex-name">{{ ex.name }}</span>
            <div class="chip-row ex-chips">
              <span class="pill" *ngIf="ex.group">{{ ex.group }}</span>
              <span class="pill">{{ ex.sets }}</span>
            </div>
          </div>
        </div>

        <div class="set-log">
          <span class="set-chip" *ngFor="let st of setsToday(ex.name); let si = index"
                (click)="state.removeSet(today(), ex.name, si)"
                title="Click to remove">{{ st.weight }}&#215;{{ st.reps }}</span>
          <input class="set-in" type="number" inputmode="decimal" placeholder="kg"
                 #w (keydown.enter)="add(ex.name, w, r)" />
          <input class="set-in" type="number" inputmode="numeric" placeholder="reps"
                 #r (keydown.enter)="add(ex.name, w, r)" />
          <button class="set-add" (click)="add(ex.name, w, r)">+</button>
        </div>

        <div class="ex-notes">
          <span class="pr-badge" *ngIf="prFor(ex.name) as p">{{ p }}</span>
          <span class="set-advice" *ngIf="adviceFor(ex) as a"
                [class.up]="a.kind === 'up'"
                [class.deload]="a.kind === 'deload'">{{ a.text }}</span>
        </div>
      </div>

      <p class="empty" *ngIf="!exercises().length">
        Nothing scheduled today. Recovery is part of the programme.
      </p>

      <div class="card">
        <div class="card-head">
          <span class="card-label">Body weight</span>
          <span class="weight-delta" *ngIf="weeklyDelta() !== null"
                [class.good]="deltaIsGood() === true"
                [class.bad]="deltaIsGood() === false">
            {{ weeklyDelta()! > 0 ? '+' : '' }}{{ weeklyDelta() }} kg / week
          </span>
        </div>

        <div *ngIf="latestWeight() as wnow">
          <span class="big-figure">{{ wnow }}</span>
          <span class="big-unit"> kg<span *ngIf="state.weightGoal()"> &middot; target {{ state.weightGoal() }}</span></span>
        </div>

        <p class="setting-note goal-line-note" *ngIf="goal() as g">
          <ng-container [ngSwitch]="g.direction">
            <span *ngSwitchCase="'reached'">At target.</span>
            <span *ngSwitchDefault>
              {{ g.remainingKg }} kg to {{ g.direction === 'cut' ? 'lose' : 'gain' }}<span
                *ngIf="g.weeksToGoal"> &middot; about {{ g.weeksToGoal }} week{{ g.weeksToGoal === 1 ? '' : 's' }} at this rate</span><span
                *ngIf="g.movingToward === false"> &middot; currently moving away</span>
            </span>
          </ng-container>
        </p>

        <svg class="weight-chart" *ngIf="trendPath() as d" viewBox="0 0 300 90"
             preserveAspectRatio="none" role="img" aria-label="Body weight trend">
          <line *ngIf="goalY() as gy" x1="0" [attr.y1]="gy" x2="300" [attr.y2]="gy"
                stroke="var(--ok)" stroke-width="1" stroke-dasharray="4 4"
                vector-effect="non-scaling-stroke" />
          <path [attr.d]="d" fill="none" stroke="var(--accent-dim)" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
        </svg>
        <p class="weight-empty" *ngIf="!trendPath()">Two or more readings draw a trend line.</p>

        <div class="add-row">
          <input class="grow" type="number" inputmode="decimal" step="0.1"
                 placeholder="today's weight in kg" #wkg />
          <button (click)="saveWeight(wkg)">Log</button>
        </div>
        <div class="add-row add-row-sub">
          <input class="grow" type="number" inputmode="decimal" step="0.1"
                 placeholder="target weight in kg" [value]="state.weightGoal() || ''" #gkg />
          <button class="ghost-btn" (click)="saveGoal(gkg)">Set target</button>
        </div>
      </div>

      <div class="card" *ngIf="recentSessions().length">
        <span class="card-label">Recent sessions</span>
        <div class="meal-row" *ngFor="let s of recentSessions()">
          <span class="meal-main">
            <span class="meal-name">{{ s.title }}</span>
            <span class="meal-food">{{ s.when }}</span>
          </span>
          <span class="meal-kcal">{{ s.sets }} {{ s.sets === 1 ? 'set' : 'sets' }} &middot; {{ s.tonnes }} t</span>
        </div>
      </div>
    </section>
  `,
})
export class WorkoutComponent {
  workoutDays = WORKOUT_DAYS;


  /** Today's session, or null on the rest day. */
  todaySession = computed<WorkoutDay | null>(() => workoutForDate());
  todayLabel = computed(() => this.todaySession()?.name ?? 'Rest day');
  todaySub = computed(() =>
    this.todaySession()
      ? "Your recomposition plan — build muscle, lose belly fat. Check today's work off as you go."
      : 'Nothing scheduled today. Recovery is part of the program, not a gap in it.'
  );

  constructor(
    public state: StateService,
    public library: ExerciseLibraryService,
  ) {
    // Kicked off on construction rather than on first keystroke: the Body tab is where the
    // library lives, so by the time the fold is opened the fetch has usually finished and
    // the list appears instantly instead of blinking through a loading line.
    void this.library.load();
  }

  /** Today's movements, straight from the plan. */
  exercises = computed(() => this.todaySession()?.exercises ?? []);

  /**
   * The library's two frames for a plan exercise, matched by name.
   *
   * The mockup's exercise card carries a photograph, and the only photographs this app has
   * are the library's — so the library stops being a separate screen you search and becomes
   * the illustration on the movement you are actually doing. Names that do not match return
   * null and the card is simply text, which is what a fresh install shows anyway.
   */
  photosFor(name: string): string[] | null {
    const hit = this.library.byName(name);
    return hit && hit.images.length ? hit.images : null;
  }

  /**
   * The last few training days, newest first.
   *
   * Built from the set log rather than from the plan, so it reflects what was done and not
   * what was scheduled. Tonnage is weight times reps summed over the day — a blunt measure,
   * but the one that makes two sessions comparable at a glance.
   */
  recentSessions = computed(() => {
    const byDate = new Map<string, { sets: number; kg: number }>();
    Object.entries(this.state.setLog()).forEach(([key, sets]) => {
      const date = key.slice(0, key.indexOf('|'));
      const acc = byDate.get(date) ?? { sets: 0, kg: 0 };
      sets.forEach(st => { acc.sets++; acc.kg += st.weight * st.reps; });
      byDate.set(date, acc);
    });
    const today = todayIso();
    return [...byDate.entries()]
      .filter(([date]) => date < today)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 3)
      .map(([date, acc]) => ({
        title: workoutForDate(new Date(date + 'T12:00:00'))?.name ?? 'Session',
        when: new Date(date + 'T00:00:00').toLocaleDateString(undefined,
          { weekday: 'long', day: 'numeric', month: 'short' }),
        sets: acc.sets,
        tonnes: (acc.kg / 1000).toFixed(1),
      }));
  });

  today(): string { return todayIso(); }

  checked(kind: 'workout' | 'diet'): boolean {
    return this.state.isFitnessLogged(`${todayIso()}:${kind}`);
  }

  toggle(kind: 'workout' | 'diet', value: boolean) {
    this.state.toggleFitnessLog(`${todayIso()}:${kind}`, value);
  }
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
