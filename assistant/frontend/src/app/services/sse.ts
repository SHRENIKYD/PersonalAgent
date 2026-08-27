/**
 * Reading a server-sent event stream, and knowing when not to.
 *
 * Angular's HttpClient buffers the whole response before handing it over, which is exactly
 * what streaming must avoid, so these paths use fetch directly.
 *
 * The important part is the fallback. Capacitor's CapacitorHttp plugin — enabled in this
 * app's config — patches fetch natively to sidestep CORS, and a patched response has no
 * readable body. Rather than breaking inside the APK while working in a browser, a response
 * with no stream is read whole and delivered as a single event: streaming degrades into the
 * behaviour it replaced instead of failing.
 */

export interface SseResult {
  /** False when the response arrived whole rather than as a stream. */
  streamed: boolean;
}

/**
 * Calls `onEvent` with the payload of each `data:` line.
 *
 * SSE frames are separated by a blank line and can split across network chunks mid-line, so
 * the buffer is carried between reads rather than parsed per chunk.
 */
export async function readSse(
  res: Response,
  onEvent: (data: string) => void,
): Promise<SseResult> {
  const body = res.body;
  if (!body || typeof body.getReader !== 'function') {
    const text = await res.text();
    forEachFrame(text, onEvent);
    return { streamed: false };
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let cut = buffer.indexOf('\n\n');
    while (cut !== -1) {
      emit(buffer.slice(0, cut), onEvent);
      buffer = buffer.slice(cut + 2);
      cut = buffer.indexOf('\n\n');
    }
  }

  // A final frame with no trailing blank line still counts.
  if (buffer.trim() !== '') emit(buffer, onEvent);
  return { streamed: true };
}

function forEachFrame(text: string, onEvent: (data: string) => void) {
  text.split('\n\n').forEach(frame => emit(frame, onEvent));
}

function emit(frame: string, onEvent: (data: string) => void) {
  // A frame may carry event: and id: lines beside data:, and data: may repeat across lines.
  const data = frame
    .split('\n')
    .filter(line => line.startsWith('data:'))
    .map(line => line.slice(5).trim())
    .join('\n');
  if (data === '' || data === '[DONE]') return;
  onEvent(data);
}

/** JSON.parse that returns null instead of throwing — a half-written frame is not fatal. */
export function parseJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
