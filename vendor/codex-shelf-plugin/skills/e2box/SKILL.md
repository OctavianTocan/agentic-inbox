---
name: e2box
description: "Spin up, drive, and tear down ephemeral comcom dev boxes on E2B cloud sandboxes with the e2box CLI, and expose them PRIVATELY to your own devices over your Tailscale tailnet \u2014 one URL, nothing public. Use when the user wants to spin up / inspect / exec on / shell into / mount / view / list / destroy a disposable comcom dev box, test a comcom change in a real browser, or asks for an 'e2b box', 'e2box', 'comcom box', 'a private box I can open in my browser', or 'a tailnet box'. Boxes are private by default (allowPublicTraffic:false); the agent reaches them over E2B's WS edge, the operator reaches the web UI over the tailnet."
metadata:
  requires:
    bins: []
  stages:
  - provision
  - develop
  - expose
  - teardown
  tavi_toolbelt_original_frontmatter:
    version: 2.1.0
    argument-hint: "up [name] [--no-tailnet] [--branch <ref>] [--size large] [--wait] [--recreate] [--timeout <h>] [--no-services] \xB7 tailnet <name> \xB7 ls \xB7 status <name> \xB7 exec <name> -- <cmd\u2026> \xB7 shell <name> \xB7 mount|unmount <name> \xB7 web <name> <port> \xB7 browse <name> \xB7 logs <name> [--provision|--dev|--bootstrap] [--follow] \xB7 token <name> \xB7 down <name>"
---

# e2box

Personal tooling at `/mnt/HC_Volume_105512717/e2box/` — a bun CLI on PATH (`e2box` → `bun cli.ts`).
Spins up throwaway **E2B cloud sandboxes** running the full comcom dev stack, **private by
default** (`network.allowPublicTraffic:false` → unauthenticated requests get **403**). The
**agent** reaches a box over E2B's WS edge (ssh/sshfs/exec, traffic-token auth); **you** reach
comcom's web UI from your own devices over your **Tailscale tailnet** — one URL, never public.
E2B sibling of `dev-box` (Hetzner).

## The one command

```
e2box up <name>
```
**Tailnet exposure is the default.** `up` provisions comcom, **joins the box to your tailnet**, exposes it privately, and prints:
```
https://e2box-<name>.tailb0501a.ts.net:3001
```
Open that on any device on your tailnet (laptop/phone with Tailscale on) → click **"Dev Sign In"**
→ you're in, agent turns run. Only your tailnet devices can reach it; nothing is on the public
internet. ~12–15 min (comcom provision) + ~2–3 min (tailnet). `down` promptly when done.

> Don't want it on the tailnet? `e2box up <name> --no-tailnet` (add it later with
> `e2box tailnet <name>`). The reusable+ephemeral `TS_AUTHKEY` is read from the env or from
> `dev-box/.env` automatically — you don't have to export it each time.

## Access model — what's reachable, by whom

| URL / path | Who | How | Exposure |
|---|---|---|---|
| `https://e2box-<name>.<TS_NET>:3001` app · `:3002` api · `:3004` actors · `:6420` mgr · `:8184` electric | **you** | `tailscale serve` | **tailnet-only** (never Funnel) |
| ssh / exec / sshfs | **agent** | E2B WS edge + per-box traffic token | private (token-gated) |
| `https://<port>-<sandboxId>.e2b.app` | nobody | — | **403** (token missing) |

**Nothing is exposed online.** Verify: `curl https://3001-<sandboxId>.e2b.app/` → 403; `tailscale
serve status` shows every entry "(tailnet only)"; there is **no** `tailscale funnel`.

## Setup (control host)

