import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../services/settings.service';
import { SyncService } from '../../services/sync.service';
import { VoiceService } from '../../services/voice.service';
import { UpdateService } from '../../services/update.service';
import { BackButtonService } from '../../services/back-button.service';
import { NotifyService } from '../../services/notify.service';
import { FoldComponent } from '../fold/fold.component';
import { BackupService } from '../../services/backup.service';
import { ApiProvider, PROVIDER_LABELS } from '../../models';
import { environment } from '../../../environments/environment';

const PROVIDER_PLACEHOLDER: Record<ApiProvider, string> = {
  anthropic: 'sk-ant-...',
  openai: 'sk-...',
  gemini: 'AIza...',
  groq: 'gsk_...',
};

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, FoldComponent],
  template: `
    <section class="panel">
      <h1 class="page-title">Settings</h1>
      <p class="page-sub">How the assistant reaches a model.</p>

      <app-fold label="Connection"
                [note]="settings.mode() === 'direct' ? 'Direct from browser' : 'Via backend'">
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
          <span>No backend. Your key is stored in this browser. Anthropic, OpenAI, Gemini, or Groq.</span>
        </button>
      </div>
      </app-fold>

      <ng-container *ngIf="settings.mode() === 'backend'">
        <app-fold label="Backend" [expanded]="true">

        <p class="setting-note">
          Requests go to <code>{{ apiBaseUrl }}</code>, which holds the Anthropic API key as
          an environment variable. Change this in
          <code>src/environments/environment.prod.ts</code> and rebuild.
        </p>
        <p class="setting-note" *ngIf="apiBaseUrl.includes('YOUR-BACKEND-URL')">
          ⚠️ That is still the placeholder URL — requests will fail until you set your real
          backend URL, or switch to direct mode.
        </p>
        </app-fold>
</ng-container>

      <ng-container *ngIf="settings.mode() === 'direct'">
        <app-fold label="Provider" [note]="providerLabel()" [expanded]="true">

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
          <button
            class="mode-btn"
            [class.active]="settings.provider() === 'gemini'"
            (click)="settings.setProvider('gemini')">
            <strong>Gemini</strong>
            <span>Google models, via generateContent.</span>
          </button>
          <button
            class="mode-btn"
            [class.active]="settings.provider() === 'groq'"
            (click)="settings.setProvider('groq')">
            <strong>Groq</strong>
            <span>Open models, hosted fast. Has a free tier.</span>
          </button>
        </div>
        </app-fold>
        <ng-container *ngIf="settings.provider() === 'groq'">
<app-fold label="Groq model" [note]="settings.groqModel()">

          <p class="setting-note">
            Groq retires hosted models on its own schedule, and a retired name fails every
            request with “the model does not exist”. If that happens, pick a current one from
            <code>console.groq.com/docs/models</code> and paste it here.
          </p>
          <div class="add-row">
            <input class="grow" [(ngModel)]="draftGroqModel" placeholder="model name"
                   autocomplete="off" spellcheck="false" />
            <button class="ghost-btn" (click)="saveGroqModel()">Use this model</button>
          </div>
          <p class="setting-note">Currently using <code>{{ settings.groqModel() }}</code>.</p>
</app-fold>
</ng-container>

        <app-fold label="API key" [note]="settings.activeKey() ? 'stored' : 'not set'">


        <div class="warn-box">
          <strong>This key is readable by anything running in this browser.</strong>
          It sits in <code>localStorage</code>, so a browser extension, anyone with access to
          this profile, or any script injected into this page can read it. That is the exact
          exposure the backend exists to prevent.
          <br /><br />
          Reasonable on a machine only you use. Do not use direct mode on a shared or public
          computer, and set a spend limit on the key in the {{ providerLabel() }} console.
          Revoke it there if it leaks — nothing in this app needs changing.
        </div>

        <div class="add-row">
          <input
            class="grow"
            [type]="reveal() ? 'text' : 'password'"
            [(ngModel)]="draftKey"
            [placeholder]="providerPlaceholder()"
            autocomplete="off"
            spellcheck="false" />
          <button class="ghost-btn" (click)="reveal.set(!reveal())">
            {{ reveal() ? 'Hide' : 'Show' }}
          </button>
          <button (click)="save()">Save</button>
        </div>

        <p class="setting-note" *ngIf="saved()">Saved to this browser.</p>

        <p class="setting-note" *ngIf="settings.activeKey() !== ''">
          A {{ providerLabel() }} key is stored ({{ masked() }}).
          <a (click)="clear()">Remove it</a>
        </p>
        <p class="setting-note" *ngIf="settings.activeKey() === ''">
          No {{ providerLabel() }} key stored — the assistant will not respond until you add
          one.
        </p>
        </app-fold>
</ng-container>

      <app-fold label="Voice" [note]="voice.enabled() ? 'on' : 'off'">

      <p class="setting-note">
        A short spoken greeting plays when the app loads, using your browser's built-in
        text-to-speech — nothing sent anywhere, no API key involved. This isn't a movie AI
        voice performance (those are copyrighted, not something this app can source or
        synthesize) — pick whichever of your device's own voices sounds closest.
      </p>
      <div class="mode-row">
        <button class="mode-btn" [class.active]="voice.enabled()" (click)="voice.setEnabled(true)">
          <strong>On</strong>
          <span>Play the greeting on load.</span>
        </button>
        <button class="mode-btn" [class.active]="!voice.enabled()" (click)="voice.setEnabled(false)">
          <strong>Off</strong>
          <span>Stay silent.</span>
        </button>
      </div>

      <div class="add-row" *ngIf="voice.enabled()">
        <select
          class="grow"
          [ngModel]="voice.selectedVoiceURI() ?? ''"
          (ngModelChange)="voice.setVoice($event)">
          <option value="">Auto (best available match)</option>
          <option *ngFor="let v of voice.voices()" [value]="v.voiceURI">
            {{ v.name }} ({{ v.lang }})
          </option>
        </select>
        <button class="ghost-btn" (click)="voice.speak('This is how I sound.')">Test voice</button>
      </div>
      <p class="setting-note" *ngIf="voice.lastError()">⚠️ {{ voice.lastError() }}</p>

      <p class="setting-note" *ngIf="voice.enabled() && !voice.supported()">
        This browser has no speech synthesis at all, so the greeting can't play here.
      </p>

      <p class="setting-note" *ngIf="voice.enabled() && !voice.isApp && !voice.unlocked()">
        Waiting for you to tap the page — browsers block audio until then. The greeting is
        held and plays on your first tap rather than being lost.
      </p>

      <p class="setting-note" *ngIf="voice.enabled() && voice.isApp">
        Using Android's built-in text-to-speech engine. If nothing plays, check that a speech
        engine is installed and enabled under Android Settings → Accessibility → Text-to-speech,
        and that media volume isn't muted.
      </p>

      <p class="setting-note" *ngIf="voice.lastSpokeAt()">
        Last spoke {{ voice.lastSpokeAt() | date:'HH:mm:ss' }} — if you heard nothing, check
        media volume and the silent switch.
      </p>

      <p class="setting-note" *ngIf="voice.enabled() && !voice.isApp && voice.voices().length === 0">
        No voices reported by this browser yet — try "Test voice" again in a moment, or check
        another browser if this persists (voice availability is entirely up to the OS/browser,
        not this app).
      </p>
      </app-fold>
<app-fold label="Cross-device sync" [note]="sync.configured() ? 'on' : 'off'">

      <p class="setting-note">
        Syncs tasks, notes, growth, and fitness log across devices via a
        private GitHub Gist — no separate backend. Whoever has the token below can read and
        write that data, so treat it like a password. "Last edit wins": whichever device
        synced most recently wins outright if the same item changed on both.
      </p>

      <div class="warn-box" *ngIf="!sync.configured()">
        Setting up sync on a <strong>second</strong> device will replace that device's local
        data with whatever is already in the Gist. Set it up on the device with the data you
        want to keep <em>first</em>.
      </div>

      <div class="add-row">
        <input
          class="grow"
          [type]="revealSyncToken() ? 'text' : 'password'"
          [(ngModel)]="draftSyncToken"
          placeholder="GitHub personal access token (gist scope)"
          autocomplete="off"
          spellcheck="false" />
        <button class="ghost-btn" (click)="revealSyncToken.set(!revealSyncToken())">
          {{ revealSyncToken() ? 'Hide' : 'Show' }}
        </button>
      </div>
      <div class="add-row">
        <input
          class="grow"
          type="text"
          [(ngModel)]="draftGistId"
          placeholder="Gist ID (leave blank on the first device — one is created automatically)"
          autocomplete="off"
          spellcheck="false" />
        <button (click)="saveSync()">Save &amp; sync</button>
      </div>

      <p class="setting-note" *ngIf="sync.configured() && sync.gistId()">
        Gist ID: <code>{{ sync.gistId() }}</code> — copy this into the same field on your other
        device, along with the same token.
      </p>
      <p class="setting-note" *ngIf="sync.configured()">
        Status: {{ syncStatusLabel() }}
        <a (click)="sync.syncNow()">Sync now</a>
        &middot;
        <a (click)="clearSync()">Disconnect</a>
      </p>
      <p class="setting-note" *ngIf="!sync.configured()">Not set up — data stays on this device only.</p>
      <p class="setting-note" *ngIf="sync.status() === 'error'">⚠️ {{ sync.errorMessage() }}</p>
</app-fold>
<app-fold label="App version">

      <ng-container *ngIf="update.isApp; else webVersion">
        <p class="setting-note" *ngIf="update.local() as l">
          Installed build <code>{{ l.sha.slice(0, 7) }}</code>, {{ l.builtAt | date:'d MMM y, HH:mm' }}.
        </p>
        <p class="setting-note" *ngIf="!update.local()">
          This build carries no version stamp, so it can't be compared against the latest release.
        </p>

        <div class="add-row">
          <button (click)="update.check()" [disabled]="update.checking()">
            {{ update.checking() ? 'Checking…' : 'Check for updates' }}
          </button>
          <button class="cta-sweep" *ngIf="update.updateAvailable()" (click)="update.download()">
            Download update
          </button>
        </div>

        <p class="setting-note" *ngIf="update.error()">⚠️ {{ update.error() }}</p>
        <p class="setting-note" *ngIf="update.updateAvailable() && update.remote() as r">
          A newer build is available — <code>{{ r.sha.slice(0, 7) }}</code>,
          {{ r.builtAt | date:'d MMM y, HH:mm' }}. Download it, then open the file to install.
          Android may ask you to uninstall this copy first: each build is signed with its own
          key, so it can't upgrade the previous install in place.
        </p>
        <p class="setting-note" *ngIf="update.remote() && !update.updateAvailable() && !update.error()">
          You're on the latest build.
        </p>
        <p class="setting-note" *ngIf="update.lastChecked() as t">
          Last checked {{ t | date:'d MMM y, HH:mm' }}.
        </p>
      </ng-container>

      <ng-template #webVersion>
        <p class="setting-note">
          You're on the web version, which updates itself — a new build is fetched in the
          background and applied next time you open the page. The update check is only
          shown in the Android app, where installing a new build is a manual step.
        </p>
      </ng-template>
</app-fold>
<app-fold label="Backup &amp; restore">

      <p class="setting-note">
        A file copy of everything — tasks, notes, roadmap, workout and diet log, and every
        set you've recorded. Unlike sync above, it needs no account and never changes on its
        own: it's a frozen copy you keep. <strong>Take one before uninstalling the app</strong>,
        since uninstalling clears local storage.
      </p>

      <div class="add-row">
        <button (click)="backup.download()">Save backup file</button>
        <button class="ghost-btn" (click)="backup.copy()">Copy backup</button>
        <button class="ghost-btn" (click)="backup.downloadSpreadsheet()">Save spreadsheet</button>
        <button class="ghost-btn" (click)="restoreInput.click()">Restore from file…</button>
        <input #restoreInput type="file" accept="application/json,.json" hidden
               (change)="onRestoreFile($event)" />
      </div>

      <p class="setting-note" *ngIf="backup.status()">✅ {{ backup.status() }}</p>
      <p class="setting-note" *ngIf="backup.error()">⚠️ {{ backup.error() }}</p>

      <details class="setting-details">
        <summary>Restore by pasting instead</summary>
        <p class="setting-note">
          For when the file picker isn't available. Paste a backup and restore it —
          this <strong>replaces</strong> everything currently in the app.
        </p>
        <textarea class="grow restore-box" rows="4" [(ngModel)]="restoreText"
                  placeholder="Paste backup JSON here"></textarea>
        <button class="ghost-btn" [disabled]="!restoreText.trim()"
                (click)="backup.restore(restoreText) && (restoreText = '')">
          Restore pasted backup
        </button>
      </details>
</app-fold>
<ng-container *ngIf="notify.available">
<app-fold label="Daily briefs" [note]="notify.enabled() ? '7am · 7pm' : 'off'">

        <p class="setting-note">
          Two notifications a day, assembled on this phone — no account, no server, and they
          still arrive with no signal and no API key. <strong>7am</strong> is the plan for the
          day: session, what's due, protein target. <strong>7pm</strong> is what's still open,
          and stays silent on a day you've finished.
        </p>

        <div class="mode-row">
          <button class="mode-btn" [class.active]="notify.enabled()" (click)="notify.setEnabled(true)">
            <strong>On</strong>
            <span>Brief at 7am and 7pm.</span>
          </button>
          <button class="mode-btn" [class.active]="!notify.enabled()" (click)="notify.setEnabled(false)">
            <strong>Off</strong>
            <span>No notifications.</span>
          </button>
        </div>

        <p class="setting-note" *ngIf="notify.enabled() && notify.permission() !== 'granted'">
          ⚠️ Android has not granted notification permission — <strong>nothing will be
          delivered</strong> until it is allowed under Android Settings → Apps → ECHO →
          Notifications. (Permission state: {{ notify.permission() }}.)
        </p>
        <p class="setting-note" *ngIf="notify.error()">⚠️ {{ notify.error() }}</p>
        <ng-container *ngIf="notify.enabled()">
          <h3 class="setting-sub">How often</h3>
          <div class="mode-row">
            <button class="mode-btn" [class.active]="notify.briefMode() === 'twice'"
                    (click)="notify.setBriefMode('twice')">
              <strong>Twice a day</strong>
              <span>7am and 7pm only. Two a day, both worth reading.</span>
            </button>
            <button class="mode-btn" [class.active]="notify.briefMode() === 'hourly'"
                    (click)="notify.setBriefMode('hourly')">
              <strong>Hourly checks</strong>
              <span>
                Every hour 7am–10pm, but silent unless something is outstanding — a day
                you've trained and logged stays quiet.
              </span>
            </button>
          </div>

          <h3 class="setting-sub">Water reminders</h3>
          <div class="mode-row">
            <button class="mode-btn" [class.active]="!notify.water()" (click)="notify.setWater(false)">
              <strong>Off</strong>
              <span>No water nudges.</span>
            </button>
            <button class="mode-btn" [class.active]="notify.water()" (click)="notify.setWater(true)">
              <strong>On</strong>
              <span>7am–10pm, on the half hour so they never collide with a brief.</span>
            </button>
          </div>

          <div class="add-row" *ngIf="notify.water()">
            <button class="ghost-btn" *ngFor="let h of [1, 2, 3]"
                    [class.active]="notify.waterEvery() === h"
                    (click)="notify.setWaterEvery(h)">
              {{ h === 1 ? 'Every hour' : 'Every ' + h + ' hours' }}
            </button>
          </div>

          <p class="setting-note" *ngIf="notify.lastScheduled() as t">
            <strong>{{ notify.scheduledCount() }}</strong> notifications queued, last rebuilt
            {{ t | date:'d MMM, HH:mm' }}. Rebuilt every time the app opens or your tasks
            change.
          </p>
        </ng-container>

        <div class="add-row" *ngIf="notify.enabled()">
          <button class="ghost-btn" (click)="notify.sendTest()">Send one now</button>
        </div>
</app-fold>
</ng-container>

      <app-fold label="Back button">

      <p class="setting-note">
        Press back once, then reopen this tab. If the count is still 0 the app never received
        the press; if it counts up but the screen did not change, it was received and ignored.
      </p>
      <p class="setting-note">
        Presses handled: <strong>{{ back.backCount() }}</strong> ·
        last by <strong>{{ back.lastBackSource() }}</strong> ·
        native listener <strong>{{ back.nativeListenerReady() ? 'ready' : 'not registered' }}</strong>
      </p>
      </app-fold>
<app-fold label="Your data">

      <p class="setting-note">
        Tasks and notes never leave this browser or the Gist above — only your chat messages
        are sent to the model provider. Clearing site data for this page deletes local data
        (synced data stays in the Gist until you delete it on GitHub).
      </p>
</app-fold>
</section>
  `,
})
export class SettingsComponent {
  draftKey = '';
  draftGroqModel = '';

