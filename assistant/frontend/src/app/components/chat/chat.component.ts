import { Component, ElementRef, ViewChild, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgentService } from '../../services/agent.service';
import { SettingsService } from '../../services/settings.service';
import { UiService } from '../../services/ui.service';
import { MarkdownComponent } from '../markdown/markdown.component';
import { WorkoutCard, DietCard, DisplayEntry } from '../../models';

/** One bubble's worth of transcript: a user message, or a run of ECHO entries. */
interface Group {
  kind: 'user' | 'echo';
  at: number;
  entries: DisplayEntry[];
}

/** Tappable openers for the empty chat. The first three show; More reveals the rest. */
const OPENERS: { label: string; prompt: string }[] = [
  { label: 'My plan today', prompt: "What's my plan today?" },
  { label: 'Workout plan', prompt: "What's my workout today?" },
  { label: 'Nutrition', prompt: 'What should I eat today to hit my macros?' },
  { label: 'Add a task', prompt: 'Add a task: ' },
  { label: 'Take a note', prompt: 'Note that ' },
  { label: 'How am I doing?', prompt: 'How am I doing on my goals this month?' },
];

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownComponent],
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


      <p *ngIf="!agent.ready()" class="chat-warn">
        No API key is set for direct mode.
        <a (click)="ui.setTab('settings')">Add one on the Settings tab</a> to use the assistant.
      </p>

      <div class="chat-log" #log>

        <!--
          Empty state. A greeting in the assistant's own shape, so the first thing on screen
          shows what a reply looks like, and openers you can tap — the examples this replaced
          were the same advice in a form you could not act on.
        -->
        <div class="echo-row" *ngIf="agent.transcript().length === 0">
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
            <span class="echo-time">{{ now | date:'h:mm a' }}</span>
          </div>

          <div class="echo-bubble"><span class="echo-body">Hi — what do you need?</span></div>

          <div class="opener-row">
            <button class="opener" *ngFor="let o of openers()"
                    [disabled]="agent.thinking()" (click)="ask(o.prompt)">
              <span class="opener-arrow" aria-hidden="true">&#8594;</span>
              {{ o.label }}
            </button>
            <button class="opener" *ngIf="!showAllOpeners()" (click)="showAllOpeners.set(true)">
              <span class="opener-arrow" aria-hidden="true">&#8230;</span>
              More
            </button>
          </div>
        </div>

        <ng-container *ngFor="let g of groups(); let gi = index; trackBy: trackGroup">

          <!-- you -->
          <div class="bubble-row me" *ngIf="g.kind === 'user'">
            <div class="bubble me">
              <span class="bubble-text">{{ g.entries[0].text }}</span>
              <span class="bubble-meta">
                {{ g.at | date:'h:mm a' }}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"
                     stroke-linecap="round" stroke-linejoin="round" class="tick" aria-hidden="true">
                  <path d="M1 13l4 4L14 8M10 13l3 3 9-9" />
                </svg>
              </span>
            </div>
          </div>

          <!--
            One header for a whole run of ECHO entries. A single answer is often a card plus
            a sentence of judgement on top of it; giving each its own name and timestamp made
            one reply look like two.
          -->
          <div class="echo-row" *ngIf="g.kind === 'echo'">
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
              <span class="echo-time">{{ g.at | date:'h:mm a' }}</span>
            </div>

            <ng-container *ngFor="let m of g.entries; let mi = index; trackBy: trackEntry">

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
                <span *ngIf="m.pending">{{ m.text }}</span>
                <app-markdown *ngIf="!m.pending" [text]="m.text"
                              [animate]="isNewest(gi, mi)" />
              </div>

              <div class="echo-action" *ngIf="m.kind === 'action'">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"
                     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                {{ m.text }}
              </div>

              <div class="echo-error" *ngIf="m.kind === 'error'">⚠️ {{ m.text }}</div>
            </ng-container>
          </div>

        </ng-container>
      </div>

      <div class="composer">
        <!--
          Deliberately not disabled while thinking. Disabling a focused element drops focus,
          which un-hides the bottom bar and shifts the composer 87px mid-conversation; and
          being able to draft the next message while a reply is in flight is worth more
          than the guard. agent.send already refuses to
          start a second turn.
        -->
        <textarea
          #composerInput
          [(ngModel)]="inputText"
          rows="1"
          placeholder="Ask your assistant…"
          (focus)="ui.composerFocused.set(true)"
          (blur)="ui.composerFocused.set(false)"
          (keydown.enter)="onEnter($event)"></textarea>

        <button class="send-btn" [disabled]="agent.thinking() || !inputText.trim()"
                (pointerdown)="keepFocus($event)"
                (mousedown)="keepFocus($event)"
                (click)="send()" aria-label="Send">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      </div>

      <p class="chat-hint">
        Enter to send · Shift+Enter for a new line
      </p>
    </section>
  `,
})
export class ChatComponent {
  inputText = '';

  /** Stamped once at construction — the greeting is not a real message with a real time. */
  now = new Date();

  showAllOpeners = signal(false);

  openers = computed(() => (this.showAllOpeners() ? OPENERS : OPENERS.slice(0, 3)));

  /**
   * An opener ending in a space is the start of a sentence rather than a whole question, so
   * it goes into the composer for you to finish instead of being sent as-is.
   */
  /**
   * Stops a composer button taking focus off the input, which would reflow the composer.
   *
   * Both events, not just pointerdown: preventing pointerdown does not suppress the
   * compatibility mousedown that follows, and mousedown is what actually moves focus.
   */
  keepFocus(event: Event) {
    event.preventDefault();
  }

  ask(prompt: string) {
    if (prompt.endsWith(' ')) {
      this.inputText = prompt;
      this.focusComposer();
      return;
    }
    this.inputText = prompt;
    this.send();
  }

  /**
   * Consecutive ECHO entries collapse into one group. A single answer is frequently a card
   * plus a line of judgement on top of it, and rendering each with its own name and
   * timestamp made one reply read as two separate ones.
   */
  groups = computed<Group[]>(() => {
    const out: Group[] = [];
    for (const m of this.agent.transcript()) {
      const kind: Group['kind'] = m.kind === 'user' ? 'user' : 'echo';
      const last = out[out.length - 1];
      // Only ECHO runs merge — two user messages in a row are genuinely two messages.
      if (last && last.kind === 'echo' && kind === 'echo') last.entries.push(m);
      else out.push({ kind, at: m.at ?? Date.now(), entries: [m] });
    }
    return out;
  });
  @ViewChild('log') log?: ElementRef<HTMLElement>;
  @ViewChild('composerInput') composerInput?: ElementRef<HTMLTextAreaElement>;

  /** Puts the cursor at the end of a half-written opener rather than at its start. */
  private focusComposer() {
    const el = this.composerInput?.nativeElement;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }

  constructor(
    public agent: AgentService,
    public settings: SettingsService,
    public ui: UiService,
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

  /*
   * Stable identities for both loops. Without them Angular tears down and rebuilds every
   * message on each change, which restarts the reveal animation from zero every time
   * anything in the transcript moves.
   */
  trackGroup = (_: number, g: Group) => `${g.kind}-${g.at}`;
  trackEntry = (_: number, m: DisplayEntry) => `${m.kind}-${m.at}-${m.text.length}`;

  /**
   * Only the last entry of the last group animates, and only briefly after it arrived.
   * Scrollback appears whole — re-typing an old message on every re-render would be
   * maddening, and switching tabs and back should not replay the conversation.
   */
  isNewest(groupIndex: number, entryIndex: number): boolean {
    const gs = this.groups();
    if (groupIndex !== gs.length - 1) return false;
    const g = gs[groupIndex];
    if (entryIndex !== g.entries.length - 1) return false;
    return Date.now() - (g.entries[entryIndex].at ?? 0) < 4000;
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
    void this.agent.send(text);
  }
}
