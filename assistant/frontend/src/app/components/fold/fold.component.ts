import { Component, Injectable, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Which fold is open, shared by all of them.
 *
 * One signal rather than one per fold, because "open" is a property of the page, not of the
 * section: opening one has to close whatever was open, and a fold cannot do that while it
 * only knows about itself. Ids are handed out on construction, so a fold's identity survives
 * being re-rendered without needing a name that could collide across pages.
 */
@Injectable({ providedIn: 'root' })
export class FoldGroupService {
  readonly openId = signal<number | null>(null);
  private next = 0;

  claim(): number {
    return ++this.next;
  }
}

/**
 * A collapsible section: a heading you tap, and the same content underneath as before.
 *
 * Settings had grown to eleven sections of full-height cards and Workout to eight, so
 * finding the one you wanted meant scrolling past the rest. Folding them puts a page on one
 * screen and costs one tap to open anything.
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
      <button class="fold-head" (click)="toggle()" [attr.aria-expanded]="open()">
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
    if (value) this.group.openId.set(this.id);
  }

  private readonly id: number;

  open = computed(() => this.group.openId() === this.id);

  constructor(private group: FoldGroupService) {
    this.id = group.claim();
  }

  toggle() {
    this.group.openId.set(this.open() ? null : this.id);
  }
}
