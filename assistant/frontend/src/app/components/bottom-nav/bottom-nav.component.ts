import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiService } from '../../services/ui.service';
import { StateService } from '../../services/state.service';
import { NAV_SECTIONS, NavSection, sectionForTab } from '../../nav';

/**
 * The phone's primary navigation: five slots pinned to the bottom of the screen.
 *
 * It is sticky rather than fixed, so it stays part of the layout — the chat panel's
 * full-height maths keeps working and the composer is never covered, which a fixed bar
 * would have required a spacer to avoid.
 *
 * Hidden entirely above the narrow breakpoint, where the sidebar is the navigation.
 */
@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="bottom-nav" [class.hidden]="hidden()" aria-label="Main">
      <button
        *ngFor="let s of sections"
        class="bn-item"
        [class.primary]="s.primary"
        [class.active]="isActive(s)"
        [attr.aria-current]="isActive(s) ? 'page' : null"
        (click)="ui.openSection(s)">
        <span class="bn-icon">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path [attr.d]="s.icon" stroke="currentColor" stroke-width="1.6"
                  stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span class="bn-badge" *ngIf="badge(s)">{{ badge(s) }}</span>
        </span>
        <span class="bn-label">{{ s.label }}</span>
      </button>
    </nav>
  `,
})
export class BottomNavComponent {
  sections = NAV_SECTIONS;

  /** Typing should not cost a row of screen to a bar you are not using. */
  hidden = computed(() => this.ui.composerFocused());

  constructor(public ui: UiService, private state: StateService) {}

  isActive(s: NavSection): boolean {
    return sectionForTab(this.ui.activeTab())?.key === s.key;
  }

  /** A count worth interrupting for — open tasks, or a key that still needs setting. */
  badge(s: NavSection): string {
    if (s.key === 'plan') {
      const open = this.state.tasks().filter(t => !t.done).length;
      return open > 0 ? String(open > 99 ? '99+' : open) : '';
    }
    return '';
  }
}
