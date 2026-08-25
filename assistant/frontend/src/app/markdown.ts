/**
 * A deliberately small Markdown subset — enough for what a chat reply actually contains.
 *
 * Parsed into a data structure rather than an HTML string, because the alternative is
 * innerHTML plus a sanitizer, and model output is exactly the text you least want to hand
 * to an HTML parser. Nothing here can produce an element the templates do not already
 * name, so there is no injection surface to sanitize in the first place.
 *
 * Supported: headings, bullet and numbered lists, fenced code, blockquotes, paragraphs,
 * and inline bold / italic / code / links. Anything else stays literal text, which is the
 * right failure: an unrendered asterisk is readable, a swallowed line is not.
 */

export type Inline =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'italic'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'link'; text: string; href: string };

export type Block =
  | { kind: 'p'; spans: Inline[] }
  | { kind: 'h'; level: number; spans: Inline[] }
  | { kind: 'ul'; items: Inline[][] }
  | { kind: 'ol'; items: Inline[][] }
  | { kind: 'quote'; spans: Inline[] }
  | { kind: 'pre'; text: string };

/**
 * Inline scanning in one pass, longest markers first so `**bold**` is never mistaken for
 * two italics. Code spans are matched before everything else so `*` inside them stays
 * literal, which is the whole point of a code span.
 */
const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*\n]+\*)|(_[^_\n]+_)|(\[[^\]]+\]\([^)\s]+\))/;

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let rest = src;

  while (rest.length > 0) {
    const m = INLINE.exec(rest);
    if (!m || m.index === undefined) break;

    if (m.index > 0) out.push({ kind: 'text', text: rest.slice(0, m.index) });
    const tok = m[0];

    if (tok.startsWith('`')) {
      out.push({ kind: 'code', text: tok.slice(1, -1) });
    } else if (tok.startsWith('**') || tok.startsWith('__')) {
      out.push({ kind: 'bold', text: tok.slice(2, -2) });
    } else if (tok.startsWith('[')) {
      const split = tok.indexOf('](');
      const href = tok.slice(split + 2, -1);
      // Only http(s) links become links. A javascript: or data: URL rendered as a tappable
      // link is a real hazard, and model output is not a trusted source of URLs.
      const text = tok.slice(1, split);
      out.push(/^https?:\/\//i.test(href) ? { kind: 'link', text, href } : { kind: 'text', text });
    } else {
      out.push({ kind: 'italic', text: tok.slice(1, -1) });
    }
    rest = rest.slice(m.index + tok.length);
  }

  if (rest.length > 0) out.push({ kind: 'text', text: rest });
  return out.length > 0 ? out : [{ kind: 'text', text: src }];
}

const BULLET = /^\s*[-*+]\s+(.*)$/;
const NUMBER = /^\s*\d+[.)]\s+(.*)$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const QUOTE = /^>\s?(.*)$/;

export function parseMarkdown(src: string): Block[] {
  const lines = (src ?? '').replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      blocks.push({ kind: 'p', spans: parseInline(para.join(' ').trim()) });
      para = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^\s*```/.test(line)) {
      flushPara();
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) body.push(lines[i++]);
      blocks.push({ kind: 'pre', text: body.join('\n') });
      continue;
    }

    if (line.trim() === '') { flushPara(); continue; }

    const h = HEADING.exec(line);
    if (h) {
      flushPara();
      blocks.push({ kind: 'h', level: h[1].length, spans: parseInline(h[2]) });
      continue;
    }

    const q = QUOTE.exec(line);
    if (q) {
      flushPara();
      blocks.push({ kind: 'quote', spans: parseInline(q[1]) });
      continue;
    }

    const b = BULLET.exec(line);
    const n = !b && NUMBER.exec(line);
    if (b || n) {
      flushPara();
      const kind = b ? 'ul' : 'ol';
      const last = blocks[blocks.length - 1];
      // Consecutive list lines join the list above rather than each starting a new one.
      const list = last && last.kind === kind ? last : null;
      const item = parseInline((b ? b[1] : (n as RegExpExecArray)[1]).trim());
      if (list) list.items.push(item);
      else blocks.push({ kind, items: [item] } as Block);
      continue;
    }

    para.push(line);
  }

  flushPara();
  return blocks;
}
