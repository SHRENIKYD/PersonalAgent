import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { UiService } from '../../services/ui.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="panel">
      <h1 class="page-title">Today</h1>
      <p class="page-sub">{{ todayLabel }}</p>

      <div class="stat-row">
        <div class="stat">
          <div class="stat-value">{{ state.dueToday().length }}</div>
          <div class="stat-label">Due today or overdue</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{ state.openTasks().length }}</div>
          <div class="stat-label">Open tasks</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{ state.notes().length }}</div>
          <div class="stat-label">Notes</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{ state.progress().pct }}%</div>
          <div class="stat-label">Completed</div>
        </div>
      </div>

      <h2 class="section-title">Needs attention</h2>
      <p *ngIf="state.dueToday().length === 0" class="empty">
        Nothing due. <a (click)="ui.setTab('chat')">Ask the assistant</a> to plan something.
      </p>
      <ul class="task-list">
        <li *ngFor="let t of state.dueToday()" class="task-row">
          <input type="checkbox" [checked]="t.done" (change)="state.toggleTask(t.id, true)" />
          <span class="task-title grow">{{ t.title }}</span>
          <span class="pill" [ngClass]="t.priority">{{ t.priority }}</span>
          <span class="due overdue">{{ t.due }}</span>
        </li>
      </ul>
    </section>
  `,
})
export class DashboardComponent {
  todayLabel = new Date().toDateString();

  constructor(public state: StateService, public ui: UiService) {}
}
