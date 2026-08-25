import { Injectable, signal } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { environment } from '../../environments/environment';

interface LocalLlmStatus {
  modelPresent: boolean;
  sizeBytes: number;
  loaded: boolean;
  path?: string;
}

interface LocalLlmPlugin {
  getStatus(): Promise<LocalLlmStatus>;
  downloadModel(options: { url: string }): Promise<{ modelPresent: boolean; sizeBytes: number }>;
  cancelDownload(): Promise<void>;
  addListener(
    event: 'downloadProgress',
    handler: (p: { received: number; total: number }) => void,
  ): Promise<{ remove: () => Promise<void> }>;
  importModel(): Promise<{ modelPresent: boolean; sizeBytes: number }>;
  load(): Promise<{ loaded: boolean }>;
  generate(options: { prompt: string }): Promise<{ text: string; ms: number }>;
  unload(): Promise<{ loaded: boolean }>;
  deleteModel(): Promise<{ modelPresent: boolean }>;
}

const LocalLlm = registerPlugin<LocalLlmPlugin>('LocalLlm');

/** Where to get a model, if the user has not got one yet. */
export const SUGGESTED_MODEL = {
  name: 'Qwen2.5 1.5B Instruct',
  approxGb: 1.5,
  page: 'https://huggingface.co/litert-community/Qwen2.5-1.5B-Instruct',
  /** A release asset, not a repo file: git rejects anything over 100MB. */
  downloadUrl:
    'https://github.com/SHRENIKYD/inter.github.io/releases/download/model-v1/model.litertlm',
};

/**
 * A model running on the phone itself, so the assistant can answer with no API key.
 *
 * Beta-only. It is a gigabyte of untested native code holding a session in memory, and the
 * failure modes are the kind that take an app down rather than showing an error — so it
 * ships in the separate beta app with its own storage, not in the copy relied on daily.
 *
 * Android only on top of that: on-device inference needs WebGPU in the browser, which
 * Android's System WebView — the engine this app runs in — does not expose. Pretending
 * otherwise would mean a feature that silently does nothing on the website.
 */
@Injectable({ providedIn: 'root' })
export class LocalLlmService {
  /** True only in the beta Android app; the UI hides itself everywhere else. */
  readonly available = Capacitor.isNativePlatform() && environment.beta;

  modelPresent = signal(false);
  sizeBytes = signal(0);
  loaded = signal(false);
  busy = signal('');
  error = signal('');

  /** 0–100 while downloading, null otherwise. */
  progress = signal<number | null>(null);
  downloadUrl = signal(SUGGESTED_MODEL.downloadUrl);

  constructor() {
    if (this.available) void this.refresh();
  }

  async refresh() {
    if (!this.available) return;
    try {
      const s = await LocalLlm.getStatus();
      this.modelPresent.set(s.modelPresent);
      this.sizeBytes.set(s.sizeBytes);
      this.loaded.set(s.loaded);
    } catch (e) {
      this.error.set(message(e));
    }
  }

  /**
   * Fetches the model straight into app storage. Reports percent as it goes — a gigabyte on
   * a phone connection is minutes long, and a silent wait is indistinguishable from a hang.
   */
  async download() {
    const url = this.downloadUrl().trim();
    const listener = await LocalLlm.addListener('downloadProgress', p => {
      this.progress.set(p.total > 0 ? Math.round((p.received / p.total) * 100) : 0);
    });
    this.progress.set(0);
    await this.run('Downloading the model…', async () => {
      const r = await LocalLlm.downloadModel({ url });
      this.modelPresent.set(r.modelPresent);
      this.sizeBytes.set(r.sizeBytes);
      this.loaded.set(false);
    });
    this.progress.set(null);
    await listener.remove();
  }

  cancelDownload() {
    void LocalLlm.cancelDownload();
  }

  /**
   * Copying a gigabyte takes a while and the picker gives no progress, so the UI says what
   * is happening rather than appearing frozen.
   */
  async importModel() {
    await this.run('Copying the model — this takes a minute…', async () => {
      const r = await LocalLlm.importModel();
      this.modelPresent.set(r.modelPresent);
      this.sizeBytes.set(r.sizeBytes);
      this.loaded.set(false);
    });
  }

  async load() {
    await this.run('Loading the model…', async () => {
      const r = await LocalLlm.load();
      this.loaded.set(r.loaded);
    });
  }

  async unload() {
    await this.run('Unloading…', async () => {
      const r = await LocalLlm.unload();
      this.loaded.set(r.loaded);
    });
  }

  async deleteModel() {
    await this.run('Deleting…', async () => {
      const r = await LocalLlm.deleteModel();
      this.modelPresent.set(r.modelPresent);
      this.loaded.set(false);
      this.sizeBytes.set(0);
    });
  }

  /** Returns the answer, or '' if it failed — the error is on the signal either way. */
  async generate(prompt: string): Promise<{ text: string; ms: number } | null> {
    if (!this.available || !this.loaded()) return null;
    try {
      return await LocalLlm.generate({ prompt });
    } catch (e) {
      this.error.set(message(e));
      return null;
    }
  }

  private async run(label: string, work: () => Promise<void>) {
    if (!this.available) return;
    this.busy.set(label);
    this.error.set('');
    try {
      await work();
    } catch (e) {
      this.error.set(message(e));
    } finally {
      this.busy.set('');
    }
  }
}

function message(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return String(e);
}
