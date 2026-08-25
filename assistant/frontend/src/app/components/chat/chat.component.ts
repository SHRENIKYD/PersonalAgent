import { Component, ElementRef, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgentService } from '../../services/agent.service';
import { SettingsService } from '../../services/settings.service';
import { UiService } from '../../services/ui.service';
import { DictationService } from '../../services/dictation.service';
import { WorkoutCard, DietCard } from '../../models';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="panel chat-panel">
      <div class="page-head">
        <div>
          <h1 class="page-title">Assistant</h1>
          <p class="page-sub">
            Ask for anything — it adds tasks, checks them off, keeps notes, and knows
            your training split and diet plan.
          </p>
        </div>
        <button class="ghost-btn clear-btn" (click)="agent.reset()" [disabled]="agent.thinking()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round" class="btn-ico" aria-hidden="true">
            <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
          </svg>
          Clear chat
        </button>
      </div>

      <p *ngIf="!settings.ready()" class="chat-warn">
        No API key is set for direct mode.
        <a (click)="ui.setTab('settings')">Add one on the Settings tab</a> to use the assistant.
      </p>

      <div class="chat-log" #log>
        <p *ngIf="agent.transcript().length === 0" class="chat-empty">
          Try “what's my workout tomorrow?”, “remind me to renew the lease on Friday”, or
          “note that the wifi password is hunter2”.
        </p>

        <ng-container *ngFor="let m of agent.transcript()">

          <!-- you -->
          <div class="bubble-row me" *ngIf="m.kind === 'user'">
            <div class="bubble me">
              <span class="bubble-text">{{ m.text }}</span>
              <span class="bubble-meta">
                {{ m.at | date:'h:mm a' }}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"
                     stroke-linecap="round" stroke-linejoin="round" class="tick" aria-hidden="true">
                  <path d="M1 13l4 4L14 8M10 13l3 3 9-9" />
                </svg>
              </span>
            </div>
          </div>

          <!-- ECHO: card, reply, action, or error -->
          <div class="echo-row" *ngIf="m.kind !== 'user'">
            <div class="echo-head">
              <span class="echo-mark" aria-hidden="true">
                <svg viewBox="0 0 200 200">
                  <g fill="none" stroke="var(--accent-dim)" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="100" cy="100" r="78" stroke-width="9" />
                    <path stroke-width="9" d="M22 100C25 98.7 34.7 90.7 40 92C45.3 93.3 46.3 103.3 52 108C57.7 112.7 58.3 79.7 62 78C65.7 76.3 68.7 122.7 74 128C79.3 133.3 82.3 90 86 86C89.7 82 89.7 96.7 92 104C94.3 111.3 94 44.7 100 42C106 39.3 105.3 116 108 122C110.7 128 112.3 72 116 70C119.7 68 121.3 130.7 126 138C130.7 145.3 132.3 86 136 84C139.7 82 143 108.7 146 112C149 115.3 152.3 93 156 92C159.7 91 163 102 166 104C169 106 175 101.3 178 100" />
                  </g>
                </svg>
              </span>
              <b>ECHO</b>
              <span class="dot">·</span>
              <span class="echo-time">{{ m.at | date:'h:mm a' }}</span>
            </div>

            <!-- workout card -->
            <div class="echo-card" *ngIf="m.kind === 'card' && asWorkout(m.card) as w">
              <h3 class="card-title">
                {{ w.title }}<ng-container *ngIf="w.when"> — {{ w.when }}</ng-container>
              </h3>
              <p class="card-sub" *ngIf="w.muscles.length">{{ w.muscles.join(", ") | titlecase }}</p>

              <ul class="ex-list">
                <li *ngFor="let e of w.exercises">
                  <span class="ex-dot" aria-hidden="true"></span>
                  <span class="ex-name">
                    {{ e.name }}<span class="ex-note" *ngIf="e.note"> ({{ e.note }})</span>
                  </span>
                  <span class="ex-sets">{{ e.sets }}</span>
                </li>
              </ul>

              <div class="core-block" *ngIf="w.core">
                <div class="core-head">
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent-dim)" stroke-width="2"
                       class="core-ico" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" />
                  </svg>
                  <b>Core</b> <span class="ex-note">({{ w.core.focus }})</span>
                </div>
                <ul class="ex-list">
                  <li *ngFor="let e of w.core.exercises">
                    <span class="ex-name">
                      {{ e.name }}<span class="ex-note" *ngIf="e.note"> ({{ e.note }})</span>
                    </span>
                    <span class="ex-sets">{{ e.sets }}</span>
                  </li>
                </ul>
              </div>
            </div>

            <!-- diet card -->
            <div class="echo-card" *ngIf="m.kind === 'card' && asDiet(m.card) as d">
              <h3 class="card-title">{{ d.title }}</h3>
              <p class="card-sub">{{ d.targets }}</p>
              <ul class="ex-list">
                <li *ngFor="let meal of d.meals">
                  <span class="ex-dot" aria-hidden="true"></span>
                  <span class="ex-name">
                    <b>{{ meal.meal }}</b>
                    <span class="ex-note"> {{ meal.food }}</span>
                  </span>
                  <span class="ex-sets">{{ meal.calories }} kcal</span>
                </li>
              </ul>
            </div>

            <div class="echo-body" *ngIf="m.kind === 'assistant'" [class.pending]="m.pending">
              <span *ngIf="m.pending" class="scan-line" aria-hidden="true"></span>
              {{ m.text }}
            </div>

            <div class="echo-action" *ngIf="m.kind === 'action'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"
                   stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              {{ m.text }}
            </div>

            <div class="echo-error" *ngIf="m.kind === 'error'">⚠️ {{ m.text }}</div>
          </div>

        </ng-container>
      </div>

      <div class="composer">
        <textarea
          [(ngModel)]="inputText"
          rows="1"
          placeholder="Ask your assistant…"
          [disabled]="agent.thinking()"
          (keydown.enter)="onEnter($event)"></textarea>

        <button *ngIf="dictation.supported()" class="mic-btn"
                [class.live]="dictation.listening()"
                [disabled]="agent.thinking()"
                (click)="toggleMic()"
                [attr.aria-label]="dictation.listening() ? 'Stop dictation' : 'Dictate'">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="9" y="2" width="6" height="12" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v4" />
          </svg>
        </button>

        <button class="send-btn" [disabled]="agent.thinking() || !inputText.trim()"
                (click)="send()" aria-label="Send">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      </div>

      <p class="chat-hint">
        Enter to send · Shift+Enter for a new line
        <span *ngIf="dictation.error()" class="dict-err"> · {{ dictation.error() }}</span>
      </p>
    </section>
  `,
})
export class ChatComponent {
  inputText = '';
  @ViewChild('log') log?: ElementRef<HTMLElement>;

  constructor(
    public agent: AgentService,
    public settings: SettingsService,
    public ui: UiService,
    public dictation: DictationService
  ) {
    // Follow the conversation as it grows. Reading the signal inside the effect is what
    // subscribes it, so this runs on every transcript change.
    effect(() => {
      this.agent.transcript();
      queueMicrotask(() => {
        const el = this.log?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
      });
    });
  }

  /**
   * Narrowing helpers. `*ngIf="… as w"` needs an expression that yields the typed value,
   * and a discriminated union cannot be narrowed inside a template otherwise.
   */
  asWorkout(c: unknown): WorkoutCard | null {
    return (c as WorkoutCard)?.type === 'workout' ? (c as WorkoutCard) : null;
  }

  asDiet(c: unknown): DietCard | null {
    return (c as DietCard)?.type === 'diet' ? (c as DietCard) : null;
  }

  toggleMic() {
    if (this.dictation.listening()) {
      this.dictation.stop();
      return;
    }
    this.dictation.start(text => {
      // Appended rather than replacing, so dictation can extend something already typed.
      this.inputText = (this.inputText + ' ' + text).trim();
    });
  }

  onEnter(e: Event) {
    const ke = e as KeyboardEvent;
    if (!ke.shiftKey) {
      ke.preventDefault();
      this.send();
    }
  }

  send() {
    const text = this.inputText;
    if (text.trim() === '') return;
    this.inputText = '';
    this.dictation.stop();
    void this.agent.send(text);
  }
}
