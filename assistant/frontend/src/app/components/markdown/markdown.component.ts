import { Component, Input, OnChanges, OnDestroy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Block, Inline, parseMarkdown } from '../../markdown';

/**
 * Renders the parsed blocks with ordinary Angular templates — no innerHTML anywhere, so
 * model output can never introduce an element or attribute this file does not name.
 */
/**
 * How long the reveal takes, regardless of length.
 *
 * Fixed duration rather than a fixed characters-per-second: the text has already arrived, so
 * anything length-proportional would make a long answer wait seconds before it could be
 * read. Speed scales with length instead, and the cost stays under a second either way.
 */
const REVEAL_MS = 900;
const FRAME_MS = 16;

/** Cuts a trailing marker that has not been closed yet. */
const DANGLING = /(\*\*?|__?|`|\[[^\]]*)$/;

@Component({
  selector: 'app-markdown',
  standalone: true,
  imports: [CommonModule],
  host: { '(click)': 'finish()' },
  template: `
    <ng-container *ngFor="let b of blocks()">
      <p    *ngIf="b.kind === 'p'"     class="md-p"><ng-container *ngTemplateOutlet="spans; context:{ $implicit: b.spans }" /></p>
      <h3   *ngIf="b.kind === 'h'"     class="md-h" [class.md-h2]="b.level >= 3"><ng-container *ngTemplateOutlet="spans; context:{ $implicit: b.spans }" /></h3>
      <blockquote *ngIf="b.kind === 'quote'" class="md-quote"><ng-container *ngTemplateOutlet="spans; context:{ $implicit: b.spans }" /></blockquote>
      <pre  *ngIf="b.kind === 'pre'"   class="md-pre"><code>{{ b.text }}</code></pre>

      <ul *ngIf="b.kind === 'ul'" class="md-list">
        <li *ngFor="let it of b.items"><ng-container *ngTemplateOutlet="spans; context:{ $implicit: it }" /></li>
      </ul>
      <ol *ngIf="b.kind === 'ol'" class="md-list">
        <li *ngFor="let it of b.items"><ng-container *ngTemplateOutlet="spans; context:{ $implicit: it }" /></li>
      </ol>
    </ng-container>

    <ng-template #spans let-list>
      <ng-container *ngFor="let s of list">
        <b    *ngIf="s.kind === 'bold'">{{ s.text }}</b>
        <i    *ngIf="s.kind === 'italic'">{{ s.text }}</i>
        <code *ngIf="s.kind === 'code'" class="md-code">{{ s.text }}</code>
        <a    *ngIf="s.kind === 'link'" [href]="s.href" target="_blank" rel="noopener noreferrer">{{ s.text }}</a>
        <ng-container *ngIf="s.kind === 'text'">{{ s.text }}</ng-container>
      </ng-container>
    </ng-template>
  `,
})
export class MarkdownComponent implements OnChanges, OnDestroy {
  private src = signal('');
  private shown = signal(0);
  private timer: ReturnType<typeof setInterval> | null = null;

  @Input({ required: true }) text = '';

  /** Only the newest reply animates; scrollback appears whole. */
  @Input() animate = false;

  /*
   * Driven from ngOnChanges rather than a setter on `text`. Angular assigns inputs in
   * template order, so a setter on `text` runs while `animate` still holds its default —
   * the reveal never started because it always read false. ngOnChanges runs once both are
   * bound.
   */
  ngOnChanges() {
    const next = this.text ?? '';
    if (next === this.src()) return;
    this.src.set(next);
    if (this.animate && !this.reduced()) this.reveal(next);
    else this.shown.set(next.length);
  }

  blocks = computed<Block[]>(() => {
    const full = this.src();
    const n = this.shown();
    if (n >= full.length) return parseMarkdown(full);
    /*
     * Mid-reveal the prefix can end inside a marker — "**bol" would otherwise render as
     * literal asterisks for a frame and then snap into bold, which reads as a glitch. The
     * unclosed marker is trimmed so partial text renders as plain text until it completes.
     */
    return parseMarkdown(full.slice(0, n).replace(DANGLING, ''));
  });

  /** Tap anywhere on the message to stop waiting. */
  finish() {
    this.stop();
    this.shown.set(this.src().length);
  }

  private reveal(text: string) {
    this.stop();
    this.shown.set(0);
    const step = Math.max(1, Math.ceil(text.length / (REVEAL_MS / FRAME_MS)));
    this.timer = setInterval(() => {
      const next = this.shown() + step;
      if (next >= text.length) { this.finish(); return; }
      this.shown.set(next);
    }, FRAME_MS);
  }

  private reduced(): boolean {
    return typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  }

  private stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  ngOnDestroy() { this.stop(); }

  /** Declared so the template's implicit context is typed rather than any. */
  readonly _spanType!: Inline[];
}
