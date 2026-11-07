export interface SanitizeOptions {
  /** Lower-case tag names to keep, e.g. ['p', 'b', 'a']. */
  allowedTags: string[];
  /** Lower-case attribute names to keep, per tag. The '*' key applies to every allowed tag. */
  allowedAttributes: Record<string, string[]>;
}

/** Removed TOGETHER WITH their content — even if they appear in allowedTags. */
export const DROP_WITH_CONTENT = new Set(['script', 'style', 'iframe', 'frame', 'object', 'embed', 'noscript', 'template', 'svg', 'math']);

/** Attributes whose value is a URL; keep them only if isSafeUrl(value) is true. */
export const URL_ATTRIBUTES = new Set(['href', 'src', 'action', 'formaction', 'poster', 'xlink:href']);

/** Same rules as the core exercise: http(s)/mailto and relative URLs only. (Done for you.) */
export function isSafeUrl(url: string): boolean {
  const normalized = url.replace(/^[\u0000- ]+|[\u0000- ]+$/g, '').replace(/[\t\n\r]/g, '');
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(normalized);
  return !scheme || ['http', 'https', 'mailto'].includes(scheme[1].toLowerCase());
}

/**
 * Allowlist-based HTML sanitizer.
 *
 * - Parse with the browser's parser into an INERT document (DOMParser or <template>) — never a live element.
 * - Elements in DROP_WITH_CONTENT: remove them and everything inside.
 * - Other elements not in allowedTags: UNWRAP them (remove the element, keep its sanitized children).
 * - Allowed elements: remove every attribute not allowed for that tag (or '*'), every on* attribute
 *   (even if allowed), and URL attributes whose value fails isSafeUrl.
 * - Remove comments.
 * - Return the sanitized HTML as a string.
 */
export function sanitizeHtml(html: string, options: SanitizeOptions): string {
  throw new Error('Not implemented');
}
