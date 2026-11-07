import { describe, it, expect } from 'vitest';
import { chatReducer, initialChatState, type ChatAction, type ChatState, type ServerMessage } from './solution';

const ME = 'me';
const send = (clientId: string, body = clientId): ChatAction => ({ type: 'send', clientId, authorId: ME, body, createdAt: 1000 });
const ack = (clientId: string, serverId: string, seq: number): ChatAction => ({ type: 'ack', clientId, serverId, seq });
const receive = (seq: number, body = `msg-${seq}`, extra: Partial<ServerMessage> = {}): ChatAction => ({
  type: 'receive',
  message: { serverId: `s${seq}`, seq, authorId: 'bob', body, createdAt: 2000 + seq, ...extra },
});
const run = (actions: ChatAction[], state: ChatState = initialChatState) => actions.reduce(chatReducer, state);
const bodies = (s: ChatState) => s.messages.map((m) => m.body);
const statuses = (s: ChatState) => s.messages.map((m) => `${m.body}:${m.status}`);

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

describe('chatReducer', () => {
  it('send appends an optimistic pending message without serverId or seq', () => {
    const s = run([send('c1', 'hello')]);
    expect(s.messages).toHaveLength(1);
    expect(s.messages[0]).toMatchObject({ clientId: 'c1', body: 'hello', authorId: ME, status: 'pending' });
    expect(s.messages[0].serverId).toBeUndefined();
    expect(s.messages[0].seq).toBeUndefined();
  });

  it('send is idempotent per clientId (double click / double dispatch)', () => {
    const s1 = run([send('c1')]);
    const s2 = chatReducer(s1, send('c1'));
    expect(s2).toBe(s1);
  });

  it('ack attaches serverId + seq, marks the message sent and keeps its clientId', () => {
    const s = run([send('c1', 'hello'), ack('c1', 's10', 10)]);
    expect(s.messages[0]).toMatchObject({ clientId: 'c1', serverId: 's10', seq: 10, status: 'sent', body: 'hello' });
  });

  it('an ack for an unknown clientId, or a duplicate ack, returns the same state object', () => {
    const s1 = run([send('c1'), ack('c1', 's10', 10)]);
    expect(chatReducer(s1, ack('nope', 's99', 99))).toBe(s1);
    expect(chatReducer(s1, ack('c1', 's10', 10))).toBe(s1);
  });

  it('receive orders messages by seq even when events arrive out of order', () => {
    const s = run([receive(3), receive(1), receive(2)]);
    expect(bodies(s)).toEqual(['msg-1', 'msg-2', 'msg-3']);
    expect(s.messages.every((m) => m.status === 'sent')).toBe(true);
  });

  it('a duplicate receive (same serverId — at-least-once delivery) is ignored', () => {
    const s1 = run([receive(1), receive(2)]);
    const s2 = chatReducer(s1, receive(2));
    expect(s2).toBe(s1);
    expect(s2.messages).toHaveLength(2);
  });

  it('pending messages stay below confirmed ones; the ack moves a message into its seq position', () => {
    const s1 = run([receive(1, 'bob-1'), send('c1', 'mine'), receive(3, 'bob-3')]);
    expect(statuses(s1)).toEqual(['bob-1:sent', 'bob-3:sent', 'mine:pending']);
    const s2 = chatReducer(s1, ack('c1', 's2', 2));
    expect(statuses(s2)).toEqual(['bob-1:sent', 'mine:sent', 'bob-3:sent']);
  });

  it('a server echo of our own message reconciles it instead of duplicating it — even before the ack', () => {
    const s1 = run([send('c1', 'mine'), receive(5, 'mine', { clientId: 'c1', authorId: ME })]);
    expect(s1.messages).toHaveLength(1);
    expect(s1.messages[0]).toMatchObject({ clientId: 'c1', serverId: 's5', seq: 5, status: 'sent' });
    expect(chatReducer(s1, ack('c1', 's5', 5))).toBe(s1); // the late ack is now a no-op
  });

  it('fail → failed, a late fail after the ack is ignored, retry → pending with the same clientId', () => {
    const failed = run([send('c1', 'a'), { type: 'fail', clientId: 'c1' }]);
    expect(statuses(failed)).toEqual(['a:failed']);

    const retried = chatReducer(failed, { type: 'retry', clientId: 'c1' });
    expect(retried.messages[0]).toMatchObject({ clientId: 'c1', status: 'pending' });

    const acked = run([send('c2', 'b'), ack('c2', 's1', 1)]);
    expect(chatReducer(acked, { type: 'fail', clientId: 'c2' })).toBe(acked); // timeout fired after success
    expect(chatReducer(acked, { type: 'retry', clientId: 'c2' })).toBe(acked); // only failed messages can be retried

    // The "failure" was a false alarm: the server did store it, so a late ack still confirms it.
    expect(chatReducer(failed, ack('c1', 's7', 7)).messages[0]).toMatchObject({ status: 'sent', seq: 7 });
  });

  it('never mutates the previous state', () => {
    const base = deepFreeze(run([receive(1), send('c1'), send('c2'), receive(4)]));
    const actions: ChatAction[] = [
      send('c3'),
      ack('c1', 's2', 2),
      receive(3),
      receive(6, 'echo', { clientId: 'c2' }),
      { type: 'fail', clientId: 'c1' },
    ];
    expect(() => actions.forEach((a) => chatReducer(base, a))).not.toThrow();
    expect(bodies(base)).toEqual(['msg-1', 'msg-4', 'c1', 'c2']);
  });
});
