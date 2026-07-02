---
name: rainstorming
description: "Turn an idea into a fully-formed design AND a step-by-step implementation plan through collaborative dialogue, then publish both to Notion (via the notion-cli skill) as a page under the 'Agent Plans' workspace — instead of writing local spec/plan files or handing off to writing-plans. Use when the user says 'rainstorming', 'brainstorm this into a Notion plan', 'design and plan in Notion', or wants an idea shaped into a reviewable plan that lives in Notion rather than the repo. Same collaborative flow as brainstorming (explore the context, ask one question at a time, propose approaches, present the design for approval), but the deliverable is a Notion plan page."
---

# Rainstorming — ideas → designs → Notion-backed plans

The same collaborative design flow as `brainstorming`, with **one difference**: the deliverable is not a local spec file plus a writing-plans handoff — it is a **Notion page** (design + implementation plan) created under the **Agent Plans** workspace via the **notion-cli** skill. The plan lives in Notion so it is shareable and reviewable outside the repo, and implementation proceeds directly from it.

## Hard gate

Do NOT write code, scaffold a project, or take any implementation action until **both**: (1) you have presented a design and the user approved it, and (2) you have published the plan to Notion and the user reviewed it. This applies to every project regardless of perceived simplicity — the Notion plan can be short for simple work, but it must exist and be approved.

## Variables

- **AGENT_PLANS_PARENT**: `3733c065-308b-802b-9659-c79bd094164a` — the "Agent Plans" Notion page. New plans are created as **child pages** of it.

## Process (mirrors brainstorming)

Track these as tasks and complete in order:

1. **Explore context** — read files, docs, recent commits; understand the current state before proposing anything. In an existing codebase, follow existing patterns and explore the structure first.
2. **Offer the visual companion** *(only if upcoming questions are genuinely visual — mockups, layouts, diagrams)* — as its own message; otherwise skip.
3. **Ask clarifying questions** — one at a time, multiple-choice preferred; focus on purpose, constraints, success criteria. If the request spans multiple independent subsystems, flag it and decompose into sub-projects first (each gets its own plan).
4. **Propose 2–3 approaches** — with trade-offs; lead with your recommendation and reasoning.
5. **Present the design** — in sections scaled to their complexity; ask after each whether it looks right. Cover architecture, components, data flow, error handling, and testing. Break the system into small, well-bounded units with clear interfaces.
6. **Publish the plan to Notion** → [cookbook/notion-plan.md](cookbook/notion-plan.md) — create a child page under `AGENT_PLANS_PARENT` containing the approved design **and** a phased, step-by-step implementation plan. Return the page URL.
7. **User reviews the Notion page** — ask them to review it; if they request changes, revise the page and re-review.
8. **Implement** — only after the Notion plan is approved. Execute it directly: the Notion page *is* the plan, so there is no separate writing-plans step.

## Key principles

- One question at a time · multiple-choice preferred · YAGNI ruthlessly · always explore 2–3 alternatives · validate incrementally · stay flexible and go back when something doesn't fit.
- The Notion plan must be **concrete enough to implement from**: numbered phases, the files/units each step touches, the interfaces between them, and how each step is verified.
- Surface conflicts between existing patterns rather than averaging them.

## Requirements

Requires the **notion-cli** skill (the `ntn` CLI) — read it for authentication and commands. The Notion integration must have access to the **Agent Plans** page (`AGENT_PLANS_PARENT`). If `ntn` is not authenticated, stop and ask the user to authenticate (`ntn login` or `NOTION_API_TOKEN`) before publishing.

## Cookbook

| File | Use when |
| --- | --- |
| [cookbook/notion-plan.md](cookbook/notion-plan.md) | Publishing the design + implementation plan to Notion under Agent Plans (the notion-cli mechanics) |
