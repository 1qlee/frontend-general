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
  const allowedTags = new Set(options.allowedTags.map((t) => t.toLowerCase()));
  const globalAttributes = options.allowedAttributes['*'] ?? [];

  // DOMParser creates a separate document with scripting disabled: <script> doesn't run,
  // <img> doesn't load, and so on* handlers can't fire while we inspect the tree.
  const doc = new DOMParser().parseFromString(html, 'text/html');

  function cleanAttributes(el: Element): void {
    const allowed = new Set([...(options.allowedAttributes[el.localName] ?? []), ...globalAttributes].map((a) => a.toLowerCase()));
    // Copy first: removing from the live NamedNodeMap while iterating would skip entries.
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const keep =
        allowed.has(name) &&
        !name.startsWith('on') && // event handlers are code, never data
        !(URL_ATTRIBUTES.has(name) && !isSafeUrl(attr.value)); // attr.value is already entity-decoded
      if (!keep) el.removeAttribute(attr.name);
    }
  }

  function walk(parent: Node): void {
    for (const node of Array.from(parent.childNodes)) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        const tag = el.localName;
        if (DROP_WITH_CONTENT.has(tag)) {
          el.remove();
          continue;
        }
        walk(el); // children first, so anything we unwrap is already clean
        if (allowedTags.has(tag)) cleanAttributes(el);
        else el.replaceWith(...Array.from(el.childNodes));
      } else if (node.nodeType !== Node.TEXT_NODE) {
        parent.removeChild(node); // comments, processing instructions, …
      }
    }
  }

  walk(doc.body);
  // Serializing re-escapes text (< > &) and attribute values, so the output string is safe to re-parse.
  return doc.body.innerHTML;
}
