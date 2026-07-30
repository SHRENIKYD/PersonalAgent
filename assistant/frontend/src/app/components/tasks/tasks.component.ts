import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../services/state.service';
import { Priority } from '../../models';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="panel">
      <h1 class="page-title">Tasks</h1>
      <p class="page-sub">
        Everything you or the assistant has added. Edits here are visible to the assistant.
      </p>

      <div class="add-row">
        <input
          class="grow"
          [(ngModel)]="newTitle"
          placeholder="Add a task…"
          (keydown.enter)="add()" />
        <input type="date" [(ngModel)]="newDue" />
        <select [(ngModel)]="newPriority">
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
        <button (click)="add()">Add</button>
      </div>

      <h2 class="section-title">Open ({{ state.openTasks().length }})</h2>
      <p *ngIf="state.openTasks().length === 0" class="empty">Nothing open.</p>
      <ul class="task-list">
        <li *ngFor="let t of state.openTasks()" class="task-row">
          <input
            type="checkbox"
            [checked]="t.done"
            (change)="state.toggleTask(t.id, true)" />
          <input
            class="task-title grow"
            [ngModel]="t.title"
            (ngModelChange)="state.updateTaskTitle(t.id, $event)" />
          <span class="pill" [ngClass]="t.priority">{{ t.priority }}</span>
          <span class="due" [class.overdue]="isOverdue(t.due)">{{ t.due || '—' }}</span>
          <button class="ghost-btn" (click)="state.removeTask(t.id)">Delete</button>
        </li>
      </ul>

      <ng-container *ngIf="state.doneTasks().length > 0">
        <h2 class="section-title">Done ({{ state.doneTasks().length }})</h2>
        <ul class="task-list">
          <li *ngFor="let t of state.doneTasks()" class="task-row done">
            <input
              type="checkbox"
              [checked]="t.done"
              (change)="state.toggleTask(t.id, false)" />
            <span class="task-title grow">{{ t.title }}</span>
            <button class="ghost-btn" (click)="state.removeTask(t.id)">Delete</button>
          </li>
        </ul>
      </ng-container>
    </section>
  `,
})
export class TasksComponent {
  newTitle = '';
  newDue = '';
  newPriority: Priority = 'normal';

  constructor(public state: StateService) {}

  add() {
    if (this.newTitle.trim() === '') return;
    this.state.addTask(this.newTitle, this.newDue, this.newPriority);
    this.newTitle = '';
    this.newDue = '';
    this.newPriority = 'normal';
  }

  isOverdue(due: string): boolean {
    return due !== '' && due < new Date().toISOString().slice(0, 10);
  }
}
