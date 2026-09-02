import { Component, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

const PRESETS = [60, 90, 120, 180];

/**
 * Rest countdown for between sets.
 *
 * Deliberately driven by a wall-clock deadline rather than by decrementing a counter each
 * tick: on a phone the tab is usually backgrounded mid-rest, and browsers throttle timers in
 * background tabs to once a minute or less. A decrementing counter would come back visibly
 * wrong. Storing the target timestamp means a throttled tab is merely a stale *display* that
 * corrects itself the instant the tab is foregrounded again.
 */
@Component({
  selector: 'app-rest-timer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rest-timer" [class.running]="running()" [class.done]="finished()">
      <div class="rest-ring-wrap">
        <svg width="132" height="132" viewBox="0 0 132 132" aria-hidden="true">
          <circle cx="66" cy="66" r="54" fill="none" stroke="var(--panel-2)" stroke-width="10" />
          <circle cx="66" cy="66" r="54" fill="none" stroke="url(#restG)" stroke-width="10"
                  stroke-linecap="round" transform="rotate(-90 66 66)"
                  [attr.stroke-dasharray]="CIRC"
                  [attr.stroke-dashoffset]="dashOffset()" />
          <defs>
            <linearGradient id="restG" gradientUnits="userSpaceOnUse" x1="12" y1="12" x2="120" y2="120">
              <stop offset="0%" stop-color="var(--ember-deep)" />
              <stop offset="100%" stop-color="var(--accent)" />
            </linearGradient>
          </defs>
        </svg>
        <div class="rest-val">
          <b>{{ clock() }}</b>
          <span>{{ finished() ? 'go' : running() ? 'rest' : 'ready' }}</span>
        </div>
      </div>

      <div class="rest-presets">
        <button *ngFor="let p of presets" class="ghost-btn"
                [class.sel]="seconds() === p" (click)="start(p)">{{ p }}s</button>
      </div>

      <div class="rest-actions">
        <button *ngIf="running()" class="ghost-btn" (click)="stop()">Stop</button>
        <button *ngIf="!running() && seconds() > 0" (click)="start(seconds())">
          {{ finished() ? 'Again' : 'Start' }}
        </button>
      </div>
    </div>
  `,
})
export class RestTimerComponent implements OnDestroy {
  readonly CIRC = 2 * Math.PI * 54;
  presets = PRESETS;

  seconds = signal(90);
  private deadline = signal(0);
  private now = signal(Date.now());
  private handle: ReturnType<typeof setInterval> | null = null;

  remaining = computed(() => {
    const d = this.deadline();
    if (d === 0) return this.seconds();
    return Math.max(0, Math.ceil((d - this.now()) / 1000));
  });

  running = computed(() => this.deadline() > 0 && this.remaining() > 0);
  finished = computed(() => this.deadline() > 0 && this.remaining() === 0);

  clock = computed(() => {
    const s = this.remaining();
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  });

  dashOffset = computed(() => {
    const total = this.seconds() || 1;
    // Ring empties as the rest burns down, so a glance at how much orange is left is the
    // same information as reading the digits.
    return this.CIRC * (1 - this.remaining() / total);
  });

  start(sec: number) {
    this.seconds.set(sec);
    this.deadline.set(Date.now() + sec * 1000);
    this.now.set(Date.now());
    this.tick();
  }

  stop() {
    this.clear();
    this.deadline.set(0);
  }

  private tick() {
    this.clear();
    this.handle = setInterval(() => {
      this.now.set(Date.now());
      if (this.remaining() === 0) this.clear();
    }, 250);
  }

  private clear() {
    if (this.handle) { clearInterval(this.handle); this.handle = null; }
  }

  ngOnDestroy() { this.clear(); }
}
