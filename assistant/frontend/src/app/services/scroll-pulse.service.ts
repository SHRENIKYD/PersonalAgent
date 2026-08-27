import { Injectable } from '@angular/core';

/**
 * Ties the header's ECG trace to how fast the page is being scrolled.
 *
 * The reveals elsewhere are pure CSS — `animation-timeline: view()` needs no JavaScript at
 * all. This one does, because there is no CSS timeline for scroll *velocity*: `scroll()`
 * exposes position, not speed, and speed is the whole point. A fling should make the
 * heartbeat surge; a slow drag should barely move it.
 *
 * Everything it writes goes into two custom properties on <html>, so the actual animation
 * still runs on the compositor and this only has to nudge a number.
 */

/** Resting duration for one tile of travel — matches the CSS default. */
const SLOW_S = 9;
/** Duration under a hard fling. Below about a second the trace blurs into a smear. */
const FAST_S = 1.2;
/**
 * Pixels per second that counts as "flat out". A hard flick on a phone runs several
 * thousand px/s; capping well below that means an ordinary scroll still registers instead
 * of only the most violent ones doing anything.
 */
const FULL_SPEED = 2600;
/**
 * How fast the effect decays once scrolling stops, per frame at 60fps. Without a decay the
 * trace would snap back to resting the instant a finger lifts, which reads as a glitch
 * rather than as momentum bleeding off.
 */
const DECAY = 0.94;

@Injectable({ providedIn: 'root' })
export class ScrollPulseService {
  private lastY = 0;
  private lastT = 0;
  /** 0 = at rest, 1 = flat out. Smoothed, not the raw per-event reading. */
  private level = 0;
  private frame = 0;
  private started = false;

  start() {
    if (this.started || typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    this.started = true;

    this.lastY = window.scrollY;
    this.lastT = performance.now();

    // Passive, because this never calls preventDefault and a non-passive scroll listener
    // is enough on its own to make a page feel heavy on touch.
    window.addEventListener('scroll', this.onScroll, { passive: true });
  }

  stop() {
    if (!this.started) return;
    this.started = false;
    window.removeEventListener('scroll', this.onScroll);
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  private onScroll = () => {
    const now = performance.now();
    const dt = now - this.lastT;
    // Two scroll events in the same millisecond give a divide-by-zero-ish spike; skip them
    // and let the next one carry the distance.
    if (dt >= 8) {
      const speed = (Math.abs(window.scrollY - this.lastY) / dt) * 1000;
      const hit = Math.min(1, speed / FULL_SPEED);
      // Rise fast, fall slow: catching a fling matters more than tracking a slow drag.
      this.level = Math.max(this.level, hit);
      this.lastY = window.scrollY;
      this.lastT = now;
    }
    if (!this.frame) this.frame = requestAnimationFrame(this.tick);
  };

  private tick = () => {
    this.level *= DECAY;
    if (this.level < 0.01) {
      this.level = 0;
      this.frame = 0;
      this.write();
      return;
    }
    this.write();
    this.frame = requestAnimationFrame(this.tick);
  };

  private write() {
    // Eased so the first bit of movement is felt — a linear map spends most of its range
    // on speeds a thumb never reaches.
    const eased = Math.pow(this.level, 0.6);
    const dur = SLOW_S + (FAST_S - SLOW_S) * eased;
    const root = document.documentElement.style;
    root.setProperty('--trace-dur', `${dur.toFixed(2)}s`);
    root.setProperty('--trace-lift', eased.toFixed(3));
  }
}
