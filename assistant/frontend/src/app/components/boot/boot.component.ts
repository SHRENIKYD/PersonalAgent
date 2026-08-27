import { Component, EventEmitter, OnDestroy, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VoiceService } from '../../services/voice.service';
import { SceneService } from '../../services/scene.service';

/**
 * The boot sequence.
 *
 * Rebuilt from four lines of fake telemetry into the ASCII disc from the reference: a field
 * of slashes with a counter reading through the middle of it, inside a lit ring.
 *
 * The counter is wired to something real. It advances toward 92% on its own and only
 * completes once SceneService reports the 3D scene has finished loading and compiling, so
 * the number on screen corresponds to work actually happening — the Three.js chunk arriving
 * and its shaders building. That is also why the boot exists at all now: it covers the gap
 * that the scene's dynamic import opens up, rather than being pure decoration in front of an
 * app that was already ready.
 *
 * Still skippable, and still capped, because a loading screen that can outlast the thing it
 * is loading is a bug however good it looks.
 */

/** The disc's character grid. Odd numbers so there is a true centre row for the counter. */
const COLS = 27;
const ROWS = 13;
/** Cells are about twice as tall as wide in a monospace face; squashing Y keeps the disc round. */
const Y_SQUASH = 2.05;
/** Roughly one cell in twenty shows a digit rather than a slash, which is what stops the
 *  field reading as a flat texture. */
const DIGIT_CHANCE = 0.05;

/** Never sit in front of the app longer than this, whatever the scene is doing. */
const MAX_MS = 3600;
/**
 * ...and never less than this. When the scene chunk is already cached the load finishes in
 * milliseconds, and without a floor the boot screen appears and vanishes within a frame or
 * two — which reads as a flicker on launch, not as a sequence. A floor is honest here in a
 * way a fixed duration is not: it only ever pads a load that genuinely was fast.
 */
const MIN_MS = 1100;
/** Where the counter parks while it is genuinely still waiting. */
const SELF_LIMIT = 92;
/**
 * Time constant for the self-driven part of the count, in reciprocal seconds.
 *
 * The counter is computed from the wall clock on each frame rather than accumulated across
 * frames. That distinction is the whole fix: an accumulator — even a delta-time one with the
 * usual clamp against resumed-tab jumps — still runs slow when frames are scarce, and frames
 * get scarce exactly when a device is busy loading. Measured on a software renderer at a
 * couple of frames a second, the accumulating version reached 40% in six seconds and then
 * timed out on a meaningless number. As a function of elapsed time it is right at any frame
 * rate; a low frame rate makes the number update in visible steps, which is honest, rather
 * than making it wrong.
 */
const EASE_PER_SEC = 3.2;
/** How long the final run up to 100 takes once the scene has actually finished. */
const FINISH_MS = 420;

