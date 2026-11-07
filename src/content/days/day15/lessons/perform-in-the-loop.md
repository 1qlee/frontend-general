## Why this lesson exists

You've spent fourteen days on *what* to know. Today is about *how it comes across*. Two candidates with identical knowledge routinely get opposite outcomes, because interviewers don't score what's in your head: they score what they can **see and write down** in 45 minutes. That includes how you clarified, how you reasoned, how you tested, how you handled a hint, and whether they'd enjoy working with you.

The good news: performance is a skill with a script. It can be learned faster than any technical topic in this course, and it pays off in every round.

> [!INTERVIEW] The one idea to keep
> Interviewers write feedback that other people read later, in a debrief or a hiring committee. Your job is to hand them **quotable evidence**: "clarified the empty-input case before coding", "stated O(n) and why", "found and fixed their own bug", "used my hint immediately and well". Every step below exists to produce one of those sentences.

## Know the loop: formats and what each round scores

A typical frontend process uses four to six of these, from the recruiter screen to the final round. Lengths vary by company. **Ask the recruiter for the exact format of every round**: they will tell you, and it's the cheapest prep there is.

| Round | Typical length | What happens | What they score | How it usually goes wrong |
|---|---|---|---|---|
| **Recruiter screen** | 20–30 min | Background, motivation, logistics, compensation range | A clear story, genuine interest, no red flags | A rambling "tell me about yourself", badmouthing your current employer |
| **Hiring manager / behavioural** | 45–60 min | "Tell me about a time…", how you work, career goals | Ownership, collaboration, the **scope** of your impact (this sets your level) | "We" stories with no result; no failure story ready |
| **JS/TS coding** | 45–60 min (~35 of coding) | Implement a utility (debounce, deepClone, EventEmitter, `Promise.all`) or a light algorithm in CoderPad or an IDE | Problem solving, correctness, JS depth, testing, communication | Coding before clarifying; silence; never running the code |
| **UI build / machine coding** | 60–90 min | Build a component or mini-app in React: autocomplete, modal, tabs, data table, star rating | Component and state design, UX states, accessibility, **finishing something that works** | Over-engineering the first 20 minutes; no loading/error states; div soup |
| **Frontend system design** | 45–60 min | Design a news feed, chat, autocomplete, or collaborative editor from the client's side | Requirements, architecture, data/state, API, performance, a11y, trade-offs | Jumping straight to components; designing the backend instead; no trade-offs |
| **Rapid-fire / domain** | 20–45 min | Quick concept questions: event loop, CSS, rendering, security, React internals | Precision and breadth of vocabulary | Rambling, or bluffing confidently |
| **AI-allowed round** | 45–90 min | A realistic task with Copilot, Cursor or Claude Code allowed, sometimes in a real repo | How you **drive and verify** the tool: decomposition, context, reading diffs, tests | Accepting output blindly, or refusing to use the tool at all |
| **Take-home** | 2–6 h + review call | Build a small app, then walk the team through it | Structure, tests, README with trade-offs, and **defending your decisions** live | Gold-plating; no README; can't explain a choice in the call |
| **Code review / debugging** | 45 min | Review a PR or fix a bug in unfamiliar code | Reading code, prioritising issues, communication | Nitpicking style while missing the actual bug |

> [!TIP] Questions for the recruiter
> Which rounds, in what order? Which tool (CoderPad, my own IDE, a whiteboard)? Can I run code? Is AI assistance allowed in any round? TypeScript or JavaScript? What level are you calibrating for? Recruiters *want* you to pass: they'll answer.

## The coding-round script

Use this script for every coding problem, including the ones you've seen before. Recognising a problem is exactly when people skip clarifying and get caught by a twist.

