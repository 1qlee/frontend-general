## Goal

Sit a full frontend interview loop back to back, the way a virtual onsite feels: **rapid-fire → coding → UI build → break → system design → behavioural**. Then debrief it honestly and turn the results into a 30-day plan that keeps you sharp until your real interviews.

## Why it matters

Each format on its own is now familiar. What you haven't practised is **stamina and switching**: going from narrating a coding solution, to building a React component under a clock, to driving a 40-minute design conversation, to telling a calm story at the end when you're tired. Real loops test exactly that. The debrief turns one tiring afternoon into a precise list of what to fix, and that list is what makes the next 30 days efficient.

## Ground rules

- **Timers are hard stops.** When a round's time is up, stop, even mid-line. Running out of time is data.
- **Out loud, all the time.** Pretend an interviewer is on a call. If you can, **record audio or video** of the whole loop. Watching it back is uncomfortable, and it's the fastest feedback you'll get.
- **No AI, no notes, no searching.** One exception: MDN is allowed in Round 3, because many real UI rounds allow docs.
- **Hints:** only after 3 minutes of being stuck, and count every one you use.
- Real loops spread 45–60-minute rounds across a day. These timings keep the **technical core** of each round and cut the small talk at the start and the Q&A at the end. You practise the opening in Setup and the Q&A in Round 5. Week 2 of your plan includes a full-length loop.

## The run-sheet