- **`E2B_API_KEY`** — gates everything (create/drive boxes).
- **`TS_AUTHKEY`** — reusable + **ephemeral** Tailscale auth key (tailnet is **on by default**; the box's node auto-removes on `down`). Auto-resolved from the env or a `TS_AUTHKEY=` line in `dev-box/.env` (override `E2BOX_TS_ENV`); if missing, `up` still builds the box and just skips tailnet with a warning.
- **`TS_NET`** — tailnet MagicDNS suffix (default `tailb0501a.ts.net`).
- `gh` logged in (clones the private comcom repo); `bun`, `sshfs` + `fusermount3`, `ssh` present.
- comcom secrets ride along **pre-decrypted** in the dev-box `box.env` bundle (override `E2BOX_SECRETS=<path>`); the sandbox never touches AWS/SOPS.

Pull secrets from Bitwarden at run time: `bws run -- e2box up <name>`.

## Commands

```
e2box up [name] [--no-tailnet] [--size large] [--branch ref] [--wait] [--recreate] [--timeout 4] [--no-services]
e2box tailnet <name>          # join tailnet + expose comcom privately (existing box)
e2box ls | status <name> | logs <name> [--provision|--dev|--bootstrap] [--follow]
e2box exec <name> -- <cmd...> # run on the box (cwd defaults to /home/user/comcom)
e2box shell <name>            # interactive ssh shell (zsh, lands in the repo)
e2box mount <name> | unmount <name>     # sshfs-mount the box's comcom repo locally (auto on up/down)
e2box web <name> <port> | browse <name> # control-host localhost proxy (only for agent-browser ON the VPS)
e2box token <name> | down <name>
```
`e2box help` for the summary. **🚨 `e2box up --help` CREATES a box — never run it; use `e2box help`.**

## Working on a box — edit local, run remote

`up` auto-mounts the box's **comcom repo** at `/mnt/HC_Volume_105512717/e2box-mnt/<name>`
(sshfs; this is `/home/user/comcom` on the box) — one source of truth, no second copy.
- **Edit / read / scoped `rg`** → through the mount with normal file tools.
- **🚨 Run EVERYTHING on the box** via `exec` (typecheck, tests, `bun`, `docker compose`, migrations):
  `e2box exec <name> -- bun run typecheck`.

### `e2box exec` quoting — deliver scripts, don't fight the shell

`exec` wraps the remote command as `zsh -c '… bash -lc <args>'`, which **glob-expands** unquoted
`[ ] ** !` in your args (e.g. `rg '[Aa]utumn'` → "no matches found"), **mangles** multi-statement
`bash -lc '…; …'`, and **swallows output** when a long-lived process is backgrounded. So:
- Use **plain `rg` patterns** (no `[]`/`**`/`!`); `rg` already skips `node_modules` via gitignore.
- For anything non-trivial, **write a script through the mount and run it by path**:
  `e2box exec <name> -- bash /home/user/comcom/run.sh ARG` (a script file isn't re-parsed). Delete it after.
- Start long-lived services as a **transient systemd unit** (`sudo systemd-run --unit=NAME --collect …`),
  not `&`; capture output by having the script write a file you then `cat` back.
- `exec` does **not** forward stdin.

## How `--tailnet` works (comcom stays byte-for-byte untouched)

`remote/tailnet-up.sh` runs in the box: userspace **tailscaled** → `tailscale up
--hostname=e2box-<name>`; a tiny in-box **Caddy** fixup proxy (rewrites `Host`→`localhost` so
vite serves; strips the `Set-Cookie` `Domain` so the `*.ts.net` session cookie sticks; passes
WebSockets); `tailscale serve` the 5 browser-facing ports on their **native** numbers; then
relaunch the stack with **host-fixup env** (`NEXT_PUBLIC_*` → the tailnet FQDN), the **billing
gate off** (`unset AUTUMN_SECRET_KEY` → agent turns run), and `turbo dev --continue`. No comcom
files are modified — the proxy handles Host/cookie, and native-port serving makes the actors
bind port == its public port (so no source patch). `e2box down` logs the node out of the tailnet.

## Gotchas (each cost a real iteration)

- **`e2box up --help` creates a box.** Use `e2box help`.
- **A first sign-in *during boot* can stick a dead session cookie** → "Couldn't sync your data" /
  401 on `/v1/shape`. Fix: open in a **private window** (or sign out) once the stack is fully up.
  (The cookie scheme is correct, SameSite=Lax/host-only; a stale mid-boot cookie is the culprit.)
- **`@apps/worker` crashes on boot** (`Service not found: @clients/redis/Client`) — orthogonal;
  `turbo --continue` keeps app/api/actors/electric up (sign-in, sessions, agent turns work).
- **In-box agent→api auth is broken on a tailnet box — agent settings (custom instructions, per-session
  config) won't load live.** comcom derives the JWT issuer/audience, the JWKS fetch URL
  (`${NEXT_PUBLIC_API_URL}/api/auth/jwks`, see `platform/auth/src/{plugins/jwt.ts,verify-token.ts}`),
  AND the operator's Dev-Sign-In magic-link (better-auth `baseURL = config.pageUrls.api`,
  `auth/src/server.ts`) **all from the single `NEXT_PUBLIC_API_URL`**. On a tailnet box that URL is the
  tailnet FQDN, which **doesn't resolve inside the box** — so when the in-box agent calls the api, the
  api can't fetch its own JWKS / match the audience and **401s the agent's `GET /v1/user-settings`**
  (browser/UI calls use a session cookie and are unaffected; only the agent's JWT path breaks).
  Pointing the api at `http://localhost:3002` fixes the agent but turns the magic-link into an
  unreachable `http://localhost:3002` link → **operator can't sign in**. You get one or the other, not
  both, without a comcom change — so the default (above) keeps **sign-in working** and the agent's
  settings-dependent behavior simply won't reflect on the box. **Proper fix (comcom):** have
  `verify-token` + the JWT plugin use an *internal* API URL (e.g. `http://localhost:3002`) for JWKS +
  issuer/audience, decoupled from the public `NEXT_PUBLIC_API_URL`.
- **vite binds `[::1]` (IPv6-only)** → Caddy upstreams use `localhost`, not `127.0.0.1`.
- **Lifetime:** same-day disposable (≤24h cycle, default 4h `--timeout`), **8 GB RAM** ceiling, ~$0.17/hr.
- **`up` always makes a FRESH box** (no resume); `--recreate` to re-ship a changed secret bundle.
- State lives in `~/.e2box/state.json` (name → sandboxId + traffic token) — use `e2box down`, not manual deletion.

## comcom PR quality bar

When writing comcom code on a box, the same bar as dev-box applies (Effect-TS not plain TS,
correct module folders, no dead code, resolve review-bot threads, run `/thermos`, verify under
Node ≥20). See the `dev-box` skill's "comcom PR quality bar" — identical here.
