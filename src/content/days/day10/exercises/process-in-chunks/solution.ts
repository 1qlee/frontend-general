export interface ChunkOptions {
  /** Items processed per chunk before yielding. Default 50. Must be a positive integer. */
  chunkSize?: number;
  /** How to yield to the event loop between chunks. Default: a macrotask via setTimeout(0). */
  yieldToMain?: () => Promise<void>;
  /** If aborted, stop before the next chunk and reject with `signal.reason`. */
  signal?: AbortSignal;
}

/**
 * A MACROtask yield: the browser can handle input and paint before we continue.
 * In production prefer `scheduler.yield()` when it exists (its continuation is
 * prioritised ahead of other queued tasks), falling back to setTimeout.
 */
const yieldWithTimeout = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

export async function processInChunks<T, R>(
  items: readonly T[],
  fn: (item: T, index: number) => R,
  options: ChunkOptions = {},
): Promise<R[]> {
  const { chunkSize = 50, yieldToMain = yieldWithTimeout, signal } = options;
  if (!Number.isInteger(chunkSize) || chunkSize < 1) {
    throw new RangeError(`chunkSize must be a positive integer, got ${chunkSize}`);
  }

  const results: R[] = [];
  for (let start = 0; start < items.length; start += chunkSize) {
    // Yield BETWEEN chunks: the first chunk runs immediately, nothing runs after the last one.
    if (start > 0) await yieldToMain();
    // Check after yielding — the abort usually happens while we were paused.
    signal?.throwIfAborted();

    const end = Math.min(start + chunkSize, items.length);
    for (let i = start; i < end; i++) {
      results.push(fn(items[i], i));
    }
  }
  return results;
}