| Clock | Block | Where | Minutes |
|---|---|---|---|
| 0:00 | Setup | fe-gym `notes/day15-loop.md` | 2 |
| 0:02 | **Round 1: Rapid-fire concepts** | [Rapid-fire](#/mock/rapid-fire) | 10 |
| 0:12 | **Round 2: Coding** | [Coding round](#/mock/coding) | 25 |
| 0:37 | **Round 3: UI build** | [UI build round](#/mock/ui-build) | 30 |
| 1:07 | Break | Away from the screen | 5 |
| 1:12 | **Round 4: System design** | [System design round](#/mock/system-design) | 40 |
| 1:52 | **Round 5: Behavioural + your questions** | [Behavioural](#/mock/behavioral) | 8 |
| 2:00 | Debrief + 30-day plan | `notes/day15-loop.md` | 15 |
| 2:15 | Done | | |

## Setup (2 min)

1. In fe-gym, create `notes/day15-loop.md` and paste in the debrief template from the end of this page. You'll fill it as you go.
2. Silence notifications, close Slack and email, get water, paper and a pen. Start your recording if you're making one.
3. Say your "tell me about yourself" out loud once, as if the first interviewer just joined. **Start the clock.**

## Round 1: Rapid-fire concepts (10 min)

[Start the rapid-fire round](#/mock/rapid-fire). The app picks 8 concept, debugging and AI questions from across the course.

- **First words of every answer:** the one-sentence answer. Then one or two supporting details, then a trade-off or an example. Then stop. Aim for **60–75 seconds** per question; it's called rapid-fire for a reason.
- **Grade honestly** as you go. *Nailed:* you'd be happy to see your answer transcribed. *Shaky:* right idea, but imprecise words or a missing key term. *Missed:* wrong or blank.
- **Write down** the titles of anything shaky or missed. They're the first input to your plan.
- **Score:** nailed out of 8. Target **≥ 5**.

## Round 2: Coding (25 min)

[Start the coding round](#/mock/coding). The app picks a non-warm-up problem you haven't passed yet and starts a countdown. Your hard stop is **25 minutes**, or the app's timer if that's shorter.

- **First words:** "Let me restate the problem to make sure I've got it…", followed by **at least two clarifying questions** out loud before you type any code.
- **Write in a comment at the top:** three examples (one an edge case), your approach in one line, and its time/space complexity.
- **Narrate decisions, not keystrokes.** Run the tests as soon as a skeleton compiles, not only at the end.
- **Stuck for more than 3 minutes?** Run the stuck protocol out loud (say it → use an example → shrink the problem → targeted question). Then you may open hint 1, and count it.
- **Before time's up:** state the final complexity and one improvement or follow-up you'd make in production.

**Self-score** each signal from 1 to 4 using the rubric from the first lesson: Problem solving · Coding · Verification · Communication · Collaboration (did you use hints well, and would an interviewer have enjoyed pairing with you?). Also note: passed? minutes to first green test? hints used?

## Round 3: UI build (30 min)

[Start the UI build round](#/mock/ui-build). The app picks a React component with tests (and, for most problems, a live preview). Your hard stop is **30 minutes**, whatever the app timer says.

- **First words:** "Before I build, let me confirm the requirements and sketch the component tree and state." Take **at most 3 minutes** for a comment block listing the components, the state (what it is, where it lives, what's derived) and the events.
- **Order of work:** skeleton that renders → happy path → loading, empty and error states → keyboard and ARIA → tests green → polish. Aim to have *something working by minute 20*.
- **Narrate state decisions:** "The filtered list is derived from `items` and `query`, so I won't store it." "Focus moves to the dialog on open and back to the trigger on close."
- Keep an eye on the preview and the test panel as you go. Don't save all the testing for the last five minutes.

**Self-score** from 1 to 4 on each: Functionality (tests passing) · Component and state design · Accessibility · UX states · Communication · Time management (did you have something working by minute 20?).

## Break (5 min)

Stand up, drink water, look out of a window. **Do not open your code or review the round.** Write one line on paper: "Round 3 done." Before you sit down, take three slow breaths with long exhales and say the opening line for Round 4 out loud.

## Round 4: System design (40 min)

[Start the system design round](#/mock/system-design). The app picks a design prompt and gives you a 45-minute timer and a RADIO scratchpad. **Stop at 40 minutes** and reveal the reference outline.

- **First words:** "Before designing, I'd like about five minutes on requirements: functional, non-functional, and what's out of scope. Then I'll sketch the architecture, data model and API, and leave time for performance and accessibility. Does that work?"
- **Pacing:** Requirements 0–6 · Architecture 6–16 · Data model 16–23 · Interface 23–30 · Optimisations and deep dives 30–39 · one-minute summary 39–40.
- **Write bullets in the scratchpad as you talk**, not prose. Name every trade-off explicitly: "Cursor pagination rather than offset, because the feed is live. The cost is no jump-to-page."
- **Check in every ~10 minutes:** "I could go deeper on caching or move on to the API. Which is more useful to you?" In a real round, this is how you let the interviewer steer you towards what they're scoring.

**Self-score** with the app's six-item rubric (Missed / Partial / Good / Strong) and **save the session**. Then compare your notes with the reference outline and write down two things it covered that you didn't.

## Round 5: Behavioural + your questions (8 min)

[Start the behavioural round](#/mock/behavioral). Answer the **first two questions cold**: no story bank open, no notes.

- **First words:** a one-sentence headline ("Sure. This was when I unblocked our checkout redesign…"), then S → T → A → R → Reflection in **under 3 minutes**.
- **Then close the loop like a real interview:** imagine the interviewer saying "We have a few minutes left. What questions do you have for us?" and ask your two best questions **out loud**.

**Self-score each story, one point per yes (out of 5):** Situation and task kept short? Mostly "I" for actions? A quantified result? A reflection? Under 3 minutes?

## Debrief (15 min)

Fill this in while it's fresh. Be **specific**: "Communication was bad" can't be fixed, but "I narrated keystrokes instead of decisions in Round 2" can.

```md
# Mock loop — <date>

## Scores
| Round          | Score                                    | Target                | Notes                                 |
|----------------|------------------------------------------|-----------------------|---------------------------------------|
| Rapid-fire     | _/8 nailed                               | ≥ 5                   | shaky/missed:                         |
| Coding         | _/20 (5 signals × 4)                     | ≥ 14                  | passed? minutes to green? hints used? |
| UI build       | _/24 (6 signals × 4)                     | ≥ 16                  | working by minute 20?                 |
| System design  | _ Strong · _ Good · _ Partial · _ Missed | ≥ 4 of 6 Good/Strong  | what the reference had that I didn't: |
| Behavioural    | _/10 (2 stories × 5)                     | ≥ 8                   | questions I asked:                    |

## Three things that went well (keep doing)
1.
2.
3.

## Three gaps, with evidence and a fix
1. Gap:
   Evidence (when, what exactly):
   Fix:
2.
3.

## Patterns across rounds
- e.g. "I skip clarifying when I recognise a problem", "I run out of time before optimisations"

## The moment I'd replay
- What happened:
- What I'll say or do instead next time:

## Topics to drill
- from shaky/missed rapid-fire answers, the coding problem, the design reference
```

Sort every gap into one of three buckets, because each needs a different fix:

| Bucket | Example | Fix |
|---|---|---|
| **Knowledge** | Couldn't explain `useSyncExternalStore` | Re-read the lesson, add or redo flashcards, answer the drill again in two days |
| **Execution under time** | Correct approach, but didn't finish in 25 minutes | Timed reps of the same format, 2–3 per week |
| **Communication** | Went silent for 4 minutes; no complexity stated | Speak-aloud reps with a recording; re-watch at 1.5× |

If you recorded, watch five minutes of your weakest round now. Count filler words and silences longer than 20 seconds, and check whether you stated complexity and trade-offs.

## Turn it into a 30-day maintenance plan

Principles: **little and often** beats bursts; **weakest round first**; everything **timed and out loud**; and **re-run this loop on day 30** so you can measure progress against today's scores table.

### Daily (15–20 min, 5 days a week)

- [Flashcards](#/flashcards): just the cards that are due. The spaced-repetition scheduler decides; trust it, and don't cram.
- Two or three questions from your [weak spots](#/mock/rapid-fire?weak=1), out loud. This mode only shows questions you graded shaky or missed.

### Weekly rhythm (one 45–60 min session per day)

| Day | Session |
|---|---|
| Mon | [Coding round](#/mock/coding), then redo one exercise you failed from the [practice bank](#/practice) |
| Tue | **One** [UI build round](#/mock/ui-build) per week, at real timings (40 min) |
| Wed | [Coding round](#/mock/coding), then polish one story out loud ([behavioural](#/mock/behavioral)) |
| Thu | **One** [system design round](#/mock/system-design) per week (45 min), then compare against the reference |
| Fri | Claude Code practice in fe-gym (below) and an [AI-assisted development](#/mock/agentic) round |
| Weekend | Rest, or read the [playbook](#/playbook) on the week's weakest topic |

### Week by week

| Week | Focus | Deliverables |
|---|---|---|
| 1 | **Your weakest round from today** | Finish the other four story cards; three timed reps of the weakest format; re-score each with the same rubric |
| 2 | **Full-length loop** | One loop at real timings (rapid-fire 15 · coding 30 · UI build 40 · system design 45 · behavioural 10) on a weekend morning, then a debrief |
| 3 | **Second-weakest round, plus breadth** | Re-read the lessons behind your "topics to drill" list; two new UI builds; explain one design prompt to a friend in 20 minutes |
| 4 | **Real conditions** | At least one mock with a **human** (a peer, or a mock-interview service); on day 30, re-run today's loop and compare the scores table |

### Keep your Claude Code practice going

Do one fe-gym session a week, rotating through:

1. **Plan, then implement:** use plan mode for a small feature, with tests as the gate, and review every diff before accepting it.
2. **Automate a workflow:** write or improve a custom slash command, or add a hook (for example, a type-check after edits).
3. **Review:** run `/review` or a reviewer subagent on your own diff, and decide which suggestions you'd accept and *why*.
4. **Generate practice, not answers:** "Give me a variation of the EventEmitter problem with a twist an interviewer might add. Don't show a solution."

Keep the rule from Day 1: **no AI on first attempts** at interview reps. Use it afterwards to review your work and to make new problems.

> [!TIP] Put it in your calendar now
> A plan without calendar slots is a wish. Block the daily 15 minutes and the five weekly sessions for the next four weeks, and put the day-30 loop re-run in your calendar as well.

### When a real interview gets scheduled

Switch from learning to **rehearsal** for the final week: run daily mocks in that company's exact format, map your story bank to their values, prepare three questions per interviewer, and follow the night-before and morning-of routine from the first lesson.

## Reflection questions

Answer these at the bottom of `notes/day15-loop.md`:

1. Which round felt most different from what you expected, and why?
2. Where did nerves show up, and what did you do about them?
3. Which single habit, if you fixed it, would improve the most rounds at once?
4. What would you tell yourself on the morning of Day 1?

## How to talk about it in an interview

If someone asks how you prepared, or how you keep your skills sharp, have a concrete answer: *"I treat interviewing as a skill separate from engineering. I ran full mock loops with timed rounds, scored myself against a rubric, and turned the gaps into a spaced-repetition and practice plan. The biggest change was learning to clarify and state my approach before coding. My mock scores in that area went from 2s to 4s."* (Use your own numbers on day 30.)
