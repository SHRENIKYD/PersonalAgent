import { ApiMessage, AssistantResponse, ToolDefinition } from '../models';

/**
 * Turning a small on-device model into something the agent loop can consume.
 *
 * The cloud providers all have real tool-calling APIs. A 1.5B model running through
 * MediaPipe has none — it emits plain text and nothing more. So the protocol is carried in
 * the prompt and parsed back out here, and it is deliberately narrower than what the cloud
 * models are given:
 *
 *   - one tool call per turn, never a list. Small models lose track partway through a batch.
 *   - a flat JSON object, no nesting, no ids. Ids are generated here instead of trusted.
 *   - tools described in one line each. A 1.5B model given thirteen full JSON schemas
 *     spends its whole context on the schemas and answers with none of it.
 */

/** Small models drift after a few exchanges; only the tail is worth sending. */
const HISTORY_TURNS = 6;

export function localPrompt(
  history: ApiMessage[],
  tools: ToolDefinition[],
  today: string,
): string {
  const menu = tools
    .map(t => `- ${t.name}(${Object.keys(t.input_schema.properties).join(', ')}): ${firstSentence(t.description)}`)
    .join('\n');

  const transcript = history
    .slice(-HISTORY_TURNS)
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${renderContent(m.content)}`)
    .join('\n');

  return [
    'You are ECHO, a personal assistant. Today is ' + today + '.',
    '',
    'You may use one tool per reply. To use a tool, reply with ONLY a JSON object:',
    '{"tool": "<name>", "args": {...}}',
    'To answer the user instead, reply with ONLY a JSON object:',
    '{"say": "<your reply>"}',
    'No prose outside the JSON. No markdown fences. One object, nothing else.',
    '',
    // A small model will happily announce work it never did. Saying so plainly, and showing
    // it, is worth more than any amount of instruction about JSON formatting.
    'NEVER claim you did something unless a tool result above shows you did it. Do not say',
    '"I have rescheduled it" or "retrieving your tasks" — call the tool instead. Anything you',
    'only describe does not happen.',
    '',
    'Examples:',
    'User: add a task to buy milk',
    'Assistant: {"tool": "add_task", "args": {"title": "Buy milk"}}',
    'User: move the lease task to next Monday',
    'Assistant: {"tool": "list_tasks", "args": {}}',
    'User: (tool result: 1. Renew the lease [id t3] due 2026-08-28)',
    'Assistant: {"tool": "reschedule_task", "args": {"id": "t3", "due": "2026-08-31"}}',
    'User: (tool result: rescheduled)',
    'Assistant: {"say": "Moved the lease renewal to Monday the 31st."}',
    '',
    'Tools:',
    menu,
    '',
    transcript,
    'Assistant:',
  ].join('\n');
}

/**
 * Reads whatever the model produced back into the shape the agent loop expects.
 *
 * Everything here assumes the model got it slightly wrong, because it usually will: fences
 * around the JSON, a sentence before it, a trailing comma, the whole thing as prose. Prose
 * is not an error — it becomes a plain answer, which is the right outcome for "how are you".
 */
export function parseLocalTurn(raw: string, known: Set<string>): AssistantResponse {
  const text = (raw ?? '').trim();
  const obj = extractJson(text);

  if (obj && typeof obj['tool'] === 'string' && known.has(obj['tool'] as string)) {
    const args = obj['args'];
    return {
      content: [
        {
          type: 'tool_use',
          // The model is not asked for an id and would not keep one stable if it were.
          id: 'local_' + Math.random().toString(36).slice(2, 10),
          name: obj['tool'] as string,
          input: args && typeof args === 'object' ? (args as Record<string, unknown>) : {},
        },
      ],
      stop_reason: 'tool_use',
    };
  }

  if (obj && typeof obj['say'] === 'string') {
    return { content: [{ type: 'text', text: obj['say'] as string }], stop_reason: 'end_turn' };
  }

  if (obj && typeof obj['tool'] !== 'string') {
    const values = Object.values(obj).filter((v): v is string => typeof v === 'string');
    if (values.length === 1) {
      return { content: [{ type: 'text', text: cleanProse(values[0]) }], stop_reason: 'end_turn' };
    }
  }

  // A tool name that does not exist is worth naming rather than silently answering as prose,
  // otherwise the user sees a confident reply about work that never happened.
  if (obj && typeof obj['tool'] === 'string') {
    return {
      content: [{
        type: 'text',
        text: `I tried to use a tool called "${obj['tool']}", which does not exist. Try rephrasing.`,
      }],
      stop_reason: 'end_turn',
    };
  }

  return { content: [{ type: 'text', text: cleanProse(text) }], stop_reason: 'end_turn' };
}

/** True when the reply is unusable enough to be worth one retry with a firmer instruction. */
export function looksMalformed(raw: string): boolean {
  const t = (raw ?? '').trim();
  if (t === '') return true;
  // Started an object and never finished it — the token limit cut it off mid-call.
  return t.startsWith('{') && extractJson(t) === null;
}

function extractJson(text: string): Record<string, unknown> | null {
  const body = stripFences(text);
  const start = body.indexOf('{');
  if (start === -1) return null;

  // Scan for the matching brace rather than taking the last one: a JSON object followed by
  // the model's commentary would otherwise swallow the commentary and fail to parse.
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < body.length; i++) {
    const ch = body[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return tryParse(body.slice(start, i + 1));
    }
  }
  return null;
}

function tryParse(candidate: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(candidate);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    // One repair, for the single most common malformation: a trailing comma.
    try {
      const parsed = JSON.parse(candidate.replace(/,\s*([}\]])/g, '$1'));
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
}

function stripFences(text: string): string {
  return text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
}

/**
 * Tidies a reply that came back as JSON debris rather than a sentence.
 *
 * A small model that has been shown JSON all prompt will sometimes answer with a bare quoted
 * string, a stray key, or an escaped newline it meant literally. None of that should reach
 * the user as-is.
 */
export function cleanProse(text: string): string {
  let t = stripFences(text);
  // A leading key with no object around it: `"echo":\n"Note added…"`
  t = t.replace(/^"?[a-z_]{1,20}"?\s*:\s*/i, '');
  t = t.replace(/\\n/g, '\n').replace(/\\"/g, '"').trim();
  // Wrapping quotes the model added around its whole answer.
  if (t.length > 1 && t.startsWith('"') && t.endsWith('"')) t = t.slice(1, -1).trim();
  return t.trim();
}

function firstSentence(s: string): string {
  const cut = s.indexOf('. ');
  return cut === -1 ? s : s.slice(0, cut + 1);
}

/**
 * Strips the bracketed instructions the cloud models are given alongside a message.
 *
 * They are guidance, not content. A small model does not reliably tell the two apart — one
 * of them was written into the user's notes verbatim, as though they had dictated it.
 */
export function stripInternalNotes(text: string): string {
  return text.replace(/\[(?:INPUT|UI) NOTE\][\s\S]*$/g, '').trim();
}

/**
 * True when a reply announces work rather than doing it. Those are the replies that read as
 * success while nothing happened, so they earn one retry demanding the tool call.
 *
 * Deliberately narrow: "I have no tasks today" is a legitimate answer and must not match.
 */
export function promisesAction(text: string): boolean {
  if (/^\s*"?(?:task|note|entry|item|set|goal)\s+(?:added|updated|deleted|removed|rescheduled|completed|logged)\b/i.test(text)) {
    return true;
  }
  return /\b(?:i(?:'ve| have)\s+(?:added|created|saved|moved|rescheduled|deleted|completed|updated|logged)|has been\s+(?:added|created|saved|moved|rescheduled|deleted|completed|updated|logged)|have been\s+(?:added|created|saved|moved|rescheduled|deleted|completed|updated|logged)|(?:retrieving|fetching|checking|looking up|getting)\b[^.]*\.{3}|let me\s+(?:check|get|look|retrieve|fetch)|i(?:'ll| will)\s+(?:add|check|get|look|move|delete|complete|save))/i.test(text);
}

function renderContent(content: ApiMessage['content']): string {
  if (typeof content === 'string') return stripInternalNotes(content);
  return content
    .map(b => {
      const block = b as Record<string, unknown>;
      if (block['type'] === 'text') return stripInternalNotes(String(block['text'] ?? ''));
      if (block['type'] === 'tool_result') return `(tool result: ${String(block['content'] ?? '')})`;
      if (block['type'] === 'tool_use') return `(used ${String(block['name'] ?? '')})`;
      return '';
    })
    .filter(Boolean)
    .join(' ');
}
