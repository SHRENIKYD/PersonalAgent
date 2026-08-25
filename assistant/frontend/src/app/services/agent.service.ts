import { Injectable, computed, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Capacitor } from '@capacitor/core';
import { StateService } from './state.service';
import { SettingsService } from './settings.service';
import { LocalLlmService } from './local-llm.service';
import { localPrompt, looksMalformed, parseLocalTurn, promisesAction } from './local-turn';
import {
  ApiMessage,
  AssistantResponse,
  ContentBlock,
  DisplayEntry,
  Priority,
  Task,
  TextBlock,
  ToolDefinition,
  ToolResultBlock,
  ToolUseBlock,
  WorkoutCard,
  ChatCard,
} from '../models';
import {
  WorkoutDay,
  DIET_RULES,
  MACRO_TARGETS,
  NONVEG_MEALS,
  SUPPLEMENTS,
  VEG_MEALS,
  WORKOUT_DAYS,
  absForDay,
  mealTotals,
  musclesFor,
  workoutForDate,
} from '../fitness-data';

/** Splits "Romanian deadlift (light–moderate)" into name and note. */
function splitNote(name: string): { name: string; note?: string } {
  const m = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(name);
  return m ? { name: m[1], note: m[2] } : { name };
}

/** A day label a person would use, rather than a bare ISO date. */
function dayLabel(iso: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const pretty = new Date(`${iso}T12:00:00`).toLocaleDateString(undefined,
    { day: 'numeric', month: 'short', year: 'numeric' });
  if (iso === today) return `Today (${pretty})`;
  if (iso === tomorrow) return `Tomorrow (${pretty})`;
  return pretty;
}

/** The structured twin of the text a workout tool returns. */
function workoutCard(day: WorkoutDay, when: string): WorkoutCard {
  const abs = absForDay(day.name);
  return {
    type: 'workout',
    title: day.name.split(' —')[0].trim(),
    when,
    muscles: musclesFor(day),
    exercises: day.exercises.map(e => ({ ...splitNote(e.name), sets: e.sets })),
    ...(abs ? {
      core: {
        // "Core (Core stability)" reads as a stutter, so a leading "Core " is dropped —
        // the heading already says it.
        focus: abs.focus.replace(/^core\s+/i, ''),
        exercises: abs.exercises.map(e => ({ ...splitNote(e.name), sets: e.sets })),
      },
    } : {}),
  };
}

/** Renders the paired abs block as a trailing line, or '' when a day has none. */
function absCue(dayName: string): string {
  const abs = absForDay(dayName);
  if (!abs) return '';
  return `\nPaired abs (${abs.focus}): ` +
    abs.exercises.map(e => `${e.name} — ${e.sets}`).join('; ');
}

/** Appended to any tool result the UI has already rendered as a card. */
const CARD_SHOWN_NOTE =
  '[UI NOTE] The user is already looking at all of the above, laid out as a card on screen. ' +
  'Do NOT repeat the exercises, sets, reps, meals or macros back to them — they can see it. ' +
  'Reply with only what the card cannot say: which part to prioritise, how it compares to ' +
  'what they lifted last time, an answer to what they actually asked, or nothing more than a ' +
  'short sentence. One or two lines is usually right.';

/** Appended to the history copy of anything that arrived by voice. */
const DICTATED_NOTE =
  '[INPUT NOTE] The above was dictated, so treat it as a phonetic transcript rather than ' +
  'exact wording. Speech recognition substitutes similar-sounding words confidently — ' +
  'product and technical names are the usual casualties. If a phrase reads oddly but a ' +
  'near-homophone would make obvious sense in context, answer the likely intent and say ' +
  'which reading you assumed in a few words. Ask only when the readings differ enough that ' +
  'guessing wrong would waste real effort.';

/** The prose in a response, for checking what the model claimed. */
function textOf(r: AssistantResponse): string {
  return r.content
    .filter(b => b['type'] === 'text')
    .map(b => String((b as { text?: unknown }).text ?? ''))
    .join(' ');
}

/** Guards against a malformed tool loop spinning forever. */
const MAX_TURNS = 8;

