---
name: dev-box
description: Provision, drive, and tear down ephemeral dev boxes on Hetzner with the Rust noun-verb dev-box CLI. Use when the user wants to spin up, inspect, exec on, open a shell on, list, destroy, or refresh a disposable VPS for any repo, or test OAuth / webhook callback flows against a public URL.
metadata:
  tavi_toolbelt_original_frontmatter:
    argument-hint: '[up|exec|shell|down] [task] [flags]'
---

# dev-box

Personal tooling at `/mnt/HC_Volume_105512717/dev-box/` (private repo `dev-box`)
that spins up throwaway Hetzner VPSes running a dev stack for any repo, reached keyless
over Tailscale SSH, then trashed per task. comcom is one profile among equals — plain
repos need only a URL.

## Arguments

The user invoked this with: $ARGUMENTS

Treat that input as one of two shapes:

- **Subcommand form** — noun-verb commands map straight to `dev-box boxes ...`.
  E.g. `/dev-box boxes up payments --profile comcom --branch fix/webhook`;
  `/dev-box boxes exec payments -- systemctl status dev-stack`; `/dev-box boxes list --json`.
- **Natural language** — e.g. "spin up a box for the payments fix on branch fix/webhook" → translate to the
  matching subcommand in the table below before running anything.

If no input was given above, ask which boxes action (`up` / `list` / `status` / `exec` / `shell` /
`logs` / `probe` / `down` / `refresh-token`) and, when needed, the `<task>` name — don't guess. `<task>` is a short kebab slug; it becomes the box name
`devbox-<task>` and its Tailscale FQDN.

## Commands

```
cd /mnt/HC_Volume_105512717/dev-box
dev-box boxes up [<task>] --profile <name> [--branch <ref>] [--recreate]
dev-box boxes up [<task>] --repo <url> [--branch <ref>] [--recreate]
dev-box boxes list [--json|--plain]
dev-box boxes status <task> [--json|--plain]
dev-box boxes exec <task> -- <command...>
dev-box boxes shell <task>
dev-box boxes mount <task>             # sshfs-mount the box repo locally (auto-runs on `up`)
dev-box boxes unmount <task>           # drop the local mount (auto-runs on `down`)
dev-box boxes logs <task> [--unit dev-stack] [--lines 200] [--follow]
dev-box boxes probe <task> [--url <url>] [--json|--plain]
dev-box boxes down <task> [--dry-run|--yes]
dev-box boxes refresh-token <task|all>
dev-box profiles list [--json|--plain]
dev-box profiles show <name> [--json|--plain]
dev-box completions <shell>
```

Every command has `--help`. Box FQDN: `devbox-<task>.tailb0501a.ts.net`.
`--profile` and `--repo` are mutually exclusive; one is required for a fresh box. Resume
with `dev-box boxes up <task>` reuses `/root/dev-box-tooling/profile.sh` already on the box
and the Hetzner `profile=` label for display.

Structured data goes to stdout; progress and child-command output go to stderr. Use
`--verbose` when source error chains matter.

## Working on a box: edit locally, run remotely

**`up` auto-mounts the box's repo onto the control host** (and `down` auto-unmounts it).
The mountpoint is printed by `up` and defaults to `<dev-box repo>/../boxes/<task>`
(e.g. `/mnt/HC_Volume_105512717/boxes/<task>`). It's a live **sshfs** view of the box's
checkout — **one source of truth, no second copy, no sync step**. Requires `sshfs` on the
control host (auto-mount is best-effort; it warns and skips if absent — `apt-get install -y
sshfs`).

- **Edit / read / search files → through the mount.** Normal file tools (Read, Edit,
  Write, and `rg` over a *scoped* subtree) operate on `…/boxes/<task>/…` and write straight
  through to the box. For whole-repo search, prefer `rg` **on the box** via `exec` — sshfs
  does a network round-trip per file, so at-scale crawls are slow locally.
