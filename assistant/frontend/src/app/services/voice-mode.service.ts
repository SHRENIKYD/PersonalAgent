import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { AgentService } from './agent.service';
import { DictationService } from './dictation.service';
import { VoiceService } from './voice.service';

/** Where a hands-free turn currently is. */
export type VoiceState = 'off' | 'listening' | 'thinking' | 'speaking';

/**
 * Hands-free conversation: listen, send, speak the reply, listen again.
 *
 * Beta-only. It is the one feature here that takes actions on your behalf without a tap —
 * a mis-heard sentence becomes a sent message — so it ships in a separate app with its own
 * storage rather than in the copy you rely on.
 *
 * The loop is deliberately half-duplex. The microphone is never open while the app is
 * speaking, because the recogniser would otherwise hear the synthesised voice and answer
 * itself; that is the failure mode every naive version of this has. Each phase completes
 * before the next begins.
 */
@Injectable({ providedIn: 'root' })
export class VoiceModeService {
  readonly available = environment.beta;

  state = signal<VoiceState>('off');
  error = signal('');
  /** What the recogniser last heard, so a mis-hear is visible rather than mysterious. */
  lastHeard = signal('');

  /** Set while stopping, so an in-flight callback cannot restart the loop. */
  private stopping = false;

  constructor(
    private agent: AgentService,
    private dictation: DictationService,
    private voice: VoiceService,
  ) {}

  get enabled(): boolean {
    return this.state() !== 'off';
  }

  toggle() {
    if (this.enabled) this.stop();
    else this.start();
  }

  start() {
    if (!this.available) return;
    if (!this.dictation.supported()) {
      this.error.set('This device has no speech recognition, so hands-free mode cannot run.');
      return;
    }
    this.stopping = false;
    this.error.set('');
    this.listen();
  }

  stop() {
    this.stopping = true;
    this.dictation.stop();
    this.voice.stopSpeaking();
    this.state.set('off');
  }

  private listen() {
    if (this.stopping) return;
    this.state.set('listening');
    this.dictation.start(text => {
      if (this.stopping) return;
      this.lastHeard.set(text);
      void this.respond(text);
    });

    // The recogniser ends on silence without ever calling back. Without noticing that, the
    // loop would sit in 'listening' for ever with the mic already closed.
    this.watchForSilentEnd();
  }

  private watchForSilentEnd() {
    const check = setInterval(() => {
      if (this.stopping || this.state() !== 'listening') { clearInterval(check); return; }
      if (!this.dictation.listening()) {
        clearInterval(check);
        // Nothing was heard. Reopen rather than dropping out — a pause mid-thought should
        // not end the conversation.
        if (!this.stopping) this.listen();
      }
    }, 400);
  }

  private async respond(text: string) {
    this.state.set('thinking');
    const before = this.agent.transcript().length;
    await this.agent.send(text);
    if (this.stopping) return;

    // Speak only the assistant's prose. Cards are on screen and reading a table of set
    // ranges aloud is worse than useless.
    const said = this.agent.transcript()
      .slice(before)
      .filter(m => m.kind === 'assistant' && !m.pending)
      .map(m => m.text)
      .join(' ')
      .trim();

    if (said) {
      this.state.set('speaking');
      await this.voice.speak(said);
    }
    if (this.stopping) return;
    this.listen();
  }
}
