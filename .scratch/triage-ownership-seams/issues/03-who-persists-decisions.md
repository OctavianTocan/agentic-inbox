# Who persists Decision rows during triage?

Type: grilling
Status: resolved
Blocked by:

## Question

Today decisions can be written via `TriageService.persistTriage` → `DecisionsRepo.upsert` and also via toolkit `record_triage` → `ActionService.recordTriage`. Who should own Decision persistence under the seam rules — and is `record_triage` allowed, forbidden, or engine-internal only?

Must stay true before and after cutover.

## Answer

Only `TriageService` persists Decision rows from the engine outcome (after the one-email walk returns). Mid-loop `record_triage` → `ActionService.recordTriage` is not allowed as a second triage writer. The engine may return an in-memory decision; it must not upsert `decisions` itself.

(User lacked prior context; recorded as the recommended default after explaining dual writers in `apps/api/src/Modules/Triage/GLOSSARY.md`.)
