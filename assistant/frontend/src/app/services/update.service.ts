import { Injectable, signal, computed } from '@angular/core';

/** What the CI build stamped into the APK, and what it published beside it. */
interface BuildInfo {
  sha: string;
  builtAt: string;   // ISO
}

const RELEASE = 'https://github.com/SHRENIKYD/PersonalAgent/releases/download/android-latest';
const VERSION_URL = `${RELEASE}/version.json`;
export const APK_URL = `${RELEASE}/echo.apk`;

const LAST_CHECK_KEY = 'assistant-update-checked-v1';

/**
 * Checks whether a newer sideload build exists.
 *
 * Only meaningful inside the Android app. The web build updates itself — the service worker
 * fetches a new bundle on the next load — so there is nothing for a user to do there, and
 * offering them a download would be nonsense.
 *
 * Comparison is on the build timestamp rather than the commit sha: shas do not order, so
 * with sha alone you can tell "different" but not "newer", and reinstalling an older APK
 * would look like an available update forever.
 */
@Injectable({ providedIn: 'root' })
export class UpdateService {
  /** The build this app was compiled from. Absent in dev, where nothing stamped it. */
  local = signal<BuildInfo | null>(null);
  remote = signal<BuildInfo | null>(null);
  checking = signal(false);
  error = signal('');
  lastChecked = signal<string>(localStorage.getItem(LAST_CHECK_KEY) ?? '');

  /**
   * True only when we know both sides and the remote is strictly newer. Unknown local build
   * means no claim either way — better to say nothing than to nag someone running a dev
   * build to "update" to a release they may not want.
   */
  updateAvailable = computed(() => {
    const l = this.local(), r = this.remote();
    if (!l || !r) return false;
    return Date.parse(r.builtAt) > Date.parse(l.builtAt);
  });

  /** Running inside the Capacitor shell rather than a browser tab. */
  readonly isApp = !!(window as unknown as { Capacitor?: unknown }).Capacitor;

  constructor() {
    // Bundled by the build; a plain fetch rather than an import so a missing file in dev is
    // a caught 404 instead of a compile error.
    fetch('assets/build-info.json', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(v => this.local.set(v))
      .catch(() => this.local.set(null));
  }

  async check(): Promise<void> {
    this.checking.set(true);
    this.error.set('');
    try {
      // no-store matters: GitHub serves release assets with long cache headers, and a
      // cached version.json would report the build you already have forever.
      const res = await fetch(VERSION_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Release check failed (${res.status})`);
      this.remote.set(await res.json());
      const now = new Date().toISOString();
      this.lastChecked.set(now);
      localStorage.setItem(LAST_CHECK_KEY, now);
    } catch (e) {
      this.error.set(
        e instanceof Error && e.message.startsWith('Release check')
          ? e.message
          : 'Could not reach GitHub to check for updates.'
      );
    } finally {
      this.checking.set(false);
    }
  }

  download() {
    window.open(APK_URL, '_blank');
  }
}
