import { Injectable, signal, effect } from '@angular/core';

export type ThemeChoice = 'system' | 'light' | 'dark';

const KEY = 'echo-theme-v1';

/**
 * Which of the two Bloom themes is showing.
 *
 * Three states rather than two, and "system" is the default: most people never open a theme
 * setting, and the right answer for them is whatever their phone is already doing at 6am
 * versus 10pm. Choosing light or dark stamps data-theme on <html>, which the stylesheet
 * treats as an override of prefers-color-scheme in *both* directions — so an explicit light
 * choice survives a dark OS, which a media query alone cannot express.
 *
 * "system" deliberately removes the attribute rather than resolving it to a value here. If
 * it resolved, the app would freeze whichever theme was active at load and stop following
 * the OS when it flips at sunset; leaving the attribute off keeps the CSS in charge, and
 * the CSS updates live.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly choice = signal<ThemeChoice>(read());

  constructor() {
    effect(() => {
      const c = this.choice();
      const root = document.documentElement;
      if (c === 'system') root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', c);
      try {
        localStorage.setItem(KEY, c);
      } catch {
        // Private browsing can refuse writes. The theme still applies for this session;
        // losing the preference is a far smaller failure than taking the app down.
      }
    });
  }

  set(c: ThemeChoice) {
    this.choice.set(c);
  }
}

function read(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}
