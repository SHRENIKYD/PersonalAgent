import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { ConceptTopic, PrepCategoryKey } from '../../models';

function key(ti: number, ii: number): string {
  return `${ti}:${ii}`;
}

/**
 * Shared shell for CS Fundamentals, System Design, and Web — concept questions with a
 * plain-English explanation each, no brute-force/optimized split (see PrepDsaComponent
 * for that format, which only fits algorithmic problems).
 */
@Component({
  selector: 'app-prep-concept',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="panel">
      <h1 class="page-title">{{ title }}</h1>
      <p class="page-sub">{{ subtitle }}</p>

      <div class="prep-topic" *ngFor="let topic of topics; let ti = index">
        <button class="prep-topic-head" (click)="toggleTopic(ti)">
          <span class="prep-topic-chevron" [class.open]="isTopicOpen(ti)">›</span>
          <span class="prep-topic-name">{{ topic.name }}</span>
          <span class="pill" [class.complete]="progress(ti).done === progress(ti).total && progress(ti).total > 0">
            {{ progress(ti).done }}/{{ progress(ti).total }}
          </span>
        </button>

        <div class="prep-problem-list" *ngIf="isTopicOpen(ti)">
          <div class="prep-problem" *ngFor="let item of topic.items; let ii = index">
            <div class="prep-problem-head" (click)="toggleItem(ti, ii)">
              <input
                type="checkbox"
                [checked]="checked(ti, ii)"
                (click)="$event.stopPropagation()"
                (change)="toggle(ti, ii, $any($event.target).checked)" />
              <span class="prep-problem-name" [class.done]="checked(ti, ii)">{{ item.name }}</span>
              <span class="prep-problem-chevron" [class.open]="isItemOpen(ti, ii)">›</span>
            </div>

            <div class="prep-problem-body" *ngIf="isItemOpen(ti, ii)">
              <div class="explanation">
                <p>{{ item.explanation }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class PrepConceptComponent {
  @Input({ required: true }) category!: PrepCategoryKey;
  @Input({ required: true }) title!: string;
  @Input({ required: true }) subtitle!: string;
  @Input({ required: true }) topics!: ConceptTopic[];

  private openTopics = signal<Set<number>>(new Set());
  private openItems = signal<Set<string>>(new Set());

  constructor(public state: StateService) {}

  progress(ti: number) {
    return this.state.topicProgress(this.category, ti);
  }

  checked(ti: number, ii: number): boolean {
    return !!this.state.prep()[this.category]?.[ti]?.[ii];
  }

  toggle(ti: number, ii: number, value: boolean) {
    this.state.toggleItem(this.category, ti, ii, value);
  }

  isTopicOpen(ti: number): boolean {
    return this.openTopics().has(ti);
  }

  toggleTopic(ti: number) {
    this.openTopics.update(set => {
      const next = new Set(set);
      if (next.has(ti)) next.delete(ti); else next.add(ti);
      return next;
    });
  }

  isItemOpen(ti: number, ii: number): boolean {
    return this.openItems().has(key(ti, ii));
  }

  toggleItem(ti: number, ii: number) {
    const k = key(ti, ii);
    this.openItems.update(set => {
      const next = new Set(set);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  }
}
