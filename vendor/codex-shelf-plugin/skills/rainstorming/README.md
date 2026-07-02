# rainstorming

An agent skill: turn an idea into a fully-formed **design + step-by-step implementation plan** through collaborative dialogue — then publish both to **Notion** (under an "Agent Plans" page) instead of writing local spec/plan files.

It's [`brainstorming`](https://github.com/obra/superpowers) with a different deliverable: same flow (explore context → one question at a time → propose 2–3 approaches → present the design for approval), but the plan lives in Notion and you implement directly from it. No local spec doc, no separate writing-plans step.

## Install

```bash
npx skills add https://github.com/<owner>/rainstorming        # from this repo
# or, from a local checkout:
npx skills add ./rainstorming
```

Verify discovery:

```bash
npx skills add ./rainstorming --list   # should list `rainstorming`
```

## Requirements

- The **notion-cli** skill (the `ntn` CLI), authenticated (`NOTION_API_TOKEN` or `ntn login`).
- The Notion integration must have access to your **Agent Plans** page. Set its id in `SKILL.md` (`AGENT_PLANS_PARENT`) — plans are created as child pages of it.

## Usage

Trigger it like brainstorming — e.g. *"rainstorming: a feature that does X"* or *"brainstorm this into a Notion plan."* It will refuse to write code until the design is approved **and** the Notion plan is published and reviewed.

## Layout

```
SKILL.md                 # routing doc + the rainstorming process
cookbook/notion-plan.md  # how to publish the design + plan to Notion via notion-cli
```
