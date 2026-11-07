import { describe, it, expect } from 'vitest';
import { toVDom, render, type VElement } from './solution';

function parse(html: string): Element {
  const host = document.createElement('div');
  host.innerHTML = html.trim();
  return host.firstElementChild!;
}

describe('toVDom', () => {
  it('serializes an element with its attributes', () => {
    const el = parse(`<a href="/docs" class="link primary" data-id="7">Docs</a>`);
    expect(toVDom(el)).toEqual({
      type: 'a',
      props: { href: '/docs', class: 'link primary', 'data-id': '7' },
      children: ['Docs'],
    });
  });

  it('keeps nested children and mixed text in order', () => {
    const el = parse(`<p>Hello <b>big</b> world</p>`);
    expect(toVDom(el)).toEqual({
      type: 'p',
      props: {},
      children: ['Hello ', { type: 'b', props: {}, children: ['big'] }, ' world'],
    });
  });

  it('serializes a Text node to a string', () => {
    expect(toVDom(document.createTextNode('just text'))).toBe('just text');
  });

  it('drops comment nodes', () => {
    const el = parse(`<ul><!-- todo --><li>One</li></ul>`);
    expect(toVDom(el)).toEqual({ type: 'ul', props: {}, children: [{ type: 'li', props: {}, children: ['One'] }] });
    expect(toVDom(document.createComment('x'))).toBeNull();
  });

  it('keeps boolean attributes as empty strings', () => {
    const el = parse(`<input type="checkbox" checked disabled>`);
    expect(toVDom(el)).toEqual({ type: 'input', props: { type: 'checkbox', checked: '', disabled: '' }, children: [] });
  });

  it('produces plain JSON (survives JSON.stringify / parse)', () => {
    const el = parse(`<div id="x"><span>a</span>b</div>`);
    const v = toVDom(el);
    expect(JSON.parse(JSON.stringify(v))).toEqual(v);
  });
});

describe('render', () => {
  it('creates elements with attributes and children', () => {
    const vnode: VElement = {
      type: 'ul',
      props: { class: 'list', 'aria-label': 'Fruits' },
      children: [
        { type: 'li', props: { 'data-id': '1' }, children: ['Apple'] },
        { type: 'li', props: { 'data-id': '2' }, children: ['Pear'] },
      ],
    };
    const el = render(vnode) as HTMLElement;
    expect(el.tagName).toBe('UL');
    expect(el).toHaveClass('list');
    expect(el).toHaveAttribute('aria-label', 'Fruits');
    expect(el.children).toHaveLength(2);
    expect((el.children[1] as HTMLElement).dataset.id).toBe('2');
    expect(el).toHaveTextContent('ApplePear');
  });

  it('returns a detached node', () => {
    const el = render({ type: 'div', props: {}, children: [] });
    expect(el.isConnected).toBe(false);
  });

  it('renders text as text — never parses it as HTML', () => {
    const el = render({ type: 'p', props: {}, children: ['<img src=x onerror="alert(1)">'] }) as HTMLElement;
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toBe('<img src=x onerror="alert(1)">');
  });

  it('renders a bare string to a Text node', () => {
    const node = render('hi');
    expect(node.nodeType).toBe(Node.TEXT_NODE);
    expect(node.textContent).toBe('hi');
  });

  it('round-trips: render(toVDom(el)) produces identical markup', () => {
    const el = parse(`
      <article class="card" data-state="open">
        <h2 id="t">Title <small>v2</small></h2>
        <p>Some <em>emphasised</em> &amp; escaped &lt;text&gt;</p>
        <button type="button" disabled>Go</button>
      </article>`);
    const copy = render(toVDom(el)!) as Element;
    expect(copy.outerHTML).toBe(el.outerHTML);
    expect(copy).not.toBe(el);
  });
});
