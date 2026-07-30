import { Injectable, signal } from '@angular/core';
import { TabKey } from '../models';

@Injectable({ providedIn: 'root' })
export class UiService {
  activeTab = signal<TabKey>('chat');

  setTab(tab: TabKey) {
    this.activeTab.set(tab);
  }
}
