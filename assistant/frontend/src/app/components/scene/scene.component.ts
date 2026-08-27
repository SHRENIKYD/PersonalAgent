import { Component, ElementRef, OnDestroy, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SceneService } from '../../services/scene.service';
import type { EchoScene } from '../../scene/echo-scene';

/**
 * Hosts the WebGL canvas that sits behind the entire app.
 *
 * Three.js is imported dynamically rather than at the top of the file, deliberately: a static
 * import would put ~150KB of renderer into the main bundle and delay first paint for every
 * launch, including the ones where the scene is switched off. This way the app draws first
 * and the scene arrives a moment later, which is also the right order visually — the boot
 * sequence is what covers the gap.
 */
@Component({
  selector: 'app-scene',
  standalone: true,
  imports: [CommonModule],
  template: `
    <canvas #canvas class="scene-canvas" aria-hidden="true"></canvas>
    <!--
      The opaque floor between the scene and the UI. Rendered here rather than in the app
      shell so it can never be present without the canvas that needs it — a veil on its own
      would just be a gradient over a flat background.
    -->
    <div class="scene-veil" aria-hidden="true"></div>
  `,
})
export class SceneComponent implements OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private scene: EchoScene | null = null;
  private loading = false;

  constructor(private scenes: SceneService) {
    effect(() => {
      const mode = this.scenes.mode();
      if (!this.scenes.available || mode === 'off') {
        this.teardown();
        this.scenes.loaded.set(true);
        return;
      }
      void this.ensure(mode);
    });
  }

  private async ensure(mode: 'lite' | 'full') {
    if (this.loading) return;

    // A quality change has to rebuild: particle counts and tube segments are baked into
    // geometry at construction, and rebuilding is far simpler than mutating buffers in place.
    this.teardown();

    if (prefersReducedMotion()) {
      this.scenes.loaded.set(true);
      return;
    }

    this.loading = true;
    try {
      const { EchoScene, HIGH, LOW } = await import('../../scene/echo-scene');
      const scene = new EchoScene();
      const ok = scene.init(this.canvasRef.nativeElement, mode === 'full' ? HIGH : LOW);
      if (!ok) {
        this.scenes.unsupported.set(true);
        return;
      }
      this.scene = scene;
      this.wire();
      scene.start();
    } catch {
      // A failed chunk load (offline first launch, cleared cache) must not take the app with
      // it — the scene is decoration, and the app works identically without it.
      this.scenes.unsupported.set(true);
    } finally {
      this.loading = false;
      // Set on every path, success or failure. A boot screen that waits forever on a load
      // that already gave up is worse than no boot screen.
      this.scenes.loaded.set(true);
    }
  }

  private wire() {
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onResize);
    window.addEventListener('pointermove', this.onPointer, { passive: true });
    window.addEventListener('deviceorientation', this.onOrient);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.onScroll();
  }

  private unwire() {
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('pointermove', this.onPointer);
    window.removeEventListener('deviceorientation', this.onOrient);
    document.removeEventListener('visibilitychange', this.onVisibility);
  }

  private onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    this.scene?.setScroll(max > 0 ? window.scrollY / max : 0);
  };

  private onResize = () => this.scene?.resize();

  private onPointer = (e: PointerEvent) => {
    this.scene?.setTilt(
      (e.clientX / window.innerWidth) * 2 - 1,
      (e.clientY / window.innerHeight) * 2 - 1,
    );
  };

  /** Phone tilt drives the same parallax a mouse does, since there is no pointer to move. */
  private onOrient = (e: DeviceOrientationEvent) => {
    if (e.gamma === null || e.beta === null) return;
    this.scene?.setTilt(e.gamma / 45, (e.beta - 45) / 45);
  };

  /**
   * Stop rendering when the tab or app is backgrounded. Without this the loop keeps running
   * behind the lock screen, which on a phone is a battery drain with nothing on screen to
   * show for it.
   */
  private onVisibility = () => {
    if (document.hidden) this.scene?.stop();
    else this.scene?.start();
  };

  private teardown() {
    if (!this.scene) return;
    this.unwire();
    this.scene.dispose();
    this.scene = null;
  }

  ngOnDestroy() {
    this.teardown();
  }
}

function prefersReducedMotion(): boolean {
  return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
