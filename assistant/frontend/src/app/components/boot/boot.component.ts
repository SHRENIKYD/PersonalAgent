import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

const BOOT_LINES = [
  'INITIALIZING J.A.R.V.I.S. CORE...',
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

  skip() {
    clearTimeout(this.timer);
    this.done.emit();
  }
}
