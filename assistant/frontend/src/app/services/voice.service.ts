import { Injectable, signal } from '@angular/core';
import { StorageService } from './storage.service';

const KEY = 'assistant-voice-v1';

/**
 * Spoken greeting via the browser's built-in Web Speech API — no external service, no API
 * key, works offline. Deliberately narrow in scope: a short greeting on load, not a full
 * voice-assistant pipeline (no speech recognition, no reading chat replies aloud).
 *
 * Autoplay-with-sound policies on some browsers (notably mobile Safari) block audio,
 * including speech synthesis, until a user gesture happens on the page. The greeting is
 * still attempted immediately on boot; if the browser blocks it, `speak()` from the boot
 * screen's own Skip click (a genuine user gesture) picks it up as a fallback.
 */
@Injectable({ providedIn: 'root' })
export class VoiceService {
  enabled = signal(true);

  constructor(private storage: StorageService) {
    this.enabled.set(this.storage.get<boolean>(KEY, true));
  }

  setEnabled(value: boolean) {
    this.enabled.set(value);
    this.storage.set(KEY, value);
  }

  speak(text: string) {
    if (!this.enabled()) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.98;
    utterance.pitch = 0.85;
    const preferred = window.speechSynthesis
      .getVoices()
      .find(v => /en-GB|en-US/.test(v.lang) && /male/i.test(v.name));
    if (preferred) utterance.voice = preferred;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  greet() {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    this.speak(`Good ${timeOfDay}. J.A.R.V.I.S. online. All systems are ready.`);
  }
}