- **🚨 Run EVERYTHING on the box — never on the control host.** Typecheck, lint, unit/e2e
  tests, `bun`/`uv`/`npm`/`pnpm` scripts, builds, `docker` / `docker compose`, DB
  migrations, code generators, dev servers — all of it must run **on the box**, where the
  toolchain, dependencies, services, ports, and env live. The control host has none of that;
  running there is wrong and **defeats the entire purpose of the box.** Always:

  ```
  dev-box boxes exec <task> -- bun run typecheck      # runs in the repo by default
  dev-box boxes exec <task> -- uv run pytest -q
  ```

  `exec` defaults its working directory to the box repo (`CLONE_DIR`), and box shells carry the
  full toolchain on PATH (`bun`/`uv`/`cargo`/`node`), so plain `bun …`/`uv …` just work — no `cd`
  or `bash -lc` wrapper. Pass `--cwd <dir>` to override. Repeated `exec`/`scp` reuse one SSH
  connection (multiplexing) automatically.

- **Manual mount control** (rarely needed; `up`/`down` handle it):
  `dev-box boxes mount <task>` / `dev-box boxes unmount <task>`.

### Navigating box code

- **References / text:** `rg` **on the box** via `exec` (`dev-box boxes exec <task> -- rg <pattern>`) — fast, local to the box.
- **Symbols / go-to-definition:** build a tags index on the box and query it (`universal-ctags` ships on every box):
  ```
  dev-box boxes exec <task> -- ctags -R -f .tags --languages=Python,TypeScript backend frontend
  dev-box boxes exec <task> -- readtags -t .tags <symbol>
  ```
- **True find-references / rename (semantic):** point **Serena at the mount path** —
  `activate_project /mnt/HC_Volume_105512717/boxes/<task>`. First index runs over sshfs so it's slow
  (scope to `backend/` for Python); cached afterward. Use only when `rg`/ctags aren't enough.

### Verifying UI changes (agent-browser)

The box app is served over the tailnet with a valid TLS cert, so `agent-browser` hits it directly — no
flags. URL is deterministic: `https://devbox-<task>.tailb0501a.ts.net:8443` (app) / `:9443` (code-server).
```
agent-browser open https://devbox-<task>.tailb0501a.ts.net:8443
agent-browser wait --load networkidle
agent-browser errors                 # confirm no console / page errors
agent-browser screenshot /tmp/box-ui.png
```

### Complex / multi-line commands (skip the quoting)

For anything with awkward quoting, write the script **through the mount**, then run it on the box:
```
# Write <mountpoint>/.devbox-run.sh with your normal file tools, then:
dev-box boxes exec <task> -- bash .devbox-run.sh     # runs in the repo; delete it after
```

### Dispatch the `devbox-worker` subagent for non-trivial box work

When the task is more than a couple of steps — a multi-file change with a typecheck/test
loop, a migration, reproducing a bug, a build-and-verify cycle — hand it to the
**`devbox-worker`** subagent (via the Agent tool). It already understands the
edit-on-mount / run-via-`exec` split and the run-on-the-box rule. Give it: the **task
name**, the **mountpoint**, the **repo path on the box**, and the **goal + how to verify**.

> **Git-surgery tasks (split-branch, interactive rebase, branch restructuring) are the
> exception to "run everything on the box."** On the comcom profile the *live dev-stack
> rewrites the repo under you* — STOP it first (`systemctl stop dev-stack`) or work in a
> throwaway second clone. See the dev-stack-mutates-repo gotcha below. Brief any worker
> doing branch surgery with this, and tell it to halt-and-report if branches it creates
> vanish or `HEAD` jumps — that's the stack fighting it, not its own bug.

## Access (the point of all this)

