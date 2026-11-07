import { useEffect, useId, useState } from 'react';

/** Injected data source. Must be a stable reference (module-level or memoised). */
export type FetchResults = (query: string, signal: AbortSignal) => Promise<string[]>;

/** The last response we accepted, tagged with the query it belongs to. */
type Response = { query: string; results: string[] } | { query: string; error: true };

export function Search({ fetchResults }: { fetchResults: FetchResults }) {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<Response | null>(null);
  const inputId = useId();
  const trimmed = query.trim();

  useEffect(() => {
    if (!trimmed) return;
    let ignore = false; // correctness: stale responses are dropped even if the fetcher ignores `signal`
    const controller = new AbortController(); // efficiency: cancel work nobody is waiting for

    fetchResults(trimmed, controller.signal).then(
      (results) => {
        if (!ignore) setResponse({ query: trimmed, results });
      },
      () => {
        if (!ignore) setResponse({ query: trimmed, error: true });
      },
    );

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [trimmed, fetchResults]);

  // Derived, not stored: a response only counts if it belongs to the current query.
  const current = trimmed && response?.query === trimmed ? response : null;
  const loading = trimmed !== '' && current === null;

  return (
    <div>
      <label htmlFor={inputId}>Search</label>{' '}
      <input id={inputId} type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
      {loading && <p role="status">Loading…</p>}
      {current && 'error' in current && <p role="alert">Something went wrong. Please try again.</p>}
      {current && 'results' in current && (
        <ul aria-label="Results">
          {current.results.map((result) => (
            <li key={result}>{result}</li>
          ))}
        </ul>
      )}
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
