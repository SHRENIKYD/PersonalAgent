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

/** A single entry in the visible transcript. Distinct from ApiMessage: one API turn
 *  can produce several of these (a thought, some tool activity, then the reply). */
export interface DisplayEntry {
  kind: 'user' | 'assistant' | 'action' | 'error';
  text: string;
  pending?: boolean;
}

export type TabKey =
  | 'chat'
  | 'tasks'
  | 'notes'
  | 'dashboard'
  | 'growth'
  | 'dsa'
  | 'cs'
  | 'sysdesign'
  | 'web'
  | 'certs'
  | 'settings';

/**
 * 'backend' proxies through the .NET API (key stays server-side).
 * 'direct' calls Anthropic from the browser with a key in localStorage — no backend to
 * deploy, but the key is exposed to anything running in this browser.
 */
export type TransportMode = 'backend' | 'direct';

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

// ---------------- Interview prep ----------------

export type PrepCategoryKey = 'dsa' | 'cs' | 'sysdesign' | 'web';

/** dsa[topicIndex][problemIndex] = checked */
export interface Approach {
  description: string;
  time: string;   // Big-O, e.g. "O(n^2)"
  space: string;  // Big-O, e.g. "O(1)"
}

export interface DsaProblem {
  name: string;
  bruteForce: Approach;
  optimized: Approach;
  /** The core insight, in plain English — why the optimized approach works. */
  explanation: string;
}

export interface DsaTopic {
  name: string;
  problems: DsaProblem[];
}

/** A concept question — no brute-force/optimized split, just a plain-English explanation. */
export interface ConceptItem {
  name: string;
  explanation: string;
}

export interface ConceptTopic {
  name: string;
  items: ConceptItem[];
}

/** prep[category][topicIndex][itemIndex] = checked. Shared across DSA and concept topics —
 *  a DsaTopic's `problems` and a ConceptTopic's `items` are both indexed the same way. */
export interface PrepState {
  [category: string]: {
    [topicIndex: number]: {
      [itemIndex: number]: boolean;
    };
  };
}

// ---------------- Certificates ----------------

export interface CertTodo {
  name: string;
  target: string;
  link: string;
  done: boolean;
}

export interface CertEarned {
  name: string;
  issuer: string;
  date: string;
  link: string;
}

export interface CertsState {
  todo: CertTodo[];
  earned: CertEarned[];
}