| # | Step | Time (35-min problem) | What it sounds like |
|---|---|---|---|
| 1 | **Clarify** | 2–4 min | "Let me restate it… Should it mutate the input? What should happen on empty input? Do I need to forward `this`?" |
| 2 | **Examples → tests** | 2–3 min | "Here are three examples, including one edge case. I'll keep them as my test cases." |
| 3 | **Approach + complexity** | 2–3 min | "I'll keep X in a closure and do Y. That's O(n) time, O(1) extra space. Does that sound reasonable?" |
| 4 | **Code while narrating** | 15–20 min | "I'll use a `Map` rather than an object so keys keep their type and lookups are O(1)." |
| 5 | **Test** | 3–5 min | "Let me run the examples… and the empty case… one fails, let me trace it." |
| 6 | **Optimise / follow-ups** | the rest | "In production I'd add `cancel`, and this cache grows forever, so I'd bound it with an LRU." |

### What it sounds like: the first three minutes

Here are steps 1–3 for a problem you already know, so you can focus on the communication:

> **Interviewer:** Implement `debounce`.
>
> **You (clarify):** "Let me make sure I've got it: `debounce(fn, wait)` returns a function that delays calling `fn` until `wait` ms have passed since the *last* call. Trailing edge only, or do you want a `leading` option? Should it forward `this` and the latest arguments? Do you want `cancel`?"
>
> **Interviewer:** Trailing only, forward arguments, and add `cancel`.
>
> **You (examples):** "So with `wait = 100`, calls at 0, 50 and 100 ms produce one call at 200 ms with the arguments from the call at 100. If I `cancel()` at 150 there's no call at all. I'll write those down as checks."
>
> **You (approach):** "I'll keep the timer id in a closure. Each call clears the pending timer and schedules a new one with the latest args and `this`, and `cancel` clears it. O(1) per call. Sound good before I write it?"

That took about 90 seconds and already produced three positive notes for the interviewer: clarified requirements, concrete examples, and an approach with complexity, all **before any code**.

### Narrate decisions, not keystrokes

| ❌ Narrating keystrokes | ✅ Narrating decisions |
|---|---|
| "Now I'm typing const result equals open bracket…" | "I'll accumulate into one array and join once at the end, so nested empties can't create double spaces." |
| "And then a for loop." | "`forEach` rather than `for…of`, because I want holes in sparse arrays skipped." |
| *(silence for four minutes)* | "I'm going to write the happy path first and leave a TODO for the error case so I don't lose the thread." |

Silence of a minute or two while you think is fine. Just say so first: "Give me a moment to think about the data structure."

### Test like you mean it

When the pad has no test runner, ten seconds of setup gets you one. Interviewers love seeing this because it makes "verification" visible:

```ts run
// No test runner in the interview pad? This tiny helper is enough.
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? '✓' : '✗'} ${label}${ok ? '' : ` — got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`}`);
}

