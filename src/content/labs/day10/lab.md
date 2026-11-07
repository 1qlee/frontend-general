## Goal

Use Claude Code **without a chat window**. You'll pipe build output into `claude -p`, get machine-readable JSON back, and wrap it all in `scripts/perf-review.sh`: one command that builds fe-gym, measures the bundle (and optionally runs Lighthouse), checks it against an explicit performance budget, and prints a prioritised fix list. Along the way you'll scope permissions for a run nobody is watching and learn where the cost goes.

## Why this matters professionally

Much of the leverage teams get from agents comes from scripts and CI, not chat: summarising a failing build, explaining a bundle-size jump on a PR, triaging Lighthouse regressions, labelling issues. Headless mode turns Claude into a Unix tool. That raises engineering questions interviewers like: what goes in, what is it allowed to do with no human approving, how do you parse what comes out, what does a run cost, and which parts must stay **deterministic**?

## 1. First headless runs (6 min)

From the fe-gym root, in your terminal (not inside a session):

```bash
mkdir -p .perf && echo ".perf/" >> .gitignore
claude -p "In two sentences: what does the build script in package.json do?"
npm run build 2>&1 | claude -p "List every output chunk with its gzip size, largest first. Markdown table only."
npm run build 2>&1 | claude -p "Which JS chunk is largest? One line." --output-format json > .perf/first.json
jq -r '.result' .perf/first.json        # the answer
jq 'del(.result)' .perf/first.json      # the metadata: session id, cost, turns…
```

`-p` (print mode) runs one task non-interactively and exits. Whatever you pipe in becomes part of the input. With `--output-format json` you get the final `result` plus metadata. The exact field names vary between versions, so look at your own output and find where the **cost** is reported **(verify)**.

| Flag | What it's for |
|---|---|
| `--output-format text\|json\|stream-json` | Plain text for humans, JSON for scripts, streamed JSON for long runs |
| `--allowedTools "Read,Grep,Bash(npm run lint:*)"` | Tools the run may use without asking |
| `--disallowedTools "Edit,Write"` | Tools it must never use |
| `--max-turns <n>` | Caps the agent loop, which also caps runaway cost |
| `--append-system-prompt "…"` | Adds standing instructions (a persona, rules) |
| `--model`, `--permission-mode` | Pick the model and the permission mode for the run |

## 2. Baseline, budget and prompt (6 min)

Budgets come from a baseline, not from thin air. Run `npm run build` and note the **gzip** size Vite prints for `dist/assets/index-*.js`. Then write `perf-budget.md`, using your baseline plus about 10 KB for the first line:

```md
# fe-gym performance budget
- Entry JS chunk (gzip): ≤ <baseline + 10> KB   ← enforced by the script
- Any other single JS chunk (gzip): ≤ 50 KB
- Total CSS (gzip): ≤ 20 KB
- Lighthouse mobile (lab): LCP ≤ 2.5 s, TBT ≤ 200 ms, CLS ≤ 0.1
```

The review prompt lives in its own file (`scripts/perf-review.prompt.md`), so you can review it and change it like code:

```md
You are a senior web performance engineer reviewing a Vite + React production build.
Stdin contains: a performance budget, a deterministic gate result, Vite's build output,
asset sizes and, optionally, a Lighthouse lab summary. You may read source files
(read-only) to find causes, e.g. which module imports a heavy dependency.

Output markdown in exactly this shape:
1. First line: `BUDGET: PASS` or `BUDGET: FAIL`, then each budget line with its measured value.
2. `## Prioritized findings`: at most 5, ordered by expected user impact. Each one has a title,
   evidence (quote the exact number or file from the input), the likely cause (file:line if
   you read it), the fix, the expected impact and the effort (S/M/L).
3. `## Not measured`: what this data can't tell us (field data, INP, real devices) and how
   we'd measure it.

