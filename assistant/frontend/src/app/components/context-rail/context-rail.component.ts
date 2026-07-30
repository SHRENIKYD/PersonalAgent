import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { UiService } from '../../services/ui.service';

const REACTOR_RADIUS = 26;
const REACTOR_CIRCUMFERENCE = 2 * Math.PI * REACTOR_RADIUS;

/**
 * Persistent right-hand context panel, present on every tab — due tasks, overall progress,
 * this week's fitness adherence, and recent notes, so the rest of your state stays visible
 * instead of hidden behind whichever tab happens to be open. Collapses below a width
 * threshold in CSS (see .rail) rather than a manual toggle, so it never fights for space on
 * a laptop-sized window.
 */
@Component({
  selector: 'app-context-rail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="rail">
      <div class="rail-section">
        <div class="rail-head">Due today</div>
        <p *ngIf="state.dueToday().length === 0" class="rail-empty">Nothing due.</p>
        <div class="rail-task" *ngFor="let t of dueTasks()">
          <span class="rail-task-title">{{ t.title }}</span>
          <span class="pill" [ngClass]="t.priority">{{ t.priority }}</span>
        </div>
        <a class="rail-link" *ngIf="state.dueToday().length > 0" (click)="ui.setTab('tasks')">
          View all tasks &rarr;
        </a>
      </div>

      <div class="rail-section rail-reactor-section">
        <div class="rail-head">Overall</div>
        <div class="rail-reactor-row">
          <div class="reactor-wrap rail-reactor-wrap">
            <svg class="reactor-ring" viewBox="0 0 64 64">
              <circle class="reactor-bg" cx="32" cy="32" r="26"></circle>
              <circle
                class="reactor-fg"
                cx="32" cy="32" r="26"
                [attr.stroke-dasharray]="reactorCircumference"
                [attr.stroke-dashoffset]="reactorOffset()"></circle>
            </svg>
            <div class="reactor-label rail-reactor-label">{{ state.overallProgress().pct }}%</div>
          </div>
          <div class="rail-reactor-copy">
            {{ state.overallProgress().done }}/{{ state.overallProgress().total }} complete
          </div>
        </div>
      </div>

      <div class="rail-section">
        <div class="rail-head">Fitness this week</div>
        <div class="overall-progress-track">
          <div class="overall-progress-fill" [style.width.%]="state.fitnessWeekProgress().pct"></div>
        </div>
        <a class="rail-link" (click)="ui.setTab('fitness')">Log today &rarr;</a>
      </div>

      <div class="rail-section">
        <div class="rail-head">Recent notes</div>
        <p *ngIf="recentNotes().length === 0" class="rail-empty">No notes yet.</p>
        <div class="rail-note" *ngFor="let n of recentNotes()">
          <div class="rail-note-title">{{ n.title }}</div>
          <div class="rail-note-body">{{ n.body }}</div>
        </div>
        <a class="rail-link" *ngIf="state.notes().length > 0" (click)="ui.setTab('notes')">
          View all notes &rarr;
        </a>
      </div>
    </aside>
  `,
})
export class ContextRailComponent {
  reactorCircumference = REACTOR_CIRCUMFERENCE;

  constructor(public state: StateService, public ui: UiService) {}

  reactorOffset = computed(() => {
    const pct = this.state.overallProgress().pct;
    return REACTOR_CIRCUMFERENCE * (1 - pct / 100);
  });

  dueTasks() {
    return this.state.dueToday().slice(0, 5);
  }

  recentNotes() {
    return [...this.state.notes()]
      .sort((a, b) => b.updated.localeCompare(a.updated))
      .slice(0, 3);
  }
}
