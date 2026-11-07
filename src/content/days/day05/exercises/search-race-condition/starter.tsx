import { useId, useState } from 'react';

/** Injected data source. Must be a stable reference (module-level or memoised). */
export type FetchResults = (query: string, signal: AbortSignal) => Promise<string[]>;

/**
 * Search-as-you-type.
 *
 * - Input labelled "Search". Every change of the trimmed query calls `fetchResults(query, signal)`.
 *   An empty / whitespace-only query never fetches and shows nothing.
 * - While the current query is loading: <p role="status">Loading…</p>
 * - On success: <ul aria-label="Results"> with one <li> per result.
 * - On failure: <p role="alert">Something went wrong…</p>
 * - The screen must ONLY ever show results for the current query: a slow response for an old
 *   query must never overwrite a newer one. Abort requests nobody is waiting for any more.
 */
export function Search({ fetchResults }: { fetchResults: FetchResults }) {
  const [query, setQuery] = useState('');
  const inputId = useId();

  // TODO: fetch in an effect that is safe against out-of-order responses.
  void fetchResults;

  return (
    <div>
      <label htmlFor={inputId}>Search</label>{' '}
      <input id={inputId} type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
      {/* TODO: loading / error / results */}
    </div>
  );
}

// ---- Preview only -----------------------------------------------------------
const FRUITS = ['apple', 'apricot', 'avocado', 'banana', 'blackberry', 'blueberry', 'cherry', 'grape', 'mango', 'melon'];

/** Shorter queries are SLOWER, so typing "ap" quickly makes the "a" response arrive last. */
const demoFetch: FetchResults = (query, signal) =>
  new Promise((resolve, reject) => {
    const id = setTimeout(() => resolve(FRUITS.filter((f) => f.includes(query.toLowerCase()))), 1500 / query.length);
    signal.addEventListener('abort', () => {
      clearTimeout(id);
      reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
    });
  });

export default function SearchDemo() {
  return <Search fetchResults={demoFetch} />;
}
