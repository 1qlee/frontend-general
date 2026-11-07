export interface RetryOptions {
  /** How many times to retry after the first attempt (max attempts = retries + 1). */
  retries: number;
  /** Delay before the first retry, in ms. Doubles on every retry: baseDelay * 2 ** (attempt - 1). */
  baseDelay: number;
  /** Upper bound for a single delay, in ms. Default: no cap. */
  maxDelay?: number;
  /** Return false to stop retrying for this error (e.g. an HTTP 400). Default: always retry. */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** Aborting rejects immediately with `signal.reason` and stops any further attempts. */
  signal?: AbortSignal;
}

/** A setTimeout-based sleep that rejects (and clears its timer) when the signal aborts. */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort); // don't leak listeners on long-lived signals
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Call `fn` (with a 1-based attempt number) until it fulfils, retrying failures with
 * exponential backoff. If every attempt fails, reject with the LAST error.
 *
 *   attempt 1 fails -> wait baseDelay     -> attempt 2
 *   attempt 2 fails -> wait baseDelay * 2 -> attempt 3
 *   attempt 3 fails -> wait baseDelay * 4 -> ...
 */
export async function retry<T>(fn: (attempt: number) => Promise<T>, options: RetryOptions): Promise<T> {
  const { retries, baseDelay, maxDelay = Infinity, shouldRetry = () => true, signal } = options;

  for (let attempt = 1; ; attempt++) {
    if (signal?.aborted) throw signal.reason;
    try {
      // `return await` (not `return`) so a rejection is caught by THIS try/catch.
      return await fn(attempt);
    } catch (error) {
      const outOfAttempts = attempt > retries;
      if (outOfAttempts || signal?.aborted || !shouldRetry(error, attempt)) throw error;
    }
    const delay = Math.min(baseDelay * 2 ** (attempt - 1), maxDelay);
    await sleep(delay, signal);
  }
}