The user connects **keyless from any device on their tailnet** — relay this:
```
ssh root@devbox-<task>.tailb0501a.ts.net      # no key, no password (Tailscale SSH)
# lands in zsh + powerlevel10k (+ tmux); then:  cd <repo> && claude
```
`claude` is on PATH with `ANTHROPIC_API_KEY` set (from box.env). `gh` + git auth work
(branch, push, PR). Git identity is configured globally on every box (`user.name`/`user.email`
from `GIT_USER_NAME`/`GIT_USER_EMAIL`), so commits aren't authored as `root@box`.
**code-server** is password-protected — the random password is in
`/root/.config/code-server/config.yaml` on the box (surface it; `up` doesn't print it):
`dev-box boxes exec <task> -- grep '^password:' /root/.config/code-server/config.yaml`.

| URL | Serves | Visibility |
|---|---|---|
| `https://<fqdn>:8443` | app (profile-defined port) | tailnet (serve) |
| `https://<fqdn>:9443` | code-server | tailnet (serve) |
| `https://<fqdn>` | api / funnel port | **PUBLIC (Funnel)** — comcom profile only; `down` promptly |

## Profiles

Profiles live in `profiles/*.sh`. A profile sets variables (`REPO_URL`, and optionally
`CLONE_DIR`, `SERVE_PORTS`, `FUNNEL_PORT`, `DEV_CMD`, `AGENT_IDENTITY`,
`db_can_refresh_secrets`) and may override any of the seven lifecycle hook functions
(`db_clone db_git_identity db_install db_secrets db_host_fixup db_launch db_expose`).

- **comcom** — `profiles/comcom.sh`: overrides `db_install`, `db_secrets`,
  `db_host_fixup`, and `db_launch`; sets `SERVE_PORTS`, `FUNNEL_PORT`, `AGENT_IDENTITY`,
  and `db_can_refresh_secrets=1`. Use `--profile comcom`.
- **pawrrtal** — `profiles/pawrrtal.sh`: Next.js + uv/FastAPI; installs `uv` + `ffmpeg` +
  `gemini-cli`, pins `SERVE_PORTS` (53001/8000), wires `NEXT_PUBLIC_API_URL`/`CORS_ORIGINS`
  to the tailnet host, SQLite (no DB). Use `--profile pawrrtal`. **Env:** ships the full local
  app env via `box.pawrrtal.env` (rebuild from local `backend/.env` with
  `scripts/sync-pawrrtal-env.sh`) — but **excludes all `TELEGRAM_*`**: multiple boxes sharing a
  bot token spawn duplicate getUpdates pollers and break Telegram (the backend just logs
  `TELEGRAM_DISABLED reason=no_token` and runs fine). The dev-stack starts on boot and
  hot-reloads on edits made through the mount, so a fresh box is testable immediately.
- **Plain repo** — needs only `REPO_URL` (plus optionally `DEV_CMD`/`SERVE_PORTS`);
  all hooks default (auto-detect lockfile/dev script). Copy `profiles/example.sh` as a
  starting point.
- **One-off** — `--repo <url>` synthesizes a minimal profile on the fly (no file needed).

Box names are always `devbox-<task>` regardless of profile (omit `<task>` and you get a
generated codename, e.g. `devbox-brave-lynx`). Git identity (`user.name`/`user.email`) is
configured on every box via the chassis `db_git_identity` hook — no profile override needed.
**Per-profile secrets:** if `box.<name>.env` exists it ships *instead of* the shared
`box.env` for that profile, so one repo's secrets can't leak into another's box.

## Cookbook — onboard a new repo as a profile

Bare `--repo <url>` is enough when a repo is a single JS service with a standard `dev`
script. Anything more — a second runtime (Python/`uv`, Go…), multiple browser-facing
services, secrets required to boot, non-default ports, or host/CORS wiring — earns a
`profiles/<name>.sh` (+ `box.<name>.env`). Run this loop.

### 1. Explore the repo first — with subagents, not guesses

Dispatch read-only `Explore` subagents (one per lens for anything non-trivial) to **map the
repo before writing a line of profile**. Frame each neutrally ("map how this repo's dev
stack starts and what it needs"); require `file:line` citations; have each report a
structured findings list. Discover:

- **Dev orchestration** — what does the dev command actually start? Follow the root
  `package.json` `dev` script → a turbo filter set, a custom orchestrator (`dev.ts`,
  `bin/dev`), a `Procfile`/`justfile`. Enumerate *every* process and the port it binds.
- **Services + ports** — each service's bind port (grep the orchestrator / a `dev-ports`
  module / config). Mark which are **browser-facing** (need a tailnet serve) vs box-internal.
- **Package manager + runtimes** — the lockfile (`bun.lock`, `pnpm-lock.yaml`, `yarn.lock`,
  `package-lock.json`) and any non-JS runtime (Python + `uv`, …). Plus **system packages** the
  app needs at runtime (`ffmpeg`, build tools, a CLI binary it shells out to).
- **Submodules** — `.gitmodules`? (`db_clone` recurses by default; confirm workspaces resolve.)
- **Required secrets / env** — which vars are *required to boot* (read `.env.example`; grep the
  config/settings model for required fields). Which are real provider keys you must supply.
- **Networking / CORS / host** — the env var the frontend uses to reach the backend
  (`NEXT_PUBLIC_*` / API-URL), the backend's allowed-origins env (CORS), any dev-server host
  allowlist (Vite `allowedHosts`, Next `allowedDevOrigins`), and cookie secure/SameSite/domain.
- **Datastore** — does dev need Postgres/Docker, or is there a SQLite/embedded fallback?
  Prefer the fallback on a throwaway box; don't point it at a remote/prod DB.

### 2. Decide: profile or bare `--repo`?

Single JS service, standard script, default-ish port, no required secrets → `--repo`.
Otherwise → write a profile.

### 3. Write `profiles/<name>.sh`

Set vars; override only the hooks the defaults get wrong (`profiles/example.sh` = the
contract; `profiles/comcom.sh` + `profiles/pawrrtal.sh` = worked examples):

- `REPO_URL`, `CLONE_DIR`.
- `SERVE_PORTS=("<internal>:<https>" …)` — one pair per browser-facing service. Convention:
  `:8443` = primary app, `:9443` = code-server (automatic), `:8444+` = the rest.
- `FUNNEL_PORT=<port>` **only** if the repo needs a public callback URL (OAuth/webhook) —
  else omit and stay tailnet-private (public exposure is a standing risk; `down` promptly).
- `db_install` — `apt-get install -y <system pkgs>`, the pm runtime (`ensure_bun`/`ensure_node`),
  and each runtime's deps (`bun install`, `uv sync`, …). Runs once at provision.
- `db_secrets` — generate any *stable* secrets the app needs (once, persisted) when the user
  didn't supply them via `box.<name>.env`.
- `db_host_fixup` — resolve + guard the tailnet host
  (`ts_host="$(tailscale status --json | jq -r '.Self.DNSName' | sed 's/\.$//')"`; fail loud
  if empty/`null`), then export the frontend→backend URL var, the backend CORS-origins var,
  and any host/cookie flags — all pointing at `https://$ts_host:<port>`. Runs at launch
  *after* box env, so it wins.
- Leave `db_launch` default (`bun run dev`) unless the start command is non-standard.

### 4. Write `box.<name>.env` (per-profile secrets)

Ships **instead of** the shared `box.env` for this profile. Gitignored (`box.*.env`).
Populate from the repo's real `.env`, but **exclude**: the datastore URL (use the
SQLite/embedded fallback), anything `db_host_fixup` owns (CORS / host / cookie / API-URL),
and tokens that would conflict with a running local instance (e.g. a Telegram bot token →
duplicate poller). Single-line values only. **Never commit it** — verify
`git check-ignore box.<name>.env`.

