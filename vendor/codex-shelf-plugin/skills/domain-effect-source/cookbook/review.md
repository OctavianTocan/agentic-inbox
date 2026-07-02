# Effect Expert Review (Subagent)

## Context

Deep Effect-TS code review, Q&A, or debugging via the `effect-expert` Claude Code agent. The agent reads `vendor/effect-smol/` source and the cross-skill Effect knowledge index automatically — your job is to hand it the artifact and state the verdict format you want back.

## When to Spawn

The threshold is intentionally low — see the **Expert Subagent** section of `SKILL.md` for the full list. Short version: any non-trivial Effect change without a clear project precedent.

## Spawn Protocol

Use the Agent tool with `subagent_type: "effect-expert"`. The agent definition at `.agents/agents/effect-expert.md` carries the model (`opus`), tools (`Read, Grep, Glob, Bash`), iron rules, and mandatory reading list. Your prompt only needs to specify the task and supply the artifact.

**Do not paste the persona or reading list inline.** The agent file is the single source of truth — inline duplication will drift.

## Spawn Template — Review

```
Agent({
  description: "Effect-TS expert review",
  subagent_type: "effect-expert",
  prompt: `Task: review the following Effect-TS code for correctness, convention adherence, and anti-pattern hits.

## Files under review

<files>
{paste the relevant file contents or unified diff here}
</files>

## What to check

1. API usage correctness — verify against vendor/effect-smol file:line.
2. Anti-pattern hits — run cookbook/anti-patterns.md as a checklist.
3. Audit rules — run meta-housekeeping/references/effect.md (P1 → P2 → P3) against the diff.
4. Type safety — implicit type erasures, missing error channels, leaked dependencies.
5. Resource and concurrency management — scope, finalizers, race conditions.
6. Comment/JSDoc hygiene — `Context.Service`/`Effect.fn`: concise JSDoc with `@param`/`@returns`/`@errors` per `domain-effect` SKILL.md; elsewhere single-line interface-only JSDoc; inline comments explain non-obvious WHY, never restate WHAT (canonical: `practice-code-quality`).

## Output format

For each finding:
- **Project**: file:line — what the code does
- **Source**: vendor/effect-smol file:line OR skill file:section — what the contract says
- **Verdict**: matches / doesn't match / needs change

End with PASS / WARN / FAIL.`
})
```

## Spawn Template — Q&A

```
Agent({
  description: "Effect-TS source lookup",
  subagent_type: "effect-expert",
  prompt: `Task: answer the following Effect-TS question.

## Question

{the user's question}

## What to deliver

- Answer grounded in vendor/effect-smol source with exact file:line citations.
- If the question is convention-shaped, also cite the relevant domain-effect/references/<topic>.md:<section>.
- Use cookbook/hot-paths.md first if the symbol is indexed — don't grep when a line range exists.`
})
```

## Spawn Template — Debug

```
Agent({
  description: "Effect-TS debug analysis",
  subagent_type: "effect-expert",
  prompt: `Task: diagnose this Effect-related issue and propose a fix.

## Symptom

{description of the problem}

## Error output

{stack trace or error message}

## Relevant project code

{the code that's failing}

## What to deliver

1. What the code expects (project file:line).
2. What actually happens, per the Effect source (vendor/effect-smol file:line).
3. Where the divergence is.
4. The fix — grounded in the Effect API and any anti-pattern entry this matches.`
})
```

## Done

After the subagent returns:
- Relay findings to the user with the vendor source citations intact
- If the subagent found issues, propose fixes that match both the Effect source API and the project's domain-effect conventions
- If the subagent confirmed correctness, report PASS with the key verifications it made
