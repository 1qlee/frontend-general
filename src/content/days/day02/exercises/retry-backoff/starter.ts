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

/**
 * Call `fn` (with a 1-based attempt number) until it fulfils, retrying failures with
 * exponential backoff. If every attempt fails, reject with the LAST error.
 *
 *   attempt 1 fails -> wait baseDelay     -> attempt 2
 *   attempt 2 fails -> wait baseDelay * 2 -> attempt 3
 *   attempt 3 fails -> wait baseDelay * 4 -> ...
 */
export function retry<T>(fn: (attempt: number) => Promise<T>, options: RetryOptions): Promise<T> {
  throw new Error('Not implemented');
}
