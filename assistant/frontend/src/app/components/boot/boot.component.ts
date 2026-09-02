import { Component, EventEmitter, Output, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VoiceService } from '../../services/voice.service';
import { StateService } from '../../services/state.service';
import { launchLines } from '../../launch-lines';

/** Characters per second. Fast enough not to be a wait, slow enough to read as typing. */
const CPS = 34;
/** A pause between lines, in characters' worth of time. */
const GAP = 8;
/** Hard ceiling. Whatever happens, the app is usable by then. */
const MAX_MS = 4200;

/**
 * The launch screen: the app opens by telling you what it remembers about you.
 *
 * This replaces an ASCII "INITIALIZING ECHO CORE..." boot sequence, which was decoration
 * pretending to be work — nothing was loading, and it cost two seconds of every launch to
 * say so. These lines are read out of the real log, so the same two seconds carry your last
 * session, your weight and what is overdue.
 *
 * Timing is computed from the wall clock on every frame rather than accumulated per frame.
 * requestAnimationFrame is throttled hard on a backgrounded tab and on slow devices, and an
 * accumulating counter turns that into a launch screen that takes fifteen seconds; reading
 * the clock means a dropped frame shows the right text late instead of the wrong text on
 * time. The setTimeout is the backstop for the case where rAF stops firing altogether.
 *
 * sessionStorage (not localStorage) is deliberate, and lives in AppComponent: this should
 * replay on a fresh session, not once ever per browser.
 */
@Component({
  selector: 'app-boot',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="launch" (click)="skip()">
      <div class="launch-lines" aria-live="polite">
        <div class="launch-line" *ngFor="let line of shown()">
          {{ line.text }}<span class="launch-caret" *ngIf="!line.complete">&#9608;</span>
        </div>
      </div>
      <div class="launch-foot" [class.ready]="settled()">Ready when you are.</div>
      <button class="ghost-btn launch-skip" (click)="skip($event)">Skip</button>
    </div>
  `,
})
export class BootComponent implements OnDestroy {
  @Output() done = new EventEmitter<void>();

  private readonly lines: string[];
  readonly shown = signal<{ text: string; complete: boolean }[]>([]);
  readonly settled = signal(false);

  private raf = 0;
  private timer: ReturnType<typeof setTimeout>;
  private finished = false;

  constructor(private voice: VoiceService, state: StateService) {
    this.lines = launchLines({
      setLog: state.setLog(),
      weightLog: state.weightLog(),
      tasks: state.tasks(),
      today: new Date().toISOString().slice(0, 10),
    });

    // The clock starts on the FIRST FRAME, not here.
    //
    // Construction happens during bootstrap, which can be seconds before anything is
    // painted — a render-blocking stylesheet that is slow to resolve is enough. Anchoring
    // to `performance.now()` at construction means that whole gap is charged against the
    // animation, and the screen finishes typing before it is ever visible: measured at 16ms
    // on screen where it should have been 3.4 seconds. requestAnimationFrame does not fire
    // until the page can actually draw, so its first timestamp is the honest starting line.
    let start = 0;
    const total = this.lines.reduce((n, l) => n + l.length + GAP, 0);

    const step = (now: number) => {
      if (!start) {
        start = now;
        // Armed here too, for the same reason: a ceiling measured from construction could
        // expire before the first character was drawn.
        this.timer = setTimeout(() => this.skip(), MAX_MS);
      }
      const chars = ((now - start) / 1000) * CPS;
      let used = 0;
      const out = this.lines.map(line => {
        const take = Math.max(0, Math.min(line.length, Math.floor(chars - used)));
        used += line.length + GAP;
        return { text: line.slice(0, take), complete: take >= line.length };
      });
      this.shown.set(out.filter(l => l.text.length > 0));
      if (chars >= total) {
        this.settled.set(true);
        // A beat on the finished screen, so the last line is readable rather than a flash.
        this.timer = setTimeout(() => this.skip(), 700);
        return;
      }
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);

    // Belt and braces for the case the first frame never comes at all (launched into a
    // backgrounded tab): rAF is then never called, so nothing above would ever end this.
    // Generous, because it must not pre-empt a slow but working launch.
    this.timer = setTimeout(() => this.skip(), MAX_MS * 3);

    // Fires before any user gesture, which mobile browsers refuse to play audio for.
    // VoiceService holds the greeting when the page is not yet unlocked and replays it on
    // the first tap, so this is a request rather than a guarantee.
    this.voice.greet();
  }

  skip(event?: Event) {
    event?.stopPropagation();
    if (this.finished) return;   // both the timer and a tap can arrive; emit once
    this.finished = true;
    cancelAnimationFrame(this.raf);
    clearTimeout(this.timer);
    this.done.emit();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.timer);
  }
}
