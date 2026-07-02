# agy-review

> Adversarially review *anything* through the shared `use-agy` toolkit before you commit to it — a fast, independent second opinion that pokes holes in whatever you give it.

## What It Does

`agy-review` is an AI-agent skill that routes content through `use-agy` and returns a concise red-team critique: questionable assumptions, flaws, risks, gaps, failure modes, and a `SHIP / REVISE / RETHINK` verdict. It's meant to harden a thing *before* you commit to it.

It reviews **whatever you give it** — a plan or design is just one case. Also: a code change, an essay or doc, a product/architecture decision, an argument or pitch, a config, a prompt, a name, an idea. Raw code, numbered specs, and prose all work.

Defaults to **Gemini 3.5 Flash in its highest thinking mode**. Inline mode runs from a throwaway empty directory, so it never reads or touches your repo; repo mode snapshots committed files into a disposable workspace so the reviewer can inspect surrounding code without seeing unrelated local state.

## Skill Architecture

```
agy-review/
├── SKILL.md                 # routing + how-to (what it reviews, arguments, reading the verdict)
└── scripts/
    └── agy-review.sh        # wraps `use-agy run text`: builds the critique prompt, runs it, prints the result
```

## Usage

```bash
# pipe content in
printf '%s\n' "$THING" | scripts/agy-review.sh -

# from a file, with context about what it is / goals
scripts/agy-review.sh -f design.md -c "must ship this sprint; Postgres only"
scripts/agy-review.sh -f essay.md  -c "blog post for a technical audience"

# pick a different model
scripts/agy-review.sh -m "Gemini 3.1 Pro (High)" -f decision.md

# review a committed PR-sized workspace snapshot
scripts/agy-review.sh --repo --base main -c "what changed; settled decisions; what to attack"
```

Options: `-f/--file`, `-c/--context`, `-m/--model`, `--repo`, `--base`, `-h/--help`.
Env: `USE_AGY_BIN`, `AGY_REVIEW_MODEL`, `AGY_PRINT_TIMEOUT` (4m), `AGY_HARD_TIMEOUT` (280s), `AGY_REVIEW_BASE`, `AGY_INLINE_MAX`.
Exit codes: `0` critique printed · `1` usage error · `2` `use-agy` or AGY setup failed / returned nothing.

## Implementation note

Large inline inputs are written to a temporary review file and passed through `use-agy` with a scoped disposable working directory. Whole-repo reviews use `git archive HEAD`, so only committed files are visible to the reviewer.

## Requirements

- `use-agy` on `PATH`, `USE_AGY_BIN`, or Shelf's initialized `vendor/use-agy/bin/use-agy`.
- The underlying AGY CLI must be installed and authenticated for `use-agy` to execute requests.

## Installation

This skill is distributed from `use-agy/.agents/skills/agy-review` and may be symlinked by plugins that vendor use-agy, such as Shelf.

## License

MIT
