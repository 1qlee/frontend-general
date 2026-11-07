import type { Day, Exercise } from '../../types';

import radioFramework from './lessons/radio-framework.md?raw';
import buildingBlocks from './lessons/building-blocks.md?raw';
import caseStudies from './lessons/case-studies.md?raw';

import normalizeStarter from './exercises/normalize-feed-entities/starter.ts?raw';
import normalizeSolution from './exercises/normalize-feed-entities/solution.ts?raw';
import normalizeTests from './exercises/normalize-feed-entities/tests.ts?raw';
import mergeStarter from './exercises/merge-feed-pages/starter.ts?raw';
import mergeSolution from './exercises/merge-feed-pages/solution.ts?raw';
import mergeTests from './exercises/merge-feed-pages/tests.ts?raw';
import autocompleteStarter from './exercises/autocomplete-client/starter.ts?raw';
import autocompleteSolution from './exercises/autocomplete-client/solution.ts?raw';
import autocompleteTests from './exercises/autocomplete-client/tests.ts?raw';
import typeaheadStarter from './exercises/typeahead-combobox/starter.tsx?raw';
import typeaheadSolution from './exercises/typeahead-combobox/solution.tsx?raw';
import typeaheadTests from './exercises/typeahead-combobox/tests.tsx?raw';

// ---------------------------------------------------------------------------
// Exercises
// ---------------------------------------------------------------------------

const normalizeFeedEntities: Exercise = {
  id: 'normalize-feed-entities',
  title: 'normalize() / denormalize(): a normalizr-lite entity store',
  runtime: 'logic',
  difficulty: 'core',
  estMinutes: 15,
  tags: ['system design', 'normalization', 'data layer', 'immutability'],
  prompt: `Your feed API returns **nested** posts: each post embeds its author and its comments, and each comment embeds its author — so the same user appears many times. Implement the core of a normalized client store:

- \`normalize(posts)\` → \`{ entities: { posts, users, comments }, result }\`
- \`denormalize(result, entities)\` → nested posts again (what a selector does before rendering)

\`\`\`ts
const { entities, result } = normalize(apiPosts);
entities.users.u1;  // { id: 'u1', name: 'Ada', avatarUrl: '/ada.png' }  ← stored once
entities.posts.p1;  // { id: 'p1', title: 'Hello', author: 'u1', comments: ['c1', 'c2'] }
result;             // ['p1', 'p2']  ← API order

entities.users.u1 = { ...entities.users.u1, name: 'Ada Lovelace' }; // ONE write…
denormalize(result, entities); // …every post and comment by u1 shows the new name
\`\`\`

Requirements:
- Every post, comment and user is stored **once**, keyed by id; nested objects become ids.
- Repeated copies of an entity are **shallow-merged**: later fields win, fields missing from a later copy are kept (APIs often send a full user in one place and a partial "summary" user in another).
- Don't mutate the input, and don't keep references to input objects.
- \`denormalize\` skips ids that point to missing entities (e.g. a deleted comment) instead of producing \`undefined\` holes.

**What the interviewer is looking for:** that you can say *why* normalize (single source of truth, O(1) lookup by id, one write per update), a deliberate merge strategy for partial entities, and immutable updates.`,
  starter: normalizeStarter,
  solution: normalizeSolution,
  tests: normalizeTests,
  hints: [
    "Create the three empty tables first, then walk each post: its author, each comment (and that comment's author), then the post itself.",
    'Write one helper, e.g. `upsert(table, entity)`, that does `table[entity.id] = { ...table[entity.id], ...entity }` and returns the id. That single line handles dedupe, merging and copying.',
    'Rest destructuring swaps nested objects for ids: `const { author, comments, ...rest } = post; upsert(posts, { ...rest, author: upsert(users, author), comments: commentIds })`. Denormalize is the mirror image — look ids up, `filter` out the missing ones.',
  ],
  explanation: `**Approach:** a generic \`upsert(table, entity)\` that shallow-merges into the table and returns the id. Walk each post, upsert its author and each comment (upserting the comment's author), then upsert the post with ids in place of objects. \`result\` is just \`posts.map(p => p.id)\`. \`denormalize\` reverses it, copying entities so callers can't mutate the store through the output. Both are **O(number of entities)**.

**Edge cases worth naming:**
- **Own-property checks.** With plain \`{}\` tables, an id like \`"constructor"\` or \`"toString"\` finds \`Object.prototype\` members via \`in\` or indexing. Use \`Object.hasOwn\`, \`Object.create(null)\` or a \`Map\`.
- **Merge order is a policy.** "Later wins" can regress data if an *older* response lands after a newer one. Production stores compare an \`updatedAt\`/version field before overwriting.
- **Orphans.** Removing a post doesn't remove its comments or users; real stores garbage-collect entities that no query references any more.

**Follow-ups you may get:**
- *"How do you stop every FeedItem re-rendering when one post changes?"* → lists hold ids; each item selects \`posts[id]\` with a **memoized selector**, so only the changed entity gets a new reference (structural sharing). Don't denormalize the whole feed on every change.
- *"Which libraries do this for you?"* → Apollo's \`InMemoryCache\` and Relay normalize automatically by \`__typename\` + \`id\`; Redux Toolkit's \`createEntityAdapter\` gives you \`{ ids, entities }\` tables. TanStack Query is a **document** cache — you either \`setQueryData\` in each affected key or invalidate.
- *"When is this overkill?"* → when each record is displayed once and rarely changes. Normalization pays off when entities repeat across views and mutate often (likes, names, read state, real-time updates).`,
};

const mergeFeedPages: Exercise = {
  id: 'merge-feed-pages',
  title: 'mergeFeedPages(): cursor pagination with dedupe and refresh',
  runtime: 'logic',
  difficulty: 'core',
  estMinutes: 15,
  tags: ['system design', 'pagination', 'cursor', 'immutability'],
  prompt: `Implement the reducer behind an infinite feed. State is normalized — ordered \`ids\` plus a \`byId\` table — and pages come from a **cursor-paginated** API:

\`\`\`ts
interface FeedState<T> { ids: string[]; byId: Record<string, T>; nextCursor: string | null; hasMore: boolean }
interface FeedPage<T>  { items: T[]; nextCursor: string | null }

let feed = mergeFeedPages(emptyFeed(), { items: [p9, p8, p7], nextCursor: 'c7' });          // initial load
feed = mergeFeedPages(feed, { items: [p7, p6], nextCursor: null });                          // load more
feed = mergeFeedPages(feed, { items: [p11, p10, p9], nextCursor: 'c9' }, 'prepend');         // "2 new posts"
feed.ids;        // ['p11', 'p10', 'p9', 'p8', 'p7', 'p6']
feed.nextCursor; // null — the refresh didn't move the bottom cursor
\`\`\`

**append** (load more): add unseen items at the end in page order; items already present keep their position but take the newer data; take the page's \`nextCursor\`; \`hasMore = nextCursor !== null\`.

**prepend** (refresh / new-posts banner): unseen items go on top in page order, existing items are updated in place, and \`nextCursor\`/\`hasMore\` are **unchanged**. Special cases:
- into an empty feed → behaves exactly like append (initial load);
- an empty page → no change;
- **no overlap** with the current feed → there may be a gap between the new page and what we have, so replace the feed with the page (as an initial load).

**Both:** duplicate ids within a page are kept once (first wins). Never mutate the previous state.

**What the interviewer is looking for:** why duplicates happen even with cursors (ranking shifts, retries, real-time inserts — and duplicate React keys break reconciliation), why a refresh must not overwrite the bottom cursor, and immutable updates.`,
  starter: mergeStarter,
  solution: mergeSolution,
  tests: mergeTests,
  hints: [
    'First dedupe the page with a `Set` of seen ids. Then separate the two jobs: which ids are new to the feed, and which existing items just need fresh data?',
    'Copy `byId` once (`{ ...state.byId }`), write every page item into the copy, and collect only the ids that were not there before. Append those for `append`; put them in front for `prepend`.',
    'Handle the prepend special cases before merging: empty feed → treat as append; empty page → `return state`; no overlap (`!items.some(i => Object.hasOwn(state.byId, i.id))`) → start over from `emptyFeed()`. And never touch the cursor on prepend.',
  ],
  explanation: `**Approach:** dedupe the page, copy \`byId\`, write every item (newer server data wins), collect the ids that are new, then concatenate in the right order. Append takes the page's cursor; prepend keeps the old one because the cursor describes the **bottom** of the feed — overwriting it with the refreshed page's cursor would make "load more" re-download everything you already have. **O(feed + page)** per merge because of the array copies — fine for page-sized updates.

**Why dedupe if cursors are "stable"?** Cursor pagination prevents the *systematic* offset bug, but ranked feeds still move items between requests, retries can deliver a page twice, and real-time inserts race with pagination. Duplicate ids also mean duplicate React keys — warnings and mismatched component state.

**The gap rule:** if a refresh shares no ids with the loaded feed, more than a page of posts arrived and you can't prove continuity. Options: reset (what you did — simplest), render a **gap marker** ("Show more posts") that loads the missing range, or keep fetching newer pages until you hit an overlap.

**Follow-ups:**
- *"How does this map to TanStack Query?"* → \`useInfiniteQuery\` stores \`pages\` + \`pageParams\` with \`getNextPageParam: last => last.nextCursor\`; flatten and dedupe in \`select\`. For "new posts" you'd prepend via \`setQueryData\` or refetch the first page.
- *"Deleted posts?"* → remove the id from \`ids\` (and optionally keep a tombstone so a late page can't resurrect it).
- *"Scroll restoration on back navigation?"* → keep the feed state in the cache (not component state) and save the scroll offset/anchor item id per history entry.`,
};

