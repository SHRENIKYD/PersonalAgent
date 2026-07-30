import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { StateService } from './state.service';
import {
  ApiMessage,
  AssistantResponse,
  DisplayEntry,
  Priority,
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
    'Keep replies short and conversational — a sentence or two. Say what you did, not what you',
    'are about to do, and never restate a task list the user can already see on screen unless',
    'they asked for it. Skip preamble.',
    '',
    'For minor choices (a task title\'s wording, normal priority, whether something is one task',
    'or two) decide sensibly and mention it. Ask only when getting it wrong would mean real',
    'rework. Deleting or completing the wrong thing counts as real rework: if a title fragment',
    'is ambiguous, ask which one.',
  ].join('\n');
}

@Injectable({ providedIn: 'root' })
export class AgentService {
  transcript = signal<DisplayEntry[]>([]);
  thinking = signal(false);

  /** Full Anthropic-shaped history. Separate from the transcript, which is display-only. */
  private history: ApiMessage[] = [];

  constructor(private http: HttpClient, private state: StateService) {}

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
      this.replace(pendingIndex, {
        kind: 'error',
        text: 'Could not reach the assistant. Check that the backend is running, then try again.',
      });
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
      const res = await firstValueFrom(
        this.http.post<AssistantResponse>(`${environment.apiBaseUrl}/api/assistant`, {
          messages: this.history,
          system: systemPrompt(),
          tools: TOOLS,
        })
      );

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
          const id = String(input['id'] ?? '').trim();
          if (id !== '') {
            const match = this.state.tasks().find(t => t.id === id);
            if (!match) {
              return { label: 'Could not find that task', result: `No task with id=${id}`, isError: true };
            }
            this.state.toggleTask(match.id, true);
            return { label: `Completed “${match.title}”`, result: `Marked "${match.title}" done.` };
          }

          const fragment = String(input['title'] ?? '').trim();
          if (fragment === '') {
            return { label: 'Rejected an unidentified task', result: 'id or title is required', isError: true };
          }

          const matches = this.state.findTasks(fragment).filter(t => !t.done);
          if (matches.length === 0) {
            return {
              label: `No open task matching “${fragment}”`,
              result: `No open task matches "${fragment}".`,
              isError: true,
            };
          }
          if (matches.length > 1) {
            // Ambiguity is the model's to resolve — change nothing.
            return {
              label: `“${fragment}” matched ${matches.length} tasks`,
              result:
                `Ambiguous — "${fragment}" matches several tasks. Nothing changed. Ask which:\n` +
                matches.map(t => `id=${t.id} | ${t.title}`).join('\n'),
              isError: true,
            };
          }
          this.state.toggleTask(matches[0].id, true);
          return { label: `Completed “${matches[0].title}”`, result: `Marked "${matches[0].title}" done.` };
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
