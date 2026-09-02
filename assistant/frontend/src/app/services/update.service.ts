import { Injectable, signal, computed } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { APP_VERSION } from '../version';

/** What the CI build stamped into the APK, and what it published beside it. */
interface BuildInfo {
  sha: string;
  builtAt: string;   // ISO
  /** Semantic version. Absent on anything built before versioning existed. */
  version?: string;
}

/*
 * `releases/latest/download/...` rather than a fixed tag.
 *
 * This used to point at a rolling "android-latest" release that every build overwrote,
 * which is exactly why no old version stayed downloadable. Now each build publishes only
 * under its own v* tag, and GitHub redirects /latest/ to whichever of those is newest —
 * a stable URL without a release that has to be destroyed to stay current.
 */
const RELEASE = 'https://github.com/SHRENIKYD/PersonalAgent/releases/latest/download';
const VERSION_URL = `${RELEASE}/version.json`;
export const APK_URL = `${RELEASE}/echo.apk`;

const LAST_CHECK_KEY = 'assistant-update-checked-v1';

/**
 * Orders two MAJOR.MINOR.PATCH strings: positive when a is newer, negative when older.
 *
 * Compared part by part as numbers, because string comparison gets "1.10.0" vs "1.9.0"
 * backwards — "1" sorts before "9".
 */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const x = pa[i] ?? 0, y = pb[i] ?? 0;
    if (Number.isNaN(x) || Number.isNaN(y)) return 0;   // unparsable: no claim either way
    if (x !== y) return x - y;
  }
  return 0;
}

/**
 * Checks whether a newer sideload build exists.
 *
 * Only meaningful inside the Android app. The web build updates itself — the service worker
 * fetches a new bundle on the next load — so there is nothing for a user to do there, and
 * offering them a download would be nonsense.
 *
 * Comparison is on the semantic version, falling back to the build timestamp for builds
 * made before versioning existed. It is never on the commit sha: shas do not order, so with
 * a sha alone you can tell "different" but not "newer", and reinstalling an older APK would
 * look like an available update forever.
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
    // Prefer the semantic version when both sides carry one: it is what a person means by
    // "newer", and it survives a rebuild of the same code (which moves builtAt without
    // changing anything). Fall back to the timestamp for builds made before versioning.
    if (l.version && r.version) {
      const cmp = compareVersions(r.version, l.version);
      if (cmp !== 0) return cmp > 0;
    }
    return Date.parse(r.builtAt) > Date.parse(l.builtAt);
  });

  /** The version this app was built from, for display. */
  version = computed(() => this.local()?.version ?? APP_VERSION);

  /**
   * Running natively rather than in a browser tab. Importing any Capacitor package defines
   * window.Capacitor in web builds as well, so the global's presence proves nothing —
   * isNativePlatform() is what separates the app from a browser.
   */
  readonly isApp = Capacitor.isNativePlatform();

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
