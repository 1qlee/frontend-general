/** A singly linked list node (provided — don't change it). */
export class ListNode {
  val: number;
  next: ListNode | null;
  constructor(val: number, next: ListNode | null = null) {
    this.val = val;
    this.next = next;
  }
}

/** Helper used by the tests: [1, 2, 3] -> 1 -> 2 -> 3 -> null. */
export function fromArray(values: readonly number[]): ListNode | null {
  let head: ListNode | null = null;
  for (let i = values.length - 1; i >= 0; i--) head = new ListNode(values[i], head);
  return head;
}

/** Helper used by the tests: 1 -> 2 -> 3 -> null -> [1, 2, 3]. */
export function toArray(head: ListNode | null): number[] {
  const out: number[] = [];
  for (let node = head; node !== null; node = node.next) out.push(node.val);
  return out;
}

/**
 * Reverse the list IN PLACE (re-link the existing nodes; don't create new ones)
 * and return the new head.
 *
 * Target: O(n) time, O(1) extra space. Must handle 100,000-node lists.
 */
export function reverseList(head: ListNode | null): ListNode | null {
  let prev: ListNode | null = null;
  let curr = head;
  // Invariant: `prev` is the already-reversed part, `curr` is the rest of the original list.
  while (curr !== null) {
    const next = curr.next; // 1. save the rest before we overwrite the pointer
    curr.next = prev; // 2. flip this node's pointer
    prev = curr; // 3. advance both pointers
    curr = next;
  }
  return prev; // curr is null, so prev is the old tail = new head
}
