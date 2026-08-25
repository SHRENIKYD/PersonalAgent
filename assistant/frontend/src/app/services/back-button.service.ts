import { Injectable, effect, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { UiService } from './ui.service';

/** How long a second back press still counts as "confirming" the first. */
const CONFIRM_WINDOW_MS = 2000;

/** After the native handler runs, a popstate this soon is the same gesture, not a new one. */
const SAME_GESTURE_MS = 600;

/**
 * Makes the back gesture mean "the tab I was just on" instead of "close the app".
 *
 * Android's back is handled here rather than by the router because the app has no router —
 * tabs are a signal.
 *
 * Two mechanisms run, not one. Capacitor's backButton event is the primary path on Android,
 * and history entries plus popstate are the primary path on the web. But the history entries
 * are now pushed on Android too, deliberately: if the native listener fails to register for
 * any reason, Capacitor's own fallback is to call webView.goBack(), which walks those entries
 * and lands on the previous tab instead of finishing the activity. Without them that fallback
 * has nothing to go back to and the app closes — which is the failure this is guarding.
 *
 * Leaving still has to be possible, so at the home tab the first press arms an exit and the
 * second within a short window takes it. An app you cannot back out of is worse than one
 * that backs out too eagerly.
 */
@Injectable({ providedIn: 'root' })
export class BackButtonService {
  /** Shown as a transient hint when the next back press will leave the app. */
  exitArmed = signal(false);

  /**
   * Diagnostics, surfaced in Settings. Which mechanism last moved the app is the one thing
   * that cannot be determined from here — the APK cannot be run in this environment — so the
   * device reports it instead of being guessed at.
   */
  backCount = signal(0);
  lastBackSource = signal<'none' | 'native' | 'history'>('none');
  nativeListenerReady = signal(false);

  private armedAt = 0;
  private poppingBack = false;
  private nativeHandledAt = 0;

  constructor(private ui: UiService) {
    this.wireHistory();
    if (Capacitor.isNativePlatform()) this.wireNative();
  }

  private wireNative() {
    App.addListener('backButton', () => {
      this.nativeHandledAt = Date.now();
      this.backCount.update(n => n + 1);
      this.lastBackSource.set('native');

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
    })
      .then(() => this.nativeListenerReady.set(true))
      .catch(() => this.nativeListenerReady.set(false));
  }

  /**
   * Each tab change pushes a history entry and popstate walks it back, which is what makes
   * the browser's own back button work and gives the native side something to fall back to.
   * The entries carry no state — UiService already holds the stack, and duplicating it here
   * would let the two disagree.
   *
   * Driven by an effect on activeTab rather than by wrapping setTab, so it cannot be
   * bypassed by anything that sets the signal another way.
   */
  private wireHistory() {
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
      // The native handler already moved for this gesture; consuming a second step would
      // skip a tab. Re-push so the entry count stays right and stop.
      if (Date.now() - this.nativeHandledAt < SAME_GESTURE_MS) {
        history.pushState(null, '');
        return;
      }

      this.poppingBack = true;
      const moved = this.ui.back();
      this.poppingBack = false;
      seen = this.ui.activeTab();

      if (moved) {
        this.backCount.update(n => n + 1);
        this.lastBackSource.set('history');
        // Re-push so there is always an entry left to consume; without this the next back
        // press leaves the page even though tabs remain on the stack.
        history.pushState(null, '');
      }
    });
  }

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
