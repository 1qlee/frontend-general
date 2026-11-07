import { describe, it, expect } from 'vitest';
import { escapeHtml, isSafeUrl } from './solution';

// Helpers so a failure tells you WHICH url was misclassified.
const wronglyBlocked = (urls: string[]) => urls.filter((u) => !isSafeUrl(u));
const wronglyAllowed = (urls: string[]) => urls.filter((u) => isSafeUrl(u));

describe('escapeHtml', () => {
  it('escapes all five HTML-significant characters', () => {
    expect(escapeHtml(`<img src=x onerror="alert('xss')">`)).toBe(
      '&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt;',
    );
  });

  it('escapes each character exactly once (no double-escaping of the & it introduces)', () => {
    expect(escapeHtml('<')).toBe('&lt;');
    expect(escapeHtml('Tom & Jerry <3')).toBe('Tom &amp; Jerry &lt;3');
  });

  it('escapes text that already looks like an entity (escape once, at output time)', () => {
    expect(escapeHtml('&lt;b&gt;')).toBe('&amp;lt;b&amp;gt;');
  });

  it('leaves safe text, including non-ASCII, untouched', () => {
    expect(escapeHtml('héllo wörld 👋 — 100%')).toBe('héllo wörld 👋 — 100%');
    expect(escapeHtml('')).toBe('');
  });
});

describe('isSafeUrl', () => {
  it('allows http, https and mailto URLs in any case', () => {
    expect(wronglyBlocked(['https://example.com/a?b=c#d', 'HTTP://EXAMPLE.COM', 'mailto:ada@example.com'])).toEqual([]);
  });

  it('allows relative URLs, including ones with a colon after a slash, ? or #', () => {
    expect(
      wronglyBlocked(['/settings', './a', '../up', '?page=2', '#top', 'docs/page.html', 'docs/javascript:intro', '?next=javascript:x', '//cdn.example.com/x.png']),
    ).toEqual([]);
  });

  it('blocks javascript:, data: and vbscript: URLs, whatever the case', () => {
    expect(
      wronglyAllowed(['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>alert(1)</script>', 'DATA:image/svg+xml,<svg onload=alert(1)>', 'vbscript:msgbox(1)']),
    ).toEqual([]);
  });

  it('blocks schemes disguised with leading whitespace or control characters', () => {
    expect(wronglyAllowed(['  javascript:alert(1)', '\t\njavascript:alert(1)', '\u0001javascript:alert(1)', '\u0000 javascript:alert(1)'])).toEqual([]);
  });

  it('blocks schemes split by tabs or newlines (browsers strip them while parsing)', () => {
    expect(wronglyAllowed(['java\tscript:alert(1)', 'java\nscript:alert(1)', 'jav\r\nascript:alert(1)', 'javascript\t:alert(1)'])).toEqual([]);
  });

  it('is an allowlist: unknown schemes are rejected too', () => {
    expect(wronglyAllowed(['ftp://example.com/file', 'blob:https://example.com/uuid', 'chrome-extension://abc/page.html'])).toEqual([]);
  });
});
