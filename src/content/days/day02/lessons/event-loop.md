## Why interviewers ask about the event loop

"What does this log?" with a mix of `setTimeout`, promises and `async/await` is the most common async question in frontend interviews. It looks like trivia, but it's a fast probe of a mental model you use every day: why the UI freezes during heavy work, why a spinner never appears, why `setTimeout(fn, 0)` isn't "now", and why React batches state updates.

A strong answer demonstrates four things:

1. JavaScript runs **to completion on a single thread** — nothing interrupts synchronous code.
2. The **host** (browser or Node), not the JS engine, schedules work as **tasks**.
3. After every task, the **microtask queue is drained completely** — including microtasks added while draining.
4. In browsers, **rendering happens between tasks**, at most once per frame.

If you can say those four sentences and then *apply* them mechanically to a puzzle, you'll answer every ordering question correctly.

## The pieces

| Piece | What it is |
|---|---|
| **Call stack** | The stack of execution contexts for the code running *right now*. The engine runs until it is empty. |
| **Host APIs** | Timers, networking, DOM events, file I/O… Work happens outside your JS; when it's done the host *queues a callback*. |
| **Task queues** | Callbacks waiting to run as a new task (colloquially "macrotasks"). The browser has several task sources (timers, user input, networking…) and may prioritise between them — e.g. input over timers. |
| **Microtask queue** | One FIFO queue per agent (a window or worker): promise reactions, `queueMicrotask`, `MutationObserver`. |
| **Rendering** | "Update the rendering": `requestAnimationFrame` callbacks, style, layout, paint. Browser only. |

Precise vocabulary helps: the **event loop is defined by the host** (the HTML spec for browsers, libuv for Node). ECMAScript itself only defines *jobs* (e.g. promise reaction jobs), which hosts run as microtasks. "Macrotask" isn't a spec term — the spec just says **task**.

## One turn of the loop

```ts
// Pseudocode for a browser event loop (simplified from the HTML spec)
while (true) {
  const task = pickOldestTaskFromSomeTaskQueue(); // a timer callback, a click handler, a message…
  run(task);                                     // runs to completion; the call stack empties
  drainMicrotasks();                             // ALL of them, including ones queued meanwhile
  if (isTimeToRender()) {                        // ~every 16.7 ms at 60 Hz, only if something changed
    runAnimationFrameCallbacks();                // requestAnimationFrame
    recalcStyle(); layout(); paint();            // (then ResizeObserver/IntersectionObserver, composite…)
  }
}
```

Consequences you should be able to state:

1. **Run-to-completion.** A 2-second `while` loop blocks clicks, timers, *and* painting for 2 seconds.
2. **Microtasks beat the next task.** A promise callback always runs before a `setTimeout(…, 0)` that was queued at the same time.
3. **Microtasks queued by microtasks run in the same drain.** An endless chain of them starves everything — rendering included.
4. **The browser paints between tasks**, so all DOM changes made in one task (and its microtasks) appear together. You never see intermediate states.

```ts run
console.log('1: sync');
setTimeout(() => console.log('5: task (setTimeout 0)'), 0);
Promise.resolve().then(() => console.log('3: microtask (then)'));
queueMicrotask(() => console.log('4: microtask (queueMicrotask)'));
console.log('2: sync');
```

> [!INTERVIEW] Say it like this
> "JavaScript runs one piece of code at a time, to completion. The host — the browser or Node — schedules callbacks as tasks. The loop takes one task, runs it until the call stack is empty, then drains the *entire* microtask queue — promise callbacks, code after `await`, `queueMicrotask` — and only then, if a frame is due, runs `requestAnimationFrame` callbacks and renders. Then it picks the next task. That's why a resolved promise's `then` always runs before a `setTimeout(0)`."

### What goes where

| Queue | What gets scheduled there |
|---|---|
| **Task** | The initial script, `setTimeout`/`setInterval` callbacks, UI events (click, input, keydown), network events (XHR, WebSocket messages), `postMessage`/`MessageChannel`, `setImmediate` (Node) |
| **Microtask** | `then`/`catch`/`finally` callbacks, the continuation after `await`, `queueMicrotask`, `MutationObserver` |
| **Rendering steps** | `requestAnimationFrame`, style/layout/paint, `ResizeObserver`, `IntersectionObserver` |
| **Idle** | `requestIdleCallback` — only when the browser has spare time before the next frame |

`fetch()` straddles two of these: the network response arrives as a *task* that resolves the promise, and your `.then`/`await` continuation then runs as a *microtask*.

> [!MISTAKE]
> "`setTimeout(fn, 0)` runs immediately" or "right after the current line". It queues a **new task**: `fn` runs after the current script finishes, after every pending microtask, after any tasks already queued — and possibly after a render.

## Microtasks drain completely

The microtask checkpoint keeps going until the queue is empty, so microtasks scheduled *by* microtasks still run before the next task:

