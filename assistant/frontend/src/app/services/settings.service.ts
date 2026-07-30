import { Injectable, computed, signal } from '@angular/core';
import { StorageService } from './storage.service';
import { TransportMode } from '../models';

const KEY = 'assistant-settings-v1';

interface Settings {
  mode: TransportMode;
  apiKey: string;
}

function defaults(): Settings {
  return { mode: 'backend', apiKey: '' };
}

/**
 * How the agent reaches Anthropic.
 *
 * 'backend' proxies through the .NET API, which holds the key server-side. 'direct' calls
 * the API straight from the browser with a key kept in localStorage — no backend to deploy,
 * but the key is readable by anything with access to this browser profile, including any
 * XSS on the page. That trade is the user's to make, so it is a visible setting rather
 * than a build-time flag, and the Settings tab states the risk plainly.
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  mode = signal<TransportMode>('backend');
  apiKey = signal<string>('');

  constructor(private storage: StorageService) {
    const saved = this.storage.get<Settings>(KEY, defaults());
    this.mode.set(saved.mode === 'direct' ? 'direct' : 'backend');
    this.apiKey.set(typeof saved.apiKey === 'string' ? saved.apiKey : '');
  }

  /** Direct mode is unusable without a key; backend mode carries its own. */
  ready = computed(() => this.mode() === 'backend' || this.apiKey().trim() !== '');

  setMode(mode: TransportMode) {
    this.mode.set(mode);
    this.save();
  }

  setApiKey(key: string) {
    this.apiKey.set(key.trim());
    this.save();
  }

  clearApiKey() {
    this.apiKey.set('');
    this.save();
  }

  private save() {
    this.storage.set<Settings>(KEY, { mode: this.mode(), apiKey: this.apiKey() });
  }
}
