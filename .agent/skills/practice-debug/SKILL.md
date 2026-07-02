---
name: practice-debug
description: Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes
---

# Systematic Debugging

## Overview

Random fixes waste time and create new bugs. Quick patches mask underlying issues.

**Core principle:** ALWAYS find root cause before attempting fixes. Symptom fixes are failure.

**Violating the letter of this process is violating the spirit of debugging.**

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you haven't completed Phase 1, you cannot propose fixes.

## When to Use

Any technical issue: test failures, production bugs, unexpected behavior, performance regressions, build failures, integration issues. Do not skip because the issue looks simple or you are in a hurry: systematic investigation is faster than guess-and-check thrashing. Apply this **especially** under time pressure, when "just one quick fix" feels obvious, or after a previous fix did not work.

## Phase 0: Define Success

Before debugging, convert the report into verifiable criteria:

1. State the expected behavior and the current failing behavior.
2. Choose the smallest reproduction or test that proves the issue.
3. Choose the verification commands before editing. Use targeted commands while iterating, then `bun run ci` before claiming completion.
4. For UI issues, do not start a browser or dev server for review. Use lint/typecheck/tests; the user reviews visuals.

## The Four Phases

Complete each phase before proceeding to the next.

### Phase 1: Root Cause Investigation

Before attempting any fix:

1. **Read error messages and stack traces in full.** Note line numbers, file paths, and codes; the message often contains the solution.
2. **Reproduce consistently.** Identify exact steps. If not reproducible, gather more data; do not guess.
3. **Check recent changes.** `git diff`, recent commits, new dependencies, config or environment differences.
4. **Gather evidence in multi-component systems.** When the system spans boundaries, instrument each boundary BEFORE proposing fixes: log what enters and exits each component, verify config and environment propagation. Run once to see WHERE it breaks, then investigate that component.
5. **Trace data flow backward.** Where does the bad value originate? What called this with the bad value? Keep tracing up. Fix at the source, not the symptom. See `root-cause-tracing.md` for the complete technique.

### Phase 2: Pattern Analysis

1. **Find a working example** of similar code in the same codebase.
2. **Read the reference completely** if implementing a known pattern; do not skim.
3. **List every difference** between working and broken, however small.
4. **Map dependencies**: components, settings, config, environment, assumptions.

### Phase 3: Hypothesis and Testing

1. **State one hypothesis.** "I think X is the root cause because Y." Be specific.
2. **Test minimally.** Smallest possible change, one variable at a time.
3. **Verify before continuing.** Worked: Phase 4. Didn't: form a NEW hypothesis. Don't stack fixes.
4. **Say "I don't understand X"** when you don't. Don't pretend; ask or research.

### Phase 4: Implementation

1. **Write the failing reproduction first.** Automated test if possible, one-off script otherwise. The assertion must encode why the behavior matters, not just current output.
2. **One fix, one change.** Address the root cause; no "while I'm here" extras, no bundled refactoring.
3. **Verify.** Target test passes, other tests still pass, issue is actually resolved. Finish with `bun run ci` unless you clearly report why it could not run.
4. **If the fix did not work, count attempts.** Fewer than 3: return to Phase 1 with new evidence. **3+ failures means the architecture is wrong, not the hypothesis.** Symptoms: each fix exposes new shared state elsewhere, fixes demand "massive refactoring," each fix creates new symptoms. Stop and discuss with the user before attempting more.

## Discipline: Stop Signals

Treat any of the following as a hard stop and return to Phase 1.

| Signal | What it means |
|--------|---------------|
| "Quick fix now, investigate later" / "Just try X and see" / "It's probably X" | Skipping Phase 1; guessing without a hypothesis. |
| "Multiple changes at once saves time" | Can't isolate what worked; new bugs introduced. |
| "I'll write the test after the fix works" | Untested fixes don't stick. |
| "Pattern says X but I'll adapt it" | Partial understanding guarantees bugs. |
| "Issue is simple" / "Emergency, no time for process" | Simple bugs still have root causes; systematic is faster than thrashing. |
| "One more fix attempt" after 2+ failures, or each fix reveals a new problem elsewhere | Architectural problem; escalate. |
| User says "Stop guessing", "Is that not happening?", "Will it show us...?", "Ultrathink this", "We're stuck?" | Your approach isn't working. Return to Phase 1. |

## Quick Reference

| Phase | Key Activities | Success Criteria |
|-------|---------------|------------------|
| **1. Root Cause** | Read errors, reproduce, check changes, gather evidence | Understand WHAT and WHY |
| **2. Pattern** | Find working examples, compare | Identify differences |
| **3. Hypothesis** | Form theory, test minimally | Confirmed or new hypothesis |
| **4. Implementation** | Create test, fix, verify | Bug resolved, tests pass |

## Supporting Techniques

Available in this directory:

- **`root-cause-tracing.md`** - Trace bugs backward through the call stack to the original trigger.
- **`defense-in-depth.md`** - Add validation at multiple layers after finding root cause.
- **`condition-based-waiting.md`** - Replace arbitrary timeouts with condition polling.
