import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../services/state.service';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="panel">
      <h1 class="page-title">Notes</h1>
      <p class="page-sub">
        Things worth remembering. The assistant searches these, so anything here carries
        across sessions — unlike the chat itself.
      </p>

      <div class="add-row">
        <input class="grow" [(ngModel)]="newTitle" placeholder="Note title…" />
        <button (click)="add()">Add note</button>
      </div>

      <p *ngIf="state.notes().length === 0" class="empty">No notes yet.</p>

      <div *ngFor="let n of state.notes()" class="note-card">
        <div class="note-head">
          <input
            class="note-title grow"
            [ngModel]="n.title"
            (ngModelChange)="state.updateNote(n.id, { title: $event })" />
          <button class="ghost-btn" (click)="state.removeNote(n.id)">Delete</button>
        </div>
        <textarea
          [ngModel]="n.body"
          (ngModelChange)="state.updateNote(n.id, { body: $event })"
          placeholder="Write here…"></textarea>
        <div class="note-meta">Updated {{ n.updated | date: 'medium' }}</div>
      </div>
    </section>
  `,
})
export class NotesComponent {
  newTitle = '';

  constructor(public state: StateService) {}

  add() {
    if (this.newTitle.trim() === '') return;
    this.state.addNote(this.newTitle, '');
    this.newTitle = '';
  }
}
