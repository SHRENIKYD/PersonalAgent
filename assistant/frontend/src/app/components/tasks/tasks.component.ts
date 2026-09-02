import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../services/state.service';
import { Priority, Task } from '../../models';
import { todayIso } from '../../fitness-data';

type Filter = 'all' | 'today' | 'overdue';

/**
 * Tasks, rebuilt to the Bloom mockup: an add row, three filters, one card holding the list,
 * and a count underneath.
 *
 * The mockup draws the add row as a single field and an Add button. The date and priority
 * controls are kept anyway — without them nothing can ever be given a due date or a
 * priority, and the row below would then show "—" and "normal" forever. Losing a feature is
 * not the same kind of change as losing a decoration.
 */
@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="panel">
      <h1 class="page-title">Tasks</h1>

      <div class="add-row">
        <input
          class="grow"
          [(ngModel)]="newTitle"
          placeholder="Add a task…"
          (keydown.enter)="add()" />
        <button (click)="add()">Add</button>
      </div>

      <div class="add-row add-row-sub">
        <input class="grow" type="date" [(ngModel)]="newDue" aria-label="Due date" />
        <select [(ngModel)]="newPriority" aria-label="Priority">
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
      </div>

      <div class="chip-row">
        <button class="chip-filter" *ngFor="let f of filters"
                [class.on]="filter() === f.key"
                (click)="filter.set(f.key)">{{ f.label }}</button>
      </div>

      <div class="card" *ngIf="shown().length">
        <ul class="task-list">
          <li *ngFor="let t of shown()" class="task-row" [class.done]="t.done">
            <input type="checkbox" [checked]="t.done"
                   (change)="state.toggleTask(t.id, !t.done)" />
            <input class="task-title grow" [ngModel]="t.title"
                   (ngModelChange)="state.updateTaskTitle(t.id, $event)" />
            <span class="due" [class.overdue]="isOverdue(t.due)">{{ dueLabel(t.due) }}</span>
            <span class="pill" [ngClass]="t.priority">{{ t.priority }}</span>
            <button class="row-x" (click)="state.removeTask(t.id)"
                    [attr.aria-label]="'Delete ' + t.title">&#215;</button>
          </li>
        </ul>
      </div>

      <p class="empty" *ngIf="shown().length === 0">{{ emptyLine() }}</p>

      <p class="list-foot">{{ countLine() }}</p>
    </section>
  `,
})
export class TasksComponent {
  newTitle = '';
  newDue = '';
  newPriority: Priority = 'normal';

  readonly filter = signal<Filter>('all');
  readonly filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'today', label: 'Today' },
    { key: 'overdue', label: 'Overdue' },
  ];

  constructor(public state: StateService) {}

  /** Open tasks first, then completed — done work is history, not the working list. */
  private ordered = computed<Task[]>(() =>
    [...this.state.openTasks(), ...this.state.doneTasks()]);

  shown = computed<Task[]>(() => {
    const today = todayIso();
    switch (this.filter()) {
      case 'today':   return this.ordered().filter(t => t.due === today);
      case 'overdue': return this.ordered().filter(t => !t.done && t.due !== '' && t.due < today);
      default:        return this.ordered();
    }
  });

  private overdue = computed(() =>
    this.state.openTasks().filter(t => t.due !== '' && t.due < todayIso()).length);

  private dueToday = computed(() =>
    this.state.openTasks().filter(t => t.due === todayIso()).length);

  countLine = computed(() => {
    const parts: string[] = [];
    if (this.overdue()) parts.push(`${this.overdue()} overdue`);
    if (this.dueToday()) parts.push(`${this.dueToday()} due today`);
    const open = this.state.openTasks().length;
    if (!parts.length) return open ? `${open} open` : 'Nothing open.';
    return parts.join(' · ');
  });

  emptyLine = computed(() => {
    switch (this.filter()) {
      case 'today':   return 'Nothing due today.';
      case 'overdue': return 'Nothing overdue.';
      default:        return 'Nothing here yet.';
    }
  });

  add() {
    if (this.newTitle.trim() === '') return;
    this.state.addTask(this.newTitle, this.newDue, this.newPriority);
    this.newTitle = '';
    this.newDue = '';
    this.newPriority = 'normal';
  }

  isOverdue(due: string): boolean {
    return due !== '' && due < todayIso();
  }

  /**
   * "Today", "30 Aug" — never the ISO date.
   *
   * A row is a checkbox, a title, a date and a priority on a 390px screen. "2026-08-31" is
   * ten characters, four of them the year you are already in, and it cost the title enough
   * width to clip it to "Renew t". The year appears only when it is not this one.
   */
  dueLabel(due: string): string {
    if (!due) return '\u2014';
    const today = todayIso();
    if (due === today) return 'Today';
    const d = new Date(due + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return due;
    const sameYear = due.slice(0, 4) === today.slice(0, 4);
    return d.toLocaleDateString(undefined,
      sameYear ? { day: 'numeric', month: 'short' }
               : { day: 'numeric', month: 'short', year: '2-digit' });
  }
}
