import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { UiService } from '../../services/ui.service';
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
          <span class="frac">{{ countFor(t.key) }}</span>
        </button>
      </nav>
    </aside>
  `,
})
export class SidebarComponent {
  tabs = TABS;

  constructor(public state: StateService, public ui: UiService) {}

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
    return '';
  }
}