const TOOLS: ToolDefinition[] = [
  {
    name: 'add_task',
    description:
      'Add a task to the user\'s task list. Use this whenever the user mentions something ' +
      'they need to do, even in passing. Resolve relative dates ("Friday", "tomorrow") to a ' +
      'concrete date yourself before calling.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short imperative description of the task.' },
        due: { type: 'string', description: 'Due date as YYYY-MM-DD. Omit if genuinely undated.' },
        priority: { type: 'string', enum: ['low', 'normal', 'high'] },
      },
      required: ['title'],
    },
  },
  {
    name: 'list_tasks',
    description:
      'List the user\'s tasks. Call this before answering any question about what they have ' +
      'on, and before completing a task so you can find its id.',
    input_schema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          enum: ['open', 'done', 'all', 'due_today'],
          description: 'Which subset to return. Defaults to open.',
        },
      },
    },
  },
  {
    name: 'complete_task',
    description:
      'Mark a task done. Pass the id from list_tasks, or a title fragment to match on. ' +
      'If a fragment matches several tasks, nothing is changed and you should ask which one.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Exact task id from list_tasks.' },
        title: { type: 'string', description: 'Title fragment, used when no id is known.' },
      },
    },
  },
  {
    name: 'reschedule_task',
    description:
      'Move a task to a different due date. Pass the id from list_tasks, or a title fragment ' +
      'to match on. Resolve relative dates ("next Tuesday") to a concrete date yourself ' +
      'before calling. Pass an empty due to clear the date and leave the task undated.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Exact task id from list_tasks.' },
        title: { type: 'string', description: 'Title fragment, used when no id is known.' },
        due: { type: 'string', description: 'New due date as YYYY-MM-DD, or empty to clear it.' },
      },
      required: ['due'],
    },
  },
  {
    name: 'delete_task',
    description:
      'Delete a task permanently. This takes an id only and will not match on a title — ' +
      'call list_tasks first and pass the exact id. Deletion cannot be undone, so prefer ' +
      'complete_task when the user has simply finished something.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Exact task id from list_tasks.' },
      },
      required: ['id'],
    },
  },
  {
    name: 'tasks_in_range',
    description:
      'List open, dated tasks falling between two dates, inclusive. Use this for questions ' +
      'spanning a period — "what\'s on this week?", "anything next month?" — working out the ' +
      'range yourself from today\'s date.',
    input_schema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Start of the range as YYYY-MM-DD.' },
        to: { type: 'string', description: 'End of the range as YYYY-MM-DD.' },
      },
      required: ['from', 'to'],
    },
  },
  {
    name: 'write_note',
    description:
      'Save a note for later recall — a decision, a reference, something the user wants ' +
      'remembered. Use this rather than trying to hold facts in the conversation.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short title for the note.' },
        body: { type: 'string', description: 'Full note content.' },
      },
      required: ['title', 'body'],
    },
  },
  {
    name: 'edit_note',
    description:
      'Change an existing note\'s title, body, or both. Call search_notes first to get the id. ' +
      'Prefer this over write_note when correcting or extending something already saved — do ' +
      'not create a second note on the same subject. Supply the full replacement body, not a diff.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Exact note id from search_notes.' },
        title: { type: 'string', description: 'Replacement title. Omit to leave it alone.' },
        body: { type: 'string', description: 'Replacement body in full. Omit to leave it alone.' },
      },
      required: ['id'],
    },
  },
  {
    name: 'search_notes',
    description:
      'Search saved notes by keyword across titles and bodies. Call this when the user asks ' +
      'about something they told you previously — notes persist across sessions, chats do not.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Keyword or phrase to look for.' },
      },
      required: ['query'],
    },
  },

  // ---------------- fitness (read-mostly) ----------------
  //
  // These reach the same fitness-data.ts and adherence log the Fitness tab renders, so the
  // assistant answers "what's my workout today?" from the actual plan rather than inventing
  // a plausible-sounding one. Three of the four are read-only on purpose: what the plan says
  // is not the assistant's to edit, and a hallucinated set range is worse than no answer.

  {
    name: 'get_todays_workout',
    description:
      "The user's scheduled session for a given day, with every exercise, set/rep range, the " +
      'muscle groups it loads, and the paired abs block. Call this for "what is my workout ' +
      'today", "what am I training", or before giving any training advice — the split is ' +
      'fixed and written down, so never guess at it. Returns the rest day explicitly when ' +
      'there is no session.',
    input_schema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'ISO date (YYYY-MM-DD). Defaults to today when omitted.',
        },
      },
    },
  },
  {
    name: 'get_workout_day',
    description:
      'Look up any session in the split by name ("Push A", "Legs B") regardless of what day ' +
      'it falls on. Use for "how many sets of squats on leg day" or to compare sessions. ' +
      'Omit the name to list every day in the split.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Session name or prefix, e.g. "Pull B".' },
      },
    },
  },
  {
    name: 'get_diet_plan',
    description:
      'The daily macro targets, the full meal plan (veg or non-veg), supplement schedule, ' +
      'and diet rules. Call this before answering anything about food, macros, protein, or ' +
      'what to eat — including "I skipped lunch, what should I have for dinner", where you ' +
      'need the real targets to work out the shortfall.',
    input_schema: {
      type: 'object',
      properties: {
        variant: {
          type: 'string',
          enum: ['nonveg', 'veg'],
          description: 'Which meal table to return. Defaults to nonveg.',
        },
      },
    },
  },
  {
    name: 'log_fitness',
    description:
      "Mark the day's workout or diet as done, or record a completed set with its weight and " +
      'reps. This is the one fitness tool that writes. Use it when the user reports having ' +
      'done something ("done with legs", "squatted 82.5 for 6") — never to correct the plan.',
    input_schema: {
      type: 'object',
      properties: {
        what: {
          type: 'string',
          enum: ['workout', 'diet', 'set'],
          description: 'workout/diet tick the day off; set records one working set.',
        },
        date: { type: 'string', description: 'ISO date. Defaults to today.' },
        exercise: { type: 'string', description: 'Required when what=set.' },
        weight: { type: 'number', description: 'Kilograms. Required when what=set.' },
        reps: { type: 'number', description: 'Required when what=set.' },
      },
      required: ['what'],
    },
  },
];

/**
 * Anthropic's server-executed web search tool — not one of ours, so it has no case in
 * `execute()`. Anthropic runs the search itself and returns `web_search_tool_result` blocks
 * inline; the browser never sees a `tool_use` for it to answer. Gives the assistant a way to
 * answer "what's current" questions (rates, news, a company's latest process) on request,
 * without us standing up any scraping/news infrastructure of our own.
 */
const WEB_SEARCH_TOOL = { type: 'web_search_20250305', name: 'web_search' };

const ALL_TOOLS: unknown[] = [...TOOLS, WEB_SEARCH_TOOL];