const autocompleteClient: Exercise = {
  id: 'autocomplete-client',
  title: 'createAutocompleteClient(): debounce + LRU cache + latest-wins',
  runtime: 'logic',
  difficulty: 'stretch',
  estMinutes: 25,
  tags: ['system design', 'debounce', 'caching', 'race conditions', 'abort'],
  prompt: `Build the framework-agnostic **data layer** of an autocomplete — the piece you'd draw as "client" in the architecture diagram. A React component would bind to it with \`useSyncExternalStore(client.subscribe, client.getState)\`.

\`\`\`ts
const client = createAutocompleteClient({ fetcher: (q, signal) => api.suggest(q, { signal }), debounceMs: 300, cacheSize: 50 });
client.subscribe((s) => render(s));
client.setQuery('rea');   // → { status: 'loading', … } now; fetch('rea') after 300 ms of quiet
\`\`\`

\`setQuery(raw)\`:
- cache key = \`raw.trim().toLowerCase()\`; the fetcher receives \`raw.trim()\`
- **empty** key → \`status: 'idle'\`, \`results: []\`, abort any in-flight request, no fetch
- **cache hit** → \`status: 'success'\` with the cached results immediately (no timer, no fetch)
- **cache miss** → \`status: 'loading'\` immediately, **keeping the previous results** (no flash), then fetch after \`debounceMs\` without another \`setQuery\`
- starting a fetch **aborts** the previous in-flight request (via its \`AbortSignal\`)

Responses:
- only a response for the **current** query may change state (latest wins) — and remember the fetcher may ignore the abort signal
- successful responses are **cached even when stale** (correct data for their key — backspacing becomes instant)
- aborted requests are ignored; failures are **not** cached → \`status: 'error'\`, \`results: []\`, \`error\` set

The cache is an **LRU** of \`cacheSize\` entries — reading an entry counts as using it. \`subscribe\` returns an unsubscribe function; \`dispose()\` cancels everything and stops notifications.

Tests use fake timers (\`vi.advanceTimersByTimeAsync\`) and a fetcher whose promises they resolve by hand, in any order.

**What the interviewer is looking for:** a clean state machine, the two layers of race protection (abort + identity check), a correct O(1) LRU (you built one on Day 10 — a small \`Map\`-based one is enough here), and the judgment calls (keep previous results, cache stale responses, don't cache errors).`,
  starter: autocompleteStarter,
  solution: autocompleteSolution,
  tests: autocompleteTests,
  hints: [
    "Hold four things in the closure: `state`, a `listeners` Set, the pending debounce `timer`, and the in-flight `AbortController`. Every `setQuery` starts by clearing the timer, then branches: empty / cache hit / cache miss.",
    'A `Map` remembers insertion order, so it is an LRU in disguise: on `get`, delete and re-set the key to make it most recent; on `set`, if `size > capacity`, delete `map.keys().next().value` (the oldest).',
    "When the timer fires: abort the previous controller, create a new one, call the fetcher. In `.then`: `if (controller.signal.aborted) return; cache.set(key, results); if (toKey(state.query) === key) setState({...})`. In the rejection handler, the same guards, but don't cache.",
  ],
  explanation: `**Approach:** a closure-based store (state + listeners, like a tiny Zustand) with a debounce timer and one in-flight \`AbortController\`. \`setQuery\` always cancels the pending timer, then either resets (empty), answers from cache (hit), or shows loading and schedules a fetch (miss). The fetch handler applies **two guards**: ignore aborted requests, and only update state if the response's key still matches the current query. Successful data is cached either way. The LRU uses \`Map\` insertion order for **O(1)** get/set/evict.

**Why both abort *and* an identity check?** Abort saves bandwidth and server work, but it's best-effort: the response may already be in flight, and many SDKs ignore signals. The identity check is what guarantees correctness.

**Binding it to React:**

\`\`\`tsx
const state = useSyncExternalStore(client.subscribe, client.getState);
\`\`\`

This works because \`getState\` returns the **same object** until something changes — returning a fresh object every call would make React re-render forever.

**Follow-ups:**
- *"The user types 'ab', the request is in flight, they type 'c' then backspace within the debounce window. What happens?"* → your client aborts and refetches 'ab'. An **in-flight dedupe** (if the in-flight key equals the new key, just wait for it) avoids that.
- *"Add a TTL"* → store \`{ value, fetchedAt }\` and treat old entries as misses (or serve them and revalidate — stale-while-revalidate).
- *"Retry transient failures?"* → only for network/5xx, with backoff — but for typeahead, failing fast and retrying on the next keystroke is usually the better UX.
- *"Why not just TanStack Query?"* → you could: query key \`['suggest', normalizedQuery]\`, a debounced query value, \`placeholderData: keepPreviousData\`, and the signal it passes to \`queryFn\`. Building it by hand shows you understand what that config does.`,
};

