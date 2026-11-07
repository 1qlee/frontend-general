## Why behavioural rounds decide more than you think

Experienced engineers often treat the behavioural round as a formality and prepare for it last. That's a mistake, for three reasons:

1. **It sets your level.** Two candidates with the same coding performance get different offers based on the **scope** of their stories: one feature versus a cross-team migration, fixing a bug versus changing how the team prevents bugs.
2. **It's the tie-breaker.** When the technical signals are mixed, the hiring committee reads the behavioural feedback to decide.
3. **It has the best return on preparation in the whole loop.** About eight well-prepared stories cover nearly every behavioural question you'll be asked. No technical topic gives you coverage that cheaply.

Interviewers use behavioural questions because **past behaviour is the best available predictor of future behaviour**. So they want a *specific time*, not your general philosophy. "I usually try to…" earns little; "Last March, when our checkout API was blocked, I…" earns a lot.

## STAR + R: the structure

| Part | What it is | Share of a ~3-min answer | Questions it answers |
|---|---|---|---|
| **S**ituation | Context: team, product, stakes | ~10% (2 sentences) | Where and when? Why did it matter? |
| **T**ask | *Your* responsibility or goal | ~10% (1–2 sentences) | What were *you* on the hook for? |
| **A**ction | What you did, step by step, and **why** | **~60%** | What did you decide? What alternatives did you weigh? How did you bring people along? |
| **R**esult | The outcome, quantified | ~10–15% | What changed: numbers, users, business, timeline? |
| **R**eflection | What you learned, or would do differently | ~5–10% | How did it change the way you work? |

The extra **R** (Reflection) is where seniority shows. It proves you learn from experience instead of just accumulating it, and it gives the interviewer a strong closing line to write down.

> [!INTERVIEW] Say it like this
> Open with a one-sentence headline so the interviewer knows where you're going: *"Sure. This was when I disagreed with my tech lead about where to keep server state, and we ended up splitting it."* Then go through S → T → A → R → R. Close with the reflection, then **stop talking**. A clean ending invites the follow-up question you prepared for.

{{quiz:star-action-weight}}

## "Tell me about yourself": 60–90 seconds

This is almost always the first question, and it frames the rest of the interview. It is **not** your CV in chronological order. Use **present → past → strengths → future**:

```text
Present:   "I'm a [level] frontend engineer at [company], working on [product] with [stack]. I own [scope]."
Past:      "Two highlights: [project], which [quantified result]. And [project], which [result]."
Strengths: "What I'm best at is [strength], and I [mentor / lead / care about X]."
Future:    "I'm looking for [what you want next], which is why [this role / team / problem] stood out."
```

Rules of thumb:

- **Pick the highlights for this job.** For a design-system role, lead with your component-library work. For a performance-focused team, lead with your Core Web Vitals win. Have two or three versions ready.
- **Put a number in each highlight.** "LCP from 4.0 to 1.8 s" is memorable. "Improved performance" isn't.
- **Seed your stories.** Every highlight is a hook the interviewer may pull on later ("Tell me more about that migration"). Pick hooks you *want* pulled.
- **End on the future.** It answers "Why us?" before they ask.
- **Time it.** Record yourself. Most people's first attempt runs 3+ minutes. Cut until it's 75 seconds.

There's a full model answer in today's drill.

## Build your story bank

A story bank is a set of about **eight** real stories, each one prepared well enough to tell in STAR+R and to survive two or three levels of follow-up questions. Each story usually covers two or three themes, so eight stories can answer dozens of questions.

