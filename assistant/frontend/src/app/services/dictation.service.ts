import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

/**
 * Web Speech API recognition, which is still prefixed and still not in every browser —
 * Firefox has no implementation at all. Typed locally rather than pulled from lib.dom,
 * which does not declare it.
 */
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>>; resultIndex: number }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type RecognitionCtor = new () => SpeechRecognitionLike;

function webCtor(): RecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const IS_APP = Capacitor.isNativePlatform();

/**
 * Dictation into the chat box — speech to text, not a voice assistant. It fills the input
 * and stops; sending stays a deliberate act, because a mis-heard message sent automatically
 * is worse than one you get to read first.
 *
 * Two implementations, for the same reason speech *output* needed two: Android's WebView
 * does not implement webkitSpeechRecognition at all, so on the web the button would simply
 * not appear inside the app. The native path calls Android's own recogniser instead.
 *
 * Nothing is spoken back here; that is VoiceService's job. Keeping them apart means the
 * microphone can never be open because the app happened to be talking.
 */
@Injectable({ providedIn: 'root' })
export class DictationService {
  listening = signal(false);
  error = signal('');

  /**
   * Whether to render the mic at all — a dead button is worse than no button. Starts true
   * on native and is corrected if the device turns out to have no recogniser.
   */
  supported = signal(IS_APP || webCtor() !== null);

  private rec: SpeechRecognitionLike | null = null;

  constructor() {
    if (IS_APP) void this.checkNative();
  }

  private async checkNative() {
    try {
      const { available } = await SpeechRecognition.available();
      this.supported.set(available);
    } catch {
      this.supported.set(false);
    }
  }

  start(onText: (text: string) => void) {
    this.error.set('');
    if (IS_APP) void this.startNative(onText);
    else this.startWeb(onText);
  }

  private async startNative(onText: (text: string) => void) {
    try {
      // Android will not record until RECORD_AUDIO is granted, and the request has to come
      // from the plugin rather than the WebView — the WebView's own getUserMedia prompt does
      // not cover the native recogniser.
      const perm = await SpeechRecognition.checkPermissions();
      if (perm.speechRecognition !== 'granted') {
        const asked = await SpeechRecognition.requestPermissions();
        if (asked.speechRecognition !== 'granted') {
          this.error.set('Microphone permission was denied. Enable it for ECHO in Android settings.');
          return;
        }
      }

      this.listening.set(true);
      // popup:false keeps Google's full-screen listening dialog out of the way; the app
      // already shows its own listening state on the button.
      const res = await SpeechRecognition.start({
        language: navigator.language || 'en-GB',
        maxResults: 1,
        partialResults: false,
        popup: false,
      });
      const text = (res?.matches ?? [])[0];
      if (text?.trim()) onText(text.trim());
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.error.set(
        /permission/i.test(msg)
          ? 'Microphone permission was denied. Enable it for ECHO in Android settings.'
          : `Dictation failed: ${msg}`
      );
    } finally {
      this.listening.set(false);
    }
  }

  private startWeb(onText: (text: string) => void) {
    const Ctor = webCtor();
    if (!Ctor) {
      this.error.set('Dictation is not supported in this browser.');
      return;
    }

    const rec = new Ctor();
    rec.lang = navigator.language || 'en-GB';
    // One utterance per tap: continuous mode on a phone keeps the mic open through silence
    // and drains battery for no benefit here.
    rec.continuous = false;
    rec.interimResults = false;

    rec.onresult = e => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      if (text.trim()) onText(text.trim());
    };

    rec.onerror = e => {
      this.error.set(
        e.error === 'not-allowed'
          ? 'Microphone permission was denied.'
          : e.error === 'no-speech'
            ? "Didn't catch that."
            : `Dictation failed: ${e.error}`
      );
      this.listening.set(false);
    };

    // Fires on both a normal finish and an error, so it is the one reliable place to clear
    // the listening state.
    rec.onend = () => this.listening.set(false);

    try {
      rec.start();
      this.rec = rec;
      this.listening.set(true);
    } catch {
      // start() throws if called while already running.
      this.listening.set(false);
    }
  }

  stop() {
    if (IS_APP) {
      void SpeechRecognition.stop().catch(() => undefined);
    } else {
      this.rec?.stop();
      this.rec = null;
    }
    this.listening.set(false);
  }
}
