---
name: feature-build
description: Idea to shipped feature — brainstorm, plan, execute, verify.
when_to_use: Starting a new feature, component, or behavior change from a rough idea, where design is not yet settled.
---

# feature-build

The full path from a vague idea to verified, shipped code. Each step hands its
output to the next: a settled design feeds the plan, the plan feeds execution,
execution feeds verification.

## Steps

1. **`superpowers:brainstorming`** — Explore intent, requirements, constraints, and design *before* any code. Surface alternatives and pick one.
   - Handoff: Carry the agreed requirements and chosen design into the plan.
2. **`superpowers:writing-plans`** — Turn the agreed design into a written, reviewable, step-by-step implementation plan.
   - Handoff: With the plan written and reviewed, execute it step by step.
3. **`superpowers:executing-plans`** — Implement the plan with review checkpoints between steps.
   - Handoff: Once the implementation is complete, verify it does what was asked.
4. **`superpowers:verification-before-completion`** — Run the checks, confirm the edge cases asked about, and only then claim done.

## Notes

- If the idea is already fully specified, skip step 1 and start at planning.
- If the change is a bug fix rather than a feature, prefer the `bug-fix` workflow.