| Theme | Questions it answers | Where frontend engineers find stories |
|---|---|---|
| **Conflict / disagreement** | "Disagreed with a decision", "a difficult coworker", "pushed back on a requirement" | Architecture debates, PR review clashes, design-vs-engineering trade-offs |
| **Failure / mistake** | "A project that failed", "a mistake you made", "a time you missed a deadline" | A slipped launch, a bad abstraction, an outage you caused |
| **Ambiguity** | "Unclear requirements", "deciding without all the data" | Vague feature requests, new product areas, APIs that didn't exist yet |
| **Impact** | "Proudest achievement", "biggest impact" | Performance wins, conversion lifts, a migration, a design system |
| **Technical decision / trade-off** | "A hard technical decision", "build vs buy", "a decision you'd reverse" | State libraries, SSR vs CSR, monorepo, picking a component library |
| **Mentoring / leadership** | "How do you mentor?", "led without authority", "raised the bar" | Onboarding, review culture, a guild, leading a project |
| **Cross-team collaboration** | "Worked with another team", "a stakeholder disagreement" | API contracts with backend, design handoff, negotiating priorities |
| **Adopting AI tools responsibly** | "How has AI changed your work?", "introduced a new tool or process" | Agent guidelines for the team, a migration done with an agent, catching an AI-introduced bug |

### Mining for stories

Most people say "I don't have stories." You do. Go through these prompts: incidents you were on call for · the migration you led · the PR thread that got heated · the feature that shipped late · the person you onboarded · the performance problem you profiled · the time the design was impossible to build as specified · the accessibility bug a customer reported · the moment you said "no" or "not yet" · the first time you used an AI agent on real code and it went wrong.

Prefer stories from the **last two or three years**, at the **highest scope** you've worked at, where **you** made decisions.

### The story card

Keep a card per story, with bullets rather than sentences. Rehearsed bullets sound natural; memorised sentences sound recited.

```text
Title:      Checkout saved cards: unblocking the payments API
Themes:     cross-team collaboration · ambiguity · impact
S:          Checkout redesign (React) needed saved cards; payments team's endpoint
            planned for "next quarter"; launch tied to a campaign 8 weeks out
T:          I was frontend lead for checkout; get the endpoint or a safe alternative
A:          Met their tech lead to understand WHY → card-vault migration risk
            Proposed: contract-first (OpenAPI) now, we build against MSW mocks,
            they build saved-cards-only on the NEW vault; lent one engineer
            Agreed a fallback with our PM: launch without saved cards if it slips
            Weekly 15-min sync + shared channel
R:          Endpoint landed week 6; launched on time; conversion +4% (A/B);
            35% of returning customers used saved cards within a month;
            contract-first became the org default
Reflection: Understand the other team's constraint before negotiating priority;
            agree the fallback early so nobody has to panic
Probes:     What if they'd said no? How did you pick the subset? What did the PM think?
```

## A worked example: weak vs strong

The question: **"Tell me about a time you worked with another team to deliver something."**

**Weak version:**

> "So we were doing a checkout redesign and the payments team was really slow. They said next quarter, which was a problem. We had a lot of meetings and eventually we got them to do it, and we launched and it went well."

What's wrong: no "I" anywhere, so the interviewer can't tell what you did. It blames the other team ("really slow"). There's no decision or reasoning, the result is "it went well", and there's no reflection. It's short, but empty.

**Strong version (about 2 minutes 30 seconds out loud):**

> "This was when I unblocked our checkout redesign, which depended on a payments API that didn't exist yet.
>
> **(S)** We were rebuilding checkout in React to support saved cards, and the launch was tied to a marketing campaign eight weeks out. The payments team owned the endpoint, and their roadmap had it next quarter. **(T)** I was the frontend lead, so it was on me to either get the endpoint or find a safe alternative, without turning it into an escalation.
>
> **(A)** First I met their tech lead, because I wanted to understand *why* it was next quarter rather than argue about priority. It turned out they were halfway through migrating their card vault and didn't want to build on the old one. So I proposed a plan that respected that: we'd write the API contract together now, my team would build the UI against mocks so we weren't blocked, and they'd implement only the saved-cards subset, directly on the new vault. I lent them one of our engineers for the BFF layer, and we set up a weekly 15-minute sync. Separately, I agreed a fallback with our PM: if the endpoint slipped, we'd launch the redesign without saved cards.
>
> **(R)** The endpoint landed in week six, and we launched on time. Checkout conversion went up 4% in the A/B test, and 35% of returning customers used saved cards within a month. The contract-first approach became the default for frontend–backend work across our org.
>
> **(R)** What I took from it: understand the other team's constraint before negotiating priority, because that turned a conflict into a shared plan. And agreeing the fallback early took the pressure off everyone."