/** Split an array into chunks of `size`. */
function chunk<T>(items: readonly T[], size: number): T[][] {
  if (!Number.isInteger(size) || size < 1) throw new RangeError('size must be a positive integer');
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

check('even split', chunk([1, 2, 3, 4], 2), [[1, 2], [3, 4]]);
check('remainder goes in the last chunk', chunk([1, 2, 3], 2), [[1, 2], [3]]);
check('empty input', chunk([], 3), []);
check('size larger than input', chunk([1], 5), [[1]]);
try {
  chunk([1], 0);
} catch (e) {
  console.log('✓ size 0 throws:', (e as Error).message);
}
```

Change `i += size` to `i += 1` and run it again. The failing line tells you exactly what broke. That's the experience you want *during* the interview, not after.

> [!MISTAKE]
> Saying "I think it works" and stopping. Walk at least one example through the code out loud, run the edge cases, and **state the complexity again at the end**. "Verification" is its own row on most rubrics.

## When you're stuck

Everyone gets stuck. Interviewers expect it and have hints ready. What they score is **what you do next**. Run this protocol out loud:

1. **Say it.** "I'm stuck on how to handle the nested case. Let me think out loud."
2. **Go back to a concrete example** and do it by hand on paper or in a comment. The algorithm is usually in what your hands did.
3. **Shrink the problem.** "Let me get a brute-force O(n²) version working first, then optimise," or "Let me ignore depth for now and flatten fully."
4. **Name the specific blocker and ask a targeted question.** "I'm not sure whether `cancel` during a pending call should also reject the promise. What would you expect?" is a great question. "Can you help me?" is a weak one.

> [!INTERVIEW] Say it like this
> "I can see two ways forward: recursion, or an explicit stack. Recursion is quicker to write; the stack avoids overflow on very deep input. I'll write the recursive version first and mention the trade-off. Does that work for you?"

{{quiz:stuck-twelve-minutes}}

### Taking hints gracefully

Rubrics usually separate "needed small nudges" from "needed significant help", but **ignoring or arguing with a hint is scored worse than needing one**. The pattern:

1. **Pause** and actually consider it. Don't keep typing.
2. **Acknowledge** it: "Good point."
3. **Restate** it in your own words, so they can see you understood it: "So a `Map` turns the inner lookup into O(1)…"
4. **Apply** it visibly and keep going.

If you think the hint is wrong, say why in one sentence and ask: "I think that breaks the ordering requirement. Am I missing something?" That's collaboration, not defiance.

> [!MISTAKE]
> Hearing an interviewer's question as an attack. "What happens if the list is empty?" almost always means *your code breaks on an empty list*. Check before you defend.

{{quiz:hint-response}}

## Recovering from a mistake

**Name it, fix it, move on.**

- A bug you spot: "Ah, I'm mutating the input array here. Let me copy it first." Calm self-correction is scored **positively**, because it's exactly what good engineers do every day.
- A wrong approach: "This approach can't handle duplicates. Let me step back. I'll keep the parsing helper and change the core loop to use a count map."
- A blank on an API: "I don't remember whether `splice` returns the removed items. I'll assume it does and verify," or "Is it OK if I check MDN?" Many interviewers say yes.
- **A round that went badly:** reset before the next one. In most loops each interviewer writes feedback independently before the debrief, so the next person doesn't know your last round went badly unless you tell them by carrying it in with you. Strong candidates often have one weak round.

## What interviewers score: an example rubric

Here is a representative coding-round rubric. Companies differ in the details, but the shape is nearly universal:

| Signal | 1 — Strong no | 2 — Lean no | 3 — Lean hire | 4 — Strong hire |
|---|---|---|---|---|
| **Problem solving** | Jumps into code; can't decompose | Finds an approach only with heavy hints | Clarifies; finds a working approach with small nudges | Clarifies precisely, compares approaches, chooses with reasons |
| **Coding** | Doesn't run; major JS gaps | Works with bugs; awkward code | Correct, readable, typed | Idiomatic, well-factored, edge cases handled unprompted |
| **Verification** | Never tests | Tests only when asked | Tests the happy path and some edges | Writes examples first; finds their own bugs |
| **Communication** | Silent, or rambling | Explains when asked | Narrates decisions | Structured and concise; checks in at the right moments |
| **Collaboration** | Defensive; ignores hints | Accepts hints passively | Uses hints well | Treats the interviewer as a teammate; builds on their input |
| **Frontend depth** *(UI/design rounds)* | Ignores UX states and a11y | Mentions them when prompted | Covers loading/empty/error and keyboard | Proactively covers a11y, performance, failure modes, trade-offs |

Notice that "reached the optimal solution" is only *part of one row*. You can pass with a sub-optimal solution and strong signals everywhere else. You can fail with an optimal solution delivered in silence.

## What "senior" sounds like

Your level is decided less by *whether* you solve the problem and more by *how you talk about it*. Senior answers make trade-offs explicit, scope the problem, anticipate failure, and connect decisions to users and the business.

| Sounds mid-level | Sounds senior |
|---|---|
| "I'd use Redux." | "Depends on the state. Server data goes in a query cache; the little genuinely global client state can live in context or a small store. I'd add Redux only for complex cross-cutting client state." |
| "It works." | "It works and it's O(n). It would leak listeners if callers forget to unsubscribe, so `on` returns an unsubscribe for effect cleanup." |
| "We built the feature." | "I proposed cutting exports from v1 to hit the date. We shipped in six weeks and added exports in v2 once usage showed they were the top request." |
| "I'd add tests." | "I'd test what users see with Testing Library and add a contract test for the API shape, since that's where it broke last time." |
| "That's a backend problem." | "I'd agree the contract with the backend team early and build against a mock so neither team is blocked." |

> [!INTERVIEW] Say it like this
> "It depends" is only a senior answer if you **finish the sentence**: "It depends on X and Y. Given what you've told me, Z, I'd choose A, and I'd revisit that if B changes."

{{quiz:senior-signal-check}}

## AI-allowed rounds

A growing number of companies run at least one round where AI assistants are allowed or even expected. These rounds don't test whether the tool can solve the problem. They test whether **you** can lead it:

- **Say your plan first**, as you would for a human pair: "I'll ask it to sketch the reducer, then I'll write the tests myself."
- **Give it context and constraints**: the types, the edge cases, the conventions. A vague prompt gets generic code.
- **Read every diff out loud** and catch its mistakes. Nothing scores better than "This handles the happy path but ignores the error response. Let me fix that."
- **Verify with tests and types**, and know when it's faster to write the code yourself.

> [!AGENT]
> Everything from Day 14 applies here: plan before implementing, keep changes small and reviewable, make the agent verify its own work, and own the result. In an AI-allowed round, narrate *why* you accept or reject each suggestion. That narration is the signal.

## Managing nerves

Nerves are physiological arousal. You can't switch them off, but you can steer them:

- **Reappraise rather than suppress.** There is research support (for example, Brooks, 2014) for reframing anxiety as excitement ("I'm excited about this") over trying to calm down. Your body's response is similar either way, and the excitement label tends to help performance.
- **Slow exhales.** A few breaths with an exhale longer than the inhale is a simple, reliable way to bring your heart rate down before a round.
- **Warm up like an athlete.** The first problem you solve that day should not be the interview's.

### The night before

- [ ] Confirm times (**time zones!**), links and interviewer names. Glance at their profiles.
- [ ] Test the setup: camera, mic, screen-share permissions, the coding pad, the charger.
- [ ] Re-read your story bank (titles and numbers only) and the three questions you'll ask.
- [ ] Light review only: 15 minutes of flashcards. No new topics.
- [ ] Put out water, a notepad and a pen. Sleep beats cramming.

### The morning of

- [ ] A warm-up problem out loud (10–15 min): redo `once` or `classNames` from memory.
- [ ] Say your "tell me about yourself" out loud twice.
- [ ] 10 minutes before: close Slack and email, silence notifications, quit other apps, get water, open the pad, take two slow breaths.
- [ ] First 30 seconds: small talk, then "Is it OK if I think out loud as I go?" It signals collaboration and buys you permission to talk through your thinking.

### Between rounds

Stand up, drink water, write "done" on your notepad, and **don't replay the round**. Say the opening line for the next format out loud ("Before I design anything, I'd like five minutes on requirements").

## Questions to ask your interviewer

"What questions do you have for us?" is scored. Prepare two or three for each type of interviewer, and make them about the real work:

| Interviewer | Strong questions |
|---|---|
| **Engineer** | "What does the path from a merged PR to production look like?" · "Which part of the frontend do people avoid touching, and why?" |
| **Hiring manager** | "What would someone in this role have shipped after six months to be considered exceptional?" · "What's the team's biggest challenge this year?" |
| **Senior leader** | "How do frontend quality and performance show up in company priorities?" · "What does the team need to get the product where you want it in two years?" |
| **Anyone** | "How does the team use AI coding tools, and what guardrails do you have?" |

Avoid questions answered on the careers page, avoid compensation questions in technical rounds (save them for the recruiter), and never answer with "No, I think you covered everything." The best move is a question that builds on something they said earlier. It shows you were listening.

## Key takeaways

- Interviewers score **visible evidence** across several signals. The final answer is only part of one row.
- Run the six-step script every time: **clarify → examples → approach and complexity → code while narrating → test → optimise.**
- Stuck: say it, use a concrete example, shrink the problem, ask a *targeted* question. Hints used well cost little; ignored hints cost a lot.
- Mistakes: **name it, fix it, move on.** Reset completely between rounds.
- Senior answers finish the "it depends" sentence: they make trade-offs, scope and failure modes explicit.
- Manage nerves with reappraisal, slow exhales, a warm-up problem, and a fixed night-before and morning-of routine.
