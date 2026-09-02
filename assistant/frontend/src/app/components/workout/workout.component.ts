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
  EXERCISE_PHOTOS,
  absForDay,
} from '../../fitness-data';

/** One entry in the stepper: a plan movement or one from the paired abs block. */
interface FocusItem {
  kind: 'plan' | 'abs';
  name: string;
  group: string;
  sets: string;
  /** The abs programme's regression, shown only for abs movements. */
  easier: string | null;
  advice: Advice | null;
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
  imports: [CommonModule, FoldComponent],
  template: `
    <section class="panel">
      <h1 class="page-title">{{ shownLabel() }}</h1>
      <p class="page-sub">{{ shownSub() }}</p>

      <!--
        The six-day accordion this replaced was the only way to look at another session, and
        removing it left the screen able to show exactly one day. These chips put every day
        back on one row: Today is the default, and the rest are a tap away.
      -->
      <div class="chip-row chip-scroll">
        <button class="chip-filter" [class.on]="viewing() === null" (click)="showDay(null)">
          Today
        </button>
        <button class="chip-filter" *ngFor="let d of workoutDays; let i = index"
                [class.on]="viewing() === i"
                (click)="showDay(i)">{{ shortName(d.name) }}</button>
      </div>

      <div class="card" *ngIf="viewing() === null">
        <div class="card-head" style="margin-bottom: 0">
          <label class="fit-check">
            <input type="checkbox" [checked]="checked('workout')"
                   (change)="toggle('workout', $any($event.target).checked)" />
            Workout done
          </label>
          <span class="card-count">{{ state.fitnessWeekProgress().pct }}% this week</span>
        </div>
      </div>

      <!--
        Focus: one movement fills the screen instead of eight cards stacked down it.
        The photograph is big enough to check a setup against, the two fields are
        thumb-sized, and the next movement is one tap away — which is what a session
        actually needs, since you are holding the phone with one hand between sets.

        The abs block is part of the same sequence rather than a second list underneath.
        It pairs with the session, so in a stepper it is simply the movements at the end.
      -->
      <div class="card focus" *ngIf="current() as ex">
        <div class="focus-count">
          {{ ex.kind === 'abs' ? 'Abs' : 'Movement' }}
          {{ pos() + 1 }} of {{ sequence().length }}
        </div>

        <div class="lib-demo ex-photo focus-photo" *ngIf="photosFor(ex.name) as pics">
          <img *ngFor="let src of pics" [src]="'assets/exercise-images/' + src"
               [alt]="ex.name" loading="lazy" decoding="async" />
        </div>

        <h2 class="focus-name">{{ ex.name }}</h2>
        <div class="chip-row focus-chips">
          <span class="pill">{{ ex.group }}</span>
          <span class="pill">{{ ex.sets }}</span>
        </div>

        <div class="focus-sets" *ngIf="setsToday(ex.name).length">
          <span class="set-chip" *ngFor="let st of setsToday(ex.name); let si = index"
                (click)="state.removeSet(today(), ex.name, si)"
                title="Tap to remove">{{ st.weight }}&#215;{{ st.reps }}</span>
        </div>

        <div class="focus-log">
          <input class="set-in focus-in" type="number" inputmode="decimal" placeholder="kg"
                 #w (keydown.enter)="add(ex.name, w, r)" />
          <input class="set-in focus-in" type="number" inputmode="numeric" placeholder="reps"
                 #r (keydown.enter)="add(ex.name, w, r)" />
        </div>
        <button class="focus-add" (click)="add(ex.name, w, r)">
          Log set {{ setsToday(ex.name).length + 1 }}
        </button>

        <div class="ex-notes focus-notes">
          <span class="pr-badge" *ngIf="prFor(ex.name) as p">{{ p }}</span>
          <span class="set-advice" *ngIf="ex.advice as a"
                [class.up]="a.kind === 'up'"
                [class.deload]="a.kind === 'deload'">{{ a.text }}</span>
        </div>
        <p class="abs-easier" *ngIf="ex.easier">Easier: {{ ex.easier }}</p>

        <!-- Every movement reachable in one tap, so the stepper never traps you at
             number six with nothing but Back. -->
        <div class="focus-dots" role="tablist" aria-label="Movements">
          <button *ngFor="let it of sequence(); let i = index"
                  [class.on]="i === pos()"
                  [class.logged]="setsToday(it.name).length > 0"
                  [attr.aria-label]="it.name"
                  [attr.aria-selected]="i === pos()"
                  role="tab"
                  (click)="pos.set(i)"></button>
        </div>

        <div class="focus-move">
          <button class="ghost-btn" [disabled]="pos() === 0" (click)="step(-1)">
            &#8592; Back
          </button>
          <button class="ghost-btn focus-next" *ngIf="next() as nx" (click)="step(1)">
            {{ nx.name }} &#8594;
          </button>
        </div>
      </div>

      <p class="empty" *ngIf="!sequence().length">
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
  /** Which day is on screen: null means today, otherwise an index into the plan. */
  readonly viewing = signal<number | null>(null);

  /** The session being shown — the chosen day, else today's. */
  shownSession = computed<WorkoutDay | null>(() => {
    const i = this.viewing();
    return i === null ? this.todaySession() : this.workoutDays[i] ?? null;
  });

  shownLabel = computed(() => this.shownSession()?.name ?? 'Rest day');

  shownSub = computed(() => {
    if (this.viewing() !== null) return 'Previewing another day. Sets still log against today.';
    return this.todaySub();
  });

  exercises = computed(() => this.shownSession()?.exercises ?? []);

  /**
   * The session as one flat sequence: the plan's movements, then the paired abs block.
   *
   * Flattened here rather than rendered as two lists because the screen is a stepper — a
   * separate abs section below would be a second thing to scroll to and the exact thing
   * that got missed when abs lived behind their own heading.
   */
  sequence = computed<FocusItem[]>(() => {
    const plan: FocusItem[] = this.exercises().map(ex => ({
      kind: 'plan' as const,
      name: ex.name,
      group: ex.group || 'Movement',
      sets: ex.sets,
      easier: null,
      advice: this.adviceFor(ex),
    }));
    const abs = this.absDay();
    const absItems: FocusItem[] = (abs?.exercises ?? []).map(ex => ({
      kind: 'abs' as const,
      name: ex.name,
      group: 'Abs',
      sets: ex.sets,
      easier: ex.easierOption,
      advice: null,
    }));
    return [...plan, ...absItems];
  });

  /** Where in the sequence we are. Clamped on read, so a shorter day cannot strand it. */
  readonly pos = signal(0);

  current = computed<FocusItem | null>(() => {
    const seq = this.sequence();
    return seq.length ? seq[Math.min(this.pos(), seq.length - 1)] : null;
  });

  next = computed<FocusItem | null>(() => this.sequence()[this.pos() + 1] ?? null);

  step(by: number) {
    const seq = this.sequence();
    this.pos.set(Math.max(0, Math.min(seq.length - 1, this.pos() + by)));
  }

  /** Switching day starts that session at its first movement, not wherever you were. */
  showDay(i: number | null) {
    this.viewing.set(i);
    this.pos.set(0);
  }

  /** The abs block paired with the session on screen, if the programme pairs one. */
  absDay = computed(() => {
    const d = this.shownSession();
    return d ? absForDay(d.name) : null;
  });

  /**
   * "Push A" out of "Push A — Upper Chest + Full Triceps".
   *
   * The chips sit on one row at 390px, and the part after the dash is the description
   * rather than the name — it is what the title above already says in full.
   */
  shortName(name: string): string {
    return name.split(/\s+[—-]\s+/)[0].trim();
  }

  /**
   * The library's two frames for a plan exercise.
   *
   * Goes through EXERCISE_PHOTOS rather than matching names directly: the plan calls it
   * "Hack squat / leg press" and the library calls it "Hack Squat", so an exact lookup found
   * four of forty-two. Falls back to the exact name for anything logged outside the plan,
   * and returns null when the library has not loaded yet — the card is then simply text.
   */
  photosFor(name: string): string[] | null {
    const hit = this.library.byName(EXERCISE_PHOTOS[name] ?? name);
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
