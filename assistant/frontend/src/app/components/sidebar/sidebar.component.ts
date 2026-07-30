import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { UiService } from '../../services/ui.service';
import { SettingsService } from '../../services/settings.service';
import { TabKey } from '../../models';

interface Tab {
  key: TabKey;
  label: string;
}

const TABS: Tab[] = [
  { key: 'chat', label: 'Assistant' },
  { key: 'dashboard', label: 'Today' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'notes', label: 'Notes' },
  { key: 'settings', label: 'Settings' },
];

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="sidebar">
      <div class="brand">Aide</div>
      <div class="brand-sub">Personal Assistant</div>

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
    return '';
  }
}
