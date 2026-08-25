import { Injectable, signal } from '@angular/core';
import { StorageService } from './storage.service';
import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

const KEY = 'assistant-voice-v1';

interface VoiceSettings {
  enabled: boolean;
  voiceURI: string | null;
}

function defaults(): VoiceSettings {
  return { enabled: true, voiceURI: null };
}

/**
 * Roughly ordered by how close they sound to "calm, deep, male, AI-assistant" — not a
 * JARVIS clone (that's Paul Bettany's copyrighted voice performance, not something this app
 * can source or synthesize), just the best fit available from each platform's built-in
 * voices. Tried in order; whichever the current browser/OS actually has wins.
 */
const PREFERRED_VOICE_NAMES = [
  'Daniel',
  'Google UK English Male',
  'Microsoft Ryan Online (Natural) - English (United Kingdom)',
  'Microsoft George - English (United Kingdom)',
  'Microsoft David - English (United States)',
  'Google US English',
  'Alex',
];

/**
 * Running natively rather than in a browser tab.
 *
 * NOT `!!window.Capacitor`: importing any Capacitor package registers that global in web
 * builds too, with platform 'web'. Checking for the global therefore reports "native" in an
 * ordinary browser, which sent the web path into the plugin's web fallback — it spoke before
 * any user gesture and then failed with an Android-specific error message. isNativePlatform()
 * is the check that actually distinguishes the two.
 */
const IS_APP = Capacitor.isNativePlatform();

@Injectable({ providedIn: 'root' })
export class VoiceService {
  enabled = signal(true);
  voices = signal<SpeechSynthesisVoice[]>([]);
  selectedVoiceURI = signal<string | null>(null);

  /** Diagnostics, surfaced in Settings — speech failing silently is the whole problem. */
  supported = signal(true);
  lastError = signal('');
  lastSpokeAt = signal<number>(0);
  /** True once a real user gesture has happened, which is what unblocks audio. */
  unlocked = signal(false);
  readonly isApp = IS_APP;

  /** A greeting the browser refused to play, replayed on the first gesture. */
  private pending: string | null = null;

  constructor(private storage: StorageService) {
    const saved = this.storage.get<VoiceSettings>(KEY, defaults());
    this.enabled.set(saved.enabled);
    this.selectedVoiceURI.set(saved.voiceURI ?? null);

    if (IS_APP) {
      // Native TTS needs no unlocking — the autoplay policy is a browser rule.
      this.unlocked.set(true);
      this.loadNativeVoices();
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.refreshVoices();
      // Chrome loads voices asynchronously; the first getVoices() is usually empty.
      window.speechSynthesis.addEventListener('voiceschanged', () => this.refreshVoices());
      this.armGestureUnlock();
    } else {
      this.supported.set(false);
      this.lastError.set('This browser has no speech synthesis support.');
    }
  }

  /**
   * Mobile browsers refuse audio, speech included, until the page has seen a real user
   * gesture. Nothing reports this — speak() resolves and simply produces silence — so the
   * first tap or key press marks the page unlocked and replays anything that was dropped.
   */
  private armGestureUnlock() {
    const unlock = () => {
      this.unlocked.set(true);
      if (this.pending) {
        const text = this.pending;
        this.pending = null;
        void this.speak(text);
      }
    };
    ['pointerdown', 'keydown', 'touchend'].forEach(evt =>
      window.addEventListener(evt, unlock, { once: true, passive: true })
    );
  }

  private async loadNativeVoices() {
    try {
      const { voices } = await TextToSpeech.getSupportedVoices();
      this.voices.set(voices as unknown as SpeechSynthesisVoice[]);
    } catch {
      // Not fatal: speaking without naming a voice uses the system default.
      this.voices.set([]);
    }
  }

  setEnabled(value: boolean) {
    this.enabled.set(value);
    this.save();
  }

  setVoice(voiceURI: string) {
    this.selectedVoiceURI.set(voiceURI.trim() === '' ? null : voiceURI);
    this.save();
  }

  private refreshVoices() {
    this.voices.set(window.speechSynthesis.getVoices());
  }

  /**
   * getVoices() is empty until the engine finishes loading, and speaking with an empty list
   * is where "no sound and no error" comes from on Chrome. Waits briefly for voiceschanged
   * rather than firing into the void.
   */
  private async waitForVoices(ms = 1500): Promise<void> {
    if (this.voices().length > 0) return;
    await new Promise<void>(resolve => {
      const done = () => { clearTimeout(t); resolve(); };
      const t = setTimeout(done, ms);
      window.speechSynthesis.addEventListener('voiceschanged', () => {
        this.refreshVoices();
        done();
      }, { once: true });
    });
    this.refreshVoices();
  }

  private resolveVoice(): SpeechSynthesisVoice | undefined {
    const all = this.voices();
    if (all.length === 0) return undefined;

    const chosen = this.selectedVoiceURI();
    if (chosen) {
      const exact = all.find(v => v.voiceURI === chosen);
      if (exact) return exact;
    }
    for (const name of PREFERRED_VOICE_NAMES) {
      const match = all.find(v => v.name === name);
      if (match) return match;
    }
    return (
      all.find(v => /^en/i.test(v.lang) && /male/i.test(v.name)) ??
      all.find(v => /^en/i.test(v.lang))
    );
  }

  async speak(text: string): Promise<void> {
    if (!this.enabled()) return;
    this.lastError.set('');

    if (IS_APP) {
      // Android's WebView exposes speechSynthesis but frequently never binds it to the
      // system TTS engine, so it reports success and plays nothing. The native plugin
      // talks to Android TTS directly, which is why the app path does not share the web one.
      try {
        await TextToSpeech.speak({ text, lang: 'en-GB', rate: 1.0, pitch: 0.9 });
        this.lastSpokeAt.set(Date.now());
      } catch (e) {
        this.lastError.set(
          `Native speech failed: ${e instanceof Error ? e.message : String(e)}. ` +
          'Check that a text-to-speech engine is installed and enabled in Android settings.'
        );
      }
      return;
    }

    if (!('speechSynthesis' in window)) {
      this.supported.set(false);
      return;
    }

    if (!this.unlocked()) {
      // Hold it rather than dropping it; the gesture listener will replay it.
      this.pending = text;
      return;
    }

    await this.waitForVoices();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.98;
    utterance.pitch = 0.85;
    const voice = this.resolveVoice();
    if (voice) { utterance.voice = voice; utterance.lang = voice.lang; }

    utterance.onerror = ev => {
      // "interrupted"/"canceled" are ours — cancel() below fires them on the previous
      // utterance — and are not worth showing as failures.
      const err = (ev as SpeechSynthesisErrorEvent).error;
      if (err === 'interrupted' || err === 'canceled') return;
      this.lastError.set(
        err === 'not-allowed'
          ? 'The browser blocked speech until you interact with the page. Tap anywhere, then try again.'
          : `Speech failed: ${err}`
      );
    };
    utterance.onend = () => this.lastSpokeAt.set(Date.now());

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  greet() {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    void this.speak(`Good ${timeOfDay}. ECHO online. All systems are ready.`);
  }

  private save() {
    this.storage.set<VoiceSettings>(KEY, { enabled: this.enabled(), voiceURI: this.selectedVoiceURI() });
  }
}
