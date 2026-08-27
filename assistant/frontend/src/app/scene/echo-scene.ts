import {
  AdditiveBlending,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  Float32BufferAttribute,
  Fog,
  Mesh,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  Points,
  PointsMaterial,
  Scene,
  TubeGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';

/**
 * The 3D scene that sits behind the whole app.
 *
 * This is deliberately not a port of the reference site's spine. ECHO's mark is an ECG, so
 * the object the camera travels down is a heartbeat: a tube swept along a curve whose X is
 * the waveform — flat runs, then a sharp spike per beat — extruded into depth. Copying
 * someone else's vertebrae would have been both derivative and meaningless here; a trace you
 * fly down is the same idea expressed in this app's own language.
 *
 * Written as a plain class rather than an Angular service on purpose: it owns a render loop
 * and a GPU context, has nothing to do with change detection, and is far easier to reason
 * about (and to tear down) when it is not entangled with the injector.
 *
 * Everything is procedural. There are no textures, models or HDRIs to fetch, so the scene
 * costs one shader compile and no network at all — which matters for an app that has to open
 * instantly in a gym with bad signal.
 */

/** How many beats the trace runs for. Each is one screenful-ish of travel. */
const BEATS = 14;
/** Points sampled per beat when building the curve. More is smoother and costs geometry. */
const PER_BEAT = 26;
/** World units the camera travels per beat. */
const BEAT_SPAN = 9;

const EMBER = new Color('#ff6b1a');
const VIOLET = new Color('#7b5cff');
const DEEP = new Color('#05060a');

/** Clamped because a 3x-DPR phone renders nine times the pixels for no visible gain. */
const MAX_DPR = 2;

export interface SceneQuality {
  /** Particle count. The first thing to cut on a slow device. */
  motes: number;
  /** Radial segments on the trace tube. */
  tubeSides: number;
  dpr: number;
}

export const HIGH: SceneQuality = { motes: 2600, tubeSides: 14, dpr: MAX_DPR };
export const LOW: SceneQuality = { motes: 700, tubeSides: 7, dpr: 1.25 };

export class EchoScene {
  private renderer!: WebGLRenderer;
  private scene = new Scene();
  private camera!: PerspectiveCamera;
  private curve!: CatmullRomCurve3;
  private frame = 0;
  private running = false;

  /** 0..1 down the page. Written from outside; read on the next frame. */
  scroll = 0;
  /** Smoothed toward `scroll`, so a jumpy scroll still moves the camera on a curve. */
  private eased = 0;
  /** Pointer/tilt parallax, -1..1 on each axis. */
  private tiltX = 0;
  private tiltY = 0;
  private targetTiltX = 0;
  private targetTiltY = 0;

  private disposables: { dispose(): void }[] = [];

  /**
   * Returns false when WebGL is unavailable — an old WebView, a blocked context, or a
   * browser that has hit its context limit across tabs. The caller leaves the DOM alone and
   * the app renders exactly as it does today, which is the correct outcome rather than a
   * blank canvas over everything.
   */
  init(canvas: HTMLCanvasElement, quality: SceneQuality): boolean {
    try {
      this.renderer = new WebGLRenderer({
        canvas,
        antialias: quality.dpr < 2,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      return false;
    }
    if (!this.renderer.getContext()) return false;

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.dpr));
    this.renderer.setClearColor(DEEP, 1);

    this.camera = new PerspectiveCamera(58, 1, 0.1, 260);

    // Fog is what actually sells the depth: without it the far end of the trace stays as
    // bright as the near end and the whole thing reads flat.
    this.scene.fog = new Fog(DEEP.getHex(), 10, 62);

    this.buildTrace(quality.tubeSides);
    this.buildMotes(quality.motes);
    this.buildLighting();

    this.resize();
    return true;
  }

  /**
   * The heartbeat the camera travels down.
   *
   * The waveform is built the same way the header's SVG is — flat baseline, a small P bump,
   * the sharp QRS spike, a rounder T — so the 3D object and the 2D mark are recognisably the
   * same shape. Z wanders slightly per beat so the trace curves away rather than running
   * down a perfectly straight corridor, which is what makes the camera move feel like flight
   * instead of a lift.
   */
  private buildTrace(sides: number) {
    const pts: Vector3[] = [];
    for (let b = 0; b < BEATS; b++) {
      for (let i = 0; i < PER_BEAT; i++) {
        const t = i / PER_BEAT;
        pts.push(new Vector3(
          waveform(t) * 3.4,
          -(b * BEAT_SPAN + t * BEAT_SPAN),
          Math.sin((b + t) * 0.7) * 2.6,
        ));
      }
    }
    this.curve = new CatmullRomCurve3(pts);

    const geo = new TubeGeometry(this.curve, BEATS * PER_BEAT, 0.2, sides, false);
    // Iridescence is what gives the reference its oil-slick sheen. MeshPhysicalMaterial does
    // it in one property, and unlike transmission it costs almost nothing on mobile.
    const mat = new MeshPhysicalMaterial({
      color: new Color('#1a1420'),
      metalness: 0.9,
      roughness: 0.22,
      iridescence: 1,
      iridescenceIOR: 1.9,
      iridescenceThicknessRange: [120, 620],
      // Restrained on purpose. Turned up far enough to read clearly through the glass, the
      // trace became a floodlight behind the panels and the text on top lost its contrast —
      // an unreadable set log is a real cost, a dimmer background is not.
      emissive: EMBER.clone().multiplyScalar(0.2),
    });
    this.scene.add(new Mesh(geo, mat));
    this.disposables.push(geo, mat);
  }

  /**
   * The drifting point cloud.
   *
   * Scattered in a cylinder around the trace rather than a box, so density stays even from
   * the camera's point of view all the way down instead of thinning at the corners. Colour
   * is interpolated per-point between ember and violet, which is cheaper and looks better
   * than two separate systems.
   */
  private buildMotes(count: number) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const span = BEATS * BEAT_SPAN;
    const c = new Color();

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      // sqrt keeps the distribution even across the disc; without it everything crowds the axis.
      const radius = 2 + Math.sqrt(Math.random()) * 17;
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = -Math.random() * span;
      pos[i * 3 + 2] = Math.sin(angle) * radius;

      c.copy(EMBER).lerp(VIOLET, Math.random());
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new Float32BufferAttribute(col, 3));

    const mat = new PointsMaterial({
      size: 0.17,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      // Additive so overlapping motes bloom into each other instead of stacking into flat
      // opaque dots. Depth-write off for the same reason.
      blending: AdditiveBlending,
      depthWrite: false,
      fog: true,
    });

    this.scene.add(new Points(geo, mat));
    this.disposables.push(geo, mat);
  }

  /**
   * Lighting, without an HDRI.
   *
   * Iridescence needs an environment to reflect or it reads as flat plastic, and shipping an
   * HDR file for a phone app is not worth the megabytes. PMREM over a two-colour gradient
   * gives the material something to catch at a cost of one render at startup.
   */
  private buildLighting() {
    const pmrem = new PMREMGenerator(this.renderer);
    const env = new Scene();
    env.background = new Color('#141020');
    const target = pmrem.fromScene(env, 0.04);
    this.scene.environment = target.texture;
    this.disposables.push(target, pmrem);
  }

  setScroll(progress: number) {
    this.scroll = clamp01(progress);
  }

  setTilt(x: number, y: number) {
    this.targetTiltX = clamp(x, -1, 1);
    this.targetTiltY = clamp(y, -1, 1);
  }

  resize() {
    if (!this.renderer) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  start() {
    if (this.running || !this.renderer) return;
    this.running = true;
    this.frame = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  private tick = (now: number) => {
    if (!this.running) return;
    this.frame = requestAnimationFrame(this.tick);

    // Ease toward the real scroll rather than snapping to it. This is the difference
    // between the camera feeling like it has mass and it feeling glued to the scrollbar.
    this.eased += (this.scroll - this.eased) * 0.07;
    this.tiltX += (this.targetTiltX - this.tiltX) * 0.05;
    this.tiltY += (this.targetTiltY - this.tiltY) * 0.05;

    const t = now * 0.001;
    // Never quite reaches the end of the curve, so there is always trace ahead of the camera.
    const along = this.eased * 0.86;
    const eye = this.curve.getPointAt(along);
    const ahead = this.curve.getPointAt(Math.min(0.999, along + 0.045));

    // Offset off the trace so it passes beside the camera rather than through it, plus a
    // slow idle drift so the scene is alive even when nobody is scrolling.
    this.camera.position.set(
      eye.x + 3.4 + this.tiltX * 1.6 + Math.sin(t * 0.21) * 0.5,
      eye.y + 1.1 + this.tiltY * 1.1,
      eye.z + 6.4 + Math.cos(t * 0.17) * 0.5,
    );
    this.camera.lookAt(ahead.x, ahead.y - 0.6, ahead.z);
    // A slow roll, tied to depth rather than to the clock, so scrolling back up unwinds it.
    this.camera.rotation.z = Math.sin(this.eased * 5.2) * 0.06;

    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.stop();
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
    this.scene.clear();
    this.renderer?.dispose();
    // Frees the GPU context outright. Browsers cap how many a page may hold, and leaking one
    // per navigation eventually kills every canvas on the page.
    this.renderer?.forceContextLoss();
  }
}

/**
 * One beat, as a function of 0..1 through the cycle.
 *
 * Straight segments joined at corners, matching the header mark: the flat stretches are what
 * make the spike read as a spike. A smooth periodic function here would give a wave, which
 * is precisely the thing that was wrong with the first version of the 2D trace.
 */
function waveform(t: number): number {
  if (t < 0.30) return 0;
  if (t < 0.38) return ramp(t, 0.30, 0.38) * 0.18;            // P up
  if (t < 0.44) return 0.18 - ramp(t, 0.38, 0.44) * 0.18;      // P down
  if (t < 0.50) return -ramp(t, 0.44, 0.50) * 0.22;            // Q
  if (t < 0.56) return -0.22 + ramp(t, 0.50, 0.56) * 1.22;     // R, the spike
  if (t < 0.62) return 1.0 - ramp(t, 0.56, 0.62) * 1.34;       // S
  if (t < 0.70) return -0.34 + ramp(t, 0.62, 0.70) * 0.34;     // back to baseline
  if (t < 0.80) return ramp(t, 0.70, 0.80) * 0.3;              // T up
  if (t < 0.90) return 0.3 - ramp(t, 0.80, 0.90) * 0.3;        // T down
  return 0;
}

function ramp(t: number, a: number, b: number): number {
  return (t - a) / (b - a);
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function clamp01(v: number): number {
  return clamp(v, 0, 1);
}