```ts run
setTimeout(() => console.log('timeout — finally my turn'), 0);

let n = 0;
function spin() {
  n++;
  console.log('microtask', n);
  if (n < 5) queueMicrotask(spin); // re-queues itself: still drained in the same checkpoint
}
queueMicrotask(spin);
```

Make that loop unbounded and the page hangs as badly as a `while (true)` — no timers, no input, no paint. A recursive `setTimeout` loop, by contrast, *does* let the browser breathe, because every iteration is a separate task.

## `await`, desugared

`await` is syntax for "subscribe the rest of this function to a promise". Roughly:

```ts
async function load(): Promise<void> {
  console.log('A');              // runs synchronously, as soon as load() is called
  const user = await getUser();  // getUser() is called synchronously too; then load() pauses
  console.log('B', user);        // the continuation runs later, as a microtask
}

// ≈ (simplified)
function loadDesugared(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('A');
    Promise.resolve(getUser()).then((user) => {
      console.log('B', user);
      resolve();
    }, reject);
  });
}
```

What this means for output questions:

- Everything **before the first `await`** — including the awaited call itself — runs synchronously, inside the caller's task.
- `await` **always yields**, even for non-promises: `await 42` still defers the rest to a microtask.
- Calling an async function returns a promise immediately; the caller keeps running.
- `await` on an already-fulfilled native promise costs **one** microtask tick (a 2019 spec change made it this cheap). Returning a promise *from* an async function costs two extra ticks — the quiz has a question on it, but don't build code that depends on tick counts.

```ts run
async function task(name: string) {
  console.log(`${name}: start (sync)`);
  await null; // even a non-promise yields to the microtask queue
  console.log(`${name}: after await (microtask)`);
}

console.log('script start');
setTimeout(() => console.log('timeout (task)'), 0);
task('A');
task('B');
console.log('script end');
```

## A reliable method for output-prediction questions

Don't "feel" your way through these. Run the algorithm on paper:

1. Make three columns: **Output**, **Microtask queue**, **Task queue** (note timer delays).
2. Execute the synchronous code top to bottom. Promise **executors** and code before the first `await` are synchronous. A `then` callback is queued **only when its promise settles**: immediately for an already-resolved promise, otherwise later.
3. When the stack is empty, take microtasks **FIFO**. Each one may log, settle a promise (queueing *its* `then` callbacks at the **end** of the queue) or schedule a timer. Continue until the queue is empty.
4. Take **one** task — the timer with the earliest due time; ties go in scheduling order — run it, then drain microtasks again (step 3).
5. Remember that a `.then().then()` chain advances **one link per microtask**, so independent chains interleave.

Let's apply it:

```ts run
console.log('A');
setTimeout(() => console.log('B'), 0);
Promise.resolve()
  .then(() => {
    console.log('C');
    setTimeout(() => console.log('D'), 0);
  })
  .then(() => console.log('E'));
new Promise<void>((resolve) => {
  console.log('F');
  resolve();
}).then(() => console.log('G'));
console.log('H');
```

| Step | Logs | Microtask queue after the step | Task queue after the step |
|---|---|---|---|
| Synchronous script | A, F, H | `C-cb`, `G-cb` | `B` |
| Microtask `C-cb` (its promise now resolves → queues `E-cb`) | C | `G-cb`, `E-cb` | `B`, `D` |
| Microtask `G-cb` | G | `E-cb` | `B`, `D` |
| Microtask `E-cb` | E | — | `B`, `D` |
| Task `B`, then drain (nothing) | B | — | `D` |
| Task `D` | D | — | — |

Result: **A F H C G E B D**. Notice `F`: the executor runs synchronously. Notice `E` after `G`: `E` was only queued when `C-cb` *returned*.

{{quiz:event-loop-chain-interleave}}

## Timers are a minimum, not a schedule

`setTimeout(fn, ms)` means "queue a task **no sooner than** `ms` from now". The actual delay is longer whenever the thread is busy, and several rules can stretch it further:

| Rule | Detail |
|---|---|
| Busy thread | A long task delays every timer behind it. Expired timers then run in order of their due time. |
| Nesting clamp | Per the HTML spec, once timers are nested more than 5 levels deep (a timeout scheduling a timeout…), the minimum delay becomes **4 ms**. |
| Hidden tabs | Browsers throttle timers in background tabs (typically to ≥ 1 s; Chrome can align long-hidden pages' timer chains to once a minute). |
| Overflow | Delays above 2³¹−1 ms (~24.8 days) overflow and fire **immediately**. |
| Node | A delay of `0` (or anything < 1) becomes 1 ms. |

```ts run
// Watch the nesting clamp (in a browser — Node doesn't apply it):
// the first few iterations are ~0-1 ms apart, the deeper ones ≥ 4 ms.
let last = performance.now();
let depth = 0;
function tick() {
  const now = performance.now();
  console.log(`depth ${depth}: +${(now - last).toFixed(1)} ms`);
  last = now;
  if (++depth < 8) setTimeout(tick, 0);
}
setTimeout(tick, 0);
```

Two practical consequences: `setInterval` drifts (compute elapsed time from `performance.now()` instead of counting ticks), and libraries that need a fast "next task" avoid `setTimeout(0)`. React's scheduler, for example, posts tasks with a `MessageChannel` precisely to dodge the 4 ms clamp.

## Rendering: when DOM updates become pixels

> [!NOTE]
> Runnable snippets in this course execute in a **Web Worker** — there's no DOM, no rendering and no `requestAnimationFrame` there. That's why the runnable examples stick to timers and promises; the rendering examples below are plain code.

The browser gets a *rendering opportunity* roughly once per display refresh (every ~16.7 ms at 60 Hz) and skips it if nothing changed or the page is hidden. Within it, `requestAnimationFrame` callbacks run **right before** style, layout and paint. Three interview-relevant consequences:

**1. A long task blocks paint and input.** Any task over 50 ms is a "long task". Heavy synchronous work in a click handler delays the next paint — measured by the INP metric (Day 10).

**2. Microtasks don't yield.** This is the most common wrong fix:

```ts
button.addEventListener('click', async () => {
  spinner.hidden = false;
  for (const chunk of chunks) {
    processChunk(chunk);     // 20 ms of synchronous work
    await Promise.resolve(); // ❌ "yields" to the microtask queue — which drains before rendering
  }
  spinner.hidden = true;     // the spinner is never painted; the page is frozen throughout
});
```

To let the browser render and handle input you must yield to the **task** queue:

```ts
type Scheduler = { yield?: () => Promise<void> };

function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: Scheduler }).scheduler;
  // scheduler.yield() (Chromium 129+, feature-detect it) resumes ahead of other queued tasks
  if (scheduler?.yield) return scheduler.yield();
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function processAll<T>(items: T[], work: (item: T) => void) {
  let lastYield = performance.now();
  for (const item of items) {
    work(item);
    if (performance.now() - lastYield > 40) {
      await yieldToMain(); // a real task boundary: the browser can paint and handle clicks
      lastYield = performance.now();
    }
  }
}
```

(For truly heavy computation, move it off the main thread entirely with a Web Worker.)

**3. Use `requestAnimationFrame` for visual work.** It runs once per frame, right before paint, so it's the right place to apply animation steps or batch DOM writes. It is *not* a microtask and not tied to tasks: many tasks can run between two frames.

> [!MISTAKE]
> "`requestAnimationFrame` runs after the browser paints." It runs **before** style/layout/paint of the upcoming frame. To run code *after* a paint, people use a `setTimeout` (or `MessageChannel`) scheduled inside a rAF callback, or a double rAF.

{{quiz:microtask-yield-spinner}}

## The React connection

You'll meet these again on Days 5 and 7, but the event loop explains them:

- **Batching.** Since React 18, all `setState` calls made in the same tick — in an event handler, a timeout or after an `await` — are batched into one render. React schedules that render rather than performing it inside each `setState`; for discrete events like clicks, React 18/19 flush it in a **microtask** after your handler returns (an implementation detail, but a good one to know).
- **Concurrent rendering.** React's scheduler splits rendering work into small units and yields back to the browser about every 5 ms by posting a task through `MessageChannel` — exactly the "yield to the task queue" idea above.
- **Effects.** `useLayoutEffect` runs synchronously after React mutates the DOM, *before* the browser paints (same task). `useEffect` normally runs after paint. That's why measuring layout belongs in `useLayoutEffect`.

## Node.js differences (briefly)

Node's loop (libuv) runs in **phases**: timers → pending callbacks → poll (I/O) → check (`setImmediate`) → close callbacks, with microtasks drained between callbacks. Two extras:

- **`process.nextTick`** has its own queue, drained *before* promise microtasks.
- **`setImmediate` vs `setTimeout(fn, 0)`**: from the main module the order is non-deterministic; inside an I/O callback, `setImmediate` always runs first.

```js
// node order.cjs  (CommonJS)
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
Promise.resolve().then(() => console.log('promise'));
process.nextTick(() => console.log('nextTick'));
console.log('sync');
// sync, nextTick, promise, timeout, immediate (the last two may swap)
```

> [!WARNING]
> In an **ES module** entry point, `promise` logs *before* `nextTick`: ESM evaluation itself runs inside a promise job, so the promise microtask queue drains first. That's a Node-specific quirk; say so if you're asked about `nextTick` ordering.

## Key takeaways

- One thread, run-to-completion; the **host** owns the event loop.
- Loop: one **task** → drain **all microtasks** → maybe **render** (rAF → style → layout → paint) → repeat.
- Microtasks: `then`/`catch`/`finally`, code after `await`, `queueMicrotask`, `MutationObserver`. Tasks: timers, events, messages, I/O.
- `await` = sync until the first `await`, then the rest is a promise reaction (microtask).
- Solve output puzzles with the three-column method; `then` callbacks are queued only when their promise settles.
- Timer delays are minimums (busy thread, 4 ms nesting clamp, background throttling).
- To keep the UI responsive, yield to the **task** queue (`setTimeout`, `scheduler.yield()`), not the microtask queue — or move work to a Worker.
