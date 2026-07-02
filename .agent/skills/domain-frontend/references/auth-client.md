# Auth Client Patterns

Better Auth client-side patterns across all frontend platforms.

## Auth Client Setup

### Web (apps/app, apps/web)

The canonical client lives in `packages/platform/auth/src/client.ts` — import from `@platform/auth/client`:

```typescript
import { authClient } from '@platform/auth/client';
```

It bundles all platform plugins (`customSessionClient`, `adminClient`, `magicLinkClient`, `organizationClient`, `deviceAuthorizationClient`, `oidcClient`, `oauthProviderClient`, `passkeyClient`, `lastLoginMethodClient`). Never duplicate this setup per-app.

### Mobile (apps/mobile)

Uses Expo plugin with SecureStore for token persistence:

```typescript
import { expoClient } from '@better-auth/expo';
// Added as a plugin to the auth client
```

### Desktop (apps/desktop)

OAuth2 PKCE flow via system browser + deep link callback:

1. Opens system browser for auth
2. Receives callback via `tcc://` deep link
3. Exchanges auth code for tokens

## Type Inference

Derive types from the auth client:

```typescript
export type Session = typeof authClient.$Infer.Session;
export type Organization = typeof authClient.$Infer.Organization;
export type Team = typeof authClient.$Infer.Team;
export type Member = typeof authClient.$Infer.Member;
export type Invitation = typeof authClient.$Infer.Invitation;
```

## Hooks

From `@platform/auth/hooks`:

| Hook | Returns |
|------|---------|
| `useSession()` | Current session (user, org, team) |
| `useActiveOrganization()` | Active organization details |
| `useActiveTeam()` | Active team (if selected) |
| `useActiveMember()` | Current user's membership |
| `useListOrganizations()` | All user's organizations |
| `useListTeams()` | Teams in active org |
| `useListInvitations()` | Pending invitations |
| `useListMembers()` | Members in active org |

All hooks are forwarders to better-auth's internal hooks — no local state management.

## Session-Based Rendering

```tsx
function ProtectedContent() {
  const { data: session, isPending } = useSession();

  if (isPending) return <Loading />;
  if (!session) return <Redirect to="/sign-in" />;

  return <Dashboard user={session.user} />;
}
```

## Organization Context

```tsx
function OrgSelector() {
  const { data: orgs } = useListOrganizations();
  const { data: activeOrg } = useActiveOrganization();

  const switchOrg = (orgId: string) => {
    authClient.organization.setActive({ organizationId: orgId });
  };

  return (
    <Select value={activeOrg?.id} onValueChange={switchOrg}>
      {orgs?.map((org) => (
        <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
      ))}
    </Select>
  );
}
```

## Pre-Built Components

`@platform/auth/components` provides ready-made auth UI:

- Sign-in forms
- Organization management
- Invitation handling

## Platform Auth Guards

| Platform | Mechanism |
|----------|-----------|
| Web (apps/app) | TanStack Router `beforeLoad` guard |
| Web (apps/web) | Next.js middleware |
| Mobile | Expo Router `Stack.Protected` |
| Desktop | TanStack Router guard (same as apps/app) |

## Anti-Patterns

- Don't call `authClient` methods in server components — use `@platform/auth/server` instead
- Don't store tokens manually — Better Auth handles persistence per platform
- Don't create custom session types — extend via `createCustomSessionPlugin`
- Don't check auth in every component — guard at the router/layout level