function systemPrompt(hasWebSearch: boolean): string {
  const now = new Date();
  return [
    "You are ECHO, the user's personal assistant. You manage their tasks and notes through tools,",
    'and you know their training split and diet plan.',
    '',
    `Today is ${now.toDateString()} (${now.toISOString().slice(0, 10)}).`,
    'Resolve relative dates against that before calling a tool; never pass "Friday" as a due date.',
    '',
    'Act rather than advise. If the user mentions something they need to do, add it — do not ask',
    'whether they would like you to. Check the actual task list before answering questions about',
    'their commitments; do not guess from the conversation. Search notes when they refer to',
    'something from an earlier session.',
    '',
    'Revise what is already there rather than duplicating it: reschedule a task instead of',
    'adding a second copy, edit a note instead of writing a near-identical one. Deleting a task',
    'needs an id from list_tasks, and editing a note needs an id from search_notes.',
    '',
    'Keep replies short and conversational — a sentence or two. Say what you did, not what you',
    'are about to do, and never restate a task list the user can already see on screen unless',
    'they asked for it. Skip preamble.',
    '',
    'Some tool results are rendered on screen as a card. When a result says so, the user can',
    'already see it — do not restate it in prose. Add judgement instead, or say very little.',
    '',
    'On training and food, read the plan before you answer. get_todays_workout, get_workout_day',
    'and get_diet_plan return what is actually written down; the split and the macro targets are',
    'fixed, so never improvise an exercise, a set range, or a calorie number that a tool could',
    'have told you. When the user reports having trained or eaten, log it with log_fitness rather',
    'than only acknowledging it. You may give coaching judgement on top of the plan — what to',
    'add to dinner to close a protein gap, when a weight looks ready to go up — but say plainly',
    'when you are advising rather than quoting the plan, and do not rewrite the plan itself.',
    '',
    'For minor choices (a task title\'s wording, normal priority, whether something is one task',
    'or two) decide sensibly and mention it. Ask only when getting it wrong would mean real',
    'rework. Deleting or completing the wrong thing counts as real rework: if a title fragment',
    'is ambiguous, ask which one.',
    ...(hasWebSearch
      ? [
          '',
          'You also have a web_search tool. Use it when the user asks about something current —',
          'a live rate, recent news, a company\'s latest interview process — that you cannot know',
          'from training alone. Do not use it for the workout or diet plan, or the growth',
          'roadmap already on screen; read those from the tabs instead. State facts from',
          'search plainly and note they may change; you are not a',
          'substitute for a doctor, financial advisor, or other licensed professional on',
          'anything health- or money-related.',
        ]
      : []),
  ].join('\n');
}

/**
 * Request settings for direct-to-Anthropic mode.
 *
 * The backend keeps its own copy of these in Program.cs — the two are intentionally
 * independent, since in backend mode the browser must not be able to dictate the model or
 * token ceiling. Change one and consider whether the other should follow.
 */
const DIRECT_CONFIG = {
  model: 'claude-opus-5',
  max_tokens: 8000,
  // Adaptive thinking stays on: with tools and thinking disabled, the model can write a
  // tool call into its visible text instead of emitting a tool_use block, and the call
  // then silently never runs.
  thinking: { type: 'adaptive', display: 'summarized' },
  output_config: { effort: 'medium' },
} as const;

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Request settings for direct-to-OpenAI mode. Kept separate from DIRECT_CONFIG (Anthropic)
 * since the two APIs take different shaped bodies entirely.
 */
const OPENAI_MODEL = 'gpt-5.1';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

interface OpenAiToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

interface OpenAiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: OpenAiToolCall[];
  tool_call_id?: string;
}

/** Anthropic-shaped tool defs -> OpenAI's { type: 'function', function: {...} } shape. */
function toOpenAiTools(tools: ToolDefinition[]): unknown[] {
  return tools.map(t => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.input_schema },
  }));
}

/**
 * Translates our internal Anthropic-shaped history into OpenAI's flat message list. The
 * history is authored once, provider-agnostic, and reshaped per request — not stored twice —
 * so switching providers mid-conversation (or the web_search tool, which OpenAI doesn't have
 * in this shape) degrades gracefully rather than needing a parallel history structure.
 */
function toOpenAiMessages(history: ApiMessage[], system: string): OpenAiMessage[] {
  const out: OpenAiMessage[] = [{ role: 'system', content: system }];

  for (const msg of history) {
    if (typeof msg.content === 'string') {
      out.push({ role: msg.role, content: msg.content });
      continue;
    }

    if (msg.role === 'assistant') {
      const text = msg.content
        .filter((b): b is TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('\n\n');
      const toolUses = msg.content.filter((b): b is ToolUseBlock => b.type === 'tool_use');
      out.push({
        role: 'assistant',
        content: text.trim() === '' ? null : text,
        ...(toolUses.length > 0
          ? {
              tool_calls: toolUses.map(tu => ({
                id: tu.id,
                type: 'function' as const,
                function: { name: tu.name, arguments: JSON.stringify(tu.input ?? {}) },
              })),
            }
          : {}),
      });
    } else {
      // A user-turn content array is always tool results in our internal shape (see
      // runLoop) — each becomes its own OpenAI "tool" message.
      for (const block of msg.content) {
        if (block.type === 'tool_result') {
          const tr = block as ToolResultBlock;
          out.push({ role: 'tool', tool_call_id: tr.tool_use_id, content: tr.content });
        }
      }
    }
  }

  return out;
}

/** OpenAI's chat.completions response message -> our internal ContentBlock[] shape. */
function fromOpenAiMessage(message: {
  content?: string | null;
  tool_calls?: OpenAiToolCall[];
}): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  if (message.content && message.content.trim() !== '') {
    blocks.push({ type: 'text', text: message.content } as TextBlock);
  }
  for (const tc of message.tool_calls ?? []) {
    let input: Record<string, unknown> = {};
    try {
      input = JSON.parse(tc.function.arguments || '{}');
    } catch {
      input = {};
    }
    blocks.push({ type: 'tool_use', id: tc.id, name: tc.function.name, input } as ToolUseBlock);
  }
  return blocks;
}

/**
 * Request settings for direct-to-Gemini mode.
 */
