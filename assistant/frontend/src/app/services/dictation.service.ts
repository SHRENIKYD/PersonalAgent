import { Injectable, signal } from '@angular/core';

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

function ctor(): RecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Dictation into the chat box — speech to text, not a voice assistant. It fills the input
 * and stops; sending is still a deliberate act, because a mis-heard message sent
 * automatically is worse than one you get to read first.
 *
 * Nothing is spoken back here; that is VoiceService's job, and keeping the two apart means
 * the microphone can never be listening because the app happened to be talking.
 */
@Injectable({ providedIn: 'root' })
export class DictationService {
  listening = signal(false);
  error = signal('');

  /** Whether to render the mic at all — a dead button is worse than no button. */
  readonly supported = ctor() !== null;

  private rec: SpeechRecognitionLike | null = null;

  start(onText: (text: string) => void) {
    const Ctor = ctor();
    if (!Ctor) {
      this.error.set('Dictation is not supported in this browser.');
      return;
    }
    this.error.set('');

    const rec = new Ctor();
    rec.lang = navigator.language || 'en-GB';
    // One utterance per tap: continuous mode on a phone keeps the mic open through
    // silence and drains battery for no benefit here.
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

    // Fires on both a normal finish and an error, so it is the one reliable place to
    // clear the listening state.
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
    this.rec?.stop();
    this.rec = null;
    this.listening.set(false);
  }
}
