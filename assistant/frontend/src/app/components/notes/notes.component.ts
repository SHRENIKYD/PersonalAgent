import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../services/state.service';

/**
 * Notes, rebuilt to the Bloom mockup: an add row, then one card of rows — title, the first
 * line underneath, and how long ago it changed.
 *
 * The mockup draws a list, which implies a note opens somewhere. Rather than invent a second
 * screen and a way back from it, a row expands in place: the resting state is the mockup's
 * list, and everything that used to be editable still is.
 */
@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="panel">
      <h1 class="page-title">Notes</h1>

      <div class="add-row">
        <input class="grow" [(ngModel)]="newTitle" placeholder="New note…"
               (keydown.enter)="add()" />
        <button (click)="add()">Add</button>
      </div>

      <p *ngIf="state.notes().length === 0" class="empty">No notes yet.</p>

      <div class="card" *ngIf="state.notes().length">
        <div class="note-row" *ngFor="let n of state.notes()">
          <button class="note-row-head" (click)="toggle(n.id)"
                  [attr.aria-expanded]="open() === n.id">
            <span class="note-row-main">
              <span class="note-row-title">{{ n.title || 'Untitled' }}</span>
              <span class="note-row-first">{{ firstLine(n.body) }}</span>
            </span>
            <span class="note-row-when">{{ ago(n.updated) }}</span>
          </button>

          <div class="note-row-body" *ngIf="open() === n.id">
            <input
              class="note-title grow"
              [ngModel]="n.title"
              (ngModelChange)="state.updateNote(n.id, { title: $event })"
              placeholder="Title" />
            <textarea
              [ngModel]="n.body"
              (ngModelChange)="state.updateNote(n.id, { body: $event })"
              placeholder="Write here…"></textarea>
            <button class="ghost-btn" (click)="state.removeNote(n.id)">Delete</button>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class NotesComponent {
  newTitle = '';
  readonly open = signal<string | null>(null);

  constructor(public state: StateService) {}

  toggle(id: string) {
    this.open.update(cur => (cur === id ? null : id));
  }

  add() {
    if (this.newTitle.trim() === '') return;
    this.state.addNote(this.newTitle, '');
    this.newTitle = '';
  }

  /** The preview line. Blank bodies say so rather than leaving a gap under the title. */
  firstLine(body: string): string {
    const line = body.split('\n').find(l => l.trim() !== '');
    return line ? line.trim() : 'Empty';
  }

  /**
   * "2d", "3w" — a rough age, not a timestamp.
   *
   * A note's exact minute is never the question; how stale it is, is. Days up to a
   * fortnight, then weeks, because "23d" is harder to place than "3w".
   */
  ago(iso: string): string {
    const ms = Date.now() - Date.parse(iso);
    if (!Number.isFinite(ms) || ms < 0) return '';
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return mins <= 1 ? 'now' : `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 14) return `${days}d`;
    return `${Math.floor(days / 7)}w`;
  }
}
