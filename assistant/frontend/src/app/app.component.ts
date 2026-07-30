import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ChatComponent } from './components/chat/chat.component';
import { TasksComponent } from './components/tasks/tasks.component';
import { NotesComponent } from './components/notes/notes.component';
import { UiService } from './services/ui.service';
import { StateService } from './services/state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    SidebarComponent,
    DashboardComponent,
    ChatComponent,
    TasksComponent,
    NotesComponent,
  ],
  template: `
    <div class="app">
      <app-sidebar></app-sidebar>
      <main class="main">
        <ng-container [ngSwitch]="ui.activeTab()">
          <app-chat *ngSwitchCase="'chat'"></app-chat>
          <app-dashboard *ngSwitchCase="'dashboard'"></app-dashboard>
          <app-tasks *ngSwitchCase="'tasks'"></app-tasks>
          <app-notes *ngSwitchCase="'notes'"></app-notes>
        </ng-container>

        <div class="footnote">
          Tasks and notes stay in this browser &middot; only your chat messages are sent anywhere
          &middot; {{ state.saveStatus() }}
        </div>
      </main>
    </div>
  `,
})
export class AppComponent {
  constructor(public ui: UiService, public state: StateService) {}
}
