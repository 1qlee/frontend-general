Build the "write a `useFetch` hook" interview classic: a generic `useAsync(key, fetcher)` that returns a **discriminated union**.

```tsx
function UserCard({ id }: { id: string | null }) {
  // An inline fetcher: a NEW function on every render.
  const user = useAsync(id, (key, signal) => api.getUser(key, { signal }));

  switch (user.status) {
    case 'idle':
      return <p>Select a user</p>;
    case 'loading':
      return <Spinner />;
    case 'error':
      return <p role="alert">{user.error.message}</p>;
    case 'success':
      return <h2>{user.data.name}</h2>; // `data` only exists in this branch
  }
}
```

**Requirements**

1. `key === null` → `{ status: 'idle' }` and no fetch.
2. Otherwise `{ status: 'loading' }`, then `{ status: 'success', data }` or `{ status: 'error', error }` — wrap non-`Error` rejections in an `Error`.
3. A new `key` **aborts** the previous request's signal, and a stale response — success *or* failure — never overwrites the current state, even if the fetcher ignores the signal.
4. Switching the key back to `null` returns to idle and aborts the in-flight request; unmounting aborts too.
5. The hook re-runs **only when `key` changes**. Callers will pass inline fetchers (new identity every render) — don't refetch on every render, and always use the **latest** fetcher.

On Day 5 you handled races inside a component. Here the focus is **hook API design**: generic types, a status union, and what to do with a function argument whose identity changes every render.

**What the interviewer is looking for:** the union type, race handling in the effect cleanup (abort *and* ignore), and a principled answer to "what goes in the dependency array — and why isn't `fetcher` in it?"
