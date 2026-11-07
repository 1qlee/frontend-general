/**
 * Escape a string so it can be inserted into HTML text content or a QUOTED attribute value.
 *
 * Replace exactly these five characters:
 *   &  →  &amp;
 *   <  →  &lt;
 *   >  →  &gt;
 *   "  →  &quot;
 *   '  →  &#39;
 */
const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(input: string): string {
  // One pass with a lookup table: each character is replaced at most once,
  // so the "&" in "&lt;" can never be escaped a second time.
  return input.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

/**
 * Return true if `url` is safe to put in an `href` / `src`.
 *
 * Allowed:
 *  - absolute URLs whose scheme is http:, https: or mailto: (scheme matching is case-insensitive)
 *  - relative URLs (no scheme): '/path', './x', '../x', '?q=1', '#top', 'page.html', '//cdn.example.com/x'
 *
 * Everything else is unsafe — notably javascript:, data: and vbscript: — including disguises such as
 * mixed case, leading whitespace / control characters (U+0000–U+0020), and tabs or newlines
 * inside the scheme ("java\tscript:"), which browsers silently remove when parsing URLs.
 *
 * `url` is the final attribute value: any HTML entities have already been decoded.
 */
const ALLOWED_SCHEMES = new Set(['http', 'https', 'mailto']);

export function isSafeUrl(url: string): boolean {
  // Mirror the WHATWG URL parser: strip leading/trailing C0 controls and spaces,
  // then remove ASCII tab / LF / CR from anywhere in the string.
  const normalized = url.replace(/^[\u0000- ]+|[\u0000- ]+$/g, '').replace(/[\t\n\r]/g, '');

  // A scheme is a letter followed by letters, digits, "+", "-" or "." and then ":".
  // If there is no scheme the URL is relative and resolves against the page's own (http/https) URL.
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(normalized);
  if (!scheme) return true;

  // Allowlist, not blocklist: unknown schemes are rejected too.
  return ALLOWED_SCHEMES.has(scheme[1].toLowerCase());
}
