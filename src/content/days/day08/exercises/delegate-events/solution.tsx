export type DelegatedHandler<E extends Event> = (this: Element, event: E, matched: Element) => void;

/**
 * Attach ONE listener to `root` that calls `handler` for every element that
 * matches `selector` on the path from `event.target` up to (but not including) `root`.
 *
 * - `this` and the second argument are the matched element (innermost first).
 * - Elements outside `root` never match, even if they match the selector.
 * - If a handler calls `event.stopPropagation()`, outer matches are skipped.
 * - Returns a function that removes the listener.
 */
export function delegate<K extends keyof HTMLElementEventMap>(
  root: HTMLElement,
  type: K,
  selector: string,
  handler: DelegatedHandler<HTMLElementEventMap[K]>,
): () => void {
  const controller = new AbortController();

  const listener = (event: HTMLElementEventMap[K]) => {
    const target = event.target;
    // The target can be a Text node (or the window/document for some events):
    // start from the nearest element.
    let el: Element | null =
      target instanceof Element ? target : target instanceof Node ? target.parentElement : null;

    while (el && el !== root) {
      if (el.matches(selector)) {
        handler.call(el, event, el);
        // `cancelBubble` reflects the "stop propagation" flag set by stopPropagation().
        if (event.cancelBubble) break;
      }
      el = el.parentElement;
    }
  };

  root.addEventListener(type, listener, { signal: controller.signal });
  return () => controller.abort();
}
