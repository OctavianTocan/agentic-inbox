# Gold and adversarial dataset contract

Type: grilling
Status: resolved
Blocked by:

## Question

For showcase evals built from `data/emails.json` plus new adversarial cases, which label fields are required (`expected category`, `mustRequireReview`, allowed/forbidden actions, etc.), how many gold vs adversarial cases are enough for a credible portfolio demo, and where do the datasets live in the repo?

## Answer

**Layout:**
- Gold: labels for a curated subset of `data/emails.json` live in `data/evals/gold.json` (or `.jsonl`), keyed by email `id` — do not fork the mailbox file.
- Adversarial: separate corpus under `data/evals/adversarial/` (fixtures + labels). Not mixed into the live seed inbox unless explicitly promoted.

**Required label fields (per case):**
- `id`
- `expectedCategory`
- `mustRequireReview` (bool — policy should trip)
- `allowedProposals` / `forbiddenProposals` (proposal vocab: `send_reply` \| `archive` \| `flag_for_review` \| `no_action`)
- `tags` (e.g. `gold`, `adversarial`, `injection`, `safety`)
- Optional: `notes` (human-facing why this case exists)

**Size (credible showcase, not research paper):**
- Gold: **≥20** labeled cases spanning categories + at least a few `mustRequireReview: true`
- Adversarial: **≥10** cases covering prompt-injection / mislabel-temptation / keyword-policy traps
- Prefer quality + story over volume; expand later without schema change

**Ground truth:** labels are fixed before any model run. Adversarial prose may be hand-written or generated, but labels are authored/reviewed by you — never auto-labeled by the system under test.

## Comments

- Resolved via defaults sweep (2026-07-15).
