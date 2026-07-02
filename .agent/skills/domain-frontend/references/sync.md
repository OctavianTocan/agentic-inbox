# Real-Time Sync (Electric SQL)

Electric SQL sync layer — architecture, adding synced tables, and collection infrastructure. For reading/writing synced data in components, see [data-fetching.md](data-fetching.md).

## Contents

- Architecture
- When you need this file
- Adding a new synced table (5 steps)
- Reading & writing synced data
- Electric Proxy
- Collection factory & runtime
- Provider setup
- Column mapping (snakeCamelMapper)
- Key concepts
- Key files

## Architecture

```
Drizzle table (platform/database)
  → syncTablesConfig (comcom/sync/src/tables.ts)
    → createOrgCollection (comcom/sync/src/create-org-collection.ts)
      → CollectionsProvider (comcom/sync/src/collections-provider.tsx)
        → useCollections() → useLiveQuery()
```

Layered architecture:

```
Postgres → Electric → Electric Proxy → Client (Electric SQL SDK) → TanStack React DB
```

- **Electric** — streams Postgres WAL changes as HTTP shapes
- **Electric Proxy** (`apps/electric-proxy`) — auth-aware proxy that validates requests and injects WHERE clauses for tenant isolation
- **Client** — `@comcom/sync` package provides collection factories and providers

## When You Need This File

Adding a new table to the sync layer or modifying sync infrastructure.

## Adding a New Synced Table

### 1. Define the Drizzle table

In `packages/platform/database/` if not already defined.

### 2. Register in syncTablesConfig

```tsx
// packages/comcom/sync/src/tables.ts
export const syncTablesConfig = {
  my_table: {
    table: myTable,
    excludedColumns: ['sensitiveColumn'],
    requiresOrganizationId: true,
    aclProtected: false,
  },
};
```

- `excludedColumns` — columns not synced to the client
- `requiresOrganizationId` — set `false` for global tables
- `aclProtected` — set `true` when the table is ACL-gated

### 3. Create the sync type

```tsx
export type SyncMyTable = Omit<typeof myTable.$inferSelect, 'sensitiveColumn'>;
```

### 4. Add collection to core-collections.ts

```tsx
const myTableCollection = createOrgCollection<SyncMyTable>(organizationId, options, {
  table: 'my_table',
  collectionId: `my_table_${organizationId}`,
  onUpdate: async (mutation) => {
    await myTableUpdate({
      path: { id: mutation.original.id },
      body: mutation.changes,
      throwOnError: true,
    });
  },
  onDelete: async (key, _original) => {
    await myTableDelete({ path: { id: key }, throwOnError: true });
  },
});
```

### 5. Wire into interfaces and create consumer hook

- Add to the `CoreCollections` interface
- Create hook in `packages/comcom/app-shared/src/hooks/use-my-table.ts`:

```tsx
export function useMyTable() {
  const { myTable } = useCollections();
  const { data, isLoading } = useLiveQuery(
    (query) => query.from({ myTable }),
    [myTable],
  );
  return { items: data ?? [], isLoading };
}
```

## Reading & Writing Synced Data

Component-level patterns (useLiveQuery, collection.update, mutation decision) live in [data-fetching.md](data-fetching.md).

## Electric Proxy (apps/electric-proxy)

The proxy sits between the client and Electric:

- Validates auth tokens via RPC to the API
- Validates requested tables against an allowlist
- Injects `organization_id = ?` WHERE clauses for tenant isolation
- Handles CORS for browser clients

## Collection Factory & Runtime

```typescript
import { createOrgCollection } from '@comcom/sync/create-org-collection';

const apiKeyCollection = createOrgCollection<ApiKey>(
  organizationId,
  options,
  {
    table: 'api_key',
    collectionId: 'apiKeys',
    getKey: (row) => row.id,
    onUpdate: ({ original, changes }) =>
      apiClient.apiKeys.update(original.id, changes),
    onDelete: (key, _original) => apiClient.apiKeys.delete(key),
  }
);
```

- Creates Electric Shape subscriptions scoped to an organization
- Mutation handlers call the API client (writes go through the API, not directly to Postgres)
- TanStack DB preserves optimistic state until Electric streams the server-confirmed row back

