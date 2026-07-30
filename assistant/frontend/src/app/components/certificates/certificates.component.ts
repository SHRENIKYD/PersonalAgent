import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../services/state.service';

@Component({
  selector: 'app-certificates',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="panel">
      <h1 class="page-title">Certificates</h1>
      <p class="page-sub">Track what you're working toward, and what you've already earned.</p>

      <div class="section-head">
        <div>
          <h2 class="section-title" style="margin:0;">In progress</h2>
          <p class="setting-note">{{ state.certsProgress().done }}/{{ state.certsProgress().total }} done</p>
        </div>
        <button (click)="state.addCertTodo()">+ Add</button>
      </div>

      <div class="cert-row" *ngFor="let c of state.certs().todo; let i = index" [class.done]="c.done">
        <input type="checkbox" [checked]="c.done" (change)="state.toggleCertTodoDone(i, $any($event.target).checked)" />
        <input
          class="grow"
          placeholder="certificate name…"
          [ngModel]="c.name"
          (ngModelChange)="state.updateCertTodo(i, 'name', $event)" />
        <input
          placeholder="target date…"
          [ngModel]="c.target"
          (ngModelChange)="state.updateCertTodo(i, 'target', $event)" />
        <input
          placeholder="link…"
          [ngModel]="c.link"
          (ngModelChange)="state.updateCertTodo(i, 'link', $event)" />
        <button class="ghost-btn" (click)="state.removeCertTodo(i)">Delete</button>
      </div>

      <div class="section-head">
        <div><h2 class="section-title" style="margin:0;">Earned</h2></div>
        <button (click)="state.addCertEarned()">+ Add</button>
      </div>

      <div class="cert-row" *ngFor="let c of state.certs().earned; let i = index">
        <input
          class="grow"
          placeholder="certificate name…"
          [ngModel]="c.name"
          (ngModelChange)="state.updateCertEarned(i, 'name', $event)" />
        <input
          placeholder="issuer…"
          [ngModel]="c.issuer"
          (ngModelChange)="state.updateCertEarned(i, 'issuer', $event)" />
        <input
          placeholder="date…"
          [ngModel]="c.date"
          (ngModelChange)="state.updateCertEarned(i, 'date', $event)" />
        <input
          placeholder="link…"
          [ngModel]="c.link"
          (ngModelChange)="state.updateCertEarned(i, 'link', $event)" />
        <button class="ghost-btn" (click)="state.removeCertEarned(i)">Delete</button>
      </div>
    </section>
  `,
})
export class CertificatesComponent {
  constructor(public state: StateService) {}
}
