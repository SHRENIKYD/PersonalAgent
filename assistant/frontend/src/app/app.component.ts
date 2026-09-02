import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BootComponent } from './components/boot/boot.component';
import { ContextRailComponent } from './components/context-rail/context-rail.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { BottomNavComponent } from './components/bottom-nav/bottom-nav.component';
import { SectionNavComponent } from './components/section-nav/section-nav.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ChatComponent } from './components/chat/chat.component';
import { TasksComponent } from './components/tasks/tasks.component';
import { NotesComponent } from './components/notes/notes.component';
import { SettingsComponent } from './components/settings/settings.component';
import { GrowthComponent } from './components/growth/growth.component';
import { WorkoutComponent } from './components/workout/workout.component';
import { DietComponent } from './components/diet/diet.component';
import { NewsComponent } from './components/news/news.component';
import { UiService } from './services/ui.service';
import { StateService } from './services/state.service';
import { SyncService } from './services/sync.service';
import { BackButtonService } from './services/back-button.service';
import { NotifyService } from './services/notify.service';
import { ThemeService } from './services/theme.service';
import { APP_VERSION } from './version';

const BOOT_SEEN_KEY = 'jarvis-boot-seen';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    BootComponent,
    ContextRailComponent,
    SidebarComponent,
    BottomNavComponent,
    SectionNavComponent,
    DashboardComponent,
    ChatComponent,
    TasksComponent,
    NotesComponent,
    SettingsComponent,
    GrowthComponent,
    WorkoutComponent,
    DietComponent,
    NewsComponent,
  ],
  template: `
    <app-boot *ngIf="showBoot()" (done)="dismissBoot()"></app-boot>
    <div class="app">
      <app-sidebar></app-sidebar>
      <main class="main">
        <app-section-nav></app-section-nav>
        <ng-container [ngSwitch]="ui.activeTab()">
          <app-chat *ngSwitchCase="'chat'"></app-chat>
          <app-dashboard *ngSwitchCase="'dashboard'"></app-dashboard>
          <app-tasks *ngSwitchCase="'tasks'"></app-tasks>
          <app-notes *ngSwitchCase="'notes'"></app-notes>
          <app-growth *ngSwitchCase="'growth'"></app-growth>
          <app-workout *ngSwitchCase="'workout'"></app-workout>
          <app-diet *ngSwitchCase="'diet'"></app-diet>
          <app-news *ngSwitchCase="'news'"></app-news>
          <app-settings *ngSwitchCase="'settings'"></app-settings>
        </ng-container>

        <div class="footnote">
          Tasks and notes stay in this browser &middot; only your chat messages are sent anywhere
          &middot; {{ state.saveStatus() }}
          <span class="footnote-version">ECHO {{ version }}</span>
        </div>
        <div class="exit-hint" *ngIf="back.exitArmed()" role="status">Press back again to exit</div>
      </main>
      <app-context-rail></app-context-rail>
      <app-bottom-nav></app-bottom-nav>
    </div>
  `,
})
export class AppComponent {
  // sessionStorage, not localStorage: replays once per tab/session, not once ever.
  showBoot = signal(sessionStorage.getItem(BOOT_SEEN_KEY) !== '1');

  /** Shown in the footer so the running version is always readable, not one tap deep. */
  readonly version = APP_VERSION;

  // Injected purely to instantiate it at app start (providedIn: 'root' services are
  // otherwise created lazily on first use) — sync needs to kick off its initial pull
  // immediately, not wait for the Settings tab to be opened.
  constructor(
    public ui: UiService,
    public state: StateService,
    private sync: SyncService,
    // Injected purely so it is constructed — it wires the back gesture on creation and has
    // no API the template needs.
    public back: BackButtonService,
    // Injected purely so it is constructed: it reschedules the next week of briefs on
    // launch, which must happen whether or not the Settings tab is ever opened.
    private notify: NotifyService,
    private theme: ThemeService,
  ) {
    // ThemeService is injected only so it is constructed: its effect applies the stored
    // light/dark choice to <html>, which has to happen at launch whether or not Settings
    // is ever opened.
  }

  dismissBoot() {
    sessionStorage.setItem(BOOT_SEEN_KEY, '1');
    this.showBoot.set(false);
  }
}