Rules: only cite numbers that appear in the input. If evidence is missing, write "unknown";
don't guess. Never suggest editing tests. Stay under 400 words.
```

## 3. Write `scripts/perf-review.sh` (8 min)

Create the script below, read every line, then `chmod +x scripts/perf-review.sh`. (Or give Claude the spec and compare its version with this one.) It needs `jq`, which you installed on Day 4. The Lighthouse step also needs Chrome.

```bash
#!/usr/bin/env bash
# Build, measure, then ask Claude for a prioritized performance review.
#   scripts/perf-review.sh                 bundle sizes only
#   LIGHTHOUSE=1 scripts/perf-review.sh    plus a Lighthouse mobile lab run
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=.perf
BUDGET_KB=${BUDGET_KB:-75}   # entry chunk, gzip. Set it from YOUR baseline.
mkdir -p "$OUT" && rm -f "$OUT"/*

echo "› Building…"
npm run build > "$OUT/build.txt" 2>&1

echo "› Measuring assets…"
{
  printf 'file\tbytes\tgzip_bytes\n'
  find dist/assets -type f \( -name '*.js' -o -name '*.css' \) | sort | while read -r f; do
    printf '%s\t%s\t%s\n' "$f" "$(wc -c < "$f" | tr -d ' ')" "$(gzip -c "$f" | wc -c | tr -d ' ')"
  done
} > "$OUT/assets.tsv"

entry=$(grep -o 'assets/index-[^"]*\.js' dist/index.html | head -n 1)
entry_gzip=$(gzip -c "dist/$entry" | wc -c | tr -d ' ')
budget_bytes=$((BUDGET_KB * 1024))
echo "entry=$entry gzip_bytes=$entry_gzip budget_bytes=$budget_bytes" > "$OUT/gate.txt"

if [[ "${LIGHTHOUSE:-0}" == "1" ]]; then
  echo "› Lighthouse (mobile, lab)…"
  npx vite preview --port 4173 --strictPort > "$OUT/preview.log" 2>&1 &
  preview_pid=$!
  trap 'kill "$preview_pid" 2>/dev/null || true' EXIT
  for _ in $(seq 1 40); do curl -sf -o /dev/null http://localhost:4173 && break; sleep 0.5; done
  npx lighthouse http://localhost:4173 --only-categories=performance --quiet \
    --output=json --output-path="$OUT/lighthouse.json" --chrome-flags="--headless=new"
  jq '{score: .categories.performance.score,
       lcp: .audits["largest-contentful-paint"].displayValue,
       fcp: .audits["first-contentful-paint"].displayValue,
       tbt: .audits["total-blocking-time"].displayValue,
       cls: .audits["cumulative-layout-shift"].displayValue,
       speedIndex: .audits["speed-index"].displayValue}' \
    "$OUT/lighthouse.json" > "$OUT/lighthouse-summary.json"
fi

echo "› Asking Claude…"
{
  echo "# Performance budget"; cat perf-budget.md
  echo; echo "# Deterministic gate"; cat "$OUT/gate.txt"
  echo; echo "# Vite build output"; cat "$OUT/build.txt"
  echo; echo "# Assets"; cat "$OUT/assets.tsv"
  if [[ -f "$OUT/lighthouse-summary.json" ]]; then
    echo; echo "# Lighthouse summary (lab, mobile)"; cat "$OUT/lighthouse-summary.json"
  fi
} | claude -p "$(cat scripts/perf-review.prompt.md)" \
      --output-format json \
      --allowedTools "Read,Grep,Glob" \
      --disallowedTools "Edit,Write,Bash" \
      --max-turns 8 \
      > "$OUT/review.json"

jq -r '.result' "$OUT/review.json" | tee "$OUT/review.md"

# The gate is arithmetic, not an opinion.
if (( entry_gzip > budget_bytes )); then
  echo "✗ $entry is $entry_gzip B gzip; budget is $budget_bytes B" >&2
  exit 1
fi
echo "✓ Entry chunk within budget"
```

Notice the split. **The script decides pass/fail with arithmetic.** Claude's job is to explain and prioritise. A model's `BUDGET: FAIL` line is useful to read, but it is not a gate: the same input can produce different wording on different runs, and a CI gate has to be reproducible.

## 4. Plant a regression and catch it (8 min)

Add a dependency that's famously expensive when imported whole:

```bash
npm install lodash && npm install -D @types/lodash
```

```ts
// src/main.tsx (planted regression, remove after the lab)
import _ from 'lodash';
window.addEventListener('resize', _.debounce(() => console.log('resized'), 200));
```

```bash
BUDGET_KB=<your baseline + 10> ./scripts/perf-review.sh; echo "exit=$?"
LIGHTHOUSE=1 BUDGET_KB=<your baseline + 10> ./scripts/perf-review.sh   # optional, needs Chrome
```

Judge the review the way you'd judge a colleague's:

- Did it name **lodash** and point to `src/main.tsx` (it can `Grep`), or did it only gesture at "large dependencies"?
- Is every number it quotes actually in `.perf/` (compare against `.perf/assets.tsv`)? Anything else is a hallucination.
- Is the fix sensible: a per-method import, `lodash-es`, or the `debounce` you can already write from memory?
- Does "Not measured" correctly say that a localhost Lighthouse run is lab data, not what users experience?

Remove the planted import, uninstall lodash, run the script again and confirm `exit=0`.

## 5. Permissions and cost for unattended runs (5 min)

> [!WARNING]
> In headless mode **nobody is there to approve anything**, so the tool list *is* the blast radius. A review only needs `Read,Grep,Glob`. If a run needs a command, allow the narrowest pattern (`Bash(npm run build:*)`), never all of `Bash`. Never use `--dangerously-skip-permissions` outside a throwaway container. Check `claude --help` for how your version handles a tool that's neither allowed nor disallowed in `-p` mode.

- **Inputs are untrusted.** Build logs and Lighthouse reports can contain text from dependencies and third-party scripts. A read-only tool set means an injected "ignore previous instructions…" can't *do* anything. (Day 12 goes deeper.)
- **`--max-turns`** stops loops. If a run hits the cap, treat the output as incomplete: check the JSON metadata or exit status rather than trusting a half-finished answer **(verify how your version reports it)**.
- **Cost is mostly input.** Pipe a `jq` summary, not the multi-megabyte Lighthouse JSON. Restricted tools also stop the run from wandering around the repo. Consider a smaller model with `--model` for routine summaries. Log the cost field from the JSON so you notice trends. In interactive sessions, `/cost` or `/usage` shows spend or usage, depending on your plan **(verify)**.

> [!TIP] Fan-out
> The same building block scales out: generate a list (the five largest chunks, every route, every open issue with a label), then loop over it, calling `claude -p` once per item with restricted tools and a small `--max-turns`. Each call gets a fresh, small context.

## Verify

- With lodash planted, `./scripts/perf-review.sh` prints a `BUDGET:` line plus at most 5 findings, and exits **1**. The top finding names lodash and `src/main.tsx`.
- After you remove it, the script exits **0**.
- You found the cost field in `.perf/review.json` and wrote down what one run cost.
- `perf-budget.md`, `scripts/perf-review.sh` and `scripts/perf-review.prompt.md` are committed. `.perf/` is git-ignored.

## Reflect (write in `notes/day10.md`)

- Which claims in Claude's review could you verify from `.perf/`, and which couldn't you? Did it invent anything?
- Why is the pass/fail decision in bash and not in the model's output? Where else would you apply that split?
- What's the worst thing this script could do if someone changed `--allowedTools` to include `Bash`? Who should review changes to it?
- What would you change to run this on every PR (Day 13), and what would that cost per month at your team's PR volume?

> [!INTERVIEW] "How do you stop performance regressions from reaching production?"
> "Budgets enforced in CI, plus field data. In CI, every PR builds and checks deterministic budgets: entry-chunk size with something like size-limit, and Lighthouse CI assertions on a few key pages. Those gates are arithmetic, so they're reproducible. I also run a headless Claude step that reads the build output and the diff and posts a prioritised explanation, like 'this PR pulls in all of lodash through main.tsx, use a per-method import'. It runs with read-only tools and a turn cap, and it explains but never decides. Lab numbers only catch some regressions, so we also collect field data with the web-vitals library, segmented by device, and alert on p75 LCP and INP."
