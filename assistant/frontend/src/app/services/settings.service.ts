import { Injectable, computed, signal } from '@angular/core';
import { StorageService } from './storage.service';
import { ApiProvider, TransportMode } from '../models';

const KEY = 'assistant-settings-v1';

interface Settings {
  mode: TransportMode;
  provider: ApiProvider;
  apiKey: string;
  openaiApiKey: string;
  geminiApiKey: string;
}

function defaults(): Settings {
  return { mode: 'backend', provider: 'anthropic', apiKey: '', openaiApiKey: '', geminiApiKey: '' };
}

/**
 * How the agent reaches a model.
 *
 * 'backend' proxies through the .NET API, which holds an Anthropic key server-side. 'direct'
 * calls a provider straight from the browser with a key kept in localStorage — no backend to
 * deploy, but the key is readable by anything with access to this browser profile, including
 * any XSS on the page. That trade is the user's to make, so it is a visible setting rather
 * than a build-time flag, and the Settings tab states the risk plainly.
 *
 * Direct mode supports three providers, each with its own stored key so switching between
 * them never loses any of the others: Anthropic (`apiKey`), OpenAI (`openaiApiKey`), and
 * Gemini (`geminiApiKey`). Backend mode is always Anthropic, since that is all `Program.cs`
 * proxies to.
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  mode = signal<TransportMode>('backend');
  provider = signal<ApiProvider>('anthropic');
  apiKey = signal<string>('');
  openaiApiKey = signal<string>('');
  geminiApiKey = signal<string>('');

  constructor(private storage: StorageService) {
    const saved = this.storage.get<Settings>(KEY, defaults());
    this.mode.set(saved.mode === 'direct' ? 'direct' : 'backend');
    this.provider.set(
      saved.provider === 'openai' ? 'openai' : saved.provider === 'gemini' ? 'gemini' : 'anthropic'
    );
    this.apiKey.set(typeof saved.apiKey === 'string' ? saved.apiKey : '');
    this.openaiApiKey.set(typeof saved.openaiApiKey === 'string' ? saved.openaiApiKey : '');
    this.geminiApiKey.set(typeof saved.geminiApiKey === 'string' ? saved.geminiApiKey : '');
  }

  /** The key for whichever provider is currently selected. */
  activeKey = computed(() => {
    switch (this.provider()) {
      case 'openai': return this.openaiApiKey();
      case 'gemini': return this.geminiApiKey();
      default: return this.apiKey();
    }
  });

  /** Direct mode is unusable without a key for the selected provider; backend mode carries its own. */
  ready = computed(() => this.mode() === 'backend' || this.activeKey().trim() !== '');

  setMode(mode: TransportMode) {
    this.mode.set(mode);
    this.save();
  }

  setProvider(provider: ApiProvider) {
    this.provider.set(provider);
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

  setOpenaiApiKey(key: string) {
    this.openaiApiKey.set(key.trim());
    this.save();
  }

  clearOpenaiApiKey() {
    this.openaiApiKey.set('');
    this.save();
  }

  setGeminiApiKey(key: string) {
    this.geminiApiKey.set(key.trim());
    this.save();
  }

  clearGeminiApiKey() {
    this.geminiApiKey.set('');
    this.save();
  }

  private save() {
    this.storage.set<Settings>(KEY, {
      mode: this.mode(),
      provider: this.provider(),
      apiKey: this.apiKey(),
      openaiApiKey: this.openaiApiKey(),
      geminiApiKey: this.geminiApiKey(),
    });
  }
}