@Component({
  selector: 'app-boot',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="boot-overlay" (click)="skip()">
      <div class="boot-disc" aria-hidden="true">
        <div class="boot-ring"></div>
        <pre class="boot-field">{{ field() }}</pre>
        <div class="boot-count">{{ label() }}</div>
      </div>
      <div class="boot-status" role="status">{{ status() }}</div>
      <button class="ghost-btn boot-skip" (click)="skip()">Skip</button>
    </div>
  `,
})
export class BootComponent implements OnDestroy {
  @Output() done = new EventEmitter<void>();

  field = signal('');
  label = signal('/0');
  status = signal('INITIALIZING ECHO CORE');

  private pct = 0;
  private frame = 0;
  private started = performance.now();
  private cells: string[][] = [];

  /**
   * A wall-clock backstop for the cap.
   *
   * The cap is checked inside the animation loop, which is fine right up until the loop
   * stops running: a browser throttles requestAnimationFrame hard when the page is not
   * compositing — launching into a backgrounded tab, or a device under load. Measured five
   * callbacks in two and a half seconds in a headless browser. Without this, that is a boot
   * screen wedged in front of a working app waiting for a frame that is not coming.
   */
  private failsafe = setTimeout(() => this.skip(), MAX_MS + 200);

  constructor(private voice: VoiceService, private scenes: SceneService) {
    this.buildCells();
    this.frame = requestAnimationFrame(this.tick);

    // Fires before any user gesture, which mobile browsers refuse to play audio for —
    // Chrome on Android included. VoiceService holds the greeting when the page is not yet
    // unlocked and replays it on the first tap, so this call is a request rather than a
    // guarantee.
    this.voice.greet();
  }

  /**
   * Lays out the disc once.
   *
   * The characters are fixed at construction rather than re-randomised every frame: a field
   * that reshuffles at 60fps is visual noise, whereas a stable field with a counter moving
   * through it reads as a readout. Only the counter's own row is rewritten per frame.
   */
  private buildCells() {
    const cx = (COLS - 1) / 2;
    const cy = (ROWS - 1) / 2;
    const r = COLS / 2;

    for (let y = 0; y < ROWS; y++) {
      const row: string[] = [];
      for (let x = 0; x < COLS; x++) {
        const dx = x - cx;
        const dy = (y - cy) * Y_SQUASH;
        // Outside the disc is a space, which is what gives the field its circular edge.
        if (Math.hypot(dx, dy) > r) { row.push(' '); continue; }
        row.push(Math.random() < DIGIT_CHANCE ? String(Math.floor(Math.random() * 10)) : '/');
      }
      this.cells.push(row);
    }
  }

  /** When the scene reported ready, or null while still waiting. */
  private loadedAt: number | null = null;

  private tick = () => {
    const now = performance.now();
    const elapsed = now - this.started;

    if (this.loadedAt === null && this.scenes.loaded() && elapsed >= MIN_MS * 0.55) {
      this.loadedAt = now;
    }

    this.pct = this.progress(elapsed, now);

    if (this.pct > 40) this.status.set('BUILDING SCENE');
    if (this.pct > 80) this.status.set('CALIBRATING TELEMETRY');

    this.render();

    if ((this.pct >= 99.2 && elapsed >= MIN_MS) || elapsed > MAX_MS) {
      this.status.set('ECHO ONLINE');
      this.skip();
      return;
    }
    this.frame = requestAnimationFrame(this.tick);
  };

  /**
   * The counter, as a pure function of the clock.
   *
   * Two phases. Before the scene reports ready it eases asymptotically toward SELF_LIMIT, so
   * it slows as it climbs and never reaches a number that would imply the load had finished.
   * Once ready it runs from wherever it had got to up to 100 over a fixed short interval —
   * picked up from the same curve, so there is no jump at the handover.
   */
  private progress(elapsed: number, now: number): number {
    const selfAt = (ms: number) => SELF_LIMIT * (1 - Math.exp(-EASE_PER_SEC * (ms / 1000)));
    if (this.loadedAt === null) return selfAt(elapsed);

    const from = selfAt(this.loadedAt - this.started);
    const k = Math.min(1, (now - this.loadedAt) / FINISH_MS);
    // Cubic ease-out on the final run, so it arrives rather than slamming into 100.
    return from + (100 - from) * (1 - Math.pow(1 - k, 3));
  }

  /** Draws the disc with the counter punched through its middle row. */
  private render() {
    const n = Math.min(100, Math.round(this.pct));
    const text = `/${n}`;
    this.label.set(text);

    const mid = Math.floor(ROWS / 2);
    const start = Math.floor((COLS - text.length) / 2);

    const out: string[] = [];
    for (let y = 0; y < ROWS; y++) {
      if (y !== mid) { out.push(this.cells[y].join('')); continue; }
      const row = this.cells[y].slice();
      for (let i = 0; i < text.length; i++) row[start + i] = text[i];
      out.push(row.join(''));
    }
    this.field.set(out.join('\n'));
  }

  skip() {
    cancelAnimationFrame(this.frame);
    clearTimeout(this.failsafe);
    this.frame = 0;
    this.done.emit();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.frame);
    clearTimeout(this.failsafe);
  }
}
