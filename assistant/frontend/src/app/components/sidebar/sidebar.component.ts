import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { UiService } from '../../services/ui.service';
import { SettingsService } from '../../services/settings.service';
import { TabKey } from '../../models';

interface Tab {
  key: TabKey;
  label: string;
}

interface TabGroup {
  title: string | null;
  items: Tab[];
}

const TAB_GROUPS: TabGroup[] = [
  {
    title: null,
    items: [
      { key: 'chat', label: 'Assistant' },
      { key: 'dashboard', label: 'Today' },
      { key: 'tasks', label: 'Tasks' },
      { key: 'notes', label: 'Notes' },
    ],
  },
  {
    title: 'Growth & Health',
    items: [
      { key: 'growth', label: 'Growth' },
      { key: 'workout', label: 'Workout' },
      { key: 'diet', label: 'Diet' },
    ],
  },
  {
    title: 'More',
    items: [
      { key: 'news', label: 'News' },
      { key: 'settings', label: 'Settings' },
    ],
  },
];

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="sidebar" [class.expanded]="mobileNavOpen()">
      <div class="brand-row">
        <!-- The ECHO waveform mark, inlined rather than an <img> so it inherits the theme
             tokens and animates with the rest of the brand row. Same geometry as
             assets/echo-mark.svg, which the app icons are rendered from. -->
        <svg class="brand-reactor" viewBox="0 0 200 200" aria-hidden="true">
          <defs>
            <linearGradient id="brandG" gradientUnits="userSpaceOnUse" x1="40" y1="30" x2="165" y2="175">
              <stop offset="0%" stop-color="var(--accent)" />
              <stop offset="55%" stop-color="var(--accent-dim)" />
              <stop offset="100%" stop-color="var(--ember-deep)" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#brandG)" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="100" cy="100" r="78" stroke-width="7" />
            <path stroke-width="7" d="M22 100C25 98.7 34.7 90.7 40 92C45.3 93.3 46.3 103.3 52 108C57.7 112.7 58.3 79.7 62 78C65.7 76.3 68.7 122.7 74 128C79.3 133.3 82.3 90 86 86C89.7 82 89.7 96.7 92 104C94.3 111.3 94 44.7 100 42C106 39.3 105.3 116 108 122C110.7 128 112.3 72 116 70C119.7 68 121.3 130.7 126 138C130.7 145.3 132.3 86 136 84C139.7 82 143 108.7 146 112C149 115.3 152.3 93 156 92C159.7 91 163 102 166 104C169 106 175 101.3 178 100" />
          </g>
        </svg>
        <div class="brand">ECHO</div>
        <button
          class="mobile-nav-toggle"
          (click)="toggleMobileNav()"
          [attr.aria-expanded]="mobileNavOpen()"
          aria-label="Toggle navigation">
          <span>{{ currentTabLabel() }}</span>
          <span class="mobile-nav-caret" [class.open]="mobileNavOpen()">&#9662;</span>
        </button>
      </div>

      <div class="sidebar-collapsible">
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
          <ng-container *ngFor="let group of groups">
            <div class="tab-group-label" *ngIf="group.title">{{ group.title }}</div>
            <button
              *ngFor="let t of group.items"
              [class.active]="ui.activeTab() === t.key"
              (click)="selectTab(t.key)">
              <span>{{ t.label }}</span>
              <span class="frac" [class.warn]="t.key === 'settings' && !settings.ready()">{{ countFor(t.key) }}</span>
            </button>
          </ng-container>
        </nav>
      </div>
    </aside>
  `,
})
export class SidebarComponent {
  groups = TAB_GROUPS;
  mobileNavOpen = signal(false);

  constructor(
    public state: StateService,
    public ui: UiService,
    public settings: SettingsService
  ) {}

  toggleMobileNav() {
    this.mobileNavOpen.update(v => !v);
  }

  /** Selecting a tab on mobile should also close the dropdown, not just switch the view. */
  selectTab(key: TabKey) {
    this.ui.setTab(key);
    this.mobileNavOpen.set(false);
  }

  currentTabLabel(): string {
    for (const group of this.groups) {
      const match = group.items.find(t => t.key === this.ui.activeTab());
      if (match) return match.label;
    }
    return '';
  }

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
    if (key === 'workout' || key === 'diet') {
      const p = this.state.fitnessWeekProgress();
      return `${p.pct}%`;
    }
    return '';
  }
}
