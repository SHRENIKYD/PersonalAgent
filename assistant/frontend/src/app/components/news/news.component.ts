import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgentService } from '../../services/agent.service';
import { UiService } from '../../services/ui.service';
import { StorageService } from '../../services/storage.service';

const LOCATION_KEY = 'assistant-news-location-v1';

interface Topic {
  kind: 'global' | 'local';
  source: string;
  title: string;
  blurb: string;
  prompt: (place: string) => string;
}

const TOPICS: Topic[] = [
  {
    kind: 'global', source: 'World', title: 'Today\'s top headlines',
    blurb: 'The main political and world stories of the last day, with sources.',
    prompt: () => 'Search the web and summarize today\'s top world/political headlines, ' +
      'in a few bullet points with sources.',
  },
  {
    kind: 'global', source: 'Tech', title: 'Technology and AI',
    blurb: 'What actually moved in the industry over the last day or two.',
    prompt: () => 'Search the web and summarize the most significant technology and AI ' +
      'industry news from the last day or two, in a few bullet points with sources.',
  },
  {
    kind: 'global', source: 'Markets', title: 'Markets and finance',
    blurb: 'Indices, rates and the company news behind them.',
    prompt: () => 'Search the web and summarize today\'s key global financial market moves ' +
      '(major indices, rates, notable company news), in a few bullet points with sources.',
  },
  {
    kind: 'local', source: 'Local', title: 'News near you',
    blurb: 'Today\'s local stories for the place you set below.',
    prompt: p => `Search the web and summarize today's top local news for ${p}, in a few ` +
      'bullet points with sources.',
  },
  {
    kind: 'local', source: 'Weather', title: 'Today\'s forecast',
    blurb: 'A sentence or two on what the sky is doing where you are.',
    prompt: p => `Search the web for today's weather forecast in ${p} and summarize it in ` +
      'a sentence or two.',
  },
];

/**
 * News, rebuilt to the Bloom mockup: filter capsules over a card of items, each with a
 * source label, a headline and a line underneath.
 *
 * The mockup draws a feed of articles. This app has no feed — every item asks the assistant
 * to go and search when you tap it, and it answers in the Assistant tab. Rendering invented
 * headlines to match the drawing would look right and be a lie, so the layout is the
 * mockup's and the content is what the app can actually do.
 */
@Component({
  selector: 'app-news',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="panel">
      <h1 class="page-title">News</h1>
      <p class="page-sub">
        Nothing here refreshes on its own. Tap an item and the assistant searches the web
        now, then answers in the Assistant tab.
      </p>

      <div class="chip-row">
        <button class="chip-filter" *ngFor="let f of filters"
                [class.on]="filter() === f.key"
                (click)="filter.set(f.key)">{{ f.label }}</button>
      </div>

      <div class="card">
        <button class="news-item" *ngFor="let t of shown()"
                [disabled]="t.kind === 'local' && !location().trim()"
                (click)="ask(t)">
          <span class="news-source">{{ t.source }}</span>
          <span class="news-title">{{ t.title }}</span>
          <span class="news-blurb">{{ t.blurb }}</span>
        </button>
      </div>

      <div class="card">
        <span class="card-label">Where you are</span>
        <div class="add-row" style="margin-top: 8px">
          <input
            class="grow"
            placeholder="e.g. Bengaluru, India"
            [ngModel]="location()"
            (ngModelChange)="setLocation($event)" />
        </div>
        <p class="setting-note" *ngIf="!location().trim()">
          Set this once and the two local items above turn on.
        </p>
      </div>
    </section>
  `,
})
export class NewsComponent {
  readonly filter = signal<'all' | 'global' | 'local'>('all');
  readonly filters = [
    { key: 'all' as const, label: 'All' },
    { key: 'global' as const, label: 'World' },
    { key: 'local' as const, label: 'Local' },
  ];

  private locationValue = signal('');

  constructor(
    private agent: AgentService,
    public ui: UiService,
    private storage: StorageService,
  ) {
    this.locationValue.set(this.storage.get<string>(LOCATION_KEY, ''));
  }

  shown = computed(() => {
    const f = this.filter();
    return f === 'all' ? TOPICS : TOPICS.filter(t => t.kind === f);
  });

  location(): string { return this.locationValue(); }

  setLocation(value: string) {
    this.locationValue.set(value);
    this.storage.set(LOCATION_KEY, value);
  }

  ask(t: Topic) {
    this.ui.setTab('chat');
    void this.agent.send(t.prompt(this.locationValue()));
  }
}
