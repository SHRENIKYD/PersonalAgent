import { Injectable, signal } from '@angular/core';
import { StorageService } from './storage.service';
import { environment } from '../../environments/environment';

const KEY = 'assistant-scene-v1';

/**
 * Whether the 3D background runs, and how hard.
 *
 * Separate from the scene itself so the toggle survives the canvas being destroyed and
 * rebuilt, and so Settings can reach the preference without pulling Three.js into the main
 * bundle just to render a checkbox.
 *
 * Off outside beta. This is a WebGL context and a render loop in an app whose actual job is
 * logging a set between two working sets, and that trade deserves to be opt-in until it has
 * been lived with on a real phone for a while.
 */
export type SceneMode = 'off' | 'lite' | 'full';

interface SceneSettings {
  mode: SceneMode;
}

@Injectable({ providedIn: 'root' })
export class SceneService {
  /** Beta only — the production app is unchanged until this has proven itself. */
  readonly available = environment.beta;

  /*
   * Lite by default. With the scene confined to the header band, Full's extra particle
   * count and the nav's backdrop blur buy very little that is actually visible, and they
   * are the two things that cost frames on a mid-range phone. Full is one tap away for
   * anyone who wants it.
   */
  mode = signal<SceneMode>('lite');

  /** Set by the scene host when WebGL turns out not to be usable, so Settings can say so
   *  rather than showing a toggle that silently does nothing. */
  unsupported = signal(false);

  /**
   * Flips once the scene has finished loading and compiling — or once it is known that it
   * never will (off, unsupported, reduced motion). The boot sequence waits on this, which is
   * what makes its counter an honest progress readout rather than a fixed-length animation
   * pretending to load something.
   */
  loaded = signal(false);

  constructor(private storage: StorageService) {
    const saved = this.storage.get<SceneSettings>(KEY, { mode: 'lite' });
    this.mode.set(
      saved.mode === 'off' || saved.mode === 'lite' || saved.mode === 'full' ? saved.mode : 'lite'
    );

    // Nothing is going to load, so say so now. The scene host is not even created in these
    // cases, and the boot sequence waits on this signal — without it the boot would sit
    // there until its cap expired every single launch with the scene switched off.
    if (!this.available || this.mode() === 'off') this.loaded.set(true);
  }

  setMode(mode: SceneMode) {
    this.mode.set(mode);
    this.storage.set<SceneSettings>(KEY, { mode });
  }

  /** True when the scene should be drawing at all. */
  active(): boolean {
    return this.available && !this.unsupported() && this.mode() !== 'off';
  }
}
