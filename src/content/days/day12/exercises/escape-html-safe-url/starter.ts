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
export function escapeHtml(input: string): string {
  throw new Error('Not implemented');
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
export function isSafeUrl(url: string): boolean {
  throw new Error('Not implemented');
}
