import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { UiService } from '../../services/ui.service';
import { TabKey } from '../../models';

const REACTOR_RADIUS = 42;
const REACTOR_CIRCUMFERENCE = 2 * Math.PI * REACTOR_RADIUS;

interface DashCard {
  tab: TabKey;
  label: string;
  progress: () => { total: number; done: number; pct: number };
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="panel">
      <h1 class="page-title">Dashboard</h1>
      <p class="page-sub">Your standing across every track. Click a card to jump in.</p>

      <div class="reactor-row">
        <div class="reactor-wrap">
          <svg class="reactor-ring" viewBox="0 0 96 96">
            <defs>
              <linearGradient id="reactorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#b3382c" />
                <stop offset="100%" stop-color="#d7a94a" />
              </linearGradient>
            </defs>
            <circle class="reactor-bg" cx="48" cy="48" r="42"></circle>
            <circle
              class="reactor-fg"
              cx="48" cy="48" r="42"
              [attr.stroke-dasharray]="reactorCircumference"
              [attr.stroke-dashoffset]="reactorOffset()"></circle>
          </svg>
          <div class="reactor-label">{{ state.overallProgress().pct }}%</div>
        </div>
        <div class="reactor-copy">
          <p class="h">Mission status</p>
          <p class="sub">
            {{ state.overallProgress().done }} of {{ state.overallProgress().total }} items
            complete across your tasks, growth, prep tracks, and certificates.
          </p>
        </div>
      </div>

      <div class="dash-grid">
        <button class="dash-card" *ngFor="let c of cards" (click)="ui.setTab(c.tab)">
          <div class="dash-card-title">{{ c.label }}</div>
          <div class="overall-progress-track">
            <div class="overall-progress-fill" [style.width.%]="c.progress().pct"></div>
          </div>
          <div class="dash-card-stat">{{ c.progress().done }}/{{ c.progress().total }} &middot; {{ c.progress().pct }}%</div>
        </button>
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
  reactorCircumference = REACTOR_CIRCUMFERENCE;

  constructor(public state: StateService, public ui: UiService) {}

  reactorOffset = computed(() => {
    const pct = this.state.overallProgress().pct;
    return REACTOR_CIRCUMFERENCE * (1 - pct / 100);
  });

  cards: DashCard[] = [
    { tab: 'growth', label: '6-Month Roadmap', progress: () => this.state.roadmapProgress() },
    { tab: 'dsa', label: 'DSA', progress: () => this.state.categoryProgress('dsa') },
    { tab: 'cs', label: 'CS Fundamentals', progress: () => this.state.categoryProgress('cs') },
    { tab: 'sysdesign', label: 'System Design', progress: () => this.state.categoryProgress('sysdesign') },
    { tab: 'web', label: 'Web & Full-Stack', progress: () => this.state.categoryProgress('web') },
    { tab: 'certs', label: 'Certificates', progress: () => this.state.certsProgress() },
  ];
}
