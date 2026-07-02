# Recommend a skill — you choose

## Context
The user describes a task and wants help choosing the right skill. The Router
ranks candidates (lexical relevance + usage + recency), but **you make the final
semantic judgment and the user picks** — never auto-invoke without confirmation.

The default install location is `$HOME/.claude/skills/router/`. If you installed
the skill elsewhere, swap that path into the commands below.

## Input
The user's request/intent as free text (e.g. "I need to fix a flaky test").

## Steps

### 1. Get the shortlist
```bash
python3 "$HOME/.claude/skills/router/scripts/router.py" rank --query "<the user's request>" --limit 8
```
Returns JSON candidates with `blended`, `relevance`, `uses`, `last_used_days_ago`,
`description`, `in_catalog`. Treat this as **input, not a verdict** — the lexical
score is shallow.

### 2. Reconcile with the live catalog
The script's file catalog misses plugin skills (e.g. `superpowers:*`, namespaced
skills) — those appear with empty `description` and `in_catalog: false`. Cross-
reference the live skill list in your context to fill in descriptions and to
consider strong matches the lexical filter missed. Usage counts from the script
are authoritative regardless of source.

### 3. Decide and present 2–4 options
Apply real judgment: read the candidate descriptions, weigh relevance against the
user's actual intent, and let usage/recency break ties (a skill they use often is
a safer bet). Present a short ranked list, each line:
`**<skill>** — <one-line why it fits> (used <N>×<, last <D>d ago if known>)`
Lead with your recommended pick and say why it edges out the others.

### 4. Wait for the choice, then invoke
Ask the user to confirm a pick (or accept your recommendation). Only then invoke
the chosen skill with the `Skill` tool, passing the user's task as args. Do not
chain into other skills unless the user asked for a workflow (see
[workflows.md](workflows.md)).

## Anti-patterns
- Do not auto-run the top candidate without confirmation — this skill is
  recommend-and-choose by design.
- Do not trust the lexical score over the skill's description and the user's
  intent. The script narrows; you decide.
- Do not pad the list — 2–4 genuine candidates beats a dump of marginal ones.

## Done
Tell the user:
- Your recommended skill and the runners-up, with one-line rationales.
- That you will invoke their pick once confirmed.
