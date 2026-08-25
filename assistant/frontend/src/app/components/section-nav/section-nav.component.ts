import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiService } from '../../services/ui.service';
import { TabKey } from '../../models';
import { sectionForTab } from '../../nav';

const LABELS: Record<TabKey, string> = {
  chat: 'Assistant',
  dashboard: 'Today',
  tasks: 'Tasks',
  notes: 'Notes',
  growth: 'Growth',
  workout: 'Workout',
  diet: 'Diet',
  news: 'News',
  settings: 'Settings',
};

/**
 * Picks between the tabs sharing one bottom-bar slot.
 *
 * It lives in the app shell rather than inside each page, so grouping Workout with Diet
 * needed no change to either component. Renders nothing for a slot holding a single tab,
 * and nothing at all on wide screens, where the sidebar already lists every tab.
 */
@Component({
  selector: 'app-section-nav',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="section-nav" *ngIf="tabs().length > 1" role="tablist">
      <button
        *ngFor="let t of tabs()"
        role="tab"
        [class.active]="ui.activeTab() === t"
        [attr.aria-selected]="ui.activeTab() === t"
        (click)="ui.setTab(t)">{{ label(t) }}</button>
    </div>
  `,
})
export class SectionNavComponent {
  tabs = computed<TabKey[]>(() => sectionForTab(this.ui.activeTab())?.tabs ?? []);

  constructor(public ui: UiService) {}

  label(t: TabKey): string { return LABELS[t]; }
}
