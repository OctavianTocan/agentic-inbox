#!/usr/bin/env bash
# agy-review.sh — adversarial critique through Shelf's use-agy toolkit.
#
# Usage:
#   agy-review.sh -f FILE
#   agy-review.sh "<text to review>"
#   echo "<text>" | agy-review.sh -
#   agy-review.sh -f design.md -c "context"
#   agy-review.sh --repo [DIR] --base main -c "what the PR is / settled decisions"
set -euo pipefail

MODEL="${AGY_REVIEW_MODEL:-Gemini 3.5 Flash (High)}"
PRINT_TIMEOUT="${AGY_PRINT_TIMEOUT:-4m}"
HARD_TIMEOUT="${AGY_HARD_TIMEOUT:-280}"
INLINE_MAX="${AGY_INLINE_MAX:-100000}"
BASE="${AGY_REVIEW_BASE:-main}"
INPUT=""
CONTEXT=""
REPO=""
REPO_MODE=0

usage() {
  sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-1}"
}

while [ $# -gt 0 ]; do
  case "$1" in
    -f|--file) [ -r "${2:-}" ] || { echo "error: cannot read file '${2:-}'" >&2; exit 1; }; INPUT="$(cat "$2")"; shift 2 ;;
    -c|--context) CONTEXT="${2:-}"; shift 2 ;;
    -m|--model) MODEL="${2:-}"; shift 2 ;;
    --repo) REPO_MODE=1
      case "${2:-}" in -*|"") REPO="$(pwd)" ;; *) REPO="$2"; shift ;; esac
      shift ;;
    --base) BASE="${2:-}"; shift 2 ;;
    -h|--help) usage 0 ;;
    -) INPUT="$(cat -)"; shift ;;
    -*) echo "error: unknown option '$1'" >&2; usage 1 ;;
    *) INPUT="$1"; shift ;;
  esac
done

if [ -z "$INPUT" ] && [ "$REPO_MODE" -eq 0 ] && [ ! -t 0 ]; then
  INPUT="$(cat -)"
fi

find_use_agy() {
  if [ -n "${USE_AGY_BIN:-}" ]; then
    printf '%s\n' "$USE_AGY_BIN"
    return
  fi

  if command -v use-agy >/dev/null 2>&1; then
    command -v use-agy
    return
  fi

  local script_dir plugin_root candidate
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  plugin_root="$(cd "$script_dir/../../.." && pwd)"
  candidate="$plugin_root/vendor/use-agy/bin/use-agy"
  if [ -x "$candidate" ]; then
    printf '%s\n' "$candidate"
    return
  fi

  echo "error: use-agy not found. Install/link it with Bun, set USE_AGY_BIN, or initialize Shelf vendor/use-agy dependencies." >&2
  exit 2
}

USE_AGY="$(find_use_agy)"

INSTRUCTIONS='Adversarially critique the target. Find its biggest REAL problems: questionable assumptions, weaknesses, flaws, risks, gaps, security issues, and ways it could fail, be wrong, or be a bad idea. Be specific and skeptical; do not restate or praise it.

Rules for a useful critique:
- VERIFY BEFORE YOU ASSERT. If a claim depends on code/behavior you have not actually read, READ IT if it is available to you; if you still cannot confirm it, label the bullet "POSSIBLE (unverified)" rather than asserting a definite bug.
- Tag EVERY bullet with [sev: high|med|low] and [conf: high|med|low].
- Separate a latent BUG from an intended TRADE-OFF.
- Cite file:line / file:hunk wherever you can.
- Concise bullets, grouped by theme. No preamble.
End with exactly one line: VERDICT: SHIP / REVISE / RETHINK - <the single biggest issue>.'

CTXBLOCK=""
[ -n "$CONTEXT" ] && CTXBLOCK="

Context (goal / constraints / decisions already made — do not re-litigate these / what to attack):
${CONTEXT}"

WORKDIR=""
cleanup() {
  [ -n "$WORKDIR" ] && { chmod -R u+w "$WORKDIR" 2>/dev/null || true; rm -rf "$WORKDIR" 2>/dev/null || true; }
}
trap cleanup EXIT

if [ "$REPO_MODE" -eq 1 ]; then
  git -C "$REPO" rev-parse --git-dir >/dev/null 2>&1 || { echo "error: --repo '$REPO' is not a git repository" >&2; exit 1; }
  git -C "$REPO" rev-parse --verify "$BASE" >/dev/null 2>&1 || { echo "error: base ref '$BASE' not found in '$REPO'" >&2; exit 1; }
  WORKDIR="$(mktemp -d)"
  git -C "$REPO" archive HEAD | tar -x -C "$WORKDIR" || { echo "error: failed to snapshot repo at HEAD" >&2; exit 2; }
  git -C "$REPO" diff "$BASE"...HEAD > "$WORKDIR/PR_DIFF.patch" 2>/dev/null || true
  {
    echo "# Review context"
    echo
    echo "This workspace is a snapshot of the repo at HEAD. The diff vs base ($BASE) is in ./PR_DIFF.patch."
    echo "Read it first, then read surrounding source to confirm each concern before asserting it."
    echo
    [ -n "$CONTEXT" ] && { echo "## What this PR is / decisions already made"; echo; echo "$CONTEXT"; }
  } > "$WORKDIR/REVIEW_CONTEXT.md"
  PROMPT="${INSTRUCTIONS}

You are reviewing a pull request. The full post-change code is in your workspace and you can read any file in it. Start with ./PR_DIFF.patch and ./REVIEW_CONTEXT.md, then open surrounding source to verify each concern. Do not critique generated/vendored artifacts as if they were hand-written.${CTXBLOCK}"
else
  [ -n "$INPUT" ] || { echo "error: no input provided (use -f FILE, an argument, stdin, or --repo)" >&2; usage 1; }
  if [ "${#INPUT}" -le "$INLINE_MAX" ]; then
    PROMPT="${INSTRUCTIONS}

Content to critique:
${INPUT}${CTXBLOCK}"
  else
    WORKDIR="$(mktemp -d)"
    printf '%s' "$INPUT" > "$WORKDIR/review-input.txt"
    PROMPT="${INSTRUCTIONS}

The content to critique is in ./review-input.txt in your workspace. Read it first.${CTXBLOCK}"
  fi
fi

RUN_CWD="${WORKDIR:-$(mktemp -d)}"
REMOVE_RUN_CWD=0
if [ -z "$WORKDIR" ]; then
  REMOVE_RUN_CWD=1
fi

OUT="$(
  cd "$RUN_CWD" && timeout -k 5s "$HARD_TIMEOUT" \
    "$USE_AGY" run text --model "$MODEL" --timeout "$PRINT_TIMEOUT" --cwd "$RUN_CWD" --add-dir "$RUN_CWD" "$PROMPT" 2>&1
)" || true

if [ "$REMOVE_RUN_CWD" -eq 1 ]; then
  rm -rf "$RUN_CWD" 2>/dev/null || true
fi

if [ -z "$(printf '%s' "$OUT" | tr -d '[:space:]')" ]; then
  echo "error: use-agy returned no output (model='$MODEL'). Check 'use-agy doctor', AGY auth, and network." >&2
  exit 2
fi

printf '%s\n' "$OUT"
