/**
 * Return every DESCENDANT of `root` (not root itself) that has ALL the classes in
 * `classNames` (whitespace-separated, like getElementsByClassName), in document order.
 *
 * Do NOT use querySelector(All), getElementsByClassName or getElementsByTagName —
 * walk the tree yourself.
 */
export function findAllByClassName(root: Element, classNames: string): Element[] {
  const wanted = classNames.split(/\s+/).filter(Boolean);
  if (wanted.length === 0) return [];

  const result: Element[] = [];
  // Iterative pre-order DFS = document order, and no recursion-depth limit.
  const stack: Element[] = [...root.children].reverse();
  while (stack.length) {
    const el = stack.pop()!;
    if (wanted.every((name) => el.classList.contains(name))) result.push(el);
    // push children in reverse so the first child is processed first
    for (let i = el.children.length - 1; i >= 0; i--) stack.push(el.children[i]);
  }
  return result;
}

const IGNORED = new Set(['SCRIPT', 'STYLE']);

function ownText(el: Element): string {
  let text = '';
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) text += node.textContent ?? '';
  }
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Like Testing Library's getByText (simplified): return the single descendant element
 * whose OWN text (its direct Text-node children joined, whitespace collapsed and trimmed)
 * equals `text`. Ignore <script> and <style>.
 * Throw an Error if there are no matches or more than one.
 */
export function getByText(root: Element, text: string): Element {
  const matches: Element[] = [];
  const visit = (el: Element) => {
    for (const child of el.children) {
      if (IGNORED.has(child.tagName)) continue;
      if (ownText(child) === text) matches.push(child);
      visit(child);
    }
  };
  visit(root);

  if (matches.length === 0) throw new Error(`Unable to find an element with the text: ${text}`);
  if (matches.length > 1) throw new Error(`Found multiple elements with the text: ${text}`);
  return matches[0];
}