const typeaheadCombobox: Exercise = {
  id: 'typeahead-combobox',
  title: 'Machine coding: an accessible Typeahead component',
  runtime: 'dom',
  difficulty: 'core',
  estMinutes: 30,
  preview: true,
  tags: ['react', 'machine coding', 'debounce', 'race conditions', 'accessibility', 'combobox'],
  prompt: `The classic UI round: build \`<Typeahead search={…} onSelect={…} />\` in React + TypeScript. The data source is **injected** (as it would be in a design-system component):

\`\`\`ts
interface TypeaheadProps {
  search: (query: string, signal: AbortSignal) => Promise<Suggestion[]>;
  onSelect: (item: Suggestion) => void;
  label?: string;       // default 'Search' — the combobox's accessible name
  debounceMs?: number;  // default 300
}
\`\`\`

Requirements:
1. **Debounce:** call \`search(trimmedQuery, signal)\` once, \`debounceMs\` after the **last** keystroke. Whitespace-only input → no request, nothing shown.
2. **States:** the text "Loading…" while a request is in flight; options on success; "No results" for an empty response; an element with \`role="alert"\` containing "Something went wrong" on error.
3. **Latest wins:** abort the superseded request and ignore any response that isn't for the current query.
4. **ARIA (APG combobox):** the input has \`role="combobox"\` (labelled by \`label\`), \`aria-autocomplete="list"\`, \`aria-expanded\`, \`aria-controls\` → the listbox id, and \`aria-activedescendant\` → the active option's id. Results render as \`role="listbox"\` > \`role="option"\` (unique ids, \`aria-selected\` on the active one). Focus never leaves the input.
5. **Keyboard:** ArrowDown/ArrowUp move the active option and **wrap**; ArrowDown re-opens a closed list; Enter selects the active option; Escape closes the list. Clicking an option selects it.
6. **Selecting** calls \`onSelect(item)\`, puts \`item.label\` in the input, closes the list — and must **not** trigger a new search.

*Stretch (not tested):* highlight the matching part of each label with \`<mark>\`; announce the result count in a live region.

The default export renders a demo with a fake API with random latency (so races really happen) — type "error" to see the error state.

**What the interviewer is looking for:** a deliberate state model (what is state, what is derived), effect cleanup used for both debounce and cancellation, the combobox keyboard/ARIA model, and the details people forget — focus staying in the input, \`mousedown\` vs blur, and "selection shouldn't search".`,
  starter: typeaheadStarter,
  solution: typeaheadSolution,
  tests: typeaheadTests,
  hints: [
    'Separate `inputValue` (what the input shows) from `query` (what you search for, set only in `onChange`). Selecting an option changes `inputValue` but not `query`, so no new search fires. Everything else — whether the list is visible, the status message — can be derived.',
    'One `useEffect` keyed on `[query, debounceMs]` owns the request: create an `AbortController`, `setTimeout(() => search(term, controller.signal).then(…))`, and return a cleanup that clears the timer AND aborts. In `.then`, `if (controller.signal.aborted) return;`.',
    'Use `useId()` for the listbox and option ids. On options, `onMouseDown={(e) => e.preventDefault()}` keeps focus in the input so its `onBlur` (which closes the list) doesn\'t fire before the click. In `onKeyDown`, `preventDefault` for the arrows (caret) and Enter (form submit).',
  ],
  explanation: `**State model:** \`inputValue\`, \`query\`, \`status\`, \`results\`, \`open\`, \`activeIndex\`. Visibility of the list is **derived** (\`open && query && status === 'success' && results.length > 0\`) rather than stored — fewer states to keep in sync.

**The effect is the debounce *and* the cancellation:** each keystroke changes \`query\`, which runs the previous effect's cleanup (clears the pending timer, aborts the in-flight request) before scheduling a new one. That gives you debounce, abort and latest-wins in ~15 lines. Keeping \`search\` in a ref means a parent passing an inline function doesn't restart the debounce on every render (React 19.2+'s \`useEffectEvent\` is the built-in answer to the same problem).

**Accessibility details that score:**
- Focus stays in the input; the "active" option is virtual, exposed with \`aria-activedescendant\`.
- \`mousedown\` + \`preventDefault\` on options so the input doesn't blur before the click lands.
- Escape closes; a second Escape clears (APG). Enter only \`preventDefault\`s when it actually selects, so forms still submit otherwise.
- A \`role="status"\` region for "Loading…"/"No results" is announced politely; errors use \`role="alert"\`.

**Testing notes:** the tests use fake timers with \`userEvent.setup({ advanceTimers: vi.advanceTimersByTime })\` and flush the debounce inside \`act(async () => vi.advanceTimersByTimeAsync(ms))\`. Deferred promises let a test resolve requests out of order to prove latest-wins. One jsdom quirk: text split by \`<mark>\` gets an accessible name like "Re mix" in jsdom (browsers say "Remix"), so the test finds that option by \`textContent\`.

**Follow-ups:**
- *"Why not \`useDeferredValue\` instead of debounce?"* → it defers *rendering*, not *requests*: you'd still fire a request per keystroke. Use it for expensive client-side filtering; debounce for the network.
- *"IME input?"* → ignore Enter/arrow handling while \`event.nativeEvent.isComposing\`, and don't search until \`compositionend\`.
- *"Make it reusable"* → extract a headless \`useTypeahead()\` returning prop getters (\`getInputProps\`, \`getOptionProps\`), Downshift-style; add \`renderItem\` and generic \`T\` with \`getItemKey\`.
- *"Positioning?"* → Floating UI or CSS anchor positioning, flipping above the input near the viewport bottom.`,
};

// ---------------------------------------------------------------------------
// Day
// ---------------------------------------------------------------------------

