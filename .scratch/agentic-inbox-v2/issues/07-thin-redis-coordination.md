# Thin Redis coordination design

Type: grilling
Status: open
Blocked by: 02

## Question

Where exactly do Redis rate limits, concurrency permits, and ingest dedup sit relative to `TriageEngine` and OpenRouter calls; what keys and priority classes are in scope for a single-process showcase that still tells a defensible Redis story; and what is explicitly not Redis (approvals, ledger, checkpoints)?

## Answer

<!-- filled on resolve -->
