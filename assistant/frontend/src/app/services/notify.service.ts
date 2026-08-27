import { Injectable, effect, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { StateService } from './state.service';
import { StorageService } from './storage.service';
import { UiService } from './ui.service';
import { morningBrief, eveningBrief, Brief, BriefInput } from '../brief';
import { workoutForDate, MACRO_TARGETS } from '../fitness-data';

const KEY = 'assistant-notify-v1';

/** Fixed hours, chosen by the user: the plan in the morning, what is left in the evening. */
const MORNING_HOUR = 7;
const EVENING_HOUR = 19;

/**
 * Ids are fixed rather than generated, so rescheduling replaces yesterday's pending
 * notification instead of stacking a second one beside it.
 */
const MORNING_ID = 1001;
const EVENING_ID = 1002;

/** How many days ahead to schedule. Rebuilt on every launch, so this only has to cover a
 *  stretch of not opening the app. */
const DAYS_AHEAD = 7;

interface NotifySettings {
  enabled: boolean;
}

/**
 * The daily briefs, delivered by Android rather than by the app being open.
 *
 * Everything here is scheduled locally — no server, no push service, no account. The content
 * is assembled from data already on the device, which is why it still works in a tunnel with
 * no signal and no API key.
 *
 * Notifications are scheduled a week ahead and rebuilt whenever the data behind them changes,
 * because a brief written on Monday about Monday's tasks is wrong by Wednesday.
 */
@Injectable({ providedIn: 'root' })
export class NotifyService {
  readonly available = Capacitor.isNativePlatform();

  enabled = signal(false);
  /** 'granted' | 'denied' | 'prompt' | 'unsupported' — shown in Settings, because a denied
   *  permission makes every one of these silently do nothing. */
  permission = signal<string>('unsupported');
  lastScheduled = signal<number | null>(null);
  error = signal('');

  constructor(
    private state: StateService,
    private storage: StorageService,
    private ui: UiService,
  ) {
    const saved = this.storage.get<NotifySettings>(KEY, { enabled: false });
    this.enabled.set(!!saved.enabled);

    if (!this.available) return;

    void this.refreshPermission();
    void this.wireTaps();

    // Rebuild whenever anything a brief mentions changes. Reading the signals inside the
    // effect is what subscribes it — tasks, the fitness log and the set log all feed the
    // evening brief's idea of what is still open.
    effect(() => {
      this.state.tasks();
      this.state.fitnessLog();
      this.state.setLog();
      if (this.enabled()) this.scheduleSoon();
    });
  }

  private pending?: ReturnType<typeof setTimeout>;

  /**
   * Coalesces a burst of changes into one rebuild.
   *
   * Logging a set fires the effect, and a set is logged every ninety seconds during a
   * session — rebuilding fourteen notifications each time would be pure churn for a result
   * that only differs once the day's state actually settles.
   */
  private scheduleSoon() {
    clearTimeout(this.pending);
    this.pending = setTimeout(() => void this.reschedule(), 3000);
  }

  async setEnabled(on: boolean) {
    this.enabled.set(on);
    this.storage.set<NotifySettings>(KEY, { enabled: on });
    if (!this.available) return;

    if (!on) {
      await this.cancelAll();
      return;
    }
    const granted = await this.request();
    if (granted) await this.reschedule();
  }

  async refreshPermission() {
    if (!this.available) return;
    try {
      const res = await LocalNotifications.checkPermissions();
      this.permission.set(res.display);
    } catch (e) {
      this.permission.set('unsupported');
    }
  }

  private async request(): Promise<boolean> {
    try {
      const res = await LocalNotifications.requestPermissions();
      this.permission.set(res.display);
      if (res.display !== 'granted') {
        this.error.set('Android denied notification permission, so briefs cannot be delivered.');
        return false;
      }
      this.error.set('');
      return true;
    } catch (e) {
      this.error.set(message(e));
      return false;
    }
  }

  /** Builds the brief for a given day from what is on the device right now. */
  private input(date: Date): BriefInput {
    const iso = date.toISOString().slice(0, 10);
    const setsToday = Object.entries(this.state.setLog())
      .filter(([k]) => k.startsWith(`${iso}|`))
      .reduce((n, [, sets]) => n + sets.length, 0);
    return {
      today: iso,
      workout: workoutForDate(date),
      tasks: this.state.tasks(),
      workoutLogged: !!this.state.fitnessLog()[`${iso}:workout`],
      dietLogged: !!this.state.fitnessLog()[`${iso}:diet`],
      setsLoggedToday: setsToday,
      proteinTargetG: MACRO_TARGETS.protein,
    };
  }

  /**
   * Cancel everything, then schedule the next week fresh.
   *
   * Cancel-then-rebuild rather than patching: a brief's text depends on tasks that may have
   * been added, completed or rescheduled since it was queued, and reconciling that in place
   * is far more error-prone than throwing the queue away.
   */
  async reschedule() {
    if (!this.available || !this.enabled()) return;
    if (this.permission() !== 'granted') return;

    try {
      await this.cancelAll();

      const notifications = [];
      for (let i = 0; i < DAYS_AHEAD; i++) {
        const day = new Date();
        day.setDate(day.getDate() + i);

        const morningAt = at(day, MORNING_HOUR);
        if (morningAt.getTime() > Date.now()) {
          notifications.push(this.toNotification(MORNING_ID + i * 10, morningBrief(this.input(day)), morningAt, 'workout'));
        }

        const eveningAt = at(day, EVENING_HOUR);
        // The evening brief stays silent on a finished day. Today's is known now; a future
        // day's is a guess, so those are scheduled and simply say what is outstanding as of
        // scheduling time — the next launch rewrites them.
        const evening = eveningBrief(this.input(day));
        if (evening && eveningAt.getTime() > Date.now()) {
          notifications.push(this.toNotification(EVENING_ID + i * 10, evening, eveningAt, 'tasks'));
        }
      }

      if (notifications.length) await LocalNotifications.schedule({ notifications });
      this.lastScheduled.set(Date.now());
      this.error.set('');
    } catch (e) {
      this.error.set(message(e));
    }
  }

  /** Fires one immediately, so the setting can be tested without waiting until 7am. */
  async sendTest() {
    if (!this.available) return;
    if (this.permission() !== 'granted' && !(await this.request())) return;
    const brief = morningBrief(this.input(new Date()));
    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: 9999,
          title: brief.title,
          body: brief.body,
          schedule: { at: new Date(Date.now() + 2000) },
          extra: { tab: 'workout' },
        }],
      });
      this.error.set('');
    } catch (e) {
      this.error.set(message(e));
    }
  }

  private toNotification(id: number, brief: Brief, when: Date, tab: string) {
    return {
      id,
      title: brief.title,
      body: brief.body,
      schedule: { at: when, allowWhileIdle: true },
      extra: { tab },
    };
  }

  private async cancelAll() {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
    }
  }

  /** Tapping a brief should land on what it was about, not just open the app. */
  private async wireTaps() {
    await LocalNotifications.addListener('localNotificationActionPerformed', action => {
      const tab = action.notification.extra?.['tab'];
      if (tab === 'workout' || tab === 'tasks') this.ui.setTab(tab);
    });
  }
}

/** A given hour of a given day, on the minute. */
function at(day: Date, hour: number): Date {
  const d = new Date(day);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function message(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return String(e);
}
