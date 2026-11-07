import { describe, it, expect, vi } from 'vitest';
import { delegate } from './solution';

function setup(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.getElementById('root')!;
}

describe('delegate', () => {
  it('calls the handler with the matched element as `this` and as the second argument', () => {
    const root = setup(`<ul id="root"><li class="item" id="a"><span id="label">A</span></li></ul>`);
    const calls: Array<{ self: Element; matched: Element; event: Event }> = [];
    delegate(root, 'click', '.item', function (event, matched) {
      calls.push({ self: this, matched, event });
    });

    document.getElementById('label')!.click();

    expect(calls).toHaveLength(1);
    expect(calls[0].self).toBe(document.getElementById('a'));
    expect(calls[0].matched).toBe(document.getElementById('a'));
    expect(calls[0].event.type).toBe('click');
  });

  it('does nothing when the click is not inside a matching element', () => {
    const root = setup(`<div id="root"><p id="text">hi</p><button class="item">x</button></div>`);
    const handler = vi.fn();
    delegate(root, 'click', '.item', handler);
    document.getElementById('text')!.click();
    root.click();
    expect(handler).not.toHaveBeenCalled();
  });

  it('handles elements added AFTER delegate() was called (the point of delegation)', () => {
    const root = setup(`<ul id="root"></ul>`);
    const handler = vi.fn();
    delegate(root, 'click', 'li', handler);

    const li = document.createElement('li');
    li.textContent = 'late';
    root.append(li);
    li.click();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][1]).toBe(li);
  });

  it('uses a single listener on the root, not one per item', () => {
    const root = setup(`<ul id="root"><li>1</li><li>2</li><li>3</li></ul>`);
    const spy = vi.spyOn(EventTarget.prototype, 'addEventListener');
    delegate(root, 'click', 'li', () => {});
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toBe('click');
  });

  it('calls the handler for every nested match, innermost first', () => {
    const root = setup(`
      <div id="root">
        <div class="box" id="outer">
          <div class="box" id="inner"><button id="btn">go</button></div>
        </div>
      </div>`);
    const order: string[] = [];
    delegate(root, 'click', '.box', function () {
      order.push(this.id);
    });
    document.getElementById('btn')!.click();
    expect(order).toEqual(['inner', 'outer']);
  });

  it('never matches the root itself or elements outside the root', () => {
    document.body.innerHTML = `
      <section class="panel" id="outside">
        <div class="panel" id="root"><button id="btn">go</button></div>
      </section>`;
    const root = document.getElementById('root')!;
    const handler = vi.fn();
    delegate(root, 'click', '.panel', handler);
    document.getElementById('btn')!.click();
    expect(handler).not.toHaveBeenCalled();
  });

  it('stops at the current match when a handler calls event.stopPropagation()', () => {
    const root = setup(`
      <div id="root">
        <div class="box" id="outer"><div class="box" id="inner"><i id="icon"></i></div></div>
      </div>`);
    const order: string[] = [];
    const bodyListener = vi.fn();
    document.body.addEventListener('click', bodyListener);
    delegate(root, 'click', '.box', function (event) {
      order.push(this.id);
      event.stopPropagation();
    });
    document.getElementById('icon')!.click();
    expect(order).toEqual(['inner']);
    expect(bodyListener).not.toHaveBeenCalled();
    document.body.removeEventListener('click', bodyListener);
  });

  it('works when the event target is a Text node', () => {
    const root = setup(`<ul id="root"><li class="item" id="a">text</li></ul>`);
    const handler = vi.fn();
    delegate(root, 'click', '.item', handler);
    const textNode = document.getElementById('a')!.firstChild!;
    textNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][1]).toBe(document.getElementById('a'));
  });

  it('returns an unsubscribe function that removes the listener', () => {
    const root = setup(`<ul id="root"><li id="a">a</li></ul>`);
    const handler = vi.fn();
    const off = delegate(root, 'click', 'li', handler);
    document.getElementById('a')!.click();
    off();
    document.getElementById('a')!.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('works for other event types (input events bubble too)', () => {
    const root = setup(`<form id="root"><input name="email" id="email" /><input name="age" /></form>`);
    const names: string[] = [];
    delegate(root, 'input', 'input[name]', (_event, matched) => {
      names.push(matched.getAttribute('name')!);
    });
    document.getElementById('email')!.dispatchEvent(new Event('input', { bubbles: true }));
    expect(names).toEqual(['email']);
  });
});
