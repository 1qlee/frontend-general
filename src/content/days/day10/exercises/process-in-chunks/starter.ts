export interface ChunkOptions {
  /** Items processed per chunk before yielding. Default 50. Must be a positive integer. */
  chunkSize?: number;
  /** How to yield to the event loop between chunks. Default: a macrotask via setTimeout(0). */
  yieldToMain?: () => Promise<void>;
  /** If aborted, stop before the next chunk and reject with `signal.reason`. */
  signal?: AbortSignal;
}

/**
 * Run `fn` over `items` in chunks, yielding to the event loop between chunks so
 * the main thread can handle input and paint (keeps INP low).
 *
 * - Process the first chunk immediately (synchronously), then yield before each later chunk.
 *   Never yield after the last chunk.
 * - Resolve with all results, in order. Reject if `fn` throws (and stop processing).
 * - Reject with a RangeError if chunkSize is not a positive integer.
 * - If `signal` is aborted, reject with `signal.reason` before processing another chunk.
 */
export function processInChunks<T, R>(
  items: readonly T[],
  fn: (item: T, index: number) => R,
  options: ChunkOptions = {},
): Promise<R[]> {
  throw new Error('Not implemented');
}
