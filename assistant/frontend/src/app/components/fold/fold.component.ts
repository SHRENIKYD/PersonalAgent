import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * A collapsible section: a heading you tap, and the same content underneath as before.
 *
 * Settings had grown to eleven sections of full-height cards, so finding the one you wanted
 * meant scrolling past ten you did not. Folding them puts the whole page on one screen and
 * costs one tap to open anything.
 *
 * Content is projected rather than rendered from a config object, so each section keeps its
 * own markup exactly as it was — the point is to change what is visible, not how any of it
 * works. It stays in the DOM when closed, so state inside a section (a half-typed key, a
 * download in progress) survives being folded away.
 */
@Component({
  selector: 'app-fold',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fold" [class.open]="open()">
      <button class="fold-head" (click)="open.set(!open())" [attr.aria-expanded]="open()">
        <span class="prep-topic-chevron" [class.open]="open()">›</span>
        <span class="fold-label">{{ label }}</span>
        <span class="fold-note" *ngIf="note">{{ note }}</span>
      </button>
      <div class="fold-body" [hidden]="!open()">
        <ng-content></ng-content>
      </div>
    </div>
  `,
})
export class FoldComponent {
  @Input({ required: true }) label = '';
  /** A short value shown on the closed row, so the section says something while shut. */
  @Input() note = '';
  @Input() set expanded(value: boolean) {
    this.open.set(value);
  }

  open = signal(false);
}
