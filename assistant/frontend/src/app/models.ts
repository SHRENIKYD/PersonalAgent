export type Priority = 'low' | 'normal' | 'high';

export interface Task {
  id: string;
  title: string;
  due: string;        // ISO date (YYYY-MM-DD) or '' when undated
  priority: Priority;
  done: boolean;
  created: string;    // ISO timestamp
}

export interface Note {
  id: string;
  title: string;
  body: string;
  updated: string;    // ISO timestamp
}

export interface AssistantState {
  tasks: Task[];
  notes: Note[];
}

// ---------------- Anthropic wire shapes ----------------
//
// Content blocks are kept deliberately loose. The agent echoes every block the API
// returns straight back on the next turn — including thinking blocks, which must
// round-trip unmodified — so narrowing these to a closed union would mean losing
// fields we don't model.

export interface ContentBlock {
  type: string;
  [key: string]: unknown;
}

export interface TextBlock extends ContentBlock {
  type: 'text';
  text: string;
}

export interface ToolUseBlock extends ContentBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export interface ApiMessage {
  role: 'user' | 'assistant';
  content: string | (ContentBlock | ToolResultBlock)[];
}

export interface AssistantResponse {
  content: ContentBlock[];
  stop_reason: string | null;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// ---------------- UI shapes ----------------

// ---------------- rich tool results ----------------
//
// A tool that reads the plan returns structured data as well as the text the model sees, so
// the UI can render the real rows rather than the model's retelling of them. That difference
// matters: a paraphrase can quietly get a set range wrong, and a card built from the same
// object the Workout tab reads cannot.

export interface CardExercise {
  name: string;
  sets: string;
  /** Parenthetical qualifier from the plan, e.g. "light–moderate". */
  note?: string;
}

export interface WorkoutCard {
  type: 'workout';
  title: string;            // "Legs A"
  when: string;             // "Tomorrow (26 Aug 2026)" — or '' when not tied to a day
  muscles: string[];
  exercises: CardExercise[];
  core?: { focus: string; exercises: CardExercise[] };
}

export interface DietCard {
  type: 'diet';
  title: string;
  targets: string;
  meals: { meal: string; food: string; protein: string; calories: string }[];
}

export type ChatCard = WorkoutCard | DietCard;

/** A single entry in the visible transcript. Distinct from ApiMessage: one API turn
 *  can produce several of these (a thought, some tool activity, then the reply). */
export interface DisplayEntry {
  kind: 'user' | 'assistant' | 'action' | 'error' | 'card';
  text: string;
  pending?: boolean;
  /** Epoch ms, for the timestamp beside a message. */
  at?: number;
  /** Present only on 'card' entries. */
  card?: ChatCard;
}

export type TabKey =
  | 'chat'
  | 'tasks'
  | 'notes'
  | 'dashboard'
  | 'growth'
  | 'workout'
  | 'diet'
  | 'news'
  | 'settings';

/**
 * 'backend' proxies through the .NET API (key stays server-side).
 * 'direct' calls the chosen provider from the browser with a key in localStorage — no
 * backend to deploy, but the key is exposed to anything running in this browser.
 */
export type TransportMode = 'backend' | 'direct';

/**
 * Which model provider direct mode talks to. Backend mode is always Anthropic — the .NET
 * API only ever proxies to Anthropic's Messages API, so this only matters in direct mode.
 */
export type ApiProvider = 'anthropic' | 'openai' | 'gemini';

// ---------------- Growth tracker (roadmap + habits) ----------------

export type TrackKey = 'career' | 'health' | 'habits' | 'balance';

export interface Goal {
  text: string;
  done: boolean;
}

export type TrackData = Record<TrackKey, Goal[]>;

export interface MonthPlan {
  name: string;
  theme: string;
  tracks: TrackData;
}

export interface Habit {
  name: string;
  weeks: boolean[];
}

export interface RoadmapState {
  months: MonthPlan[];
  habits: Habit[];
}

// ---------------- strength log ----------------

/**
 * One recorded set. Keyed in `SetLog` by `${isoDate}|${exerciseName}`, so a day's sets for
 * one movement sit together and "what did I lift last time" is a scan backwards through
 * dates rather than a filter over a flat list.
 */
export interface SetEntry {
  weight: number;     // kg
  reps: number;
}

export type SetLog = Record<string, SetEntry[]>;

// ---------------- cross-device sync ----------------

/** Everything that syncs across devices via SyncService — one device's full data. */
export interface SyncPayload {
  tasks: Task[];
  notes: Note[];
  roadmap: RoadmapState;
  fitnessLog: Record<string, boolean>;
  /** Optional: absent in blobs written by a device running a build older than the
   *  strength log, which must still merge cleanly rather than throwing. */
  setLog?: SetLog;
}