### 5. Smoke-verify, then tear down

- `dev-box boxes up <task> --profile <name> > /tmp/up.log 2>&1` (background); watch for `is up.`
  or a *silent* abort (process exits with no `is up.` → an install/clone failure in the log;
  grep the tail).
- `dev-box boxes exec <task> -- ...`: `systemctl is-active dev-stack` must be **`active`** (not
  restart-looping); expected ports listening (`ss -tlnp`); local `curl` probes return
  2xx/3xx; the running process env (`/proc/<pid>/environ`) shows the tailnet URL/CORS wiring.
  Per the no-browser-review rule, the **operator** confirms the UI in a browser.
- Fix what the journal surfaces (missing system dep, wrong port, host/CORS), commit, then
  `up` again (resume re-ships the profile) or `--recreate`.
- `dev-box boxes down <task> --yes` to stop billing.

## Running `up`

~3–10 min (comcom; plain repos faster). comcom reuses the host's AWS SSO token, so
normally **no interactive login**. Drive it:

1. `dev-box boxes up <task> --profile comcom [--branch <ref>] > /tmp/devbox-up.log 2>&1`, `run_in_background: true`.
   Or for a plain repo: `dev-box boxes up <task> --repo https://github.com/org/repo.git > /tmp/devbox-up.log 2>&1`.
