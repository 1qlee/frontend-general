/**
 * Renders course markdown. Most content goes through `marked`, but a few
 * token types become React components:
 *  - ```ts run   → <RunnableCode> (editable, executes in a worker)
 *  - other fences → highlighted <CodeBlock>
 *  - > [!TIP] …   → <Callout>
 *  - {{quiz:id}}  → an inline quiz question (via renderQuiz)
 *  - ## headings  → anchors for the table of contents
 */
import { Marked, type Token, type Tokens } from 'marked';
import { Fragment, useMemo, type ReactNode } from 'react';
import { highlight, normalizeLang } from '../lib/highlight';
import { CodeBlock } from './CodeBlock';
import { RunnableCode } from './RunnableCode';
import { Icon, type IconName } from './Icon';

const marked = new Marked({
  gfm: true,
  renderer: {
    code({ text, lang }) {
      const language = normalizeLang(lang);
      return `<pre class="codeblock-inline"><code class="hljs language-${language}">${highlight(text, lang)}</code></pre>`;
    },
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const external = /^https?:\/\//.test(href);
      const titleAttr = title ? ` title="${title}"` : '';
      return external
        ? `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`
        : `<a href="${href}"${titleAttr}>${text}</a>`;
    },
    table(token) {
      // Wrap tables so they scroll horizontally on small screens.
      const header = token.header.map((cell) => `<th${cell.align ? ` style="text-align:${cell.align}"` : ''}>${this.parser.parseInline(cell.tokens)}</th>`).join('');
      const rows = token.rows
        .map((row) => `<tr>${row.map((cell) => `<td${cell.align ? ` style="text-align:${cell.align}"` : ''}>${this.parser.parseInline(cell.tokens)}</td>`).join('')}</tr>`)
        .join('');
      return `<div class="table-wrap"><table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table></div>`;
    },
  },
});

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_~]/g, '')
    .replace(/&[a-z]+;/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

export interface Heading {
  id: string;
  text: string;
  depth: number;
}

export function extractHeadings(source: string): Heading[] {
  const tokens = marked.lexer(source);
  return tokens
    .filter((t): t is Tokens.Heading => t.type === 'heading' && (t.depth === 2 || t.depth === 3))
    .map((t) => ({ id: slugify(t.text), text: t.text.replace(/[`*_]/g, ''), depth: t.depth }));
}

const CALLOUTS: Record<string, { icon: IconName; label: string }> = {
  TIP: { icon: 'lightbulb', label: 'Tip' },
  NOTE: { icon: 'info', label: 'Note' },
  WARNING: { icon: 'alert', label: 'Warning' },
  INTERVIEW: { icon: 'mic', label: 'In the interview' },
  MISTAKE: { icon: 'ban', label: 'Common mistake' },
  AGENT: { icon: 'bot', label: 'Claude Code tip' },
};

interface MarkdownProps {
  source: string;
  inline?: boolean;
  renderQuiz?: (id: string) => ReactNode;
  className?: string;
}

function renderTokens(tokens: Token[], links: Tokens.Generic['links'], renderQuiz?: (id: string) => ReactNode): ReactNode[] {
  const out: ReactNode[] = [];
  let buffer: Token[] = [];
  const flush = () => {
    if (!buffer.length) return;
    const list = Object.assign([...buffer], { links: links ?? {} }) as unknown as Parameters<typeof marked.parser>[0];
    out.push(<div key={`md-${out.length}`} className="md-chunk" dangerouslySetInnerHTML={{ __html: marked.parser(list) }} />);
    buffer = [];
  };

  for (const token of tokens) {
    if (token.type === 'code') {
      const code = token as Tokens.Code;
      const info = (code.lang ?? '').trim();
      flush();
      if (/^(ts|js|typescript|javascript)\s+run\b/.test(info)) out.push(<RunnableCode key={`run-${out.length}`} code={code.text} />);
      else out.push(<CodeBlock key={`code-${out.length}`} code={code.text} lang={info} />);
      continue;
    }
    if (token.type === 'heading' && ((token as Tokens.Heading).depth === 2 || (token as Tokens.Heading).depth === 3)) {
      const heading = token as Tokens.Heading;
      flush();
      const Tag = heading.depth === 2 ? 'h2' : 'h3';
      out.push(<Tag key={`h-${out.length}`} id={slugify(heading.text)} dangerouslySetInnerHTML={{ __html: marked.parseInline(heading.text) as string }} />);
      continue;
    }
    if (token.type === 'paragraph') {
      const quizMatch = /^\{\{quiz:([\w-]+)\}\}$/.exec((token as Tokens.Paragraph).text.trim());
      if (quizMatch) {
        flush();
        out.push(<Fragment key={`quiz-${out.length}`}>{renderQuiz?.(quizMatch[1]) ?? null}</Fragment>);
        continue;
      }
    }
    if (token.type === 'blockquote') {
      const quote = token as Tokens.Blockquote;
      const match = /^\[!(\w+)\][ \t]*(.*)$/m.exec(quote.text.split('\n')[0] ?? '');
      if (match && CALLOUTS[match[1].toUpperCase()]) {
        flush();
        const kind = match[1].toUpperCase();
        const meta = CALLOUTS[kind];
        const title = match[2]?.trim();
        const inner = quote.text.split('\n').slice(1).join('\n');
        const innerTokens = marked.lexer(inner);
        out.push(
          <aside key={`callout-${out.length}`} className={`callout callout-${kind.toLowerCase()}`}>
            <div className="callout-title">
              <Icon name={meta.icon} size={16} />
              <span>{title ? <span dangerouslySetInnerHTML={{ __html: marked.parseInline(title) as string }} /> : meta.label}</span>
            </div>
            <div className="callout-body">{renderTokens(innerTokens, innerTokens.links, renderQuiz)}</div>
          </aside>,
        );
        continue;
      }
    }
    buffer.push(token);
  }
  flush();
  return out;
}

export function Markdown({ source, inline, renderQuiz, className }: MarkdownProps) {
  const nodes = useMemo(() => {
    if (inline) return null;
    const tokens = marked.lexer(source);
    return renderTokens(tokens, tokens.links, renderQuiz);
  }, [source, inline, renderQuiz]);

  if (inline) {
    return <span className={`md-inline ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: marked.parseInline(source) as string }} />;
  }
  return <div className={`md ${className ?? ''}`}>{nodes}</div>;
}
