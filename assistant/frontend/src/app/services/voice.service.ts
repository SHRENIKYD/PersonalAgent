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

  /**
   * The Android side builds each entry as
   *   voiceURI = the engine's voice name  (e.g. "en-gb-x-gbb-local")
   *   name     = language + country only  (e.g. "English United Kingdom")
   * so a device with eight English (UK) voices shows the same label eight times and the
   * only distinguishing detail sits in voiceURI. The label is rebuilt here to include it,
   * otherwise the list is unusable however well the selection works.
   */
  private async loadNativeVoices() {
    try {
      const { voices } = await TextToSpeech.getSupportedVoices();
      const labelled = voices.map(v => ({
        ...v,
        name: this.nativeLabel(v as unknown as { name?: string; voiceURI?: string }),
      }));
      this.voices.set(labelled as unknown as SpeechSynthesisVoice[]);
    } catch {
      // Not fatal: speaking without naming a voice uses the system default.
      this.voices.set([]);
    }
  }

  private nativeLabel(v: { name?: string; voiceURI?: string }): string {
    const base = (v.name ?? '').trim();
    const uri = (v.voiceURI ?? '').trim();
    if (!uri) return base || 'Unnamed voice';
    // "en-gb-x-gbb-local" -> "gbb-local": the language is already in the base label, so the
    // part worth showing is what differs between voices of the same language.
    const detail = uri.replace(/^[a-z]{2,3}([-_][a-z]{2,3})?[-_]x[-_]/i, '').trim() || uri;
    return base ? `${base} — ${detail}` : detail;
  }

  setEnabled(value: boolean) {
    this.enabled.set(value);
    this.save();
  }

  setVoice(voiceURI: string) {
    this.selectedVoiceURI.set(voiceURI.trim() === '' ? null : voiceURI);
    this.save();
    // Speak on change. Picking a voice you cannot hear is the reason this was broken for so
    // long without anyone noticing — the setting looked like it had applied.
    void this.speak('This is how I sound.');
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
        /*
         * The plugin takes `voice` as an INDEX into getSupportedVoices(), not a URI — so the
         * stored voiceURI has to be resolved back to its position. Passing the URI straight
         * through would be silently ignored, which is what the previous version did by not
         * passing anything at all: the setting saved, displayed, and changed nothing.
         *
         * lang is deliberately omitted when a voice is chosen. Sending 'en-GB' alongside a
         * voice from another locale makes the two fight, and the engine wins.
         */
        const all = this.voices();
        const chosen = this.selectedVoiceURI();
        const index = chosen
          ? all.findIndex(v => v.voiceURI === chosen)
          : -1;
        const picked = index >= 0 ? all[index] : undefined;

        await TextToSpeech.speak({
          text,
          rate: 1.0,
          pitch: 0.9,
          ...(picked ? { voice: index, lang: picked.lang } : { lang: 'en-GB' }),
        });
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
    if (voice) {
      /*
       * Assigning anything that is not a genuine SpeechSynthesisVoice throws a TypeError,
       * and speak() is called as `void this.speak(...)` — so an unguarded throw here kills
       * the utterance with no sound and no message, which is the exact failure mode this
       * service exists to make visible. A stale entry from a previous voiceschanged can hit
       * this. Falling back to the default voice is far better than silence.
       */
      try {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } catch {
        this.lastError.set('That voice is no longer available — using the default.');
      }
    }

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
    /*
     * Resolve when speech FINISHES, not when it is queued. Hands-free mode reopens the
     * microphone as soon as speak() settles, and a promise that resolves immediately would
     * put the mic up while the app is still talking — the recogniser then hears the
     * synthesised voice and the assistant answers itself.
     */
    await new Promise<void>(resolve => {
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      utterance.onend = () => { this.lastSpokeAt.set(Date.now()); finish(); };
      const priorError = utterance.onerror;
      utterance.onerror = ev => { priorError?.call(utterance, ev); finish(); };

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);

      // Chrome drops long utterances without firing either event. A ceiling well past any
      // realistic reply keeps a lost event from stalling the loop for ever.
      setTimeout(finish, 60_000);
    });
  }

  /** Cuts off anything currently being spoken, on either platform. */
  stopSpeaking() {
    if (IS_APP) {
      void TextToSpeech.stop().catch(() => undefined);
      return;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
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
