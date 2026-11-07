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
  throw new Error('Not implemented');
}
