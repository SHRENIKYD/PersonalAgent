import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VoiceService } from '../../services/voice.service';

const BOOT_LINES = [
  'INITIALIZING ECHO CORE...',
  'LOADING TASK MATRIX...',
  'CALIBRATING GROWTH TELEMETRY...',
  'ARC REACTOR ONLINE.',
];

/**
 * A brief once-per-tab boot animation, skippable and capped at a few seconds so it never
 * blocks real use — this is a JARVIS-style flourish, not a loading screen for anything that
 * actually takes time. sessionStorage (not localStorage) is deliberate: it should replay on a
 * fresh tab/session, not just once ever per browser.
 */
@Component({
  selector: 'app-boot',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="boot-overlay" (click)="skip()">
      <div class="boot-box">
        <div class="boot-line" *ngFor="let line of lines">{{ line }}</div>
      </div>
      <button class="ghost-btn boot-skip" (click)="skip()">Skip</button>
    </div>
  `,
})
export class BootComponent {
  @Output() done = new EventEmitter<void>();
  lines = BOOT_LINES;
  private timer = setTimeout(() => this.skip(), 2600);

  constructor(private voice: VoiceService) {
    // Fires before any user gesture, which mobile browsers refuse to play audio for —
    // Chrome on Android included, contrary to what this comment used to claim. VoiceService
    // holds the greeting when the page is not yet unlocked and replays it on the first tap,
    // so this call is a request rather than a guarantee.
    this.voice.greet();
  }

  skip() {
    clearTimeout(this.timer);
    this.done.emit();
  }
}
