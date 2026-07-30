import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../services/state.service';
import { GOAL_PLACEHOLDERS, TRACKS } from '../../growth-data';

@Component({
  selector: 'app-growth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="panel">
      <div class="page-head">
        <div>
          <h1 class="page-title">Growth</h1>
          <p class="page-sub">
            Career, health, habits, and relationships — a six-month plan alongside a weekly
            habit tracker. Type your own goals; everything saves automatically.
          </p>
        </div>
        <button (click)="state.applySuggestedRoadmap()">Fill empty goals with suggested plan</button>
      </div>

      <div class="trail-col">
        <div class="trail-line"></div>
        <div class="trail-fill" [style.height.%]="roadmapPct()"></div>

        <div class="month" *ngFor="let m of state.roadmap().months; let mi = index">
          <div class="waypoint" [class.complete]="state.monthComplete(m)"></div>
          <div class="month-head">
            <span class="month-index">{{ mi + 1 }}</span>
            <span class="month-name">{{ m.name }}</span>
            <input
              class="theme-input"
              placeholder="this month's theme…"
              [ngModel]="m.theme"
              (ngModelChange)="state.updateTheme(mi, $event)" />
          </div>

          <div class="tracks">
            <div class="track" *ngFor="let t of tracks">
              <div class="track-label"><span class="dot"></span>{{ t.label }}</div>
              <div class="goal-row" *ngFor="let goal of m.tracks[t.key]; let gi = index" [class.checked]="goal.done">
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
      </div>

      <div class="section-head">
        <div>
          <h2 class="section-title" style="margin:0;">Weekly Habit Tracker</h2>
          <p class="setting-note">26 weeks. Rename habits, add more, tap a box each week you keep it up.</p>
        </div>
        <button (click)="state.addHabit()">+ Add habit</button>
      </div>

      <div class="habit-scroll">
        <table class="habit-grid">
          <thead>
            <tr>
              <th class="week-label-th">Habit</th>
              <th *ngFor="let w of weeks">{{ w }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let h of state.roadmap().habits; let hi = index">
              <td>
                <input
                  class="habit-name"
                  placeholder="habit name…"
                  [ngModel]="h.name"
                  (ngModelChange)="state.updateHabitName(hi, $event)" />
              </td>
              <td class="cell" *ngFor="let on of h.weeks; let wi = index">
                <button
                  [class.on]="on"
                  [attr.aria-label]="(h.name || 'habit') + ' week ' + (wi + 1)"
                  (click)="state.toggleHabitWeek(hi, wi)"></button>
              </td>
              <td>
                <button class="ghost-btn" aria-label="Remove habit" (click)="state.removeHabit(hi)">✕</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class GrowthComponent {
  tracks = TRACKS;
  placeholders = GOAL_PLACEHOLDERS;
  weeks = Array.from({ length: 26 }, (_, i) => i + 1);

  constructor(public state: StateService) {}

  roadmapPct(): number {
    return this.state.roadmapProgress().pct;
  }
}