2. Monitor `/tmp/devbox-up.log` for `is up\.`, `FATAL`, `funnel failed`, `command not found`,
   and (comcom-specific rare fallback) `https://device` + a `XXXX-XXXX` device code to relay.
   **The harness completion notification for the backgrounded `up` often never fires** — `up`
   spawns detached daemons (the sshfs auto-mount + SSH ControlMaster) that keep the process
   tree / output FDs open, so the task hangs "running" forever. Don't wait on `up`'s exit; arm
   a separate log-marker watcher:
   `until grep -qE "is up\.|FATAL|funnel failed|✗|fatal:" /tmp/devbox-up.log; do sleep 8; done`
   with `run_in_background: true` — it fires one clean notification the moment the box is up or fails.
3. `remote-setup` finishing ≠ apps up. Verify over SSH: `dev-stack` active, app +
   api → HTTP 200, branch checked out, `gh auth status`. Watch `journalctl -u dev-stack -f`.
4. Relay the keyless `ssh root@devbox-<task>.<tailnet>.ts.net` command (see Access).

If a long-lived box's token rotates: `dev-box boxes refresh-token <task>` (only works for
boxes whose profile sets `db_can_refresh_secrets=1`, e.g. comcom). Then
`dev-box boxes exec <task> -- systemctl restart dev-stack` if it must re-decrypt.

## One-time setup (control host + tailnet)

