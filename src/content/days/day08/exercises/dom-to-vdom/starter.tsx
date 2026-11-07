export interface VElement {
  /** Lower-case tag name, e.g. 'div' */
  type: string;
  /** Attributes exactly as written (`class`, not `className`; all values are strings) */
  props: Record<string, string>;
  children: VNode[];
}
/** Text nodes serialize to plain strings. */
export type VNode = VElement | string;

/**
 * Serialize a DOM node to a JSON-safe tree.
 * - Element → { type, props, children }
 * - Text    → its text (string)
 * - Anything else (comments, processing instructions…) → null, and is skipped in `children`
 */
export function toVDom(node: Node): VNode | null {
  throw new Error('Not implemented');
}

/**
 * Build real DOM nodes from a VNode tree. Text must be rendered as TEXT
 * (never parsed as HTML). Returns a detached node.
 */
export function render(vnode: VNode): Node {
  throw new Error('Not implemented');
}
