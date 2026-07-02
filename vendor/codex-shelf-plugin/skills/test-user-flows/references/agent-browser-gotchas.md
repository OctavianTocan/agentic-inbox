# agent-browser Techniques & Gotchas

Hard-won specifics for driving and verifying flows. The canonical agent-browser workflow lives in `agent-browser skills get core` / `--full` and `agent-browser skills get dogfood` — load those first. This file is the deltas: the traps that cost real iterations.

## Driving

- **snapshot→ref→act, always re-snapshot.** `@eN` refs are valid only for the snapshot that produced them. After any action that changes the DOM (navigation, dialog open, menu expand), the old refs are stale — `snapshot -i` again before the next click.
- **Disclosure-then-confirm modals.** Items behind a `…`/"Actions" menu, kebab, or dropdown are NOT in the accessibility tree until the disclosure is opened. Sequence: click the trigger → re-snapshot → click the now-present item → handle the confirm dialog (which is itself a fresh snapshot). Looking for the item before expanding finds nothing and reads as "the feature is missing."
- **`eval` for authed fetches.** To hit an endpoint the UI doesn't expose a button for, run `fetch` in page context so it inherits the session cookies — no need to reconstruct auth headers. Base64-encode the script (`agent-browser eval -b <b64>`) so quotes/JSON survive the shell. Return the status/body so you can assert on it.
- **`cookies get/set` for session.** Inject a session cookie to authenticate without driving the full login UI; `cookies get` to inspect what's set; `cookies clear` to simulate a stale/expired session mid-flow. **A session cookie is a live credential** — never write a real one into a file, commit, or report; have the user rotate it after testing.
- **Third-party forms with multiple sections** (e.g. GitHub settings) often have **one `<form>` per section**, each with its own save. Clicking a generic "Save" can submit the *wrong* form and silently no-op the field you changed. Submit the specific field's form (press Enter inside the field, or target that section's submit button), then verify the value actually persisted by re-reading it — don't assume the save applied. (A session burned an iteration concluding "the browser matters"; the real cause was submitting the wrong form.)

## Verifying at the data layer

- **The UI toast is a claim, not proof.** Confirm every leg against DB + server log + network. A real bug: an unconditional `toast.success()` that fired over a 404, reporting a disconnect that never happened.
- **Parameterized SQL hides values in logs.** Postgres `log_statement='all'` logs the statement with `$1, $2` placeholders, not bound values — so you can see *that* a query ran but not *with what*. To get values, use `log_min_duration_statement` (logs binds) or inspect from the app side. Don't conclude "wrong value" from a placeholder log.
- **A 404/error can be thrown before any SQL runs.** If `log_statement='all'` shows **zero** DB statements for a request that 404'd, the rejection is application-layer (wrong route, missing handler, failed pre-check), not a DB "row not found." Distinguish "query ran, returned 0 rows" from "query never ran" — they have completely different root causes.
- **RLS context propagation.** Under row-level security, reads/writes run as a restricted role with a tenant context (org/user) set per-transaction. A SELECT under the **wrong or absent** context returns 0 rows — a *false* not-found that looks identical to a real one. Webhook/inbound paths run with no user session and must use the privileged/table-owner role, NOT the user-scoped context, or every row is filtered out. When a row "isn't found," check whether the tenant context is set and correct before assuming the row is missing.
- **Webhook content-type & raw bytes.** Pinning a webhook endpoint's payload schema to `Uint8Array`/`application/octet-stream` rejects the provider's `application/json` with a 400 decode error. Read the **raw body bytes** and verify the signature (HMAC) over exactly those bytes — a reparse-then-stringify round-trip won't reproduce the signed bytes and the signature check fails.
- **Provider/route key mismatches → 404 at dispatch.** A handler registered under the wrong key (e.g. `github` vs `github-app`) means inbound events resolve to no handler → not-found, even though "the code is there." Check the dispatch key matches what actually arrives.
- **URL prefixes.** Endpoints are often mounted under a global prefix (e.g. `/v1`). External config — webhook URLs, OAuth callbacks — must include the full path or you get a 404 that looks like a missing route.

## Real bug vs. environment flakiness

On a throwaway/dev-box instance, many "bugs" are infra, not the diff. Before filing anything against the PR, rule these out and confirm the failure reproduces on a **healthy** instance:

- **Stack health**: `systemctl is-active dev-stack` is `active` (not restart-looping); expected ports listening.
- **DB**: reachable, password not drifted (`28P01` = auth failure), required tables present (auth/session tables can get dropped/recreated).
- **Sync**: real-time sync (e.g. Electric) not degraded — a live list that "doesn't update" may be a sync hiccup, not a write bug. Restart the sync service and retry.
- **Cloud auth**: expired SSO/credentials (`InvalidGrant`) break seeds and background jobs in ways that mimic product failures.

If a failure vanishes after a stack restart / recreate, it was the environment — note it and move on. If it reproduces on a clean instance, it's a real bug — reproduce deterministically, root-cause, and propose a regression test.

## Safety

- Test against a **throwaway** instance, never production or shared staging — adversarial inputs (injection, oversized payloads, concurrent writes, tampered params) are destructive by design.
- A **public callback URL** (Funnel/tunnel) is a standing exposure; tear it down promptly when done.
- Never persist or echo real secrets/session tokens captured during testing; rotate any that were injected.