`onUpdate` receives an `OrgCollectionMutationContext<T>` with `{ original, changes }`. `onDelete` receives `(key: string, original: T)`. The handlers call the API — the sync layer waits for Electric to confirm the write came back through the stream.

**Runtime** caches collections per `(userId, organizationId)` scope — same instance on repeat calls:

```typescript
const runtime = createCoreCollectionsRuntime({ shapeUrl, fetchClient });
const scope = { userId, organizationId };
const collections = runtime.getCollections(scope);
await runtime.whenHydrated(scope);
```

`whenHydrated` is the first-paint gate. It waits for persisted
SQLite/OPFS rows to hydrate into TanStack DB when available, then lets
Electric continue in the background. Electric stream errors are reported
through `onSyncError` and `useSyncStatus().lastStreamError`; they
must not block warm-cache render. `lastStreamError` is the last
observed stream problem, not an active connection state; it clears on
manual retry, scope change, or unmount.

Core collections: `organizations`, `connections`, `integrationConnections`, `credentials`, `identityLinks`, `accessTokens`, `sessions`, `sessionPullRequests`, `machines`, `automations`, `skills`, `members`, `invitations`, `users`, `secrets`, `userSettings`.

## Provider Setup

Boot/teardown is owned by `SyncLifecycle` (vanilla module-level state machine), not the React provider. A small bridge mirrors the auth session into `lifecycle.setActiveScope`; `<CollectionsProvider>` is a thin reader.

```typescript
// apps/<app>/src/lib/sync/collections.ts
export const collectionsRuntime = createCoreCollectionsRuntime({ … });
export const syncLifecycle = createSyncLifecycle({
  runtime: collectionsRuntime,
  onUserChange: (prev) => { if (prev) clearPersistence().catch(() => {}); },
});
```

```tsx
// At the app root, above any auth gate:
<SyncLifecycleBridge />

// Inside the auth-gated route:
<SyncStatusProvider lifecycle={syncLifecycle}>
  <SyncErrorToast />                 {/* OK to render during suspense */}
  <Suspense fallback={<SyncLoadingScreen />}>
    <CollectionsProvider lifecycle={syncLifecycle} runtime={collectionsRuntime}>
      {children}
    </CollectionsProvider>
  </Suspense>
</SyncStatusProvider>
```

- `<SyncStatusProvider>` is non-suspending and exposes `useSyncStatus()` (`status`, `error`, `lastStreamError`, `retry`) — mount it above the suspense boundary so non-blocking error UI can render alongside the loading fallback.
- `<CollectionsProvider>` suspends on `snapshot.ready`; `useCollections()` must be called inside it.
- The bridge must use `useSession` (not `useAuthedSession`) and live above the auth gate so it can mirror the sign-out edge.
- Disposal of orphaned collections is delegated to TanStack DB's auto-GC; never call `collection.cleanup()` from app code.

## Column Mapping

`snakeCamelMapper()` from `@electric-sql/client` automatically converts snake_case DB columns to camelCase TypeScript properties. Synced data uses `item.createdAt` despite the DB column being `created_at`.

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Shape** | A subset of a table streamed from Electric |
| **Collection** | A client-side representation of a shape with mutation handlers |
| **Sync confirmation** | Waiting for a write to be reflected back through the sync stream |
| **Column mapping** | Postgres snake_case columns are mapped to camelCase on the client |

## Key Files

- `packages/comcom/sync/src/tables.ts` — syncTablesConfig (source of truth for sync decision)
- `packages/comcom/sync/src/create-org-collection.ts` — collection factory
- `packages/comcom/sync/src/core-collections.ts` — runtime + mutation handlers
- `packages/comcom/sync/src/collections-provider.tsx` — SyncStatusProvider + CollectionsProvider + useSyncStatus + useCollections
- `packages/comcom/sync/src/sync-lifecycle.ts` — SyncLifecycle state machine (boot/teardown, scope management)
- `packages/comcom/sync/src/connection-handlers.ts` — mutation handlers for connection-related collections
- `packages/comcom/sync/src/mcp-tool-policy.ts` — MCP tool policy sync collection
