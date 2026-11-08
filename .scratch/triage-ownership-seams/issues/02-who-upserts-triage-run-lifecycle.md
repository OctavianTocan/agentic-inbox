# Who upserts TriageRun lifecycle?

Type: grilling
Status: resolved
Blocked by:

## Question

Who is allowed to create and advance `triage_runs` status (`running` → `interrupted` / `completed` / `failed`) and set/clear `pending` — `TriageService`, the engine/Agent triage path, or a split (e.g. Service creates + finalizes from engine outcomes; engine never touches the repo)?

Must stay true for today’s Effect loop and after `TriageEngine.invoke`.

## Answer

Only `TriageService`. It creates the run at the start of an attempt and upserts `interrupted` / `completed` / `failed` (and `pending`) from engine outcomes. The engine never touches `TriageRunsRepo`.
