/**
 * Return every DESCENDANT of `root` (not root itself) that has ALL the classes in
 * `classNames` (whitespace-separated, like getElementsByClassName), in document order.
 *
 * Do NOT use querySelector(All), getElementsByClassName or getElementsByTagName —
 * walk the tree yourself.
 */
export function findAllByClassName(root: Element, classNames: string): Element[] {
  throw new Error('Not implemented');
}

/**
 * Like Testing Library's getByText (simplified): return the single descendant element
 * whose OWN text (its direct Text-node children joined, whitespace collapsed and trimmed)
 * equals `text`. Ignore <script> and <style>.
 * Throw an Error if there are no matches or more than one.
 */
export function getByText(root: Element, text: string): Element {
  throw new Error('Not implemented');
}
