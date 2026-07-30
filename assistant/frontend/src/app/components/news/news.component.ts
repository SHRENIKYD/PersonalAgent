import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgentService } from '../../services/agent.service';
import { UiService } from '../../services/ui.service';
import { StorageService } from '../../services/storage.service';

const LOCATION_KEY = 'assistant-news-location-v1';

interface NewsTopic {
  label: string;
  prompt: string;
}

const GLOBAL_TOPICS: NewsTopic[] = [
  { label: 'Top world headlines today', prompt: 'Search the web and summarize today\'s top world/political headlines, in a few bullet points with sources.' },
  { label: 'Tech & AI industry news', prompt: 'Search the web and summarize the most significant technology and AI industry news from the last day or two, in a few bullet points with sources.' },
  { label: 'Global markets & finance', prompt: 'Search the web and summarize today\'s key global financial market moves (major indices, rates, notable company news), in a few bullet points with sources.' },
];

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="panel">
      <h1 class="page-title">News</h1>
      <p class="page-sub">
        On-demand research, not a live feed — each card asks the assistant to search the web
        right now and answers in the Assistant tab. Nothing here refreshes on its own.
      </p>

      <h2 class="section-title">Global</h2>
      <div class="dash-grid">
        <button class="dash-card" *ngFor="let t of globalTopics" (click)="ask(t.prompt)">
          <div class="dash-card-title">{{ t.label }}</div>
          <div class="dash-card-stat">Ask the assistant &rarr;</div>
        </button>
      </div>

      <h2 class="section-title">Local</h2>
      <p class="setting-note">Set your city/region once — it's reused for every local search.</p>
      <div class="fit-today-row">
        <input
          class="theme-input"
          placeholder="e.g. Bengaluru, India"
          [ngModel]="location()"
          (ngModelChange)="setLocation($event)"
          style="max-width: 280px;" />
      </div>

      <div class="dash-grid">
        <button class="dash-card" (click)="ask(localNewsPrompt())" [disabled]="!location().trim()">
          <div class="dash-card-title">Local news</div>
          <div class="dash-card-stat">Ask the assistant &rarr;</div>
        </button>
        <button class="dash-card" (click)="ask(localWeatherPrompt())" [disabled]="!location().trim()">
          <div class="dash-card-title">Local weather</div>
          <div class="dash-card-stat">Ask the assistant &rarr;</div>
        </button>
      </div>
      <p *ngIf="!location().trim()" class="empty">Add a location above to enable local search.</p>
    </section>
  `,
})
export class NewsComponent {
  globalTopics = GLOBAL_TOPICS;
  private locationValue: string;

  constructor(
    private agent: AgentService,
    public ui: UiService,
    private storage: StorageService
  ) {
    this.locationValue = this.storage.get<string>(LOCATION_KEY, '');
  }

  location(): string {
    return this.locationValue;
  }

  setLocation(value: string) {
    this.locationValue = value;
    this.storage.set(LOCATION_KEY, value);
  }

  localNewsPrompt(): string {
    return `Search the web and summarize today's top local news for ${this.locationValue}, in a few bullet points with sources.`;
  }

  localWeatherPrompt(): string {
    return `Search the web for today's weather forecast in ${this.locationValue} and summarize it in a sentence or two.`;
  }

  ask(prompt: string) {
    this.ui.setTab('chat');
    void this.agent.send(prompt);
  }
}
