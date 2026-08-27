import { Injectable, signal } from '@angular/core';
import { StateService } from './state.service';
import { buildSpreadsheet, Sheet } from '../export-sheet';
import { SyncPayload } from '../models';

/** Bumped only if the payload shape changes incompatibly. */
const BACKUP_VERSION = 1;

interface BackupFile {
  app: 'echo';
  version: number;
  exportedAt: string;
  data: SyncPayload;
}

/**
 * A plain-JSON backup of everything the app stores, independent of where it is installed.
 *
 * Gist sync already keeps two devices in step, but it needs a GitHub token and a network,
 * and it is a *sync* — delete something and the deletion propagates. A file is the other
 * kind of safety: a frozen copy you hold, that survives uninstalling the app, clearing
 * storage, or losing the phone, and that restores onto a fresh install with no account.
 *
 * Both a download and a clipboard copy are offered because neither works everywhere: an
 * <a download> is inert inside Android's WebView, and clipboard writes need a secure
 * context and a user gesture. Whichever succeeds, the user has their data out.
 */
@Injectable({ providedIn: 'root' })
export class BackupService {
  status = signal('');
  error = signal('');

  constructor(private state: StateService) {}

  private build(): BackupFile {
    return {
      app: 'echo',
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      data: this.state.exportAll(),
    };
  }

  /** Pretty-printed so the file is readable and diffable, not a single opaque line. */
  toJson(): string {
    return JSON.stringify(this.build(), null, 2);
  }

  filename(): string {
    return `echo-backup-${new Date().toISOString().slice(0, 10)}.json`;
  }

  /**
   * The same data as a spreadsheet: one sheet per thing, sortable and chartable.
   *
   * The JSON backup is for restoring — it round-trips exactly and is the wrong shape for
   * reading. This is the other half; nobody reads a training history as nested JSON.
   */
  sheets(): Sheet[] {
    const sets: (string | number)[][] = [];
    Object.entries(this.state.setLog()).forEach(([key, entries]) => {
      const bar = key.indexOf('|');
      const date = key.slice(0, bar);
      const exercise = key.slice(bar + 1);
      entries.forEach((e, i) => sets.push([date, exercise, i + 1, e.weight, e.reps, e.weight * e.reps]));
    });
    sets.sort((a, b) => String(a[0]).localeCompare(String(b[0])));

    return [
      {
        name: 'Sets',
        headers: ['Date', 'Exercise', 'Set', 'Weight kg', 'Reps', 'Volume kg'],
        rows: sets,
      },
      {
        name: 'Body weight',
        headers: ['Date', 'Weight kg'],
        rows: this.state.weightEntries().map(e => [e.date, e.kg]),
      },
      {
        name: 'Tasks',
        headers: ['Title', 'Due', 'Priority', 'Done', 'Created'],
        rows: this.state.tasks().map(t => [t.title, t.due || '', t.priority, t.done ? 'yes' : 'no', t.created ?? '']),
      },
      {
        name: 'Notes',
        headers: ['Title', 'Body'],
        rows: this.state.notes().map(n => [n.title, n.body ?? '']),
      },
      {
        name: 'Adherence',
        headers: ['Date', 'What'],
        rows: Object.keys(this.state.fitnessLog())
          .filter(k => this.state.fitnessLog()[k])
          .sort()
          .map(k => [k.split(':')[0], k.split(':')[1] ?? '']),
      },
    ];
  }

  downloadSpreadsheet() {
    const name = `echo-data-${new Date().toISOString().slice(0, 10)}.xls`;
    this.saveFile(buildSpreadsheet(this.sheets()), name, 'application/vnd.ms-excel');
  }

  download() {
    this.saveFile(this.toJson(), this.filename(), 'application/json');
  }

  /**
   * Writes a string out as a file.
   *
   * An <a download> is inert inside Android's WebView, which is why "Copy backup" exists
   * beside it — the failure is caught and named rather than leaving a button that appears
   * to do nothing.
   */
  private saveFile(text: string, name: string, mime: string) {
    this.error.set('');
    try {
      const blob = new Blob([text], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revoked on a delay: revoking synchronously can cancel the download in some
      // browsers before it has actually read the blob.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      this.status.set(`Saved ${name}.`);
    } catch (e) {
      this.error.set(
        `Could not save a file here (${e instanceof Error ? e.message : String(e)}). ` +
        'Use "Copy backup" instead and paste it somewhere safe.'
      );
    }
  }

  async copy() {
    this.error.set('');
    try {
      await navigator.clipboard.writeText(this.toJson());
      this.status.set('Backup copied — paste it into a note or a file you keep.');
    } catch {
      this.error.set('Clipboard was blocked. Use "Save backup file" instead.');
    }
  }

  /**
   * Replaces everything with the backup's contents. Deliberately a full replace rather than
   * a merge: a merge would have to guess what to do when both sides changed the same task,
   * and a restore is normally onto an empty install where there is nothing to merge anyway.
   */
  restore(text: string): boolean {
    this.error.set('');
    this.status.set('');
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      this.error.set('That is not valid JSON — check you pasted the whole file.');
      return false;
    }

    const file = parsed as Partial<BackupFile>;
    if (file?.app !== 'echo' || !file.data) {
      this.error.set('That file is not an ECHO backup.');
      return false;
    }
    if (typeof file.version === 'number' && file.version > BACKUP_VERSION) {
      this.error.set(
        `That backup was written by a newer version of ECHO (v${file.version}). ` +
        'Update the app before restoring it.'
      );
      return false;
    }

    this.state.importAll(file.data);
    const when = file.exportedAt ? new Date(file.exportedAt).toLocaleString() : 'unknown date';
    this.status.set(`Restored the backup from ${when}.`);
    return true;
  }

  async restoreFromFile(file: File): Promise<boolean> {
    try {
      return this.restore(await file.text());
    } catch (e) {
      this.error.set(`Could not read that file: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  }
}
