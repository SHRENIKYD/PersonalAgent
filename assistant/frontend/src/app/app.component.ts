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
import { FitnessComponent } from './components/fitness/fitness.component';
import { NewsComponent } from './components/news/news.component';
import { PrepDsaComponent } from './components/prep-dsa/prep-dsa.component';
import { PrepConceptComponent } from './components/prep-concept/prep-concept.component';
import { CertificatesComponent } from './components/certificates/certificates.component';
import { CS_TOPICS, SYSDESIGN_TOPICS, WEB_TOPICS } from './prep-concept-data';
import { UiService } from './services/ui.service';
import { StateService } from './services/state.service';

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
    FitnessComponent,
    NewsComponent,
    PrepDsaComponent,
    PrepConceptComponent,
    CertificatesComponent,
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
          <app-fitness *ngSwitchCase="'fitness'"></app-fitness>
          <app-news *ngSwitchCase="'news'"></app-news>
          <app-prep-dsa *ngSwitchCase="'dsa'"></app-prep-dsa>
          <app-prep-concept
            *ngSwitchCase="'cs'"
            category="cs" title="CS Fundamentals"
            subtitle="The concept questions that come up in every core/CS round: OS, DBMS, Networks, OOP."
            [topics]="csTopics"></app-prep-concept>
          <app-prep-concept
            *ngSwitchCase="'sysdesign'"
            category="sysdesign" title="System Design"
            subtitle="Building blocks first, then the classic case-study questions."
            [topics]="sysdesignTopics"></app-prep-concept>
          <app-prep-concept
            *ngSwitchCase="'web'"
            category="web" title="Web & Full-Stack"
            subtitle="JavaScript core, React, and Node/API questions."
            [topics]="webTopics"></app-prep-concept>
          <app-certificates *ngSwitchCase="'certs'"></app-certificates>
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
  csTopics = CS_TOPICS;
  sysdesignTopics = SYSDESIGN_TOPICS;
  webTopics = WEB_TOPICS;

  // sessionStorage, not localStorage: replays once per tab/session, not once ever.
  showBoot = signal(sessionStorage.getItem(BOOT_SEEN_KEY) !== '1');

  constructor(public ui: UiService, public state: StateService) {}

  dismissBoot() {
    sessionStorage.setItem(BOOT_SEEN_KEY, '1');
    this.showBoot.set(false);
  }
}