- `.env` (gitignored): `HCLOUD_TOKEN`, `TS_AUTHKEY` (reusable + ephemeral, **untagged**),
  `TS_NET`, `BOX_PREFIX` (default `devbox`), optional `GIT_USER_NAME`/`GIT_USER_EMAIL`
  (falls back to control host's `git config --global` values).
- `box.env` (gitignored): shared per-box secrets → `/root/.dev-box.env`. **Single-line,
  shell-quoted values only** (no multi-line PEM). gh auth is automatic — no GH token needed.
  comcom profile: auto-populated from the octavian SOPS decrypt. A per-profile
  `box.<name>.env` (also gitignored, `box.*.env`) ships instead of `box.env` for that
  profile — keeps one repo's secrets out of another's box.
- `hcloud` installed on the control host.
- **Tailscale ACL** (deny-by-default): the `ssh` rule must be `action: accept` for
  `autogroup:self` (boxes are the user's own untagged devices) — `check` mode forces
  browser re-auth and breaks provisioning. Funnel works via the default `autogroup:member`
  `funnel` nodeAttr.

## Gotchas (each cost a real iteration — don't relearn)

- **Tailscale SSH ACL = `accept`, not `check`** (check breaks non-interactive use). Boxes
  are untagged/user-owned, so rules target `autogroup:self`, not `tag:dev-box`.
- **Server type `cpx42`** (8/16/320, in stock). `cx43`/`cx42` are often
  `resource_unavailable` — `hcloud datacenter list` if `create` fails.
- **box.env must be single-line + shell-quoted.** A multi-line PEM (`GITHUB_APP_PRIVATE_KEY`)
  breaks `source` and mangles the stack key — exclude it; the stack gets it from bootstrap.
- **Pass the branch as `DEVBOX_BRANCH`, never `BRANCH`** — the oh-my-zsh installer reads
  `$BRANCH` and will try to clone that branch of *ohmyzsh*.
- **apt for zsh/tmux needs `-o Dpkg::Options::=--force-confold`** — the `/etc/zsh/zshrc`
  conffile prompt EOF-fails with no tty.
- **Shell setup runs LAST** (after dev-stack + Tailscale) so a shell hiccup can't block the stack.
- **comcom profile — AWS: token-reuse, not login** — device-code is a flaky fallback
  (instant `InvalidGrant`).
- **comcom profile — Toolchain (aws/bun/sops) lives in the devenv shell** — run via
  `direnv exec "$CLONE_DIR" <cmd>`; interactive shells get it from the `direnv hook` on
  `cd <repo>`.
- **`down` logout is `timeout`-guarded** (logout drops the tailnet SSH it runs over).
- **comcom profile — `dev-stack.sh` re-asserts the tailnet `NEXT_PUBLIC_*` URLs after box.env** — keep that ordering.
- **comcom profile — actors needs `ACTORS_PORT=3004`** (via `actors-port.patch`): the actors service
  derives its bind port from `NEXT_PUBLIC_ACTORS_URL`, so without the override it binds the serve-held
  `:8444` and agent messaging silently dies. The api needs no equivalent — it's on the Funnel with no
  port in its URL, so it defaults to `3002`.
- **comcom profile — sign-in needs `AUTH_COOKIE_DOMAIN`** (via `auth-cookie-domain.patch`): on a
  `*.ts.net` host the cookie domain resolves to the public suffix `ts.net`, the browser drops the
  session cookie, and sign-in loads then bounces to login. Pinned to the registrable domain
  (`${ts_host#*.}`). Both gates apply through `_dbx_apply_patch`, which **warns loudly** if a patch
  stops applying — so a stale patch can't silently reintroduce the break. Drop the patches once the
  env-gates are upstreamed into comcom.
- **comcom profile — secrets need the box hostname in `users.json` (now auto-registered in
  `db_secrets`).** comcom's devenv gates SOPS-secret loading on the machine `hostname` appearing
  under a user in `CLONE_DIR/users.json`; if it's missing the loader aborts (`no secrets loaded —
  hostname '<box>' not found`) and `BETTER_AUTH_SECRET`, `ANTHROPIC_API_KEY`, etc. are NOT loaded
  (the agent can't run, auth signing uses a default). `db_secrets` now appends `$(hostname)` to
  `users.json` for `AGENT_IDENTITY` + `direnv allow` BEFORE `db_launch`. Also needs valid AWS SSO
  (`aws sso login` on the control host, then `boxes refresh-token`). NOTE: this is about SECRETS,
  not the DB password — see the next bullet.
- **comcom profile — `28P01 password authentication failed for user "postgres"` = a STALE
  `local-postgres` volume, NOT a wrong/decrypted password (verified).** The password is uniformly
  the literal `postgres` (`docker-compose.yml` hardcodes `POSTGRES_PASSWORD: postgres`;
  `bootstrap-dev.sh` defaults `DATABASE_URL` to `postgres:postgres@…/app`; SOPS does NOT override
  it). Postgres only honors `POSTGRES_PASSWORD` on first-init with an empty data dir, so a volume
  carried over from an earlier provision keeps its OLD password while services use `postgres` →
  28P01 cascade → `@apps/rpc`'s session query throws → electric-proxy 401s → empty session list +
  stuck sends. **The browser "CORS error" is a SYMPTOM of the api 500 (error responses skip CORS
  middleware); `trustedOrigins` already includes `:8443` — don't chase CORS.** Fix: fresh
  `--recreate` (wipes the volume → re-inits clean). **Do NOT `systemctl restart dev-stack`** to fix
  it — that cascaded failures to ~738/min in one session. Stopgap for stale connections after
  churn: `docker restart local-electric local-hatchet` (dropped failures 738→18). **OPEN:** a fresh IDLE
  box stayed clean for 20 min (monitor: 0 failures, 0 `mbtest` branches) — it does NOT degrade on a
  timer. Earlier degradation correlated with activity/churn (heavy reloads + my own `systemctl
  restart`), not idle time; exact trigger unproven (suspect: the session-machine churn below). After `up`,
  run a full health gate (sign-in + a session that syncs into the list) and **test promptly**.
- **comcom profile — the live dev-stack mutates `CLONE_DIR`; STOP it before any git surgery.**
  The running stack (`@apps/api`/`worker`/`actors` — the session-machine / repo-backed-session
  feature) performs its own `git checkout` + branch-create inside the box repo, spawning
  `<current-branch>-mbtest-N` working branches and moving `HEAD` (telltale: those reflog entries
  carry a fixed *TestClock* date like `…01:27:16` while your real ops are wall-clock). In a normal
  edit→typecheck loop this is invisible, but it **silently sabotages split-branch / interactive
  rebase / branch restructuring** done in the live checkout: branches you create get clobbered and
  `HEAD` jumps mid-operation, so the agent looks like it's "flailing" when the ground is moving under
  it. For any git-surgery task: `dev-box boxes exec <task> -- systemctl stop dev-stack` first (you
  don't need the app for git work), or clone aside (`git clone CLONE_DIR /root/work`, operate +
  `git push` from there). `systemctl start dev-stack` to restore. **Diagnostic when a branch task
  misbehaves:** `git reflog` — mystery `*-mbtest-N` checkouts with a non-wall-clock timestamp = the
  stack, not you.

Rationale + decisions: `DESIGN.md`. One-time setup detail: `README.md` (both in the repo).
