import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { StateService } from './state.service';
import { SettingsService } from './settings.service';
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
} from '../models';

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

function systemPrompt(): string {
  const now = new Date();
  return [
    "You are Aide, the user's personal assistant. You manage their tasks and notes through tools.",
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
    'For minor choices (a task title\'s wording, normal priority, whether something is one task',
    'or two) decide sensibly and mention it. Ask only when getting it wrong would mean real',
    'rework. Deleting or completing the wrong thing counts as real rework: if a title fragment',
    'is ambiguous, ask which one.',
    '',
    'You also have a web_search tool. Use it when the user asks about something current — a',
    'live rate, recent news, a company\'s latest interview process — that you cannot know from',
    'training alone. Do not use it for the DSA/CS/System Design/Web prep content, workout or',
    'diet plan, or growth roadmap already on screen; read those from the tabs instead. State',
    'facts from search plainly and note they may change; you are not a substitute for a doctor,',
    'financial advisor, or other licensed professional on anything health- or money-related.',
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

@Injectable({ providedIn: 'root' })
export class AgentService {
  transcript = signal<DisplayEntry[]>([]);
  thinking = signal(false);

  /** Full Anthropic-shaped history. Separate from the transcript, which is display-only. */
  private history: ApiMessage[] = [];

  constructor(
    private http: HttpClient,
    private state: StateService,
    private settings: SettingsService
  ) {}

  reset() {
    this.history = [];
    this.transcript.set([]);
  }

  async send(userText: string): Promise<void> {
    const text = userText.trim();
    if (text === '' || this.thinking()) return;

    this.thinking.set(true);
    this.push({ kind: 'user', text });
    this.history.push({ role: 'user', content: text });

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
        this.push({ kind: 'action', text: outcome.label });
        results.push({
          type: 'tool_result',
          tool_use_id: use.id,
          content: outcome.result,
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
    const status = (e as { status?: number } | null)?.status;

    if (e instanceof Error && e.message.startsWith('No API key')) {
      return e.message;
    }

    // Anthropic (and our backend, which passes the body through unchanged) returns
    // {type, error: {type, message}, request_id} on rejection. Angular's HttpErrorResponse
    // puts the parsed body on `.error` — prefer that real message over a guess from the
    // status code alone, since "credit balance too low" and "invalid x-api-key" both land
    // on different status codes than what a reader would expect.
    const apiMessage = (e as { error?: { error?: { message?: string } } } | null)?.error?.error
      ?.message;
    if (typeof apiMessage === 'string' && apiMessage.trim() !== '') {
      return direct ? `Anthropic: ${apiMessage}` : `Backend: ${apiMessage}`;
    }

    if (status === 401 || status === 403) {
      return direct
        ? 'Anthropic rejected the API key. Check it on the Settings tab.'
        : 'The backend rejected the request — check its ANTHROPIC_API_KEY.';
    }
    if (status === 429) {
      return 'Rate limited by Anthropic. Wait a moment and try again.';
    }
    if (status === 0) {
      return direct
        ? 'Could not reach Anthropic. Check your connection.'
        : `Could not reach the backend at ${environment.apiBaseUrl}. Is it running, and does its FRONTEND_ORIGINS allow this page?`;
    }
    if (typeof status === 'number' && status >= 500) {
      return direct
        ? 'Anthropic returned a server error. Try again shortly.'
        : 'The backend returned an error — check its logs.';
    }
    return direct
      ? 'The request to Anthropic failed. See the browser console for details.'
      : 'Could not reach the assistant. Check that the backend is running, then try again.';
  }

  // ---------------- transport ----------------

  /** One request to the model, via whichever transport is configured. */
  private requestTurn(): Promise<AssistantResponse> {
    return this.settings.mode() === 'direct' ? this.requestDirect() : this.requestViaBackend();
  }

  private async requestViaBackend(): Promise<AssistantResponse> {
    return firstValueFrom(
      this.http.post<AssistantResponse>(`${environment.apiBaseUrl}/api/assistant`, {
        messages: this.history,
        system: systemPrompt(),
        tools: ALL_TOOLS,
      })
    );
  }

  /**
   * Straight to Anthropic from the browser. Needs the dangerous-direct-browser-access
   * header — without it the API rejects requests carrying an Origin.
   */
  private async requestDirect(): Promise<AssistantResponse> {
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
          system: systemPrompt(),
          messages: this.history,
          tools: ALL_TOOLS,
        },
        { headers }
      )
    );

    return { content: res.content ?? [], stop_reason: res.stop_reason ?? null };
  }

  // ---------------- tool execution ----------------

  /**
   * Runs one tool against local state. Errors come back as ordinary tool results
   * with is_error set so the model can recover rather than the loop collapsing.
   */
  private execute(use: ToolUseBlock): { label: string; result: string; isError?: boolean } {
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

  private push(entry: DisplayEntry) {
    this.transcript.update(list => [...list, entry]);
  }

  private replace(index: number, entry: DisplayEntry) {
    this.transcript.update(list => {
      if (index < 0 || index >= list.length) return [...list, entry];
      const next = [...list];
      next[index] = entry;
      return next;
    });
  }

  private drop(index: number) {
    this.transcript.update(list => list.filter((_, i) => i !== index));
  }
}
