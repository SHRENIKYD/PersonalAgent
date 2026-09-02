import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../services/state.service';
import { MonthPlan, Habit } from '../../models';
import { GOAL_PLACEHOLDERS, TRACKS } from '../../growth-data';

/**
 * Growth, rebuilt to the Bloom mockup: a card per month carrying its own progress bar, the
 * open one tinted, and the habits as small square grids underneath.
 *
 * The mockup draws a habit as seven cells. This app tracks twenty-six weeks, so the cells
 * wrap seven to a row instead — the same grid to look at, with nothing dropped. Showing only
 * the last seven would have matched the drawing by hiding nineteen weeks of someone's work.
 *
 * The vertical trail with its waypoints is gone. It was the old system's device for making a
 * list feel like a journey, and a stack of cards says the same thing without the scaffolding.
 */
@Component({
  selector: 'app-growth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="panel">
      <h1 class="page-title">Growth</h1>
      <p class="card-label">Roadmap &middot; six months</p>

      <div class="card" [class.card-accent]="isOpen(mi)"
           *ngFor="let m of state.roadmap().months; let mi = index">
        <button class="month-head-row" (click)="toggle(mi)" [attr.aria-expanded]="isOpen(mi)">
          <span class="month-name">{{ m.name }}</span>
          <span class="month-frac" [class.on]="isOpen(mi)">{{ monthCount(m) || '—' }}</span>
        </button>

        <div class="overall-progress-track">
          <div class="overall-progress-fill" [style.width.%]="monthPct(m)"></div>
        </div>

        <input
          *ngIf="isOpen(mi)"
          class="theme-input"
          placeholder="this month's theme…"
          [ngModel]="m.theme"
          (ngModelChange)="state.updateTheme(mi, $event)" />
        <p class="month-theme" *ngIf="!isOpen(mi) && m.theme">{{ m.theme }}</p>

        <div class="tracks" *ngIf="isOpen(mi)">
          <div class="track" *ngFor="let t of tracks">
            <div class="track-label"><span class="dot"></span>{{ t.label }}</div>
            <div class="goal-row" *ngFor="let goal of m.tracks[t.key]; let gi = index"
                 [class.checked]="goal.done">
              <input
                type="checkbox"
                [checked]="goal.done"
                (change)="state.toggleGoal(mi, t.key, gi, $any($event.target).checked)" />
              <input
                class="goal-text"
                type="text"
                [placeholder]="placeholders[t.key]"
                [ngModel]="goal.text"
                (ngModelChange)="state.updateGoalText(mi, t.key, gi, $event)" />
            </div>
          </div>
        </div>
      </div>

      <div class="add-row">
        <button class="ghost-btn grow" (click)="state.applySuggestedRoadmap()">
          Fill empty goals with the suggested plan
        </button>
      </div>

      <div class="card">
        <div class="card-head">
          <span class="card-label">Habits &middot; 26 weeks</span>
          <button class="ghost-btn" (click)="state.addHabit()">Add</button>
        </div>

        <p class="empty" *ngIf="state.roadmap().habits.length === 0">No habits yet.</p>

        <div class="habit-block" *ngFor="let h of state.roadmap().habits; let hi = index">
          <div class="habit-head">
            <input
              class="habit-name grow"
              placeholder="habit name…"
              [ngModel]="h.name"
              (ngModelChange)="state.updateHabitName(hi, $event)" />
            <span class="habit-streak">{{ streakLabel(h) }}</span>
            <button class="row-x" aria-label="Remove habit" (click)="state.removeHabit(hi)">&#215;</button>
          </div>
          <div class="habit-cells">
            <button
              *ngFor="let on of h.weeks; let wi = index"
              [class.on]="on"
              [attr.aria-label]="(h.name || 'habit') + ' week ' + (wi + 1)"
              (click)="state.toggleHabitWeek(hi, wi)"></button>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class GrowthComponent {
  tracks = TRACKS;
  placeholders = GOAL_PLACEHOLDERS;

  /** One month open at a time — six months of goals do not fit on a phone screen at once. */
  private openMonth = signal<number | null>(null);

  constructor(public state: StateService) {
    // Land on the first month that still has work in it rather than always on month one.
    const months = this.state.roadmap().months;
    const first = months.findIndex(m => !this.state.monthComplete(m));
    this.openMonth.set(first >= 0 ? first : 0);
  }

  isOpen(i: number): boolean { return this.openMonth() === i; }
  toggle(i: number) { this.openMonth.update(cur => (cur === i ? null : i)); }

  /** Done-of-total for the row, so a shut month still says where it stands. */
  monthCount(m: MonthPlan): string {
    const { done, total } = this.monthTally(m);
    return total === 0 ? '' : `${done} / ${total}`;
  }

  monthPct(m: MonthPlan): number {
    const { done, total } = this.monthTally(m);
    return total === 0 ? 0 : Math.round((done / total) * 100);
  }

  /** Empty goal rows are placeholders, not work — they do not count either way. */
  private monthTally(m: MonthPlan): { done: number; total: number } {
    let total = 0, done = 0;
    TRACKS.forEach(t => m.tracks[t.key].forEach(g => {
      if (g.text.trim() !== '') { total++; if (g.done) done++; }
    }));
    return { done, total };
  }

  /**
   * Weeks kept in a row, counting back from the most recent one ticked.
   *
   * Counted from the last tick rather than from today, because the grid has no notion of
   * which week is current — a run that ended two weeks ago is still the run you had.
   */
  streakLabel(h: Habit): string {
    const last = h.weeks.lastIndexOf(true);
    if (last < 0) return 'not started';
    let n = 0;
    for (let i = last; i >= 0 && h.weeks[i]; i--) n++;
    return n === 1 ? '1 week' : `${n} weeks`;
  }
}
