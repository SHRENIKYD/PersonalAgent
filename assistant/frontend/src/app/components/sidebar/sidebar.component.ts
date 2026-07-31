import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { UiService } from '../../services/ui.service';
import { SettingsService } from '../../services/settings.service';
import { PrepCategoryKey, TabKey } from '../../models';

interface Tab {
  key: TabKey;
  label: string;
}

const PREP_TABS: TabKey[] = ['dsa', 'java', 'cs', 'sysdesign', 'web', 'interview'];

const TABS: Tab[] = [
  { key: 'chat', label: 'Assistant' },
  { key: 'dashboard', label: 'Today' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'notes', label: 'Notes' },
  { key: 'growth', label: 'Growth' },
  { key: 'fitness', label: 'Fitness & Diet' },
  { key: 'news', label: 'News' },
  { key: 'dsa', label: 'DSA' },
  { key: 'java', label: 'Java' },
  { key: 'cs', label: 'CS Fundamentals' },
  { key: 'sysdesign', label: 'System Design' },
  { key: 'web', label: 'Web & Full-Stack' },
  { key: 'interview', label: 'Interview Questions' },
  { key: 'certs', label: 'Certificates' },
  { key: 'settings', label: 'Settings' },
];

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="sidebar">
      <div class="brand-row">
        <svg class="brand-reactor" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="14" fill="none" stroke="var(--accent-dim)" stroke-width="1.5" opacity="0.6" />
          <circle cx="16" cy="16" r="9" fill="none" stroke="var(--hud-cyan)" stroke-width="1.5" opacity="0.8" />
          <circle cx="16" cy="16" r="3.5" fill="var(--accent)" />
        </svg>
        <div class="brand">ECHO</div>
      </div>
      <div class="brand-sub">Personal Assistant</div>

      <div class="overall-progress">
        <div class="overall-progress-top">
          <span class="overall-progress-tag">Overall</span>
          <span class="overall-progress-label">{{ state.overallProgress().pct }}%</span>
        </div>
        <div class="overall-progress-track">
          <div class="overall-progress-fill" [style.width.%]="state.overallProgress().pct"></div>
        </div>
      </div>

      <nav class="tabs">
        <button
          *ngFor="let t of tabs"
          [class.active]="ui.activeTab() === t.key"
          (click)="ui.setTab(t.key)">
          <span>{{ t.label }}</span>
          <span class="frac" [class.warn]="t.key === 'settings' && !settings.ready()">{{ countFor(t.key) }}</span>
        </button>
      </nav>
    </aside>
  `,
})
export class SidebarComponent {
  tabs = TABS;

  constructor(
    public state: StateService,
    public ui: UiService,
    public settings: SettingsService
  ) {}

  countFor(key: TabKey): string {
    if (key === 'tasks') {
      const p = this.state.progress();
      return p.total ? `${p.done}/${p.total}` : '';
    }
    if (key === 'notes') {
      const n = this.state.notes().length;
      return n ? `${n}` : '';
    }
    if (key === 'dashboard') {
      const d = this.state.dueToday().length;
      return d ? `${d}` : '';
    }
    if (key === 'settings' && !this.settings.ready()) {
      return '!';
    }
    if (key === 'growth') {
      const p = this.state.roadmapProgress();
      return p.total ? `${p.done}/${p.total}` : '';
    }
    if (key === 'fitness') {
      const p = this.state.fitnessWeekProgress();
      return `${p.pct}%`;
    }
    if (PREP_TABS.includes(key)) {
      const p = this.state.categoryProgress(key as PrepCategoryKey);
      return p.total ? `${p.done}/${p.total}` : '';
    }
    if (key === 'certs') {
      const p = this.state.certsProgress();
      return p.total ? `${p.done}/${p.total}` : '';
    }
    return '';
  }
}
