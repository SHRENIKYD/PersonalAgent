import { Injectable, effect, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { StateService } from './state.service';
import { StorageService } from './storage.service';
import { UiService } from './ui.service';
import { morningBrief, eveningBrief, hourlyNudge, waterReminder, Brief, BriefInput } from '../brief';
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

/**
 * The status-bar icon, and the colour Android tints it.
 *
 * Without a small icon Android falls back to a generic marker — a plain white circle that
 * says nothing about which app it came from. The drawable is a white silhouette because
 * Android discards the colour; iconColor is what puts the ember back.
 */
const SMALL_ICON = 'ic_stat_echo';
const ICON_COLOR = '#FF6B1A';

/** How many days ahead to schedule. Rebuilt on every launch, so this only has to cover a
 *  stretch of not opening the app. */
const DAYS_AHEAD = 7;

interface NotifySettings {
  enabled: boolean;
  /** 'twice' = 7am and 7pm only. 'hourly' = a check on every hour of the waking window. */
  briefMode: 'twice' | 'hourly';
  water: boolean;
  /** Hours between water reminders. 1 is every hour; 2 halves the count. */
  waterEvery: number;
}

const DEFAULTS: NotifySettings = { enabled: false, briefMode: 'twice', water: false, waterEvery: 1 };

/** The waking window the hourly checks and water reminders run inside. */
const DAY_START = 7;
const DAY_END = 22;

/**
 * Android keeps a limited number of pending alarms per app, and hourly checks plus water can
 * reach thirty a day. Scheduling fewer days ahead when the count is high keeps well clear of
 * that, and every launch rebuilds anyway.
 */
const MAX_PENDING = 120;

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
  briefMode = signal<'twice' | 'hourly'>('twice');
  water = signal(false);
  waterEvery = signal(1);
  /** How many notifications the last rebuild actually queued — the honest count. */
  scheduledCount = signal(0);
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
    const saved = this.storage.get<NotifySettings>(KEY, DEFAULTS);
    this.enabled.set(!!saved.enabled);
    this.briefMode.set(saved.briefMode === 'hourly' ? 'hourly' : 'twice');
    this.water.set(!!saved.water);
    this.waterEvery.set(saved.waterEvery === 2 || saved.waterEvery === 3 ? saved.waterEvery : 1);

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

  private persist() {
    this.storage.set<NotifySettings>(KEY, {
      enabled: this.enabled(),
      briefMode: this.briefMode(),
      water: this.water(),
      waterEvery: this.waterEvery(),
    });
  }

  setBriefMode(mode: 'twice' | 'hourly') {
    this.briefMode.set(mode);
    this.persist();
    void this.reschedule();
  }

  setWater(on: boolean) {
    this.water.set(on);
    this.persist();
    void this.reschedule();
  }

  setWaterEvery(hours: number) {
    this.waterEvery.set(hours);
    this.persist();
    void this.reschedule();
  }

  async setEnabled(on: boolean) {
    this.enabled.set(on);
    this.persist();
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

      const notifications: ReturnType<NotifyService['toNotification']>[] = [];
      const hourly = this.briefMode() === 'hourly';
      // Hourly checks plus water can reach thirty a day, so the horizon shortens to stay
      // well inside Android's pending-alarm limit. Every launch rebuilds regardless.
      const days = hourly || this.water() ? 2 : DAYS_AHEAD;

      for (let i = 0; i < days; i++) {
        const day = new Date();
        day.setDate(day.getDate() + i);
        const input = this.input(day);
        const base = i * 100;

        const morning = at(day, MORNING_HOUR);
        if (morning.getTime() > Date.now()) {
          notifications.push(this.toNotification(MORNING_ID + base, morningBrief(input), morning, 'workout'));
        }

        if (hourly) {
          // Skip the two hours the briefs already cover, or the same minute carries two
          // notifications saying overlapping things.
          for (let h = DAY_START + 1; h <= DAY_END; h++) {
            if (h === MORNING_HOUR || h === EVENING_HOUR) continue;
            const when = at(day, h);
            if (when.getTime() <= Date.now()) continue;
            const nudge = hourlyNudge(input, h);
            if (nudge) notifications.push(this.toNotification(base + 200 + h, nudge, when, 'tasks'));
          }
        }

        if (this.water()) {
          for (let h = DAY_START; h <= DAY_END; h += this.waterEvery()) {
            const when = at(day, h, 30);
            if (when.getTime() <= Date.now()) continue;
            notifications.push(this.toNotification(base + 300 + h, waterReminder(h), when, 'today'));
          }
        }

        const evening = at(day, EVENING_HOUR);
        const later = eveningBrief(input);
        if (later && evening.getTime() > Date.now()) {
          notifications.push(this.toNotification(EVENING_ID + base, later, evening, 'tasks'));
        }
      }

      // Soonest first, so if the cap bites it drops the furthest-out rather than today's.
      notifications.sort((a, b) => a.schedule.at.getTime() - b.schedule.at.getTime());
      const queued = notifications.slice(0, MAX_PENDING);

      if (queued.length) await LocalNotifications.schedule({ notifications: queued });
      this.scheduledCount.set(queued.length);
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
          smallIcon: SMALL_ICON,
          iconColor: ICON_COLOR,
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
      smallIcon: SMALL_ICON,
      iconColor: ICON_COLOR,
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

/**
 * A given hour of a given day. Water reminders sit on the half hour so they never land in
 * the same minute as a brief, which would arrive as one buried under the other.
 */
function at(day: Date, hour: number, minute = 0): Date {
  const d = new Date(day);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function message(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return String(e);
}
