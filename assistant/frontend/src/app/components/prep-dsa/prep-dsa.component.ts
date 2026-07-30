import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { DSA_TOPICS } from '../../prep-dsa-data';

/** Composite key for tracking expand/collapse state — this is pure UI state, not persisted. */
function key(ti: number, pi: number): string {
  return `${ti}:${pi}`;
}

@Component({
  selector: 'app-prep-dsa',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="panel">
      <h1 class="page-title">Data Structures & Algorithms</h1>
      <p class="page-sub">
        {{ topics.length }} topics, {{ totalProblems }} problems. Each one has a brute-force
        approach, the optimized approach with its complexity, and a plain-English explanation
        of why the optimization works.
      </p>

      <div class="prep-topic" *ngFor="let topic of topics; let ti = index">
        <button class="prep-topic-head" (click)="toggleTopic(ti)">
          <span class="prep-topic-chevron" [class.open]="isTopicOpen(ti)">›</span>
          <span class="prep-topic-name">{{ topic.name }}</span>
          <span class="pill" [class.complete]="progress(ti).done === progress(ti).total && progress(ti).total > 0">
            {{ progress(ti).done }}/{{ progress(ti).total }}
          </span>
        </button>

        <div class="prep-problem-list" *ngIf="isTopicOpen(ti)">
          <div class="prep-problem" *ngFor="let p of topic.problems; let pi = index">
            <div class="prep-problem-head" (click)="toggleProblem(ti, pi)">
              <input
                type="checkbox"
                [checked]="checked(ti, pi)"
                (click)="$event.stopPropagation()"
                (change)="toggle(ti, pi, $any($event.target).checked)" />
              <span class="prep-problem-name" [class.done]="checked(ti, pi)">{{ p.name }}</span>
              <span class="prep-problem-chevron" [class.open]="isProblemOpen(ti, pi)">›</span>
            </div>

            <div class="prep-problem-body" *ngIf="isProblemOpen(ti, pi)">
              <div class="approach">
                <div class="approach-label">Brute force</div>
                <p>{{ p.bruteForce.description }}</p>
                <div class="complexity">
                  <span>Time <code>{{ p.bruteForce.time }}</code></span>
                  <span>Space <code>{{ p.bruteForce.space }}</code></span>
                </div>
              </div>
              <div class="approach optimized">
                <div class="approach-label">Optimized</div>
                <p>{{ p.optimized.description }}</p>
                <div class="complexity">
                  <span>Time <code>{{ p.optimized.time }}</code></span>
                  <span>Space <code>{{ p.optimized.space }}</code></span>
                </div>
                <pre class="note-code" *ngIf="p.optimized.pseudocode">{{ p.optimized.pseudocode }}</pre>
              </div>
              <div class="explanation">
                <div class="approach-label">Why it works</div>
                <p>{{ p.explanation }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class PrepDsaComponent {
  topics = DSA_TOPICS;
  totalProblems = DSA_TOPICS.reduce((sum, t) => sum + t.problems.length, 0);

  private openTopics = signal<Set<number>>(new Set());
  private openProblems = signal<Set<string>>(new Set());

  constructor(public state: StateService) {}

  progress(ti: number) {
    return this.state.topicProgress('dsa', ti);
  }

  checked(ti: number, pi: number): boolean {
    return !!this.state.prep()['dsa']?.[ti]?.[pi];
  }

  toggle(ti: number, pi: number, value: boolean) {
    this.state.toggleItem('dsa', ti, pi, value);
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

  isProblemOpen(ti: number, pi: number): boolean {
    return this.openProblems().has(key(ti, pi));
  }

  toggleProblem(ti: number, pi: number) {
    const k = key(ti, pi);
    this.openProblems.update(set => {
      const next = new Set(set);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  }
}
