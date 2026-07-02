---
name: agy-review
description: Adversarially review anything through Shelf's use-agy toolkit - a plan, design, code change, piece of writing, decision, argument, config, or idea. A fast second opinion from an independent model that pokes holes in assumptions, risks, gaps, failure modes, and gives a SHIP/REVISE/RETHINK verdict. Use when you want to red-team / stress-test / sanity-check / critique something, "poke holes in this", "what am I missing", "what's wrong with this", "get a second opinion", "review this with agy", or harden it before committing. Pairs with brainstorming and writing-plans.
user-invocable: true
argument-hint: "[text or file to review]"
stages: [plan]
---

# agy-review

Run anything through the shared `use-agy` toolkit for a quick adversarial critique — questionable assumptions, flaws, risks, gaps, failure modes, and a SHIP/REVISE/RETHINK verdict — from a second, independent model. Use it to harden a thing *before* you commit to it, not to replace your own judgment.

This Shelf copy intentionally routes through `use-agy` instead of shelling out to `agy` directly. If the `use-agy` skill is visible, read it for the current AGY service, CLI, API/RPC, and error semantics before changing this skill.

It reviews **whatever you give it** — a plan or design is just one case. Also: a code change, an essay or doc, a product/architecture decision, an argument or pitch, a config, a prompt, a name, an idea. Raw code, numbered specs, prose — all fine.

## What to review (arguments)

Invoked as `/agy-review [text or file to review]`. Interpret the argument — `$ARGUMENTS` — as *what to critique*:

- a **file path** → review its contents (pass it with `-f`);
- **pasted text** or an inline description → review that;
- **nothing** → review the most relevant artifact in the current context (e.g. the plan, draft, or decision you just produced), and state what you picked.

## How to run it

One script does everything: `scripts/agy-review.sh`. Give it the content via stdin, a file, or an argument; add `-c` to say what the thing is so the critique is on-target. The script invokes `use-agy run text`; set `USE_AGY_BIN` if the binary is not on `PATH`.

```bash
# pipe content in (most common when reviewing your own draft)
printf '%s\n' "$THING" | scripts/agy-review.sh -

# from a file, with context about what it is / the goal
scripts/agy-review.sh -f design.md -c "B2B SaaS onboarding flow; must ship this sprint"
scripts/agy-review.sh -f rate-limiter.md -c "Node/Express service behind a load balancer"
```

It prints the critique to stdout and exits `0`. Each bullet is tagged `[sev: …] [conf: …]`, and the model is told to **verify before asserting** — claims it could not confirm against the actual code are labelled `POSSIBLE (unverified)` instead of stated as bugs, which makes false alarms easy to spot. Read the bullets, then weigh them — adopt the real ones, dismiss the off-base ones, and tell the user which is which.

### Reviewing big things / whole PRs

Don't paste a huge diff — a single CLI argument caps at ~128KB, and a blind excerpt is where false positives come from (the reviewer can't see the call site that proves the bullet wrong). Instead, let `agy` read the actual code:

```bash
# review a whole PR: snapshot HEAD, diff against base, let agy read the full tree
scripts/agy-review.sh --repo --base main -c "what the PR is; decisions already made & why; what to attack"
scripts/agy-review.sh --repo /path/to/repo --base release -c "..."
```

In `--repo` mode the script takes a `git archive HEAD` snapshot (committed files only — no `node_modules`, `.env`, token files, or untracked junk), drops `PR_DIFF.patch` + `REVIEW_CONTEXT.md` in it, and points `use-agy` at that disposable directory so AGY can open consumers, call sites, and types itself before judging. The snapshot is deleted on exit. Big `-f`/stdin inputs (over `AGY_INLINE_MAX`) are likewise written to a file `use-agy` reads, rather than failing on the arg-size limit.

> **Context is your highest-leverage input.** `agy` is good at blind spots and bad at knowing *your* context. Put goals, constraints, and **decisions already made (and why)** in `-c` — the prompt explicitly tells it not to re-litigate settled trade-offs, so it spends its effort on genuinely new risk instead. If you already ran another review, pass those findings too so it dedups.

## Model

Defaults to **`Gemini 3.5 Flash (High)`** (Flash in its highest thinking mode), per preference. Override with `AGY_REVIEW_MODEL="<name>"` or `-m`.

## Reading the result

The last line is `VERDICT: SHIP / REVISE / RETHINK - <biggest issue>`. Treat it as input, not a verdict you must obey:

- **SHIP** — no blocking issues found; still skim the bullets.
- **REVISE** — fix the flagged issues, then proceed.
- **RETHINK** — it may be fundamentally off; reconsider before committing.

Always reconcile the critique with your own reasoning and the actual context. A second model is good at catching blind spots and bad at knowing your context — keep what's true, drop what isn't, and tell the user which is which.

## Notes

- Needs `use-agy` on `PATH`, `USE_AGY_BIN`, or an initialized Shelf `vendor/use-agy/bin/use-agy` checkout. The underlying AGY CLI still needs to be installed for `use-agy` to execute work. Missing → exit `2`.
- **Inline mode** (small `-f`/stdin/arg) runs `use-agy` from a throwaway empty directory — AGY never reads, edits, or crawls your repo; it just asks a question and prints the answer.
- **Workspace mode** (`--repo`, or any input over `AGY_INLINE_MAX`) is the only mode where AGY reads files. The script scopes `use-agy` to a disposable directory it creates and deletes — in `--repo` mode a `git archive HEAD` snapshot, i.e. committed code only (no secrets, no `node_modules`, nothing untracked). AGY sees the code under review and nothing else of yours. The first run in a new environment may need you to approve the AGY invocation.
- Inline reviews run in ~5–20s; a whole-PR `--repo` review takes longer (it reads files).
- Env knobs: `USE_AGY_BIN` · `AGY_REVIEW_MODEL` · `AGY_PRINT_TIMEOUT` (4m) · `AGY_HARD_TIMEOUT` (280s) · `AGY_REVIEW_BASE` (`main`) · `AGY_INLINE_MAX` (100000 bytes).
- Exit codes: `0` critique printed · `1` usage error · `2` `use-agy`/AGY missing / returned nothing / setup failed.
