# Synthesize

## Context

The parent merges every persona report that ran into one deliverable. The **core three** always run; the specialized personas (accessibility, power-user, security, mobile) run when selected by relevance. Different personas produce findings on **different axes** — keep them separate (a flow can be bug-free and still fail the novice, the keyboard user, or the phone):

- **Correctness / security bugs:** Pass 1 (regular), Pass 2 (frustrated), Pass 5 concurrency, Pass 6 (security adversary).
- **Usability friction:** Pass 3 (novice).
- **Accessibility:** Pass 4.
- **Efficiency / affordances:** Pass 5 (power-user).
- **Mobile / responsive:** Pass 7.

The synthesis must make coverage and gaps legible at a glance, must not silently drop a flow no one reached, and must **resolve contradictions between personas** before reporting (see below). It feeds directly into [fix-and-document.md](fix-and-document.md) — so every finding it lands must be clear enough to fix.

## Input

- Pass 1: authoritative flow inventory + per-flow ✅/❌/⚠️ + bugs + could-not-cover + screenshot manifest.
- Pass 2: per-flow × per-cell adversarial matrix + classified bugs + skipped cells + screenshot manifest.
- Pass 3: per-flow friction findings (severity-rated) + flows a novice couldn't complete + screenshot manifest.
- Any specialized passes that ran (Pass 4 a11y, Pass 5 power, Pass 6 security, Pass 7 mobile): their matrices, findings, and manifests.
- All screenshot manifests + their image files under `<artifacts>/<persona>/` (one dir per persona that ran).

## Steps

1. **Build the coverage matrix** — rows = the authoritative flows, columns = the personas that ran (the core three always; plus any specialized passes selected). Each cell ✅ / ❌ / ⚠️ (not covered) / severity for the friction lanes. One look should show what was and wasn't exercised.
2. **Resolve persona conflicts FIRST (do not average).** Personas can **contradict** each other — one pass reports a flow works, another reports the same flow broken. You must **investigate and resolve the conflict at the data/log layer** before writing anything down: re-read both repros, query the DB, read the server logs and network responses for both attempts, and determine which observation reflects reality. Then **distinguish a product bug from an environment/config artifact** — a flow that failed only because of a test-environment auth/config issue (expired creds, a missing env var, a stale seed, drifted DB password) is **not** a product bug and must NOT be reported as one. (Real example: one pass confirmed an AI feature worked while another saw it fail; root cause was a test-environment auth/config artifact, not the product — it was correctly recorded as an env artifact, not filed against the diff.) **Never write "sometimes works"** — find out why it differed and report the resolved truth, tagging env artifacts as such (they are excluded from the fix phase).
3. **Merge & dedupe bugs** (correctness/security lanes: regular, frustrated, power-concurrency, security). Same root cause surfaced by two personas = one bug, noting both repros. Order by severity (state corruption / cross-tenant / security breach / false success first).
4. **Rank the friction lanes by severity**, kept on their own axes: usability (novice), accessibility (Pass 4), efficiency/affordances (power, Pass 5), mobile/responsive (Pass 7) — blockers first, then majors, then papercuts — each with its concrete fix suggestion.
5. **Fail loud on gaps** — list every flow with a ⚠️ in any column and why it couldn't be covered, plus any adversarial/specialized cell deliberately skipped, plus any contradiction resolved as an env artifact (say so explicitly). Silent omission misreads as "all good."
6. **Decide the fix list** — for each bug, the fix + a regression test (must fail before / pass after); for each friction finding, whether it's a default-fix (high-value) or needs a human design call. This list is the input to [fix-and-document.md](fix-and-document.md). Surface anything needing the user's judgment as an explicit question rather than guessing.
7. **Publish the report body**, then **hand to fix-and-document, then append** — per [notion-report.md](notion-report.md): create the page under the given parent and write the report body (matrix + bugs + friction lanes + gaps + resolved conflicts), append the per-persona → per-flow screenshot walkthrough, **capture the page id**, then run [fix-and-document.md](fix-and-document.md) and **append the "Fixes applied" section to that SAME page**. Return the one page URL.

## Output shape

```markdown
## test-user-flows — <PR/branch>

### Coverage matrix
(columns = personas that ran; core three always, specialized as selected)
| Flow | Regular | Frustrated | Novice | A11y | Power | Security | Mobile |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 1. … | ✅ | ✅ | ⚠️ | major | ✅ | held | ✅ |
| 2. … | ✅ | ❌ | major | — | minor | BREACH | blocker |

### Correctness & security bugs (regular · frustrated · power-concurrency · security)
- [severity · class] flow — repro — root cause — data-layer evidence — suggested regression test

### Usability friction (novice)
- [blocker/major/minor] flow · step — what confused the user — make-it-easier suggestion

### Accessibility (Pass 4) / Efficiency (Pass 5) / Mobile (Pass 7) — when run
- [severity] flow · step — defect — concrete fix

### Resolved conflicts & env artifacts
- flow — persona A said X, persona B said Y — investigated at data layer — resolved truth (product bug | ENV ARTIFACT, excluded from fixes)

### Not covered / skipped (fail loud)
- flow / cell — why

### Recommendations & open questions
- the fix list (feeds fix-and-document), high-value UX changes, and anything needing your decision
```

## Done

This is the **midpoint**, not the deliverable. Produce the merged report (coverage matrix, then bugs severity-ordered, then each friction lane, then resolved conflicts/env artifacts, then explicit gaps, then the fix list), publish it as the report body and **capture the page id**, then proceed to [fix-and-document.md](fix-and-document.md) — fixing is the default end of the run. The final deliverable is the **one Notion page** carrying both the report and the appended "Fixes applied" section. Never report "all good" if any flow went uncovered, and never average a contradiction — say what's unverified and what was an env artifact. If the Notion page could not be published (no auth / no parent page), say so loudly and hand back the assembled markdown + screenshot paths so nothing is lost.
