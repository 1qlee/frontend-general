export type MessageStatus = 'pending' | 'sent' | 'failed';

export interface ChatMessage {
  /** Generated on the client before sending (e.g. crypto.randomUUID()). Idempotency key + stable React key. */
  clientId: string;
  /** Assigned by the server once the message is persisted. */
  serverId?: string;
  /** Server-assigned, strictly increasing per conversation — the only ordering you can trust. */
  seq?: number;
  authorId: string;
  body: string;
  /** Client clock (ms). Display only — never use it for ordering. */
  createdAt: number;
  status: MessageStatus;
}

export interface ChatState {
  /**
   * Invariant: confirmed messages (those with a `seq`) sorted ascending by seq,
   * followed by unconfirmed messages (pending / failed) in the order they were sent.
   */
  messages: ChatMessage[];
}

export interface ServerMessage {
  serverId: string;
  seq: number;
  authorId: string;
  body: string;
  createdAt: number;
  /** Present when the server echoes a message that one of OUR clients sent. */
  clientId?: string;
}

export type ChatAction =
  | { type: 'send'; clientId: string; authorId: string; body: string; createdAt: number }
  | { type: 'ack'; clientId: string; serverId: string; seq: number }
  | { type: 'receive'; message: ServerMessage }
  | { type: 'fail'; clientId: string }
  | { type: 'retry'; clientId: string };

export const initialChatState: ChatState = { messages: [] };

/** Restore the invariant: confirmed by seq, then unconfirmed in insertion order. Returns a NEW array. */
function ordered(messages: ChatMessage[]): ChatMessage[] {
  const confirmed = messages.filter((m) => m.seq !== undefined).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
  const unconfirmed = messages.filter((m) => m.seq === undefined);
  return [...confirmed, ...unconfirmed];
}

function findByClientId(state: ChatState, clientId: string): ChatMessage | undefined {
  return state.messages.find((m) => m.clientId === clientId);
}

function hasServerId(state: ChatState, serverId: string): boolean {
  return state.messages.some((m) => m.serverId === serverId);
}

/** Replace one message (by clientId) with an updated copy; optionally re-sort. */
function update(state: ChatState, clientId: string, patch: Partial<ChatMessage>, resort = false): ChatState {
  const messages = state.messages.map((m) => (m.clientId === clientId ? { ...m, ...patch } : m));
  return { ...state, messages: resort ? ordered(messages) : messages };
}

function confirm(state: ChatState, clientId: string, serverId: string, seq: number): ChatState {
  return update(state, clientId, { serverId, seq, status: 'sent' }, true);
}

/**
 * Pure reducer for one conversation's messages.
 *
 * - send:    append an optimistic 'pending' message. Ignore a clientId we already have.
 * - ack:     the server persisted our message → attach serverId + seq, status 'sent', move it into seq order.
 *            Ignore unknown clientIds and messages that are already confirmed.
 * - receive: a server-pushed message. Ignore a serverId we already have (at-least-once delivery).
 *            If its clientId matches one of our local messages, reconcile it (like an ack) instead of adding a copy.
 *            Otherwise insert it as 'sent' in seq order (events can arrive out of order).
 * - fail:    'pending' → 'failed'. Ignore anything that is not pending (e.g. a late timeout after the ack).
 * - retry:   'failed' → 'pending', same clientId (so the server can de-duplicate the resend).
 *
 * Never mutate `state`. Return the SAME state object when an action is ignored.
 */
export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'send': {
      if (findByClientId(state, action.clientId)) return state; // double click / double dispatch
      const message: ChatMessage = {
        clientId: action.clientId,
        authorId: action.authorId,
        body: action.body,
        createdAt: action.createdAt,
        status: 'pending',
      };
      return { ...state, messages: [...state.messages, message] }; // unconfirmed go last: no re-sort needed
    }

    case 'ack': {
      const local = findByClientId(state, action.clientId);
      if (!local || local.serverId !== undefined) return state; // unknown, or already confirmed (e.g. by the echo)
      if (hasServerId(state, action.serverId)) return state;
      // A 'failed' message can still be acked: the timeout was a false alarm — the server is the source of truth.
      return confirm(state, action.clientId, action.serverId, action.seq);
    }

    case 'receive': {
      const { message } = action;
      if (hasServerId(state, message.serverId)) return state; // duplicate delivery

      const local = message.clientId !== undefined ? findByClientId(state, message.clientId) : undefined;
      if (local) {
        // Our own message echoed back (possibly before the ack): reconcile, don't duplicate.
        return local.serverId !== undefined ? state : confirm(state, local.clientId, message.serverId, message.seq);
      }

      const incoming: ChatMessage = {
        clientId: message.clientId ?? message.serverId,
        serverId: message.serverId,
        seq: message.seq,
        authorId: message.authorId,
        body: message.body,
        createdAt: message.createdAt,
        status: 'sent',
      };
      return { ...state, messages: ordered([...state.messages, incoming]) };
    }

    case 'fail': {
      const local = findByClientId(state, action.clientId);
      if (!local || local.status !== 'pending') return state; // never downgrade a 'sent' message
      return update(state, action.clientId, { status: 'failed' });
    }

    case 'retry': {
      const local = findByClientId(state, action.clientId);
      if (!local || local.status !== 'failed') return state;
      return update(state, action.clientId, { status: 'pending' });
    }

    default:
      return state;
  }
}
