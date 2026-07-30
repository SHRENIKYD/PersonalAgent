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
  | 'fitness'
  | 'news'
  | 'dsa'
  | 'java'
  | 'cs'
  | 'sysdesign'
  | 'web'
  | 'interview'
  | 'certs'
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

// ---------------- Interview prep ----------------

export type PrepCategoryKey = 'dsa' | 'java' | 'cs' | 'sysdesign' | 'web' | 'interview';

/** dsa[topicIndex][problemIndex] = checked */
export interface Approach {
  description: string;
  time: string;   // Big-O, e.g. "O(n^2)"
  space: string;  // Big-O, e.g. "O(1)"
  /** Optional pseudocode for this approach — shown as a code block under the description. */
  pseudocode?: string;
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
  /** When present, the topic renders as a teaching narrative instead of independent problem
   *  cards — see NarrativeTopic below. `problems` is ignored for progress counting in that
   *  case (see PREP_TOPIC_SIZES in state.service.ts). */
  narrative?: NarrativeTopic;
}

/**
 * A concept question — no brute-force/optimized split, just clean study notes: what it is,
 * how it actually works, a concrete example or pseudocode where one clarifies the mechanism,
 * and why it's the kind of thing interviewers actually ask about.
 */
export interface ConceptItem {
  name: string;
  definition: string;
  howItWorks: string;
  /** Pseudocode, a code snippet, or a worked example — omitted when prose alone is clearer. */
  example?: string;
  whyItMatters: string;
}

export interface ConceptTopic {
  name: string;
  items: ConceptItem[];
  /** Same narrative-teaching-arc shape as DsaTopic's, for concept tabs (CS/SysDesign/Web)
   *  once they're migrated. `items` is ignored for progress counting in that case. */
  narrative?: NarrativeTopic;
}

/**
 * One concept taught as a step in a progression, not an isolated fact — each one exists to
 * fix a specific weakness in the one before it, and explicitly sets up the one after it.
 * Modeled after a real class-notes structure: why this is being introduced, a plain
 * definition, two concrete numeric/worked walkthroughs, code, and what it unlocks next.
 */
export interface NarrativeConcept {
  name: string;
  whyThisExists: string;
  /** The mental checklist before being told the technique — what to notice/ask yourself
   *  when a problem like this first shows up, distinct from the definition of the fix. */
  howToApproach: string;
  definitionLabel: string;
  definition: string;
  inSimpleWords: string;
  /** Exactly two worked examples, traced through with real numbers/values. */
  examples: [string, string];
  /** Pseudocode/code for this step. Omitted for non-code concepts (e.g. a prompting pattern). */
  code?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  whatThisUnlocks: string;
}

export interface NarrativeSummaryRow {
  concept: string;
  formula: string;
}

export interface NarrativeSelfTestItem {
  question: string;
  answer: string;
}

export interface NarrativeTopic {
  concepts: NarrativeConcept[];
  summary: NarrativeSummaryRow[];
  selfTest: NarrativeSelfTestItem[];
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

// ---------------- cross-device sync ----------------

/** Everything that syncs across devices via SyncService — one device's full data. */
export interface SyncPayload {
  tasks: Task[];
  notes: Note[];
  roadmap: RoadmapState;
  prep: PrepState;
  certs: CertsState;
  fitnessLog: Record<string, boolean>;
}
