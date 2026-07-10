# Agentic Inbox — static email dataset

Apply **base.md** conventions plus:

Canonical sample mail lives in `data/emails.json`.

## Do NOT flag

- Fixed shape keys: `id`, `from`, `to`, `cc`, `subject`, `body`, `timestamp`, `in_reply_to`
- Ids `e-001` .. `e-080` as the product corpus

## DO flag

- Changing the schema keys without updating loaders, api-core Email schemas, and tests together
- Shrinking, replacing, or “syncing” the corpus toward a live provider
- Adding pagination / streaming / incremental sync assumptions in code that reads this file
- Committing PII beyond the intentional sample dataset, or real customer mail dumps
- Duplicate ids or broken `in_reply_to` references introduced without a dataset integrity check
