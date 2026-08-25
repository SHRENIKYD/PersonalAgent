import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BootComponent } from './components/boot/boot.component';
import { ContextRailComponent } from './components/context-rail/context-rail.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
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

const BOOT_SEEN_KEY = 'jarvis-boot-seen';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    BootComponent,
    ContextRailComponent,
    SidebarComponent,
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
        </div>
      </main>
      <app-context-rail></app-context-rail>
    </div>
  `,
})
export class AppComponent {
  // sessionStorage, not localStorage: replays once per tab/session, not once ever.
  showBoot = signal(sessionStorage.getItem(BOOT_SEEN_KEY) !== '1');

  // Injected purely to instantiate it at app start (providedIn: 'root' services are
  // otherwise created lazily on first use) — sync needs to kick off its initial pull
  // immediately, not wait for the Settings tab to be opened.
  constructor(public ui: UiService, public state: StateService, private sync: SyncService) {}

  dismissBoot() {
    sessionStorage.setItem(BOOT_SEEN_KEY, '1');
    this.showBoot.set(false);
  }
}
