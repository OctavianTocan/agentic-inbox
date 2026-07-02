---
name: bug-fix
description: Reproduce, root-cause, and fix a bug with a regression test that proves it.
when_to_use: A bug, test failure, crash, or unexpected behavior — anything broken that needs a verified root-cause fix, not a patch over the symptom.
---

# bug-fix

Disciplined path from a reported defect to a verified fix backed by a regression
test. Resist jumping to a fix before the cause is understood.

## Steps

1. **`superpowers:systematic-debugging`** — Reproduce reliably, isolate the failure, and find the root cause before proposing any fix.
   - Handoff: Once the root cause is known, write a test that fails because of it.
2. **`superpowers:test-driven-development`** — Write a regression test that fails on the bug, then make the smallest change that turns it green.
   - Handoff: With the test green, confirm nothing else regressed.
3. **`superpowers:verification-before-completion`** — Run the full check suite, confirm the original repro is gone, and claim done only when clean.

## Notes

- If you cannot reproduce, stay in step 1 — do not fabricate a fix.
- If the root cause reveals a design problem, escalate to the `feature-build` workflow instead of patching.