const day: Day = {
  number: 11,
  title: 'Frontend System Design I: Framework & Fundamentals',
  tagline: 'RADIO, the building blocks every design reuses, and two classic prompts worked end to end.',
  summary:
    'Frontend system design rounds reward structure, trade-offs and frontend-specific depth — not backend infrastructure. Today you learn what interviewers grade, drive a 45-minute round with the **RADIO** framework (Requirements, Architecture, Data model, Interface, Optimizations), and build a toolbox of reusable building blocks: rendering strategy, state ownership, normalized data, API and pagination design, real-time transports, optimistic updates, retries and offline. Then you apply it to autocomplete and a news feed — and implement their hardest parts in code.',
  objectives: [
    'Explain what frontend system design interviewers evaluate and how it differs from backend design',
    'Drive a 45-minute round with RADIO, a clarifying-questions checklist and a time plan',
    'State trade-offs in the "options → choice → reason → when to revisit" form',
    'Choose between CSR/SSR/SSG/RSC, REST/GraphQL/tRPC, offset/cursor pagination and polling/SSE/WebSockets with justification',
    'Design optimistic updates with rollback, retries with backoff and jitter, and a level of offline support',
    'Walk through autocomplete and news feed designs end to end',
    'Implement normalization, cursor-page merging, an autocomplete data client and an accessible typeahead',
  ],
  skills: ['system-design', 'networking', 'react', 'accessibility', 'interviewing'],
  blocks: [
    {
      kind: 'review',
      id: 'warm-up-review',
      title: 'Warm-up: spaced review',
      minutes: 15,
      intro:
        'Flashcards from earlier days. Today leans on Day 2 (debounce, latest-wins, retry), Days 5–7 (state design, TanStack Query, virtualization, rendering strategies) and Day 10 (caching, HTTP, Web Vitals) — notice which of those you hesitate on, because they become deep dives in design rounds.',
    },
    {
      kind: 'lesson',
      id: 'radio-framework',
      title: 'The interview and the RADIO framework',
      minutes: 35,
      body: radioFramework,
      checks: [
        {
          id: 'sd-first-move',
          prompt: 'The interviewer says: *"Design a news feed."* What is the strongest first move?',
          choices: [
            'Sketch the React component tree so the interviewer sees concrete progress early',
            'Restate the problem and spend a few minutes clarifying functional and non-functional requirements, stating assumptions out loud',
            'Announce the stack (Next.js, Redux, Tailwind) so the rest of the design has a foundation',
            'Start with the backend: feed generation, fan-out and storage, since the client depends on it',
          ],
          answer: 1,
          explanation:
            'Requirements gathering is one of the explicitly graded signals, and every later trade-off is justified by pointing back at a requirement. Drawing components first means designing before you know the scale, devices or real-time needs. Naming a stack is an implementation detail that should follow from requirements. The backend is out of scope in a frontend round — treat the server as a black box whose API you define.',
        },
        {
          id: 'sd-time-allocation',
          prompt: 'You are 22 minutes into a 45-minute round and still on the data model. What should you do?',
          choices: [
            'Keep going — thoroughness in the data model is what interviewers value most',
            'Say you will keep the API section brief, cover it in a few minutes, and move to the deep dives',
            'Skip straight to the wrap-up so you finish on time',
            'Ask the interviewer for 15 more minutes',
          ],
          answer: 1,
          explanation:
            'Managing your own clock is part of the communication signal, and the deep dives (Optimizations) are where seniority shows — they should get the largest share of time. Signposting the compression ("I\'ll keep the API brief so we have time for performance and accessibility") shows control. Skipping to the wrap-up forfeits the depth signal entirely, and continuing at length on the data model risks never reaching it.',
        },
      ],
    },
    {
      kind: 'lesson',
      id: 'building-blocks',
      title: 'Building blocks: rendering, state, data, APIs, real-time, resilience',
      minutes: 45,
      body: buildingBlocks,
      checks: [
        {
          id: 'sd-normalize-why',
          prompt:
            'A user renames themselves. Their name appears in 40 posts and 15 comments spread across three cached queries, and some views keep showing the old name. Which data-layer design makes the rename a single write?',
          choices: [
            'Increase the cache staleTime so the queries refetch less often',
            'A normalized entity store: users stored once by id, posts and comments reference the user id, views select by id',
            'Store every query response in React context instead of a cache',
            'Deep-clone each response before caching it',
          ],
          answer: 1,
          explanation:
            'The bug is duplicated copies of the same entity (a document cache stores each response as returned). Normalizing keeps one copy per id, so one write updates every view that selects it. A longer staleTime makes staleness *worse*. Moving responses into context doesn\'t remove the duplication, and cloning creates even more independent copies. (With a document cache, the alternative is invalidating every query that contains the user.)',
        },
        {
          id: 'sd-realtime-choice',
          prompt:
            'An order-tracking page receives status updates pushed by the server every few seconds. The client never sends data over that channel. Which transport fits best?',
          choices: [
            'WebSockets — they are the standard for real-time',
            'Server-Sent Events — one-way server→client stream over plain HTTP with built-in reconnection',
            'Short polling every 500 ms',
            'A service worker with Background Sync',
          ],
          answer: 1,
          explanation:
            'SSE is designed for exactly this: a one-directional stream over HTTP, with `EventSource` reconnecting automatically and resuming via `Last-Event-ID`. WebSockets work but add bidirectional, stateful infrastructure (sticky sessions or a pub/sub backplane, manual reconnect and heartbeats) you don\'t need. 500 ms polling wastes requests and battery when nothing changes. Background Sync is for replaying outgoing requests once connectivity returns, not for receiving updates.',
        },
      ],
    },
    {
      kind: 'lesson',
      id: 'case-studies',
      title: 'Worked case studies: autocomplete and news feed',
      minutes: 40,
      body: caseStudies,
      checks: [
        {
          id: 'sd-autocomplete-race',
          prompt:
            'A user types "re", pauses, then types "a". The request for "re" resolves **after** the request for "rea", and the list shows results for "re". What is the most robust fix?',
          choices: [
            'Increase the debounce to 1 second so requests never overlap',
            'Abort the previous request when starting a new one, and only apply a response if it belongs to the current query',
            'Sort results alphabetically so the order doesn\'t matter',
            'Disable the input while a request is in flight',
          ],
          answer: 1,
          explanation:
            'This is the out-of-order response race. Aborting saves bandwidth, but abort is best-effort (the response may already be on its way, or the API may ignore the signal), so you also check that the response matches the current query — "latest wins". A longer debounce only makes the race rarer and the UI slower. Sorting doesn\'t change *which query* the results belong to. Disabling the input destroys the typing experience.',
        },
        {
          id: 'sd-feed-banner',
          prompt:
            'While a user is reading their feed, the server signals that 3 new posts exist. What should the client do?',
          choices: [
            'Insert the new posts at the top immediately so the feed is always fresh',
            'Reload the whole feed from the first page',
            'Buffer them and show a "3 new posts" banner; on click, prepend them (keeping the bottom cursor), scroll to top and announce it',
            'Ignore them until the next full page load',
          ],
          answer: 2,
          explanation:
            'Inserting above the reader shifts content (they lose their place, and it counts as layout shift). Reloading discards the loaded items and scroll position. Ignoring them defeats the real-time requirement. Buffering behind a banner keeps the user in control; the merge prepends by id and keeps the existing `nextCursor`, because the cursor describes the bottom of the feed.',
        },
      ],
    },
    {
      kind: 'quiz',
      id: 'trade-off-scenarios',
      title: 'Trade-off scenarios',
      minutes: 15,
      intro:
        'Each question is a design decision an interviewer might push on. Before revealing, say your answer out loud **with its reason** in one sentence — that sentence is what you are practising.',
      questions: [
        {
          id: 'sdq-live-scores-transport',
          prompt:
            'A sports site shows live scores to millions of concurrent viewers. Updates flow server→client every few seconds; viewers never send anything. Which transport would you choose?',
          choices: [
            'WebSockets, because they have the lowest per-message overhead',
            'SSE (with a polling fallback), because it is one-way, plain HTTP, auto-reconnecting and works with existing HTTP infrastructure',
            'Long polling, because it works in every browser',
            'Short polling every second from every client',
          ],
          answer: 1,
          explanation:
            'The traffic is one-directional, so SSE\'s model fits exactly, and it rides on ordinary HTTP (load balancers, HTTP/2 multiplexing, auth cookies) with automatic reconnection and `Last-Event-ID` resume. WebSockets would work but buy bidirectionality you don\'t need at the cost of stateful connection infrastructure at a massive scale. Long polling is a fallback, not a first choice. Per-second polling from millions of clients is a self-inflicted load problem.',
        },
        {
          id: 'sdq-feed-offset-duplicates',
          prompt:
            'Users report seeing the same post twice while scrolling the feed, usually during busy periods. The API is `GET /feed?page=N&size=20`. What is the root cause and fix?',
          choices: [
            'React key collisions — use the array index as the key',
            'Offset pagination shifts when new posts are inserted at the top; switch to cursor pagination (and dedupe by id on the client)',
            'The CDN is caching pages; add `Cache-Control: no-store`',
            'The page size is too small; use 100 items per page',
          ],
          answer: 1,
          explanation:
            'With offsets, every new post pushes existing posts down, so page 2 starts with items you already saw on page 1 (deletions do the opposite and skip items). A cursor continues after a specific item, so inserts at the top don\'t affect it; client-side dedupe by id is the safety net. Index keys would hide nothing and break reconciliation. Caching and page size don\'t change the shifting window.',
        },
        {
          id: 'sdq-admin-table-pagination',
          prompt:
            'An internal admin table lists ~5,000 invoices, rarely changing, and users need "page 37 of 250" plus jumping to any page. Which pagination?',
          choices: [
            'Cursor pagination, because it is always the best practice',
            'Offset/page-number pagination, because users need random access and totals, and the data is stable',
            'Infinite scroll with virtualization',
            'Load all 5,000 rows and paginate nothing',
          ],
          answer: 1,
          explanation:
            'Cursor pagination can\'t jump to page N or easily show "of 250". Its main advantage — stability under concurrent inserts — barely matters for rarely-changing data, and `OFFSET` cost at 5,000 rows is negligible. Choosing offset here, *with that reasoning*, is the senior answer: there is no universally best pagination. Infinite scroll defeats "jump to page 37"; loading everything ignores growth.',
        },
        {
          id: 'sdq-stale-user-name',
          prompt:
            'After a user updates their avatar, the header shows the new avatar but their posts in the feed still show the old one until a reload. The app uses a document cache (one entry per query). What are the two standard fixes?',
          choices: [
            'Add `key={Math.random()}` to the feed so it remounts',
            'Invalidate/refetch every query that contains the user — or normalize so the user is stored once and every view selects it by id',
            'Put the avatar URL in localStorage',
            'Increase the cache gcTime',
          ],
          answer: 1,
          explanation:
            'The feed query holds its own copy of the user. Either tell the cache those queries are stale (invalidation — simple, costs refetches) or remove the duplication (normalization — one write, more machinery). Random keys remount everything and still render the stale cached copy. localStorage adds a third source of truth. gcTime controls how long *unused* entries are kept, not freshness.',
        },
        {
          id: 'sdq-like-toggle-race',
          prompt:
            'The like button calls `POST /posts/:id/toggle-like` optimistically. A user double-taps fast; the first request fails after the second succeeds, and the UI ends up wrong. Which API change best fixes the class of bug?',
          code: `// current
await api.post(\`/posts/\${id}/toggle-like\`);`,
          codeLang: 'ts',
          choices: [
            'Add a 1-second debounce to the button and keep the toggle endpoint',
            'Use idempotent set semantics — `PUT /posts/:id/like` and `DELETE /posts/:id/like` (or `{ liked: true }`) — and apply only the response for the latest intent',
            'Disable optimistic updates for likes',
            'Retry the failed toggle request until it succeeds',
          ],
          answer: 1,
          explanation:
            '"Toggle" is not idempotent: the server\'s result depends on how many requests arrive and in what order, so retries and reordering corrupt state. "Set liked = true/false" can be retried and reordered safely, and the client only reconciles with the response matching the user\'s latest intent. A debounce hides the symptom; dropping optimism hurts UX; retrying a toggle can flip it twice.',
        },
        {
          id: 'sdq-checkout-not-optimistic',
          prompt: 'For which action is an optimistic update the **worst** idea?',
          choices: [
            'Liking a post',
            'Marking a notification as read',
            'Placing an order and charging a card',
            'Adding an item to a wishlist',
          ],
          answer: 2,
          explanation:
            'Payments are irreversible, have a meaningful failure rate (declines, fraud checks, stock), and the server produces data the UI needs (order number). Show a clear pending state and protect against double submission with an idempotency key instead. Likes, read state and wishlists are low-risk, high-success, easily reversible — ideal optimistic candidates.',
        },
        {
          id: 'sdq-rendering-split',
          prompt:
            'An e-commerce site has public product pages (must rank in search, LCP matters, shared on social media) and a logged-in seller dashboard (highly interactive charts and tables). Which rendering plan fits?',
          choices: [
            'CSR everywhere — one SPA is simpler',
            'SSR everywhere, including fully server-rendering every dashboard interaction',
            'SSR/SSG (with revalidation) for product pages; CSR (optionally with an SSR shell) for the dashboard',
            'SSG for the dashboard and CSR for product pages',
          ],
          answer: 2,
          explanation:
            'Product pages need HTML with content and meta tags for crawlers and link-preview bots, and fast LCP — server rendering or static generation with revalidation provides that. The dashboard is behind login (no SEO) and app-like, so client rendering is fine. CSR everywhere hurts SEO and previews; SSR for every dashboard interaction adds server load and latency for no benefit; the last option is backwards.',
        },
        {
          id: 'sdq-no-retry-422',
          prompt: 'Which failure should the client **not** retry automatically?',
          choices: [
            'A network error on an idempotent GET',
            '`503 Service Unavailable` with `Retry-After: 5`',
            '`422 Unprocessable Content` with field validation errors',
            '`429 Too Many Requests` with `Retry-After: 2`',
          ],
          answer: 2,
          explanation:
            'A 422 means the request itself is invalid — sending it again gets the same answer, so show the field errors instead. Network errors on idempotent requests, 503 and 429 are transient: retry with exponential backoff and jitter, honouring `Retry-After` when present.',
        },
        {
          id: 'sdq-bff-round-trips',
          prompt:
            'The web home page makes six sequential and parallel calls to different microservices, two of them dependent, and the mobile app needs a slimmer shape of the same data. What is the most direct architectural fix?',
          choices: [
            'Upgrade to HTTP/3 so the six requests are faster',
            'A Backend-for-Frontend (or GraphQL gateway) that aggregates the calls server-side and returns a screen-shaped response per client',
            'Cache all six responses in localStorage',
            'Merge the microservices into a monolith',
          ],
          answer: 1,
          explanation:
            'A BFF moves the fan-out next to the services (low-latency network), removes client-side waterfalls, and shapes responses per client; it can also keep tokens server-side. HTTP/2/3 reduce connection overhead but can\'t remove dependent round trips. localStorage caching doesn\'t help first load and adds staleness. Merging services is an organisational change far outside the frontend\'s remit.',
        },
        {
          id: 'sdq-offline-notes',
          prompt:
            'A note-taking web app must let users create and edit notes on a plane and sync when they land. Which combination is right?',
          choices: [
            'localStorage for notes and `navigator.onLine` to decide when to save',
            'A service worker precaching the app shell, notes in IndexedDB, and an outbox of pending mutations (with client ids) replayed on reconnect',
            'The HTTP cache with long `max-age` on the notes API',
            'The Background Sync API alone',
          ],
          answer: 1,
          explanation:
            'You need three layers: the app must load (service worker app shell), data must be readable and writable locally (IndexedDB — async, large, structured), and writes must sync later (an outbox with client-generated ids, replayed on reconnect/app start, with a conflict strategy). localStorage is synchronous, small and string-only, and `navigator.onLine` is unreliable. The HTTP cache can\'t accept writes. Background Sync is Chromium-only and only schedules replay — it doesn\'t store your data.',
        },
        {
          id: 'sdq-graphql-cdn',
          prompt:
            'A team moves a public, read-heavy content API from REST to GraphQL and CDN hit rates collapse. Why, and what is the usual mitigation?',
          choices: [
            'GraphQL responses are larger; enable gzip',
            'Queries are typically sent as POST to one endpoint, which HTTP caches don\'t cache; use persisted queries sent as GET (hash in the URL) with cache headers',
            'GraphQL disables ETags by specification',
            'The CDN cannot parse JSON',
          ],
          answer: 1,
          explanation:
            'HTTP caches key on method + URL; a POST to `/graphql` with the query in the body isn\'t cacheable by default. Persisted queries replace the query text with a hash, so requests become cacheable GETs like `/graphql?id=abc123&variables=…`. GraphQL\'s strength is flexible fetching and normalized client caches, not CDN caching — a classic REST-vs-GraphQL trade-off. The other options are false.',
        },
      ],
    },
    {
      kind: 'exercise',
      id: 'design-in-code',
      title: 'Design in code: data layer and typeahead',
      minutes: 55,
      intro:
        'System design rounds increasingly include a coding segment, and machine-coding rounds are system design in miniature. Start the timer and talk through your **state model before you type**. Order: `normalize` and `mergeFeedPages` (~25 min, the data layer from the feed case study), then the **Typeahead** machine-coding exercise (~30 min — use the live preview to feel the races). The autocomplete client is the stretch: do it if you finish early, or come back to it before Day 12.',
      exercises: [normalizeFeedEntities, mergeFeedPages, typeaheadCombobox, autocompleteClient],
    },
    {
      kind: 'drill',
      id: 'speak-aloud',
      title: 'Speak-aloud drill',
      minutes: 15,
      intro:
        'Two parts. **(1)** Answer the six concept questions out loud in ~2 minutes each, then compare with the model answer. **(2)** Pick one design prompt and do only its **first eight minutes** against a timer: restate, requirements (functional + non-functional), and an architecture sketch narrated with numbered flows. Then read the model outline and note what you missed. Full 30–40-minute runs come on Day 12 and in the Day 15 mock.',
    },
  ],
  flashcards: [
    { id: 'radio-acronym', front: 'What does **RADIO** stand for?', back: '**R**equirements, **A**rchitecture, **D**ata model, **I**nterface (APIs), **O**ptimizations (deep dives). Signpost each transition out loud.' },
    { id: 'sd-45-min-split', front: 'Rough time plan for a 45-minute frontend design round?', back: '~2 min restate · ~6 requirements · ~7 architecture · ~5 data model · ~6 interface · ~12 deep dives · ~2 wrap-up. Most depth goes into Optimizations.' },
    { id: 'functional-vs-nonfunctional', front: 'Functional vs non-functional requirements?', back: 'Functional = what users can do (view feed, like, post). Non-functional = qualities: performance, scale, devices/network, a11y, i18n, SEO, security, offline, real-time freshness.' },
    { id: 'fe-sd-scope', front: 'What is a frontend system design round **not** about?', back: 'Backend infrastructure (sharding, queues, load balancers). Treat the server as a black box whose **API you define from the client\'s needs**; spend depth on client architecture.' },
    { id: 'trade-off-template', front: 'The four parts of a strong trade-off statement?', back: 'Options → choice → reason tied to a stated requirement → the condition under which you\'d revisit it.' },
    { id: 'normalization-benefit', front: 'Why normalize client data?', back: 'One copy per entity (keyed by id) → a single write updates every view; O(1) lookups; lists hold ids so items re-render independently. Cost: normalize/denormalize code and GC of orphans.' },
    { id: 'document-vs-normalized-cache', front: 'Document cache vs normalized cache?', back: 'Document (TanStack Query, SWR): stores each response per key — simple, but entities duplicate; update via invalidation or per-key writes. Normalized (Apollo, Relay): one record per `type:id`, updates propagate automatically.' },
    { id: 'state-ownership-rules', front: 'Five rules for where state lives?', back: 'Colocate; lift only to the lowest common owner; server data in a server-state cache; URL for shareable state (filters, tabs, page); derive instead of syncing.' },
    { id: 'offset-vs-cursor', front: 'Offset vs cursor pagination in one line each?', back: 'Offset: random access and totals, but duplicates/skips when data shifts and slow at depth. Cursor: stable under inserts and index-friendly, but no "jump to page N".' },
    { id: 'opaque-cursor', front: 'What is inside a good cursor, and why opaque?', back: 'An encoding of the last item\'s sort key plus id tie-breaker (e.g. `createdAt|id`, base64). Opaque so clients can\'t construct or depend on it — the server can change it freely.' },
    { id: 'sse-vs-websocket', front: 'SSE vs WebSocket?', back: 'SSE: server→client only, plain HTTP, text, auto-reconnect with `Last-Event-ID`. WebSocket: bidirectional, binary, persistent stateful connection, manual reconnect/heartbeats, harder to scale.' },
    { id: 'push-signal-pull-data', front: 'What is "push a signal, pull the data"?', back: 'The real-time channel sends tiny events (`new_posts: 3`); the client fetches the actual data through the normal cached, authorized API. One data path, simple channel.' },
    { id: 'optimistic-steps', front: 'Optimistic update steps?', back: 'Cancel in-flight refetches → snapshot → apply optimistic change → send → on success reconcile with the server entity; on error roll back and notify (then invalidate if needed).' },
    { id: 'idempotency-key', front: 'What is an idempotency key for?', back: 'A client-generated unique id (e.g. UUID) sent with a non-idempotent request (`POST`) so the server can recognise a retry and not create a duplicate (double post, double charge).' },
    { id: 'full-jitter', front: 'Exponential backoff with full jitter — formula and why?', back: '`delay = random(0, min(cap, base × 2^attempt))`. Jitter spreads retries so clients that failed together don\'t retry together (thundering herd).' },
    { id: 'retryable-statuses', front: 'Which failures are safe to auto-retry?', back: 'Network errors/timeouts (idempotent or with an idempotency key), 408, 429 and 503 (honour `Retry-After`), 500/502/504. Not 400/403/404/409/422; 401 → refresh session once.' },
    { id: 'bff-pattern', front: 'What is a Backend-for-Frontend?', back: 'A server owned by the frontend team that aggregates upstream services into screen-shaped responses per client, removes client waterfalls and keeps tokens server-side. Cost: another service to run.' },
    { id: 'rfc-9457', front: 'Standard format for HTTP API errors?', back: 'RFC 9457 Problem Details (`application/problem+json`, successor of RFC 7807): `type`, `title`, `status`, `detail`, `instance`, plus extensions such as field errors.' },
    { id: 'offline-outbox', front: 'How do offline writes work?', back: 'Persist each mutation (with a client id) in an IndexedDB outbox, show it as pending, replay on reconnect/app start (Background Sync where available), resolve conflicts (LWW, server-wins, merge/CRDT).' },
    { id: 'new-posts-banner', front: 'Why buffer new feed posts behind a banner?', back: 'Inserting above the reader shifts content and loses their place (and causes layout shift). A "N new posts" banner lets the user choose; prepend by id and keep the bottom cursor.' },
  ],
  interviewQuestions: [
    {
      id: 'sd-design-autocomplete',
      kind: 'system-design',
      level: 'core',
      minutes: 30,
      question:
        'Design an autocomplete (typeahead) component that product teams across the company can reuse — for example in the global search bar.',
      answer: `**Restate:** a reusable component question — depth goes into the component API, the data layer and accessibility.

**R — Requirements**
- Clarify: reusable library vs one search box (→ generic API), data size (small static list → client filtering; large → server), result types (text vs rich rows), recent searches on focus, devices.
- Functional: suggestions as you type; select via mouse, touch, keyboard; highlighted matches; loading/empty/error states; optional recents.
- Non-functional: results within ~300 ms of a pause; minimal requests; correct under races; APG combobox accessibility; IME/RTL; mobile keyboards.

**A — Architecture**
- \`<Autocomplete>\` controller (input, popup, live region) + presentational \`Option\`s via \`renderItem\`.
- A framework-agnostic **data client** (\`setQuery\`/\`subscribe\`/\`getState\`) owning debounce, cache and request ordering; bound with \`useSyncExternalStore\`.
- Server suggest endpoint behind a CDN.

**D — Data model**
- Component: \`inputValue\`, \`isOpen\`, \`activeIndex\`. Client: normalized \`query\`, \`status\`, \`results\`, \`error\`, and an **LRU cache** \`Map<normalizedQuery, Suggestion[]>\` (~50 entries, optional TTL).
- \`Suggestion { id, type, label, highlights: [start, end][], url? }\`.

**I — Interface**
- Props: \`fetchSuggestions(query, { signal })\`, \`onSelect\`, \`getItemKey\`, \`renderItem\`, \`debounceMs\`, \`minQueryLength\`, \`label\` (required). Offer a headless \`useAutocomplete()\` for full control.
- \`GET /suggest?q=rea&limit=8 → { query, results }\`; \`Cache-Control: public, max-age=60\` for non-personalised results, \`private\` otherwise.

**O — Deep dives**
- **Network:** debounce 200–300 ms, per-query cache, minimum length, prefetch on focus.
- **Races:** abort the previous request *and* only apply responses matching the current query; still cache stale ones.
- **UX:** keep previous results while loading, delay the spinner ~150 ms, highlight via ranges.
- **A11y:** \`role="combobox"\` + \`aria-expanded\`/\`aria-controls\`/\`aria-activedescendant\`; listbox/options; focus stays in the input; arrows/Enter/Escape; live region "8 results".
- **i18n/mobile:** ignore keys during IME composition; \`inputmode="search"\`, \`enterkeyhint\`; touch targets; virtual keyboard overlap.
- **Security:** render text + ranges, never server HTML.

**Wrap-up:** biggest risks are races and accessibility regressions; I'd measure requests per search and time-to-suggestion.`,
      followUps: [
        'How would you handle 100,000 static options with no server?',
        'Why not use useDeferredValue instead of debouncing?',
        'How would you test the race condition?',
        'What changes if suggestions are personalised?',
        'How do you handle IME composition for Japanese input?',
      ],
    },
    {
      id: 'sd-design-news-feed',
      kind: 'system-design',
      level: 'senior',
      minutes: 40,
      question: 'Design the frontend of a news feed like Facebook\'s or X\'s.',
      answer: `**Restate:** a product question — depth goes into pagination, rendering performance, the data layer and real-time behaviour.

**R — Requirements**
- Functional: infinite ranked feed (text + images), create post, like/comment, "N new posts" without losing position. Out of scope: ranking, stories, DMs, ads targeting.
- Non-functional: LCP < 2.5 s on mid-range mobile; smooth scrolling over hundreds of items; instant-feeling interactions; accessible; flaky networks; i18n.

**A — Architecture**
- SSR (streamed) first page for LCP, then client-side pagination. Logged in → no SEO pressure.
- Data layer: server-state cache + **normalized store** (posts, users, comments). Feed state = ordered ids + cursor.
- SSE channel for \`new_posts\` signals — push a signal, pull the data.
- View: \`FeedPage\` → \`Composer\`, \`NewPostsBanner\`, virtualized \`FeedList\` → \`FeedItem(id)\` (renderer by \`kind\`, error boundary per item) → header, body, \`MediaGrid\`, \`ActionBar\`, comments preview.

**D — Data model**
- \`Post { id, author: UserId, createdAt, text, entities[], media[{url, width, height, blurhash, alt}], likeCount, commentCount, viewerHasLiked }\`.
- \`FeedItem\` is a discriminated union on \`kind\` (post, suggestion, ad).
- \`FeedState { ids, nextCursor, hasMore, pendingNewIds }\`; client-only drafts and pending optimistic items with temp ids.

**I — Interface**
- \`GET /feed?cursor&limit=10 → { items, posts, users, nextCursor }\` (side-loaded, already normalized).
- \`POST /posts\` and comments with \`Idempotency-Key\`; \`PUT\`/\`DELETE /posts/:id/like\` (idempotent set, not toggle).
- \`GET /feed/stream\` (SSE): \`new_posts { count, newestId }\`.

**O — Deep dives**
- **Pagination:** cursor (stable under inserts); IntersectionObserver sentinel with a generous \`rootMargin\`; one request per cursor; dedupe by id on merge; "Load more" fallback.
- **Virtualization:** measured variable heights, overscan, scroll anchoring and restoration; trade-offs (find-in-page, screen readers); \`content-visibility\` as the lighter option.
- **New posts:** buffer behind the banner; on click prepend by id keeping the bottom cursor, scroll to top, focus and announce; reset if there's no overlap.
- **Optimistic** likes and comments with rollback and retry.
- **Images:** \`srcset\`/\`sizes\`, AVIF/WebP, lazy below the fold but \`fetchpriority="high"\` for the LCP image, dimensions to prevent CLS, blurhash placeholders.
- **States:** skeleton, initial-load error, pagination error inline, empty onboarding, offline, end of feed.
- **A11y:** \`role="feed"\`, \`<article>\` with \`aria-posinset\`/\`aria-setsize\`, \`aria-busy\` while loading, keyboard navigation, polite announcements.

**Wrap-up:** main risks are virtualization complexity and memory on low-end devices; I'd track LCP, INP, scroll jank and feed-load errors from real users.`,
      followUps: [
        'How do you restore scroll position when the user comes back from a post detail page?',
        'What happens to a virtualized item that contains a playing video or an open comment box?',
        'How would the design change if the feed had to work offline?',
        'How do you make like counts consistent when many users like the same post at once?',
        'How do you avoid duplicate posts across pages?',
      ],
    },
    {
      id: 'sd-design-photo-upload',
      kind: 'system-design',
      level: 'senior',
      minutes: 35,
      question:
        'Design the frontend for a photo-sharing app\'s upload flow: a user picks several photos, adds a caption, and publishes a post.',
      answer: `**Restate:** a flow question — depth goes into reliability on bad networks, main-thread performance and UX during long operations.

**R — Requirements**
- Clarify: max photos (say 10) and size, video (out of scope), editing filters (out of scope), mobile share.
- Functional: pick via picker, drag-and-drop or camera; previews; reorder/remove; caption and alt text; per-photo progress, cancel, retry; publish.
- Non-functional: large files on flaky mobile networks (resumable), responsive UI while processing, privacy (strip location EXIF), accessible, validated limits.

**A — Architecture**
- \`UploadComposer\`: \`DropZone\` (a real \`<input type="file" multiple accept="image/*">\` underneath), \`PreviewGrid\` of \`UploadCard\`s, \`MetadataForm\`, \`PublishButton\`.
- \`UploadManager\` living above the routes: a queue with concurrency 2–3 and a per-file state machine; image processing in a **Web Worker**.
- Uploads go **directly to object storage via presigned URLs**; the API only creates sessions and the post.
- Flow: (1) select → (2) validate, show an object-URL preview → (3) worker: decode, orient, resize to ~2048 px, re-encode (drops EXIF) → (4) create upload → (5) PUT to storage with progress → (6) complete → (7) on publish, create the post. Uploads start immediately, while the user writes the caption.

**D — Data model**
- \`UploadItem { localId, file, previewUrl, status: 'queued' | 'processing' | 'uploading' | 'uploaded' | 'failed' | 'canceled', progress, uploadId?, mediaId?, error?, alt }\`; draft \`{ caption, order: localId[] }\`.

**I — Interface**
- \`POST /uploads { contentType, size } → { uploadId, url | parts[], expiresAt }\`; \`PUT <presigned url>\`; \`POST /uploads/:id/complete → { mediaId, width, height }\`.
- \`POST /posts { caption, media: [{ mediaId, alt }] }\` with an \`Idempotency-Key\`.

**O — Deep dives**
- **Progress:** \`fetch\` has no upload-progress events; use \`XMLHttpRequest.upload.onprogress\` or count completed chunks.
- **Resumability:** multipart/chunked uploads (or the tus protocol); retry failed chunks with backoff; on resume, ask which parts exist.
- **Performance:** object URLs (revoke them), \`createImageBitmap\` + \`OffscreenCanvas\` in a worker, a concurrency limit so the uplink isn't saturated; resizing shrinks uploads several-fold.
- **UX:** publish optimistically with "Uploading 2/4"; uploads continue across in-app navigation; \`beforeunload\` warning; keyboard-accessible reordering.
- **Reliability:** persist the queue (Blobs) in IndexedDB to survive reloads.
- **Security/privacy:** server validates type (magic bytes) and size; short-lived, scoped presigned URLs; strip GPS EXIF; never trust \`accept\`.
- **A11y:** drop zone is also a button; \`role="progressbar"\` per file with an accessible name; live-region announcements for completion and errors; prompt for alt text.

**Wrap-up:** riskiest parts are resumability and memory on low-end phones; I'd measure upload success rate and time-to-publish.`,
      followUps: [
        'Can fetch report upload progress? What do you use instead?',
        'Why upload directly to object storage instead of through your API server?',
        'How do you resume after the user loses connectivity or reloads the page?',
        'How do you keep the main thread responsive while resizing ten 12-megapixel photos?',
        'What do you do with EXIF metadata, and why?',
      ],
    },
    {
      id: 'sd-design-notifications',
      kind: 'system-design',
      level: 'core',
      minutes: 25,
      question:
        'Design a notifications feature: a bell icon with an unread count in the app header, and a dropdown list of notifications.',
      answer: `**R — Requirements**
- Functional: unread badge on every page; dropdown list newest first, paginated; click navigates to the target; mark one / mark all as read; new notifications arrive live.
- Non-functional: cheap on every page (bundle size, connections, battery), consistent across tabs, accessible, i18n (plurals, relative time).

**A — Architecture**
- \`NotificationBell\` in the header — tiny, always loaded; \`NotificationPanel\` **lazy-loaded** (prefetched on hover/focus).
- Data layer: an unread-count query, a cursor-paginated list query, and a real-time channel.
- **One SSE connection per user**, not per tab: elect a leader tab (Web Locks or \`BroadcastChannel\`) or use a \`SharedWorker\`, and broadcast events to other tabs; fall back to visibility-aware polling.

**D — Data model**
- \`Notification { id, type, actors: UserId[], target: { kind, id, url }, createdAt, readAt: string | null, groupKey }\` — \`groupKey\` enables "Ada and 3 others liked your post".
- \`unreadCount\` is server-authoritative; the client adjusts it locally between fetches.

**I — Interface**
- \`GET /notifications?cursor&limit=20\`, \`GET /notifications/unread-count\`.
- \`POST /notifications/read { ids }\` and \`POST /notifications/read-all { upToId }\`.
- SSE \`/notifications/stream\` with event ids so \`Last-Event-ID\` resumes after reconnect.

**O — Deep dives**
- **Consistency:** dedupe events by id; increment locally on arrival; refetch the count on reconnect and when the tab becomes visible.
- **Mark all as read** with a watermark (\`upToId\`), so a notification arriving mid-request stays unread.
- **Optimistic** read state with rollback.
- **Cross-tab** sync via \`BroadcastChannel\`; tab title "(3)".
- **A11y:** a button whose *accessible name* includes the count ("Notifications, 3 unread"), not just a visual badge; the panel manages focus and closes on Escape; a polite live region for new notifications, throttled.
- **i18n:** \`Intl.PluralRules\`/ICU messages and \`Intl.RelativeTimeFormat\`.
- **Extension:** browser push (Push API + service worker) is a separate, opt-in feature.`,
      followUps: [
        'How do you keep the unread count correct across three open tabs?',
        'SSE or WebSocket here — and why?',
        'How do you avoid opening one connection per tab?',
        'How would you add browser push notifications when the site is closed?',
      ],
    },
    {
      id: 'rest-vs-graphql-frontend',
      kind: 'concept',
      level: 'core',
      minutes: 3,
      question: 'REST or GraphQL for a new frontend? How do you decide?',
      answer: `**One-liner:** GraphQL optimizes for flexible, client-driven data fetching across many screens and clients; REST optimizes for simplicity and HTTP caching. I pick based on the shape of the UI, the number of clients and the caching needs.

**GraphQL's strengths:** each screen asks for exactly the fields it needs in one round trip — no over- or under-fetching, no waterfalls; a typed schema with codegen; and normalized client caches (Apollo, Relay) that keep entities consistent across views. It shines with deeply nested UIs and several clients (web, iOS, Android) wanting different shapes.

**Its costs:** HTTP/CDN caching is harder because queries are usually POSTs to one endpoint (persisted queries over GET mitigate it); errors often come back as 200 with an \`errors\` array; uploads are awkward; and the server needs query-cost limits and DataLoader-style batching to avoid N+1.

**REST's strengths:** simple, cacheable GETs with \`ETag\` and \`Cache-Control\`, meaningful status codes, natural uploads and streaming, and OpenAPI codegen for types.

**Also on the table:** tRPC for internal full-stack TypeScript apps (end-to-end types without codegen), and a **BFF** — whichever protocol it speaks, aggregation per screen removes most REST round-trip pain.

**Example:** a public, read-heavy content site → REST behind a CDN. A product with a web app and two mobile apps sharing a rich social graph → GraphQL.`,
      followUps: ['How do you cache GraphQL responses at the CDN?', 'What is the N+1 problem in GraphQL and how is it solved?', 'Where does tRPC fit?'],
    },
    {
      id: 'offset-vs-cursor-pagination',
      kind: 'concept',
      level: 'core',
      minutes: 2,
      question: 'Offset vs cursor pagination — when would you use each?',
      answer: `**One-liner:** offset gives random access but breaks when the data shifts; cursor is stable under inserts and deletes but only moves forward or back.

**Offset** (\`?offset=40&limit=20\` or \`?page=3\`): easy to implement, supports "page 3 of 12" and jumping to any page. But if items are inserted above your position between requests, the window shifts — you see duplicates (or skip items on delete). It also gets slow at depth because the database scans and discards \`OFFSET\` rows.

**Cursor** (\`?after=<opaque>&limit=20\`): the cursor encodes the position of the last item — usually its sort key plus id as a tie-breaker — so the next page is "items after this one", typically a keyset query (\`WHERE (created_at, id) < (…)\`) that uses an index. Stable under inserts, fast at any depth. You lose random access and usually total counts. Keep it opaque so the server can change the encoding.

**My rule:** feeds, timelines, chat history and infinite scroll → cursor. Admin tables, search results with page numbers, rarely changing data → offset. And always dedupe by id on the client, because ranking changes and retries can still repeat items.`,
      followUps: ['What goes inside a cursor?', 'How do you support "jump to page N" with cursors?', 'Why does OFFSET get slow on large tables?'],
    },
    {
      id: 'polling-sse-websockets',
      kind: 'concept',
      level: 'core',
      minutes: 3,
      question: 'Compare short polling, long polling, Server-Sent Events and WebSockets. How do you choose?',
      answer: `**One-liner:** choose by direction and frequency of updates — polling for infrequent, SSE for server-to-client streams, WebSockets when both sides talk often.

- **Short polling:** a request every N seconds. Trivial and works everywhere, but latency is up to N and most requests return nothing — costly in battery and server load.
- **Long polling:** the server holds the request open until there's data or a timeout, then the client immediately re-requests. Near real-time on plain HTTP; a solid fallback, with more per-message overhead and some ordering complexity.
- **SSE:** one long-lived HTTP response streaming \`text/event-stream\`. Server-to-client only and text-only, but \`EventSource\` **reconnects automatically** and resumes with \`Last-Event-ID\`, and it works with ordinary HTTP infrastructure and HTTP/2. Gotcha: native \`EventSource\` can't send custom headers, so use cookies or a fetch-based client.
- **WebSockets:** a persistent, full-duplex connection, binary-capable, lowest per-message overhead. You own reconnection, heartbeats and resubscription, and scaling stateful connections needs sticky sessions or a pub/sub backplane.

**How I choose:** notifications, live scores, progress and AI token streams → SSE. Chat with typing indicators, collaborative editing, presence, games → WebSockets. Data that changes every few minutes → polling, paused when the tab is hidden.

**A pattern I like:** push a small signal ("3 new posts") and pull the data through the normal API — one data path, simple channel.`,
      followUps: ['How do you avoid one connection per browser tab?', 'How do you authenticate an SSE or WebSocket connection?', 'What happens to SSE on HTTP/1.1 with many tabs open?'],
    },
    {
      id: 'optimistic-updates-explained',
      kind: 'concept',
      level: 'core',
      minutes: 3,
      question: 'What are optimistic updates? How do you implement them safely, and when would you avoid them?',
      answer: `**One-liner:** you update the UI as if the mutation already succeeded, send the request, and then reconcile with the server's response — or roll back if it fails.

**Implementation (e.g. TanStack Query \`onMutate\`/\`onError\`/\`onSettled\`):**
1. Cancel in-flight refetches of the affected data so they can't overwrite the optimistic value.
2. Snapshot the current value.
3. Apply the change to the cache.
4. Send the mutation.
5. On success, replace the optimistic value with the server's entity — it's the truth (the count may include other users' likes). On error, roll back and show a toast with retry. Invalidate afterwards if other data depends on it.

React 19's \`useOptimistic\` covers the component-level version: an optimistic value during an action that falls back to the real state when it settles.

**Making it safe:**
- **Idempotent "set" APIs** (\`PUT/DELETE /like\`) instead of toggles, so retries and reordering can't corrupt state.
- Apply only the response for the **latest intent** when the same entity is mutated quickly.
- **Client-generated ids** for created items, also sent as an idempotency key.

**When I avoid it:** payments and irreversible actions, mutations likely to fail validation, and anything where the server computes what the user needs to see (an order number). Those get a clear pending state instead.`,
      followUps: ['What happens if two optimistic mutations on the same item overlap?', 'How do you show an optimistic comment before it has a server id?', 'How does useOptimistic differ from setting state directly?'],
    },
    {
      id: 'state-structure-large-app',
      kind: 'concept',
      level: 'senior',
      minutes: 3,
      question: 'How do you structure state in a large React application?',
      answer: `**One-liner:** classify state by owner and lifetime, and give each kind the simplest tool that fits — most "state management" problems come from treating server data like client state.

**The categories:**
- **Server state** (anything the backend owns): a server-state cache such as TanStack Query, RTK Query or Apollo. You get dedupe, staleness, retries and invalidation. Normalize if the same entities appear in many views and change often.
- **URL state** (filters, search, tabs, pagination): router search params — shareable, survives reload, works with the back button.
- **Local UI state** (open menus, input values, hover): \`useState\`/\`useReducer\`, colocated in the lowest component that needs it.
- **Shared client state** (theme, auth user, feature flags, a multi-step draft): context for low-frequency values; a store with selectors (Zustand, Redux Toolkit, or \`useSyncExternalStore\`) for high-frequency or large state, so components subscribe only to what they read.
- **Form state:** a form library or React 19 actions with \`useActionState\`.
- **Derived state:** computed during render (memoized if expensive), never stored.

**Organisation:** feature folders that own their queries, components and local stores; a thin global layer; explicit boundaries so features don't reach into each other's state.

**Trade-off:** a single global store gives one place to look but couples features and duplicates server data that goes stale. The split approach has more concepts, but each one is simpler and fits its job.`,
      followUps: ['When would you still choose Redux Toolkit today?', 'Why does a context with frequently changing values cause performance problems?', 'How do you keep URL state and component state in sync?'],
    },
    {
      id: 'approach-fe-system-design',
      kind: 'concept',
      level: 'core',
      minutes: 2,
      question: 'Walk me through how you approach a frontend system design question.',
      answer: `**One-liner:** I make the ambiguity explicit, agree on scope, then go from a coarse architecture to a few deep, well-justified decisions — out loud, with check-ins.

**My structure (RADIO):**
1. **Requirements** (~5 min): restate the problem, decide whether it's a product or a component question, list 3–5 core functional requirements and the non-functional ones that matter here — performance targets, devices and network, accessibility, i18n, SEO, real-time, offline, security. I write them down and state assumptions rather than stalling.
2. **Architecture:** the main components and the data layer between them and the server, with numbered data flows and the client/server rendering boundary.
3. **Data model:** entity shapes with the fields that matter, and a table of which state lives where.
4. **Interface:** endpoints, pagination, the real-time channel and error format — or the props API for a component question.
5. **Optimizations:** I offer a menu of deep dives and go deep on the two or three that matter most, with mechanisms and numbers.

**Throughout:** I signpost transitions, check in at phase boundaries, phrase decisions as trade-offs tied to requirements, and watch the clock. I finish with a 30-second recap, the main risks and what I'd measure after launch.`,
      followUps: ['What do you do if the interviewer says "you decide" to every clarifying question?', 'How do you adapt the framework for a component-design question?'],
    },
  ],
};

export default day;