// Google retires model ids and refuses them for new users rather than aliasing them
// forward, so this needs updating when that happens — the API says exactly which id to
// move to, and that message is surfaced verbatim in the chat.
const GEMINI_MODEL = 'gemini-3.1-pro-preview';
const GEMINI_URL = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`;

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: { content: string } };
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

/** Anthropic-shaped tool defs -> Gemini's { functionDeclarations: [...] } shape. */
function toGeminiTools(tools: ToolDefinition[]): unknown[] {
  return [
    {
      functionDeclarations: tools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.input_schema,
      })),
    },
  ];
}

/**
 * Translates our internal Anthropic-shaped history into Gemini's `contents` list. Gemini has
 * no separate "tool" role — a function result is a `user` turn carrying a `functionResponse`
 * part — and a `functionResponse` must carry the function's *name*, not just an id, so a
 * running id -> name map is built as assistant turns are walked (Gemini itself never gives
 * function calls a stable id the way Anthropic/OpenAI do).
 */
function toGeminiContents(history: ApiMessage[]): GeminiContent[] {
  const out: GeminiContent[] = [];
  const nameById = new Map<string, string>();

  for (const msg of history) {
    if (typeof msg.content === 'string') {
      out.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] });
      continue;
    }

    if (msg.role === 'assistant') {
      const parts: GeminiPart[] = [];
      for (const block of msg.content) {
        if (block.type === 'text') {
          parts.push({ text: (block as TextBlock).text });
        } else if (block.type === 'tool_use') {
          const tu = block as ToolUseBlock;
          nameById.set(tu.id, tu.name);
          parts.push({ functionCall: { name: tu.name, args: tu.input ?? {} } });
        }
      }
      if (parts.length > 0) out.push({ role: 'model', parts });
    } else {
      const parts: GeminiPart[] = [];
      for (const block of msg.content) {
        if (block.type === 'tool_result') {
          const tr = block as ToolResultBlock;
          const name = nameById.get(tr.tool_use_id) ?? 'unknown_tool';
          parts.push({ functionResponse: { name, response: { content: tr.content } } });
        }
      }
      if (parts.length > 0) out.push({ role: 'user', parts });
    }
  }

  return out;
}

/** Gemini's generateContent response candidate -> our internal ContentBlock[] shape. */
function fromGeminiParts(parts: GeminiPart[] | undefined): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  let callIndex = 0;
  for (const part of parts ?? []) {
    if (part.text) {
      blocks.push({ type: 'text', text: part.text } as TextBlock);
    } else if (part.functionCall) {
      blocks.push({
        type: 'tool_use',
        id: `gemini_call_${callIndex++}`,
        name: part.functionCall.name,
        input: part.functionCall.args ?? {},
      } as ToolUseBlock);
    }
  }
  return blocks;
}

@Injectable({ providedIn: 'root' })
export class AgentService {
  transcript = signal<DisplayEntry[]>([]);
  thinking = signal(false);

  /** Full Anthropic-shaped history. Separate from the transcript, which is display-only. */
  private history: ApiMessage[] = [];

  constructor(
    private http: HttpClient,
    private state: StateService,
    private settings: SettingsService,
    private local: LocalLlmService
  ) {}

  reset() {
    this.history = [];
    this.transcript.set([]);
  }

  /**
   * `dictated` marks text that came from speech recognition rather than a keyboard. The
   * model cannot otherwise tell, and the two need reading differently: a recogniser
   * substitutes phonetically similar words with total confidence — "GenAI" arrives as
   * "Jain AI" — and answering the words as written is then confidently wrong.
   *
   * The hint rides on the history copy only. The transcript keeps the clean text, so the
   * screen shows what was said rather than an annotation.
   */
  async send(userText: string, opts: { dictated?: boolean } = {}): Promise<void> {
    const text = userText.trim();
    if (text === '' || this.thinking()) return;

    this.thinking.set(true);
    this.push({ kind: 'user', text });
    this.history.push({
      role: 'user',
      content: opts.dictated ? `${text}\n\n${DICTATED_NOTE}` : text,
    });

    const pendingIndex = this.transcript().length;
    this.push({ kind: 'assistant', text: 'Thinking…', pending: true });

    try {
      await this.runLoop(pendingIndex);
    } catch (e) {
      console.error('Assistant request failed', e);
      this.replace(pendingIndex, { kind: 'error', text: this.explainFailure(e) });
    } finally {
      this.thinking.set(false);
    }
  }

  /**
   * The agent loop. Each pass sends the history, executes any tools the model asked
   * for against local state, and feeds the results back. Ends when the model replies
   * without requesting a tool.
   */
  private async runLoop(pendingIndex: number): Promise<void> {
    let slot = pendingIndex;

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const res = await this.requestTurn();
      const blocks = res.content ?? [];

      // Echo the assistant turn back verbatim. Thinking blocks in particular must
      // round-trip unmodified or the next request is rejected.
      this.history.push({ role: 'assistant', content: blocks });

      const toolUses = blocks.filter((b): b is ToolUseBlock => b.type === 'tool_use');
      const said = blocks
        .filter((b): b is TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('\n\n')
        .trim();

      if (toolUses.length === 0) {
        this.replace(slot, {
          kind: 'assistant',
          text: said === '' ? 'Done.' : said,
        });
        return;
      }

      // Mid-loop commentary is worth showing — it explains the actions that follow.
      if (said !== '') {
        this.replace(slot, { kind: 'assistant', text: said });
      } else {
        this.drop(slot);
      }

      const results: ToolResultBlock[] = [];
      for (const use of toolUses) {
        const outcome = this.execute(use);
        // A card replaces the one-line action label: it says everything the label did and
        // then some, and two rows describing the same call is noise.
        if (outcome.card) this.push({ kind: 'card', text: outcome.label, card: outcome.card });
        else this.push({ kind: 'action', text: outcome.label });
        results.push({
          type: 'tool_result',
          tool_use_id: use.id,
          // The model cannot see the screen, so without being told it re-lists the plan it
          // just fetched and the user reads the same six exercises twice. Saying so at the
          // result — rather than only in the system prompt — puts the instruction next to
          // the data it applies to, where it is hardest to ignore.
          content: outcome.card ? `${outcome.result}\n\n${CARD_SHOWN_NOTE}` : outcome.result,
          ...(outcome.isError ? { is_error: true } : {}),
        });
      }

      // All results for one assistant turn go back in a single user message.
      this.history.push({ role: 'user', content: results });

      slot = this.transcript().length;
      this.push({ kind: 'assistant', text: 'Working…', pending: true });
    }

    this.replace(slot, {
      kind: 'error',
      text: 'Stopped after too many steps without finishing. Try rephrasing that.',
    });
  }

  /**
   * Turns a failed request into something the user can act on. The two modes fail in
   * different ways, and "something went wrong" sends people to the wrong place —
   * a 401 in direct mode is a bad key, not a broken app.
   */
  private explainFailure(e: unknown): string {
    const direct = this.settings.mode() === 'direct';
    const providerName = !direct
      ? 'Anthropic'
      : this.settings.provider() === 'openai'
      ? 'OpenAI'
      : this.settings.provider() === 'gemini'
      ? 'Gemini'
      : 'Anthropic';
    const status = (e as { status?: number } | null)?.status;

    if (e instanceof Error && e.message.startsWith('No API key')) {
      return e.message;
    }

    // Anthropic (and our backend, which passes the body through unchanged) returns
    // {type, error: {type, message}, request_id} on rejection — the message is nested two
    // levels deep. OpenAI's shape is flatter: {error: {message, type, param, code}}. Angular's
    // HttpErrorResponse puts the parsed body on `.error` either way — prefer whichever shape
    // actually has a message over a guess from the status code alone, since "credit balance
    // too low" and "invalid api key" both land on different status codes than expected.
    const err = (e as { error?: { error?: { message?: string }; message?: string } } | null)?.error;
    const apiMessage = err?.error?.message ?? err?.message;
    if (typeof apiMessage === 'string' && apiMessage.trim() !== '') {
      return direct ? `${providerName}: ${apiMessage}` : `Backend: ${apiMessage}`;
    }

    if (status === 401 || status === 403) {
      return direct
        ? `${providerName} rejected the API key. Check it on the Settings tab.`
        : 'The backend rejected the request — check its ANTHROPIC_API_KEY.';
    }
    if (status === 429) {
      return `Rate limited by ${providerName}. Wait a moment and try again.`;
    }
    if (status === 0) {
      return direct
        ? `Could not reach ${providerName}. Check your connection.`
        : Capacitor.isNativePlatform()
          ? `This app is set to Backend mode, which expects a server at ${environment.apiBaseUrl} — ` +
            'a localhost address that cannot exist on a phone. Open Settings and switch to ' +
            '"Direct from browser", then add an API key.'
          : `Could not reach the backend at ${environment.apiBaseUrl}. Is it running, and does its FRONTEND_ORIGINS allow this page?`;
    }
    if (typeof status === 'number' && status >= 500) {
      return direct
        ? `${providerName} returned a server error. Try again shortly.`
        : 'The backend returned an error — check its logs.';
    }
    return direct
      ? `The request to ${providerName} failed. See the browser console for details.`
      : 'Could not reach the assistant. Check that the backend is running, then try again.';
  }

  // ---------------- transport ----------------

  /**
   * Whether the assistant can answer at all. A loaded on-device model counts: it needs no
   * key, so gating on the key alone told the user to add one while a working model sat
   * loaded on the phone.
   */
  ready = computed(() =>
    (this.local.available && this.local.loaded()) || this.settings.ready()
  );

  /** One request to the model, via whichever transport is configured. */
  private requestTurn(): Promise<AssistantResponse> {
    // The on-device model wins when it is actually loaded, whatever else is configured —
    // choosing it is the point of loading it, and it costs nothing per message.
    if (this.local.available && this.local.loaded()) return this.requestLocal();
    return this.settings.mode() === 'direct' ? this.requestDirect() : this.requestViaBackend();
  }

  /**
   * One turn from the model running on the phone.
   *
   * It has no tool-calling API, so the protocol lives in the prompt and is parsed back out.
   * A reply that is cut off mid-object earns exactly one retry with a blunter instruction —
   * more than that and a confused small model just burns seconds it cannot spare.
   */
  private async requestLocal(): Promise<AssistantResponse> {
    const today = new Date().toISOString().slice(0, 10);
    const known = new Set(TOOLS.map(t => t.name));

    let raw = (await this.local.generate(localPrompt(this.history, TOOLS, today)))?.text ?? '';
    if (looksMalformed(raw)) {
      const firmer = localPrompt(this.history, TOOLS, today) +
        '\n\nYour last reply was not valid JSON. Reply with one JSON object and nothing else.';
      raw = (await this.local.generate(firmer))?.text ?? '';
    }

    if (raw.trim() === '') {
      throw new Error('The on-device model returned nothing. It may have run out of memory.');
    }

    let parsed = parseLocalTurn(raw, known);

    // A reply that announces work without calling anything is the worst failure available
    // here: it reads as success and nothing happened. One firm retry usually converts it
    // into the tool call it was describing.
    if (parsed.stop_reason === 'end_turn' && promisesAction(textOf(parsed))) {
      const insist = localPrompt(this.history, TOOLS, today) +
        '\n\nDo not describe what you are about to do. If the request needs a tool, emit the ' +
        'tool call JSON now. If it does not, answer plainly without claiming any action.';
      const second = (await this.local.generate(insist))?.text ?? '';
      if (second.trim() !== '') {
        const retry = parseLocalTurn(second, known);
        // Keep the retry only if it actually improved on the promise.
        if (retry.stop_reason === 'tool_use' || !promisesAction(textOf(retry))) parsed = retry;
      }
    }

    return parsed;
  }

  private async requestViaBackend(): Promise<AssistantResponse> {
    return firstValueFrom(
      this.http.post<AssistantResponse>(`${environment.apiBaseUrl}/api/assistant`, {
        messages: this.history,
        system: systemPrompt(true),
        tools: ALL_TOOLS,
      })
    );
  }

  /** One request to whichever provider direct mode is currently set to. */
  private requestDirect(): Promise<AssistantResponse> {
    switch (this.settings.provider()) {
      case 'openai': return this.requestDirectOpenAi();
      case 'gemini': return this.requestDirectGemini();
      default: return this.requestDirectAnthropic();
    }
  }

  /**
   * Straight to Anthropic from the browser. Needs the dangerous-direct-browser-access
   * header — without it the API rejects requests carrying an Origin.
   */
  private async requestDirectAnthropic(): Promise<AssistantResponse> {
    const key = this.settings.apiKey().trim();
    if (key === '') {
      throw new Error('No API key set. Add one on the Settings tab.');
    }

    const headers = new HttpHeaders({
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    });

    const res = await firstValueFrom(
      this.http.post<{ content?: ContentBlock[]; stop_reason?: string | null }>(
        ANTHROPIC_URL,
        {
          ...DIRECT_CONFIG,
          system: systemPrompt(true),
          messages: this.history,
          tools: ALL_TOOLS,
        },
        { headers }
      )
    );

    return { content: res.content ?? [], stop_reason: res.stop_reason ?? null };
  }

  /**
   * Straight to OpenAI's Chat Completions API. No dangerous-browser-access header needed —
   * OpenAI's API is designed to be called with just a Bearer token. web_search is Anthropic's
   * server tool and has no OpenAI equivalent in this shape, so it's left out here entirely;
   * the system prompt only claims that capability when it's actually being sent.
   */
  private async requestDirectOpenAi(): Promise<AssistantResponse> {
    const key = this.settings.openaiApiKey().trim();
    if (key === '') {
      throw new Error('No API key set. Add one on the Settings tab.');
    }

    const headers = new HttpHeaders({
      'content-type': 'application/json',
      authorization: `Bearer ${key}`,
    });

    const res = await firstValueFrom(
      this.http.post<{
        choices?: { message: { content?: string | null; tool_calls?: OpenAiToolCall[] } }[];
      }>(
        OPENAI_URL,
        {
          model: OPENAI_MODEL,
          messages: toOpenAiMessages(this.history, systemPrompt(false)),
          tools: toOpenAiTools(TOOLS),
        },
        { headers }
      )
    );

    const message = res.choices?.[0]?.message;
    return { content: message ? fromOpenAiMessage(message) : [], stop_reason: null };
  }

  /**
   * Straight to Gemini's generateContent API. The key goes in the URL as a query param —
   * that's Gemini's own convention, not a choice made here. Same web_search caveat as
   * OpenAI: no equivalent tool sent, and the system prompt reflects that.
   */
  private async requestDirectGemini(): Promise<AssistantResponse> {
    const key = this.settings.geminiApiKey().trim();
    if (key === '') {
      throw new Error('No API key set. Add one on the Settings tab.');
    }

    const res = await firstValueFrom(
      this.http.post<{ candidates?: { content?: { parts?: GeminiPart[] } }[] }>(
        GEMINI_URL(key),
        {
          contents: toGeminiContents(this.history),
          systemInstruction: { parts: [{ text: systemPrompt(false) }] },
          tools: toGeminiTools(TOOLS),
        }
      )
    );

    const parts = res.candidates?.[0]?.content?.parts;
    return { content: fromGeminiParts(parts), stop_reason: null };
  }

  // ---------------- tool execution ----------------

  /**
   * Runs one tool against local state. Errors come back as ordinary tool results
   * with is_error set so the model can recover rather than the loop collapsing.
   */
  private execute(use: ToolUseBlock): { label: string; result: string; isError?: boolean; card?: ChatCard } {
    const input = use.input ?? {};

    try {
      switch (use.name) {
        case 'add_task': {
          const title = String(input['title'] ?? '').trim();
          if (title === '') {
            return { label: 'Rejected an empty task', result: 'title is required', isError: true };
          }
          const due = String(input['due'] ?? '');
          const priority = (input['priority'] as Priority | undefined) ?? 'normal';
          const task = this.state.addTask(title, due, priority);
          return {
            label: `Added task “${task.title}”${due ? ` (due ${due})` : ''}`,
            result: `Added task id=${task.id} title="${task.title}" due="${due || 'none'}" priority=${priority}`,
          };
        }

        case 'list_tasks': {
          const filter = String(input['filter'] ?? 'open');
          const list =
            filter === 'all' ? this.state.tasks()
            : filter === 'done' ? this.state.doneTasks()
            : filter === 'due_today' ? this.state.dueToday()
            : this.state.openTasks();

          const body = list.length === 0
            ? 'No matching tasks.'
            : list
                .map(t => `id=${t.id} | ${t.title} | due=${t.due || 'none'} | ${t.priority}${t.done ? ' | done' : ''}`)
                .join('\n');
          return { label: `Read the task list (${list.length})`, result: body };
        }

        case 'complete_task': {
          const found = this.resolveTask(input, { openOnly: true });
          if ('label' in found) return found;
          this.state.toggleTask(found.task.id, true);
          return {
            label: `Completed “${found.task.title}”`,
            result: `Marked "${found.task.title}" done.`,
          };
        }

        case 'reschedule_task': {
          const found = this.resolveTask(input, { openOnly: true });
          if ('label' in found) return found;
          const due = String(input['due'] ?? '');
          this.state.updateTaskDue(found.task.id, due);
          return {
            label: due === ''
              ? `Cleared the date on “${found.task.title}”`
              : `Moved “${found.task.title}” to ${due}`,
            result: `"${found.task.title}" is now due ${due || 'nothing (undated)'}.`,
          };
        }

        case 'delete_task': {
          // id only, by design — see the tool description.
          const id = String(input['id'] ?? '').trim();
          if (id === '') {
            return {
              label: 'Refused a delete without an id',
              result: 'id is required. Call list_tasks first and pass the exact id.',
              isError: true,
            };
          }
          const match = this.state.tasks().find(t => t.id === id);
          if (!match) {
            return { label: 'Could not find that task', result: `No task with id=${id}`, isError: true };
          }
          this.state.removeTask(match.id);
          return { label: `Deleted “${match.title}”`, result: `Deleted "${match.title}".` };
        }

        case 'tasks_in_range': {
          const from = String(input['from'] ?? '').trim();
          const to = String(input['to'] ?? '').trim();
          if (from === '' || to === '') {
            return {
              label: 'Rejected an incomplete range',
              result: 'from and to are both required, as YYYY-MM-DD',
              isError: true,
            };
          }
          const hits = this.state.tasksInRange(from, to);
          const body = hits.length === 0
            ? `No open dated tasks between ${from} and ${to}.`
            : hits
                .map(t => `id=${t.id} | ${t.title} | due=${t.due} | ${t.priority}`)
                .join('\n');
          return { label: `Checked ${from} to ${to} (${hits.length})`, result: body };
        }

        case 'write_note': {
          const title = String(input['title'] ?? '').trim();
          const body = String(input['body'] ?? '');
          if (title === '') {
            return { label: 'Rejected an untitled note', result: 'title is required', isError: true };
          }
          const note = this.state.addNote(title, body);
          return { label: `Saved note “${note.title}”`, result: `Saved note id=${note.id}.` };
        }

        case 'edit_note': {
          const id = String(input['id'] ?? '').trim();
          if (id === '') {
            return {
              label: 'Refused a note edit without an id',
              result: 'id is required. Call search_notes first and pass the exact id.',
              isError: true,
            };
          }
          const note = this.state.notes().find(n => n.id === id);
          if (!note) {
            return { label: 'Could not find that note', result: `No note with id=${id}`, isError: true };
          }

          // Only apply fields actually supplied, so a title-only edit keeps the body.
          const fields: { title?: string; body?: string } = {};
          if (input['title'] !== undefined) fields.title = String(input['title']);
          if (input['body'] !== undefined) fields.body = String(input['body']);
          if (fields.title === undefined && fields.body === undefined) {
            return {
              label: 'Nothing to change on that note',
              result: 'Supply title, body, or both.',
              isError: true,
            };
          }

          this.state.updateNote(note.id, fields);
          return {
            label: `Updated note “${fields.title ?? note.title}”`,
            result: `Updated note id=${note.id}.`,
          };
        }

        case 'search_notes': {
          const query = String(input['query'] ?? '');
          const hits = this.state.findNotes(query);
          const body = hits.length === 0
            ? `No notes match "${query}".`
            : hits.map(n => `id=${n.id} | ${n.title}\n${n.body}`).join('\n\n');
          return { label: `Searched notes for “${query}” (${hits.length})`, result: body };
        }

        // ---------------- fitness ----------------

        case 'get_todays_workout': {
          const iso = String(input['date'] ?? '').trim();
          const when = iso ? new Date(`${iso}T12:00:00`) : new Date();
          if (Number.isNaN(when.getTime())) {
            return { label: 'Bad date', result: `Not a valid date: "${iso}"`, isError: true };
          }
          const day = workoutForDate(when);
          const label = iso || when.toISOString().slice(0, 10);
          if (!day) {
            return {
              label: `Checked the plan for ${label}`,
              result: `${label} is a rest day — no session scheduled.`,
            };
          }
          return {
            card: workoutCard(day, dayLabel(label)),
            label: `Read the plan for ${label} (${day.name.split(' —')[0]})`,
            result: [
              `Session: ${day.name}`,
              `Muscle groups: ${musclesFor(day).join(', ') || 'unspecified'}`,
              '',
              ...day.exercises.map(e => `- ${e.group ? `[${e.group}] ` : ''}${e.name} — ${e.sets}`),
              day.extra ? `\nNote: ${day.extra}` : '',
              absCue(day.name),
            ].filter(Boolean).join('\n'),
          };
        }

        case 'get_workout_day': {
          const name = String(input['name'] ?? '').trim().toLowerCase();
          if (name === '') {
            return {
              label: 'Listed the full split',
              result: WORKOUT_DAYS.map(d => `${d.name} (${d.exercises.length} exercises)`).join('\n'),
            };
          }
          const day = WORKOUT_DAYS.find(d => d.name.toLowerCase().startsWith(name));
          if (!day) {
            return {
              label: `No session named “${name}”`,
              result: `No such day. The split is: ${WORKOUT_DAYS.map(d => d.name.split(' —')[0]).join(', ')}.`,
              isError: true,
            };
          }
          return {
            card: workoutCard(day, ''),
            label: `Read ${day.name.split(' —')[0]}`,
            result: [
              `Session: ${day.name}`,
              ...day.exercises.map(e => `- ${e.group ? `[${e.group}] ` : ''}${e.name} — ${e.sets}`),
              absCue(day.name),
            ].filter(Boolean).join('\n'),
          };
        }

        case 'get_diet_plan': {
          const veg = String(input['variant'] ?? 'nonveg') === 'veg';
          const meals = veg ? VEG_MEALS : NONVEG_MEALS;
          const totals = mealTotals(meals);
          return {
            card: {
              type: 'diet',
              title: `${veg ? 'Veg' : 'Non-veg'} day`,
              targets: `${MACRO_TARGETS.kcal} kcal · ${MACRO_TARGETS.protein} g protein · ` +
                       `${MACRO_TARGETS.carbs} g carbs · ${MACRO_TARGETS.fat} g fat`,
              meals: meals.map(m => ({ meal: m.meal, food: m.food, protein: m.protein, calories: m.calories })),
            },
            label: `Read the ${veg ? 'veg' : 'non-veg'} diet plan`,
            result: [
              `Targets: ${MACRO_TARGETS.kcal} kcal, protein ${MACRO_TARGETS.protein} g, ` +
                `carbs ${MACRO_TARGETS.carbs} g, fat ${MACRO_TARGETS.fat} g.`,
              `Plan as written totals ${totals.calories} kcal and ${totals.protein} g protein.`,
              '',
              ...meals.map(m => `- ${m.meal}: ${m.food} (${m.protein}, ${m.calories} kcal)`),
              '',
              'Rules:',
              ...DIET_RULES.map(r => `- ${r}`),
              '',
              'Supplements:',
              ...SUPPLEMENTS.map(x => `- ${x.supplement} — ${x.when}. ${x.notes}`),
            ].join('\n'),
          };
        }

        case 'log_fitness': {
          const what = String(input['what'] ?? '');
          const date = String(input['date'] ?? '').trim() || new Date().toISOString().slice(0, 10);

          if (what === 'workout' || what === 'diet') {
            this.state.toggleFitnessLog(`${date}:${what}`, true);
            return {
              label: `Logged ${what} for ${date}`,
              result: `Marked ${what} done on ${date}. Week adherence is now ${this.state.fitnessWeekProgress().pct}%.`,
            };
          }

          if (what === 'set') {
            const exercise = String(input['exercise'] ?? '').trim();
            const weight = Number(input['weight']);
            const reps = Number(input['reps']);
            if (!exercise || !Number.isFinite(weight) || !Number.isFinite(reps)) {
              return {
                label: 'Rejected an incomplete set',
                result: 'what=set needs exercise, weight and reps.',
                isError: true,
              };
            }
            const prev = this.state.lastSession(exercise, date);
            this.state.logSet(date, exercise, weight, reps);
            const compare = prev
              ? ` Last time (${prev.date}): ${prev.sets.map(x => `${x.weight}×${x.reps}`).join(', ')}.`
              : ' First time this is logged.';
            return {
              label: `Logged ${exercise} ${weight} kg × ${reps}`,
              result: `Recorded ${exercise} ${weight} kg × ${reps} on ${date}.${compare}`,
            };
          }

          return { label: 'Unknown log target', result: `what must be workout, diet or set.`, isError: true };
        }

        default:
          return { label: `Unknown tool ${use.name}`, result: `No such tool: ${use.name}`, isError: true };
      }
    } catch (e) {
      console.error('Tool execution failed', use.name, e);
      return {
        label: `${use.name} failed`,
        result: `Tool threw: ${e instanceof Error ? e.message : String(e)}`,
        isError: true,
      };
    }
  }

  /**
   * Resolves a task from either an exact id or a title fragment.
   *
   * An ambiguous fragment resolves to nothing and returns the candidates: acting on the
   * wrong task is real rework, so the model is made to ask instead. Callers distinguish
   * the two outcomes with `'label' in result`.
   */
  private resolveTask(
    input: Record<string, unknown>,
    opts: { openOnly: boolean }
  ): { task: Task } | { label: string; result: string; isError: true } {
    const id = String(input['id'] ?? '').trim();
    if (id !== '') {
      const match = this.state.tasks().find(t => t.id === id);
      if (!match) {
        return { label: 'Could not find that task', result: `No task with id=${id}`, isError: true };
      }
      return { task: match };
    }

    const fragment = String(input['title'] ?? '').trim();
    if (fragment === '') {
      return { label: 'Rejected an unidentified task', result: 'id or title is required', isError: true };
    }

    const matches = this.state
      .findTasks(fragment)
      .filter(t => (opts.openOnly ? !t.done : true));

    if (matches.length === 0) {
      const scope = opts.openOnly ? 'open task' : 'task';
      return {
        label: `No ${scope} matching “${fragment}”`,
        result: `No ${scope} matches "${fragment}".`,
        isError: true,
      };
    }
    if (matches.length > 1) {
      return {
        label: `“${fragment}” matched ${matches.length} tasks`,
        result:
          `Ambiguous — "${fragment}" matches several tasks. Nothing changed. Ask which:\n` +
          matches.map(t => `id=${t.id} | ${t.title}`).join('\n'),
        isError: true,
      };
    }
    return { task: matches[0] };
  }

  // ---------------- transcript helpers ----------------

  /** Stamped centrally so no call site can forget, and a pending row keeps its own time. */
  private push(entry: DisplayEntry) {
    this.transcript.update(list => [...list, { at: Date.now(), ...entry }]);
  }

  private replace(index: number, entry: DisplayEntry) {
    this.transcript.update(list => {
      if (index < 0 || index >= list.length) return [...list, { at: Date.now(), ...entry }];
      const next = [...list];
      // Keeps the time the slot was first created — a reply is timed from when the exchange
      // started, not from when the last token happened to arrive.
      next[index] = { at: list[index]?.at ?? Date.now(), ...entry };
      return next;
    });
  }

  private drop(index: number) {
    this.transcript.update(list => list.filter((_, i) => i !== index));
  }
}
