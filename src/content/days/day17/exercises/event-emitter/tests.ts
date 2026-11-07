import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from './solution';

type ChatEvents = {
  message: [text: string, from: string];
  typing: [userId: string];
  close: [];
};

describe('EventEmitter', () => {
  it('calls listeners with the emitted arguments, in registration order', () => {
    const chat = new EventEmitter<ChatEvents>();
    const order: string[] = [];
    chat.on('message', (text, from) => order.push(`first:${from}:${text}`));
    chat.on('message', (text) => order.push(`second:${text}`));
    expect(chat.emit('message', 'hi', 'ada')).toBe(true);
    expect(order).toEqual(['first:ada:hi', 'second:hi']);
  });

  it('only calls listeners for the emitted event; emit returns false when nobody listens', () => {
    const chat = new EventEmitter<ChatEvents>();
    const onTyping = vi.fn();
    chat.on('typing', onTyping);
    expect(chat.emit('close')).toBe(false);
    expect(onTyping).not.toHaveBeenCalled();
  });

  it('off() removes a listener; the unsubscribe function returned by on() does too', () => {
    const chat = new EventEmitter<ChatEvents>();
    const a = vi.fn();
    const b = vi.fn();
    chat.on('typing', a);
    const unsubscribeB = chat.on('typing', b);
    chat.off('typing', a);
    unsubscribeB();
    unsubscribeB(); // calling it twice is harmless
    chat.emit('typing', 'u1');
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
    expect(chat.listenerCount('typing')).toBe(0);
  });

  it('once() listeners run a single time and are then removed', () => {
    const chat = new EventEmitter<ChatEvents>();
    const onClose = vi.fn();
    chat.once('close', onClose);
    chat.emit('close');
    chat.emit('close');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(chat.listenerCount('close')).toBe(0);
  });

  it('off(event, fn) also removes a listener that was registered with once()', () => {
    const chat = new EventEmitter<ChatEvents>();
    const onClose = vi.fn();
    chat.once('close', onClose);
    chat.off('close', onClose);
    chat.emit('close');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('a listener removing itself during emit does not cause the next listener to be skipped', () => {
    const chat = new EventEmitter<ChatEvents>();
    const calls: string[] = [];
    chat.once('typing', () => calls.push('once-1'));
    const selfRemoving = () => {
      calls.push('self-removing');
      chat.off('typing', selfRemoving);
    };
    chat.on('typing', selfRemoving);
    chat.on('typing', () => calls.push('last'));
    chat.emit('typing', 'u1');
    expect(calls).toEqual(['once-1', 'self-removing', 'last']);
    chat.emit('typing', 'u1');
    expect(calls).toEqual(['once-1', 'self-removing', 'last', 'last']);
  });

  it('listeners added during an emit are not called until the next emit', () => {
    const chat = new EventEmitter<ChatEvents>();
    const late = vi.fn();
    chat.on('typing', () => {
      if (chat.listenerCount('typing') < 5) chat.on('typing', late);
    });
    chat.emit('typing', 'u1');
    expect(late).not.toHaveBeenCalled();
    chat.emit('typing', 'u1');
    expect(late).toHaveBeenCalledTimes(1);
  });

  it('a once() listener that re-emits the same event is still only called once (re-entrancy)', () => {
    const chat = new EventEmitter<ChatEvents>();
    let calls = 0;
    chat.once('close', () => {
      calls++;
      chat.emit('close');
    });
    chat.emit('close');
    expect(calls).toBe(1);
  });

  it('keeps separate emitters independent', () => {
    const a = new EventEmitter<ChatEvents>();
    const b = new EventEmitter<ChatEvents>();
    const spy = vi.fn();
    a.on('close', spy);
    b.emit('close');
    expect(spy).not.toHaveBeenCalled();
  });
});
