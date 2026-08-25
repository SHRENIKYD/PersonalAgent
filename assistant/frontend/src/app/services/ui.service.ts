import { Injectable, signal } from '@angular/core';
import { TabKey } from '../models';
import { NavSection, sectionForTab } from '../nav';

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

  /**
   * True while the chat composer has focus, which on a phone means the keyboard is up.
   * The bottom bar hides itself then, so the input sits directly above the keyboard.
   */
  composerFocused = signal(false);

  /** Tabs visited before the current one, oldest first. */
  private history: TabKey[] = [];

  /**
   * The tab last opened inside each bottom-bar slot. Returning to Body should land on
   * whichever of Workout or Diet you were last reading, not always the first one.
   */
  private lastInSection = new Map<string, TabKey>();

  setTab(tab: TabKey) {
    const section = sectionForTab(tab);
    if (section) this.lastInSection.set(section.key, tab);
    const current = this.activeTab();
    if (tab === current) return;
    this.history.push(current);
    if (this.history.length > MAX_HISTORY) this.history.shift();
    this.activeTab.set(tab);
  }

  /** Opens a bottom-bar slot at its remembered tab, falling back to its first. */
  openSection(section: NavSection) {
    this.setTab(this.lastInSection.get(section.key) ?? section.tabs[0]);
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
