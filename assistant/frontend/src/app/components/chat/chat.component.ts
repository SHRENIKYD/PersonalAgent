import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgentService } from '../../services/agent.service';
import { SettingsService } from '../../services/settings.service';
import { UiService } from '../../services/ui.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="panel">
      <div class="page-head">
        <div>
          <h1 class="page-title">Assistant</h1>
          <p class="page-sub">
            Ask for anything — it adds tasks, checks them off, and keeps notes for you.
          </p>
        </div>
        <button class="ghost-btn" (click)="agent.reset()" [disabled]="agent.thinking()">
          Clear chat
        </button>
      </div>

      <p *ngIf="!settings.ready()" class="chat-warn">
        No API key is set for direct mode.
        <a (click)="ui.setTab('settings')">Add one on the Settings tab</a> to use the assistant.
      </p>

      <div class="chat-log">
        <p *ngIf="agent.transcript().length === 0" class="chat-empty">
          Try “remind me to renew the lease on Friday”, “what’s due today?”, or
          “note that the wifi password is hunter2”.
        </p>

        <div
          *ngFor="let m of agent.transcript()"
          class="chat-msg"
          [ngClass]="m.kind"
          [class.pending]="m.pending">
          <span *ngIf="m.pending" class="scan-line" aria-hidden="true"></span>
          {{ m.text }}
        </div>
      </div>

      <div class="chat-input-row">
        <textarea
          [(ngModel)]="inputText"
          placeholder="Ask your assistant…"
          [disabled]="agent.thinking()"
          (keydown.enter)="onEnter($event)"></textarea>
        <button class="chat-send" [disabled]="agent.thinking()" (click)="send()">Send</button>
      </div>

      <p class="chat-hint">Enter to send · Shift+Enter for a new line</p>
    </section>
  `,
})
export class ChatComponent {
  inputText = '';

  constructor(
    public agent: AgentService,
    public settings: SettingsService,
    public ui: UiService
  ) {}

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