Notice the ratio: two sentences of situation, one of task, the bulk on actions *with reasons*, numbers in the result, one reflection. "We" appears only for team context, and "I" for every decision.

{{quiz:weak-story-fix}}

## Common pitfalls

> [!MISTAKE] "We" all the way down
> Use "we" for the team's context and "I" for your actions and decisions. The interviewer is hiring you, not your team. If you really did something jointly, say what *your* part was.

> [!MISTAKE] No result, or a vague one
> "It went well" tells the interviewer nothing. Quantify: latency, conversion, error rate, support tickets, time saved, adoption. If you don't have numbers, use concrete outcomes: "the customer signed", "the on-call rotation stopped getting paged for it".

> [!MISTAKE] Too long
> Five minutes of backstory before any action is the most common failure. Give two sentences of situation; the interviewer will ask if they want more. Aim for 2–3 minutes in total.

More traps to avoid:

- **Blaming others** or badmouthing a former employer. Even when it's deserved, it reads as a future risk.
- **Fake failures and fake weaknesses** ("I care too much"). Interviewers have heard them all. Pick a real, survivable failure and show what you changed.
- **No reflection.** Without it, the story says what happened but not what you learned.
- **Wrong altitude.** Too much implementation detail for a manager, too vague for an engineer. Ask: "Do you want me to go deeper on the technical side?"
- **Hypotheticals.** "I would…" doesn't answer "Tell me about a time…". If you really have no example, say so and give the closest real one.

## Surviving the follow-ups

Good interviewers dig two or three levels deep: *"Why that approach?" "What did your manager think?" "What would you do differently?" "What was the hardest part?"* Invented or borrowed stories fall apart at this point, and real ones get stronger. That's why each story card has a **Probes** line: predict the three most likely follow-ups and have one-sentence answers ready.

## Tailoring to company values

Most companies publish values or leadership principles, and interviewers are often asked to assess them explicitly. Before the loop:

1. Read the values page and the engineering blog.
2. Map each value to one or two of your stories.
3. **Re-tell the same story with a different emphasis** depending on the value being probed:

| Value being probed | How to open the checkout story |
|---|---|
| Customer focus | "Our customers kept abandoning checkout because re-entering card details on mobile is painful…" |
| Ownership / bias for action | "Instead of waiting a quarter, I proposed building against a mocked contract and agreed a fallback…" |
| Collaboration | "I started by understanding why the payments team couldn't prioritise it…" |

### Telling an AI-adoption story

This theme is increasingly common ("How has AI changed how you work?", "Tell me about introducing a new tool"). Strong stories emphasise **guardrails, verification and measured outcomes**: you set up project rules, kept changes reviewable, used tests as the gate, caught a mistake the tool made, and measured the result. Avoid "I let it write everything", and also avoid "I don't trust it, so I don't use it." Interviewers want judgement, not enthusiasm or fear.

> [!AGENT]
> Once you've drafted a story card *yourself*, use Claude Code to stress-test it: *"Act as a sceptical hiring manager. Here's my story card. Ask me three follow-up questions, one at a time, that dig into what I personally did, and after each answer tell me where I was vague."* Don't ask it to write your stories. Interviewers can tell, and you won't survive the probes.

## Do it now (about 8 minutes)

In fe-gym, create `notes/story-bank.md` and draft **four** skeleton cards: title, themes, and one line each for S, T, A, R and Reflection. Choose them to cover at least five of the eight themes between them. You'll speak them out loud in the next block. The other four cards go into week 1 of the maintenance plan you'll write at the end of today.

## Key takeaways

- Behavioural rounds set your **level** and break ties. About eight prepared stories cover nearly every question.
- **STAR + Reflection**, with about 60% of the time on Action, a quantified Result, and a one-line reflection to finish.
- "Tell me about yourself" = present → two quantified highlights → strengths → why this role, in 60–90 seconds.
- Map stories to the eight themes, keep cards as bullets, and prepare the probes.
- Say "I" for your decisions, give numbers for results, keep it under 3 minutes, and never blame.
- Re-tell the same story with a different emphasis to match the company's values.
