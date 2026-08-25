import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Block, Inline, parseMarkdown } from '../../markdown';

/**
 * Renders the parsed blocks with ordinary Angular templates — no innerHTML anywhere, so
 * model output can never introduce an element or attribute this file does not name.
 */
@Component({
  selector: 'app-markdown',
  standalone: true,
  imports: [CommonModule],
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
export class MarkdownComponent {
  private src = signal('');

  @Input({ required: true })
  set text(v: string) { this.src.set(v ?? ''); }

  blocks = computed<Block[]>(() => parseMarkdown(this.src()));

  /** Declared so the template's implicit context is typed rather than any. */
  readonly _spanType!: Inline[];
}
