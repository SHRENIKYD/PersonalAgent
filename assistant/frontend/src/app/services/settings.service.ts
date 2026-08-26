import { Injectable, computed, signal } from '@angular/core';
import { StorageService } from './storage.service';
import { Capacitor } from '@capacitor/core';
import { ApiProvider, TransportMode } from '../models';

/**
 * Every provider the app knows, used to validate what comes back from storage.
 *
 * This was a hardcoded chain of ternaries that only recognised two of them, so a saved
 * choice of anything else silently reverted to Anthropic on the next launch — including the
 * key that went with it appearing to vanish. A list means adding a provider is one edit
 * rather than one edit and a trap.
 */
const PROVIDERS: ApiProvider[] = ['anthropic', 'openai', 'gemini', 'groq'];

const KEY = 'assistant-settings-v1';

interface Settings {
  mode: TransportMode;
  provider: ApiProvider;
  apiKey: string;
  openaiApiKey: string;
  geminiApiKey: string;
  groqApiKey: string;
}

function defaults(): Settings {
  // Backend mode points at a localhost API, which cannot exist on a phone — the installed
  // app has no such server and never will, so defaulting to it there guarantees a confusing
  // "could not reach the backend at http://localhost:5000" on the very first message.
  // Direct mode is the only default that can work natively.
  return {
    mode: Capacitor.isNativePlatform() ? 'direct' : 'backend',
    provider: 'anthropic',
    apiKey: '',
    openaiApiKey: '',
    geminiApiKey: '',
    groqApiKey: '',
  };
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
 * them never loses any of the others: Anthropic (`apiKey`), OpenAI (`openaiApiKey`),
 * Gemini (`geminiApiKey`), and Groq (`groqApiKey`). Backend mode is always Anthropic, since that is all `Program.cs`
 * proxies to.
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  mode = signal<TransportMode>('backend');
  provider = signal<ApiProvider>('anthropic');
  apiKey = signal<string>('');
  openaiApiKey = signal<string>('');
  geminiApiKey = signal<string>('');
  groqApiKey = signal<string>('');

  constructor(private storage: StorageService) {
    const fallback = defaults();
    const saved = this.storage.get<Settings>(KEY, fallback);
    // An explicit stored choice still wins — this only decides what an untouched install does.
    this.mode.set(saved.mode === 'direct' || saved.mode === 'backend' ? saved.mode : fallback.mode);
    this.provider.set(
      PROVIDERS.includes(saved.provider) ? saved.provider : fallback.provider
    );
    this.apiKey.set(typeof saved.apiKey === 'string' ? saved.apiKey : '');
    this.openaiApiKey.set(typeof saved.openaiApiKey === 'string' ? saved.openaiApiKey : '');
    this.geminiApiKey.set(typeof saved.geminiApiKey === 'string' ? saved.geminiApiKey : '');
    this.groqApiKey.set(typeof saved.groqApiKey === 'string' ? saved.groqApiKey : '');
  }

  /** The key for whichever provider is currently selected. */
  activeKey = computed(() => {
    switch (this.provider()) {
      case 'openai': return this.openaiApiKey();
      case 'gemini': return this.geminiApiKey();
      case 'groq': return this.groqApiKey();
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

  setGroqApiKey(key: string) {
    this.groqApiKey.set(key.trim());
    this.save();
  }

  clearGroqApiKey() {
    this.groqApiKey.set('');
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
      groqApiKey: this.groqApiKey(),
    });
  }
}
