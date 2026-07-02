# Private Tailscale Dev URL

Use this only after the user asks for a tailnet URL. Prefer `tailscale serve`;
do not use `tailscale funnel` unless the user explicitly needs public inbound
traffic.

## Single-Port Next.js Dev Server

1. Start the app on localhost:

   ```bash
   bun run dev -- --hostname 127.0.0.1 --port 3101
   ```

2. Serve it privately on the tailnet:

   ```bash
   tailscale serve --bg --https=443 http://127.0.0.1:3101
   ```

3. Verify before sharing:

   ```bash
   tailscale serve status
   tailscale funnel status
   curl -sS -I https://openclaw-vps.tailb0501a.ts.net/
   ```

Every serve entry must say `tailnet only`, and funnel must be empty.
