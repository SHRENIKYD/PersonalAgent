import { Injectable, effect, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { UiService } from './ui.service';

/** How long a second back press still counts as "confirming" the first. */
const CONFIRM_WINDOW_MS = 2000;

/**
 * Makes the back gesture mean "the tab I was just on" instead of "close the app".
 *
 * Android's back is handled here rather than by the router because the app has no router —
 * tabs are a signal. Capacitor's backButton event only fires natively, so the web gets the
 * equivalent through history entries and popstate, which is what makes the browser's own
 * back button behave too.
 *
 * Leaving still has to be possible, so at the home tab the first press arms an exit and the
 * second within a short window takes it. An app you cannot back out of is worse than one
 * that backs out too eagerly.
 */
@Injectable({ providedIn: 'root' })
export class BackButtonService {
  /** Shown as a transient hint when the next back press will leave the app. */
  exitArmed = signal(false);

  private armedAt = 0;

  constructor(private ui: UiService) {
    if (Capacitor.isNativePlatform()) this.wireNative();
    else this.wireWeb();
  }

  private wireNative() {
    void App.addListener('backButton', () => {
      if (this.ui.back()) {
        this.disarm();
        return;
      }
      // Nowhere left to go. First press warns, second within the window exits.
      if (this.exitArmed() && Date.now() - this.armedAt < CONFIRM_WINDOW_MS) {
        void App.exitApp();
        return;
      }
      this.arm();
    });
  }

  /**
   * On the web the browser's back button is the same gesture, so each tab change pushes a
   * history entry and popstate walks it back. The entries carry no state — UiService already
   * holds the stack, and duplicating it here would let the two disagree.
   *
   * Driven by an effect on activeTab rather than by wrapping setTab, so it cannot be
   * bypassed by anything that sets the signal another way.
   */
  private wireWeb() {
    if (typeof window === 'undefined') return;

    let seen = this.ui.activeTab();
    history.pushState(null, '');

    effect(() => {
      const now = this.ui.activeTab();
      if (now === seen) return;
      seen = now;
      // A tab change caused by back() must not push a new entry, or the stack grows by one
      // for every step back and the browser button stops making progress.
      if (this.poppingBack) return;
      history.pushState(null, '');
    });

    window.addEventListener('popstate', () => {
      this.poppingBack = true;
      const moved = this.ui.back();
      this.poppingBack = false;
      seen = this.ui.activeTab();
      // Re-push so there is always an entry left to consume; without this the next back
      // press leaves the page even though tabs remain on the stack.
      if (moved) history.pushState(null, '');
    });
  }

  private poppingBack = false;

  private arm() {
    this.armedAt = Date.now();
    this.exitArmed.set(true);
    setTimeout(() => {
      if (Date.now() - this.armedAt >= CONFIRM_WINDOW_MS) this.exitArmed.set(false);
    }, CONFIRM_WINDOW_MS);
  }

  private disarm() {
    this.exitArmed.set(false);
    this.armedAt = 0;
  }
}
