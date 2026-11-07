import { describe, it, expect, vi } from 'vitest';
import { findAllByClassName, getByText } from './solution';

function mount(html: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.append(root);
  return root;
}

const ids = (els: Element[]) => els.map((el) => el.id);

describe('findAllByClassName', () => {
  it('finds matching descendants at any depth, in document order', () => {
    const root = mount(`
      <div class="card" id="a">
        <p class="card" id="b"><span class="card" id="c"></span></p>
      </div>
      <section><div class="card" id="d"></div></section>`);
    expect(ids(findAllByClassName(root, 'card'))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('does not include the root itself', () => {
    const root = mount(`<i class="x" id="child"></i>`);
    root.className = 'x';
    expect(ids(findAllByClassName(root, 'x'))).toEqual(['child']);
  });

  it('matches whole class names, not substrings', () => {
    const root = mount(`<b class="button" id="a"></b><b class="btn-primary" id="b"></b><b class="btn" id="c"></b>`);
    expect(ids(findAllByClassName(root, 'btn'))).toEqual(['c']);
  });

  it('requires ALL classes when given several (any order, extra whitespace ok)', () => {
    const root = mount(`
      <i class="a b c" id="abc"></i>
      <i class="a" id="onlyA"></i>
      <i class="b a" id="ba"></i>`);
    expect(ids(findAllByClassName(root, '  b   a '))).toEqual(['abc', 'ba']);
  });

  it('returns an empty array when nothing matches or the class string is empty', () => {
    const root = mount(`<i class="a"></i>`);
    expect(findAllByClassName(root, 'zzz')).toEqual([]);
    expect(findAllByClassName(root, '   ')).toEqual([]);
  });

  it('walks the tree itself (no querySelectorAll / getElementsBy*)', () => {
    const root = mount(`<ul><li class="x" id="1"></li><li class="x" id="2"></li></ul>`);
    const qsa = vi.spyOn(Element.prototype, 'querySelectorAll');
    const qs = vi.spyOn(Element.prototype, 'querySelector');
    const byClass = vi.spyOn(Element.prototype, 'getElementsByClassName');
    const byTag = vi.spyOn(Element.prototype, 'getElementsByTagName');
    expect(findAllByClassName(root, 'x')).toHaveLength(2);
    expect(qsa).not.toHaveBeenCalled();
    expect(qs).not.toHaveBeenCalled();
    expect(byClass).not.toHaveBeenCalled();
    expect(byTag).not.toHaveBeenCalled();
  });

  it('handles deep trees without blowing up', () => {
    const root = mount('');
    let parent: Element = root;
    for (let i = 0; i < 2000; i++) {
      const child = document.createElement('div');
      if (i % 500 === 0) child.className = 'deep';
      parent.append(child);
      parent = child;
    }
    expect(findAllByClassName(root, 'deep')).toHaveLength(4);
  });
});

describe('getByText', () => {
  it('finds the element whose own text matches (whitespace-normalised)', () => {
    const root = mount(`<ul><li id="a">  Buy
        milk </li><li id="b">Walk dog</li></ul>`);
    expect(getByText(root, 'Buy milk').id).toBe('a');
    expect(getByText(root, 'Walk dog').id).toBe('b');
  });

  it('returns the innermost element, not every ancestor that "contains" the text', () => {
    const root = mount(`<div><p><button id="btn">Save</button></p></div>`);
    expect(getByText(root, 'Save').id).toBe('btn');
  });

  it('does not match text split across child elements (just like Testing Library)', () => {
    const root = mount(`<p>Hello <strong>world</strong></p>`);
    expect(() => getByText(root, 'Hello world')).toThrow(/unable to find/i);
    expect(getByText(root, 'world').tagName).toBe('STRONG');
  });

  it('ignores <script> and <style> contents', () => {
    const root = mount(`<style>Total</style><script>Total</script><span id="t">Total</span>`);
    expect(getByText(root, 'Total').id).toBe('t');
  });

  it('throws when nothing matches', () => {
    const root = mount(`<p>Something</p>`);
    expect(() => getByText(root, 'Nothing')).toThrow(/unable to find/i);
  });

  it('throws when several elements match', () => {
    const root = mount(`<button>Delete</button><button>Delete</button>`);
    expect(() => getByText(root, 'Delete')).toThrow(/multiple/i);
  });
});
