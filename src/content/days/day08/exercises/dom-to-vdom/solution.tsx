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
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const el = node as Element;
  const props: Record<string, string> = {};
  for (const attr of el.attributes) props[attr.name] = attr.value;

  const children: VNode[] = [];
  for (const child of el.childNodes) {
    const v = toVDom(child);
    if (v !== null) children.push(v);
  }
  return { type: el.tagName.toLowerCase(), props, children };
}

/**
 * Build real DOM nodes from a VNode tree. Text must be rendered as TEXT
 * (never parsed as HTML). Returns a detached node.
 */
export function render(vnode: VNode): Node {
  if (typeof vnode === 'string') return document.createTextNode(vnode);

  const el = document.createElement(vnode.type);
  for (const [name, value] of Object.entries(vnode.props)) el.setAttribute(name, value);
  // A fragment lets us build all children off-document and insert them in one operation.
  const fragment = document.createDocumentFragment();
  for (const child of vnode.children) fragment.append(render(child));
  el.append(fragment);
  return el;
}
