import { Injectable, signal } from '@angular/core';
import { TabKey } from '../models';

/** Where back goes when there is nowhere left to go back to. */
const HOME: TabKey = 'chat';

/**
 * Which tab is showing, plus the history behind it.
 *
 * Tabs are a signal rather than routes, which means the browser and Android both see a
 * single page with no history — so Android's back gesture had nothing to pop and closed the
 * app instead, from any tab. This keeps its own stack so back means "the tab I was just on".
 *
 * The stack is capped: someone bouncing between two tabs for a while should not have to
 * press back forty times to leave, and nobody remembers more than a few steps anyway.
 */
const MAX_HISTORY = 20;

@Injectable({ providedIn: 'root' })
export class UiService {
  activeTab = signal<TabKey>(HOME);

  /** Tabs visited before the current one, oldest first. */
  private history: TabKey[] = [];

  setTab(tab: TabKey) {
    const current = this.activeTab();
    if (tab === current) return;
    this.history.push(current);
    if (this.history.length > MAX_HISTORY) this.history.shift();
    this.activeTab.set(tab);
  }

  /** True when there is somewhere to go back to. */
  canGoBack(): boolean {
    return this.history.length > 0 || this.activeTab() !== HOME;
  }

  /**
   * Steps back one tab. Returns false when there was nowhere to go, which is the caller's
   * cue to let the platform handle it — on Android, that means leaving the app.
   */
  back(): boolean {
    const previous = this.history.pop();
    if (previous !== undefined) {
      this.activeTab.set(previous);
      return true;
    }
    // No history but not home: land on home rather than dropping straight out of the app.
    if (this.activeTab() !== HOME) {
      this.activeTab.set(HOME);
      return true;
    }
    return false;
  }
}
