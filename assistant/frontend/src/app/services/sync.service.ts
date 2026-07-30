import { Injectable, effect, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { StateService } from './state.service';
import { StorageService } from './storage.service';
import { SyncPayload } from '../models';

const KEY = 'assistant-sync-v1';
const GIST_FILENAME = 'jarvis-assistant-data.json';
const GIST_API = 'https://api.github.com/gists';
const PUSH_DEBOUNCE_MS = 1500;

interface SyncSettings {
  token: string;
  gistId: string;
  lastSyncedAt: number | null;
}

interface GistListEntry {
  id: string;
  files: Record<string, unknown>;
}

interface GistEnvelope {
  updatedAt: number;
  data: SyncPayload;
}

function defaults(): SyncSettings {
  return { token: '', gistId: '', lastSyncedAt: null };
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

/**
 * Cross-device sync via a private GitHub Gist — no custom backend, since this is single-user
 * and a Gist is already a free, private, versioned JSON file GitHub hosts for you. The token
 * is the only credential: whoever has it (and the gist id) can read/write that one file.
 *
 * Model is deliberately simple ("last edit wins" on the whole blob, not a per-field merge):
 * each write stamps `updatedAt`; on pull, whichever side — local or remote — is newer wins
 * outright and replaces the other side entirely. That can occasionally lose a same-moment
 * edit made on the losing device, but matches what was actually asked for, and a per-field
 * merge across six different data shapes (tasks, notes, roadmap, prep, certs, fitness log)
 * would be a much larger, harder-to-verify piece of code for a single-user tool.
 */
@Injectable({ providedIn: 'root' })
export class SyncService {
  token = signal('');
  gistId = signal('');
  status = signal<SyncStatus>('idle');
  errorMessage = signal('');
  lastSyncedAt = signal<number | null>(null);

  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  private applyingRemote = false;
  private initialPullDone = false;

  constructor(
    private http: HttpClient,
    private state: StateService,
    private storage: StorageService
  ) {
    const saved = this.storage.get<SyncSettings>(KEY, defaults());
    this.token.set(saved.token ?? '');
    this.gistId.set(saved.gistId ?? '');
    this.lastSyncedAt.set(saved.lastSyncedAt ?? null);

    if (this.configured()) {
      void this.pull();
    } else {
      this.initialPullDone = true;
    }

    // Any local mutation, once the initial pull has settled, schedules a push. Skipped
    // entirely while a remote payload is being applied, so pulling never triggers a push
    // right back at the gist it just came from.
    effect(() => {
      this.state.lastLocalChange();
      if (!this.initialPullDone || this.applyingRemote || !this.configured()) return;
      this.schedulePush();
    });

    // A debounced push scheduled just before the tab is backgrounded or closed can lose the
    // race — mobile browsers in particular may suspend JS before the timer fires. Flush
    // immediately (best-effort; still not a hard guarantee) whenever the tab goes hidden.
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && this.pushTimer) {
          clearTimeout(this.pushTimer);
          this.pushTimer = null;
          void this.push();
        }
      });
    }
  }

  configured(): boolean {
    return this.token().trim() !== '';
  }

  setCredentials(token: string, gistId: string) {
    this.token.set(token.trim());
    this.gistId.set(gistId.trim());
    this.lastSyncedAt.set(null);
    this.save();
    this.initialPullDone = false;
    void this.pull();
  }

  clearCredentials() {
    this.token.set('');
    this.gistId.set('');
    this.lastSyncedAt.set(null);
    this.save();
    this.status.set('idle');
  }

  /**
   * Finds a gist already carrying our data file under this token's account, so a second
   * device only needs the same token — not a hand-copied Gist ID — to link up. Without this,
   * leaving the Gist ID field blank on a second device silently created a brand new, separate
   * gist instead of joining the first one, which is why sync could look like it was doing
   * nothing at all.
   */
  private async findExistingGist(): Promise<string | null> {
    try {
      const list = await firstValueFrom(
        this.http.get<GistListEntry[]>(`${GIST_API}?per_page=100`, { headers: this.headers() })
      );
      const match = list.find(g => GIST_FILENAME in (g.files ?? {}));
      return match?.id ?? null;
    } catch {
      return null;
    }
  }

  /** Manual sync button — same path automatic sync uses, just triggered on demand. */
  async syncNow(): Promise<void> {
    await this.pull();
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({
      authorization: `Bearer ${this.token()}`,
      accept: 'application/vnd.github+json',
      'content-type': 'application/json',
    });
  }

  private schedulePush() {
    if (this.pushTimer) clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => void this.push(), PUSH_DEBOUNCE_MS);
  }

  /**
   * Pulls the remote gist and applies it if newer than the last known sync point, otherwise
   * pushes local data up instead — either way this is the "figure out who's ahead" step, run
   * on load and whenever the user asks for a manual sync.
   */
  async push(): Promise<void> {
    if (!this.configured()) return;
    this.status.set('syncing');

    const envelope: GistEnvelope = { updatedAt: Date.now(), data: this.state.exportAll() };
    const body = { content: JSON.stringify(envelope, null, 2) };

    try {
      if (this.gistId().trim() === '') {
        const existing = await this.findExistingGist();
        if (existing) this.gistId.set(existing);
      }

      if (this.gistId().trim() === '') {
        const res = await firstValueFrom(
          this.http.post<{ id: string }>(
            GIST_API,
            {
              description: 'J.A.R.V.I.S. assistant sync data',
              public: false,
              files: { [GIST_FILENAME]: body },
            },
            { headers: this.headers() }
          )
        );
        this.gistId.set(res.id);
      } else {
        await firstValueFrom(
          this.http.patch(
            `${GIST_API}/${this.gistId()}`,
            { files: { [GIST_FILENAME]: body } },
            { headers: this.headers() }
          )
        );
      }
      this.lastSyncedAt.set(envelope.updatedAt);
      this.save();
      this.status.set('synced');
      this.errorMessage.set('');
    } catch (e) {
      this.status.set('error');
      this.errorMessage.set(this.explainFailure(e));
    }
  }

  async pull(): Promise<void> {
    if (!this.configured()) {
      this.initialPullDone = true;
      return;
    }

    if (this.gistId().trim() === '') {
      // No known Gist ID — look for one already tied to this token before assuming this is
      // a brand-new setup with nothing to join.
      const existing = await this.findExistingGist();
      if (existing) {
        this.gistId.set(existing);
        this.save();
      } else {
        this.initialPullDone = true;
        await this.push();
        return;
      }
    }

    this.status.set('syncing');
    try {
      const res = await firstValueFrom(
        this.http.get<{ files: Record<string, { content: string }> }>(
          `${GIST_API}/${this.gistId()}`,
          { headers: this.headers() }
        )
      );
      const file = res.files[GIST_FILENAME];
      const remote: GistEnvelope | null = file ? JSON.parse(file.content) : null;
      const localUpdatedAt = this.lastSyncedAt() ?? 0;

      if (remote && remote.updatedAt > localUpdatedAt) {
        this.applyingRemote = true;
        this.state.importAll(remote.data);
        this.lastSyncedAt.set(remote.updatedAt);
        this.save();
        this.applyingRemote = false;
        this.status.set('synced');
      } else {
        // Local is at least as fresh — push it up so the gist reflects it too.
        await this.push();
      }
      this.errorMessage.set('');
    } catch (e) {
      this.status.set('error');
      this.errorMessage.set(this.explainFailure(e));
    } finally {
      this.initialPullDone = true;
    }
  }

  private explainFailure(e: unknown): string {
    const status = (e as { status?: number } | null)?.status;
    if (status === 401) return 'GitHub rejected the token. Check it on the Settings tab.';
    if (status === 404) return 'Gist not found — check the Gist ID, or clear it to create a new one.';
    if (status === 403) return 'GitHub rate-limited or denied this request. Try again shortly.';
    if (status === 0) return 'Could not reach GitHub. Check your connection.';
    return 'Sync failed. See the browser console for details.';
  }

  private save() {
    this.storage.set<SyncSettings>(KEY, {
      token: this.token(),
      gistId: this.gistId(),
      lastSyncedAt: this.lastSyncedAt(),
    });
  }
}
