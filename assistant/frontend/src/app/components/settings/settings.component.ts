import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../services/settings.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="panel">
      <h1 class="page-title">Settings</h1>
      <p class="page-sub">How the assistant reaches a model.</p>

      <div class="mode-row">
        <button
          class="mode-btn"
          [class.active]="settings.mode() === 'backend'"
          (click)="settings.setMode('backend')">
          <strong>Via backend</strong>
          <span>Your key stays on the server. Needs the .NET API deployed. Anthropic only.</span>
        </button>
        <button
          class="mode-btn"
          [class.active]="settings.mode() === 'direct'"
          (click)="settings.setMode('direct')">
          <strong>Direct from browser</strong>
          <span>No backend. Your key is stored in this browser. Anthropic or OpenAI.</span>
        </button>
      </div>

      <ng-container *ngIf="settings.mode() === 'backend'">
        <h2 class="section-title">Backend</h2>
        <p class="setting-note">
          Requests go to <code>{{ apiBaseUrl }}</code>, which holds the Anthropic API key as
          an environment variable. Change this in
          <code>src/environments/environment.prod.ts</code> and rebuild.
        </p>
        <p class="setting-note" *ngIf="apiBaseUrl.includes('YOUR-BACKEND-URL')">
          ⚠️ That is still the placeholder URL — requests will fail until you set your real
          backend URL, or switch to direct mode.
        </p>
      </ng-container>

      <ng-container *ngIf="settings.mode() === 'direct'">
        <h2 class="section-title">Provider</h2>
        <div class="mode-row">
          <button
            class="mode-btn"
            [class.active]="settings.provider() === 'anthropic'"
            (click)="settings.setProvider('anthropic')">
            <strong>Anthropic</strong>
            <span>Claude models, adaptive thinking.</span>
          </button>
          <button
            class="mode-btn"
            [class.active]="settings.provider() === 'openai'"
            (click)="settings.setProvider('openai')">
            <strong>OpenAI</strong>
            <span>GPT models, via Chat Completions.</span>
          </button>
        </div>

        <h2 class="section-title">API key</h2>

        <div class="warn-box">
          <strong>This key is readable by anything running in this browser.</strong>
          It sits in <code>localStorage</code>, so a browser extension, anyone with access to
          this profile, or any script injected into this page can read it. That is the exact
          exposure the backend exists to prevent.
          <br /><br />
          Reasonable on a machine only you use. Do not use direct mode on a shared or public
          computer, and set a spend limit on the key in the
          {{ settings.provider() === 'openai' ? 'OpenAI' : 'Anthropic' }} console. Revoke it
          there if it leaks — nothing in this app needs changing.
        </div>

        <div class="add-row">
          <input
            class="grow"
            [type]="reveal() ? 'text' : 'password'"
            [(ngModel)]="draftKey"
            [placeholder]="settings.provider() === 'openai' ? 'sk-...' : 'sk-ant-...'"
            autocomplete="off"
            spellcheck="false" />
          <button class="ghost-btn" (click)="reveal.set(!reveal())">
            {{ reveal() ? 'Hide' : 'Show' }}
          </button>
          <button (click)="save()">Save</button>
        </div>

        <p class="setting-note" *ngIf="saved()">Saved to this browser.</p>

        <p class="setting-note" *ngIf="settings.activeKey() !== ''">
          A {{ settings.provider() === 'openai' ? 'OpenAI' : 'Anthropic' }} key is stored
          ({{ masked() }}).
          <a (click)="clear()">Remove it</a>
        </p>
        <p class="setting-note" *ngIf="settings.activeKey() === ''">
          No {{ settings.provider() === 'openai' ? 'OpenAI' : 'Anthropic' }} key stored — the
          assistant will not respond until you add one.
        </p>
      </ng-container>

      <h2 class="section-title">Your data</h2>
      <p class="setting-note">
        Tasks and notes never leave this browser in either mode — only your chat messages are
        sent. Clearing site data for this page deletes them.
      </p>
    </section>
  `,
})
export class SettingsComponent {
  draftKey = '';
  reveal = signal(false);
  saved = signal(false);
  apiBaseUrl = environment.apiBaseUrl;

  constructor(public settings: SettingsService) {}

  save() {
    if (this.draftKey.trim() === '') return;
    if (this.settings.provider() === 'openai') {
      this.settings.setOpenaiApiKey(this.draftKey);
    } else {
      this.settings.setApiKey(this.draftKey);
    }
    this.draftKey = '';
    this.reveal.set(false);
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 2500);
  }

  clear() {
    if (this.settings.provider() === 'openai') {
      this.settings.clearOpenaiApiKey();
    } else {
      this.settings.clearApiKey();
    }
    this.saved.set(false);
  }

  /** Enough to recognise which key is stored, not enough to reconstruct it. */
  masked(): string {
    const k = this.settings.activeKey();
    return k.length <= 10 ? '••••' : `${k.slice(0, 7)}…${k.slice(-4)}`;
  }
}