  saveGroqModel() {
    this.settings.setGroqModel(this.draftGroqModel);
    this.draftGroqModel = this.settings.groqModel();
  }

  reveal = signal(false);
  saved = signal(false);
  apiBaseUrl = environment.apiBaseUrl;

  restoreText = '';
  draftSyncToken = '';
  draftGistId = '';
  revealSyncToken = signal(false);

  onRestoreFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) void this.backup.restoreFromFile(file);
    // Cleared so picking the same file twice still fires a change event.
    input.value = '';
  }

  constructor(
    public settings: SettingsService,
    public sync: SyncService,
    public voice: VoiceService,
    public update: UpdateService,
    public backup: BackupService,
    public back: BackButtonService,
    public notify: NotifyService,
  ) {
    this.draftGistId = sync.gistId();
    // Prefilled so the field shows what is in use rather than sitting empty.
    this.draftGroqModel = settings.groqModel();
  }

  providerLabel(): string {
    return PROVIDER_LABELS[this.settings.provider()];
  }

  providerPlaceholder(): string {
    return PROVIDER_PLACEHOLDER[this.settings.provider()];
  }

  save() {
    if (this.draftKey.trim() === '') return;
    switch (this.settings.provider()) {
      case 'openai': this.settings.setOpenaiApiKey(this.draftKey); break;
      case 'gemini': this.settings.setGeminiApiKey(this.draftKey); break;
      case 'groq': this.settings.setGroqApiKey(this.draftKey); break;
      default: this.settings.setApiKey(this.draftKey);
    }
    this.draftKey = '';
    this.reveal.set(false);
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 2500);
  }

  clear() {
    switch (this.settings.provider()) {
      case 'openai': this.settings.clearOpenaiApiKey(); break;
      case 'gemini': this.settings.clearGeminiApiKey(); break;
      case 'groq': this.settings.clearGroqApiKey(); break;
      default: this.settings.clearApiKey();
    }
    this.saved.set(false);
  }

  /** Enough to recognise which key is stored, not enough to reconstruct it. */
  masked(): string {
    const k = this.settings.activeKey();
    return k.length <= 10 ? '••••' : `${k.slice(0, 7)}…${k.slice(-4)}`;
  }

  saveSync() {
    if (this.draftSyncToken.trim() === '' && !this.sync.configured()) return;
    const token = this.draftSyncToken.trim() !== '' ? this.draftSyncToken : this.sync.token();
    this.sync.setCredentials(token, this.draftGistId);
    this.draftSyncToken = '';
    this.revealSyncToken.set(false);
  }

  clearSync() {
    this.sync.clearCredentials();
    this.draftGistId = '';
  }

  syncStatusLabel(): string {
    switch (this.sync.status()) {
      case 'syncing': return 'Syncing…';
      case 'synced': return this.sync.lastSyncedAt() ? `Synced (${new Date(this.sync.lastSyncedAt()!).toLocaleTimeString()})` : 'Synced';
      case 'error': return 'Error — see below';
      default: return 'Idle';
    }
  }
}
