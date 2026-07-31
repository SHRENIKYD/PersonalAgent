import { Injectable, signal } from '@angular/core';
import { StorageService } from './storage.service';

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
  'Daniel', // macOS/iOS — British male, closest stock match
  'Google UK English Male',
  'Microsoft Ryan Online (Natural) - English (United Kingdom)',
  'Microsoft George - English (United Kingdom)',
  'Microsoft David - English (United States)',
  'Google US English',
  'Alex',
];

/**
 * Spoken greeting via the browser's built-in Web Speech API — no external service, no API
 * key, works offline. Deliberately narrow in scope: a short greeting on load, not a full
 * voice-assistant pipeline (no speech recognition, no reading chat replies aloud).
 *
 * Voice quality/availability varies enormously by OS and browser, and none of it can be
 * guaranteed to sound like any particular character — so this exposes the actual voice list
 * the current device has (`voices`) and lets the user pick, rather than silently picking one
 * and hoping. `resolveVoice()` still has an automatic preference order as the default.
 *
 * Autoplay-with-sound policies on some browsers (notably mobile Safari) block audio,
 * including speech synthesis, until a user gesture happens on the page. The greeting is
 * still attempted immediately on boot; if the browser blocks it, `speak()` from the boot
 * screen's own Skip click (a genuine user gesture) picks it up as a fallback.
 */
@Injectable({ providedIn: 'root' })
export class VoiceService {
  enabled = signal(true);
  voices = signal<SpeechSynthesisVoice[]>([]);
  selectedVoiceURI = signal<string | null>(null);

  constructor(private storage: StorageService) {
    const saved = this.storage.get<VoiceSettings>(KEY, defaults());
    this.enabled.set(saved.enabled);
    this.selectedVoiceURI.set(saved.voiceURI ?? null);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.refreshVoices();
      // Chrome in particular loads voices asynchronously — the first getVoices() call often
      // returns an empty list until this event fires.
      window.speechSynthesis.addEventListener('voiceschanged', () => this.refreshVoices());
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

  speak(text: string) {
    if (!this.enabled()) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.98;
    utterance.pitch = 0.85;
    const voice = this.resolveVoice();
    if (voice) utterance.voice = voice;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  greet() {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    this.speak(`Good ${timeOfDay}. ECHO online. All systems are ready.`);
  }

  private save() {
    this.storage.set<VoiceSettings>(KEY, { enabled: this.enabled(), voiceURI: this.selectedVoiceURI() });
  }
}
