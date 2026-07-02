# Data Table Filter

Faceted filter bar (Linear-style chips) for tables and list views, built on bazza's `@bazza/ui` filter primitives.

Library docs: https://ui.bazza.dev/docs/filters

## When to Use

| Approach | Use for |
|----------|---------|
| Tabs + search input | One-dimensional filter (single status enum) plus free-text search |
| `DataTableFilter` | Multi-dimensional faceted filters (status AND owner AND date AND text), URL-persisted |

The faceted bar is the standard for new pages with two or more filter dimensions. For the simpler tabs+search precedent, see `packages/comcom/app-core/src/pages/automations/components/run-history-filter-bar.tsx`.

Default to URL-persisting filter state via TanStack Router's `validateSearch` and a page-local `useThingSearch()` hook. The Sessions settings page is the canonical precedent (`packages/comcom/app-core/src/pages/sessions-settings/`). Reach for `nuqs` only for primitive scalars (`q`, `page`, repeated string params) on routes you don't own; never for an array of objects — see [URL Persistence](#url-persistence) below for why.

## Setup

Install via the bazza shadcn registry (bun-first repo):

```bash
bunx shadcn@latest add https://ui.bazza.dev/r/filters
```

Dependencies and imports (already in the monorepo for most apps):

- TanStack Router `validateSearch` for route-owned URL-persisted state; `nuqs` only for primitive-scalar fallbacks when `validateSearch` is unavailable
- `zod` for the column config helper
- `@ui/design-system/components/icons` for icons used inside the filter chips; only the icon registry imports `lucide-react` directly

Deep-import each symbol from its source module (the package has no barrel, per the no-barrel-files rule):

```tsx
import { DataTableFilter } from '@ui/design-system/components/ui/data-table-filter/components/data-table-filter';
import { useDataTableFilters } from '@ui/design-system/components/ui/data-table-filter/hooks/use-data-table-filters';
import { createColumnConfigHelper } from '@ui/design-system/components/ui/data-table-filter/core/filters';
```

## Builder API

Define columns once with `createColumnConfigHelper<TRow>()`, then call the dimension builders: `dtf.text()`, `dtf.option()`, `dtf.multiOption()`, `dtf.number()`, `dtf.date()`. Co-locate the config in `pages/<area>/lib/filter-columns.ts` and freeze with `as const` so types stay narrow.

```tsx
// pages/sessions/lib/filter-columns.ts
import { createColumnConfigHelper } from '@ui/design-system/components/ui/data-table-filter/core/filters';
import { CircleDotIcon, UserIcon } from '@ui/design-system/components/icons';

export type SessionRow = {
  id: string;
  title: string;
  status: 'running' | 'completed' | 'error';
  ownerId: string;
  ownerName: string;
  createdAt: Date;
};

const dtf = createColumnConfigHelper<SessionRow>();

export const sessionFilterColumns = [
  dtf
    .text()
    .id('search')
    .accessor((row) => row.title)
    .displayName('Search')
    .build(),
  dtf
    .option()
    .id('status')
    .accessor((row) => row.status)
    .displayName('Status')
    .icon(CircleDotIcon)
    .options([
      { value: 'running', label: 'Running' },
      { value: 'completed', label: 'Completed' },
      { value: 'error', label: 'Error' },
    ])
    .build(),
  dtf
    .option()
    .id('owner')
    .accessor((row) => row.ownerId)
    .displayName('Owner')
    .icon(UserIcon)
    .build(),
  dtf
    .date()
    .id('createdAt')
    .accessor((row) => row.createdAt)
    .displayName('Created')
    .build(),
] as const;
```

Then consume in the page. The hook returns `{ columns, filters, actions, strategy }` and does NOT auto-filter the input array; the consumer applies the active `filters` to its own rows. Mirror the column-id switch from the live `sessions-settings-section.tsx`:

```tsx
// pages/sessions/sessions-page.tsx
import { DataTableFilter } from '@ui/design-system/components/ui/data-table-filter/components/data-table-filter';
import { useDataTableFilters } from '@ui/design-system/components/ui/data-table-filter/hooks/use-data-table-filters';
import {
  dateFilterFn,
  optionFilterFn,
  textFilterFn,
} from '@ui/design-system/components/ui/data-table-filter/lib/filter-fns';
import type { FilterModel } from '@ui/design-system/components/ui/data-table-filter/core/types';
import { useMemo } from 'react';
import { sessionFilterColumns, type SessionRow } from './lib/filter-columns';

function rowMatchesFilter(row: SessionRow, filter: FilterModel): boolean {
  switch (filter.columnId) {
    case 'search':
      return filter.type === 'text' ? textFilterFn(row.title, filter) : true;
    case 'status':
      return filter.type === 'option' ? optionFilterFn(row.status, filter) : true;
    case 'owner':
      return filter.type === 'option' ? optionFilterFn(row.ownerId, filter) : true;
    case 'createdAt':
      return filter.type === 'date' ? dateFilterFn(row.createdAt, filter) : true;
    default:
      return true;
  }
}

export function SessionsPage() {
  const sessions = useSessions();

  const { columns, filters, actions, strategy } = useDataTableFilters({
    strategy: 'client',
    data: sessions,
    columnsConfig: sessionFilterColumns,
  });

  const filteredData = useMemo(
    () => sessions.filter((row) => filters.every((f) => rowMatchesFilter(row, f))),
    [sessions, filters]
  );

  return (
    <div className="flex flex-col gap-4">
      <DataTableFilter
        actions={actions}
        columns={columns}
        filters={filters}
        strategy={strategy}
      />
      <SessionsTable rows={filteredData} />
    </div>
  );
}
```

## URL Persistence

Use TanStack Router's `validateSearch` for the route, then encapsulate read/write in a page-local `useThingSearch()` hook so the page consumes one typed surface. The hook returns the typed search snapshot plus stable setters — including a `Dispatch<SetStateAction<FiltersState>>` shaped `setFilters` that drops straight into `useDataTableFilters`'s `onFiltersChange`.

```ts
// pages/<area>/lib/filter-schema.ts
import { z } from 'zod';
import { filterStateSchema } from '...'; // your discriminated-union filter schema

export const thingSearchSchema = z.object({
  q: z.string().catch('').default(''),
  page: z.number().int().min(1).catch(1).default(1),
  filters: filterStateSchema.catch([]).default([]),
});
```

```ts
// routes/route-tree.tsx
const thingRoute = createRoute({
  getParentRoute: () => orgRoute,
  path: '/things',
  component: ThingPage,
  validateSearch: thingSearchSchema,
});
```

```ts
// pages/<area>/hooks/use-thing-search.ts
import { getRouteApi } from '@tanstack/react-router';

const route = getRouteApi('/_authed/_app/~/$orgSlug/things');

export function useThingSearch() {
  const { q, page, filters } = route.useSearch();
  const navigate = route.useNavigate();

  const filtersRef = useRef(filters);
  useEffect(() => { filtersRef.current = filters; }, [filters]);

  const setFilters = useCallback<Dispatch<SetStateAction<FiltersState>>>(
    (next) => {
      const prev = filtersRef.current;
      const resolved = typeof next === 'function' ? next(prev) : next;
      const changed = JSON.stringify(resolved) !== JSON.stringify(prev);
      navigate({
        search: (s) => ({ ...s, filters: resolved, ...(changed ? { page: 1 } : {}) }),
        replace: true,
      });
    },
    [navigate],
  );

  // setQ / setPage are analogous; setQ resets page atomically.
  return { q, page, filters, setQ, setPage, setFilters };
}
```

The page just calls the hook and forwards `setFilters` as `onFiltersChange`. The `filters` array is the canonical serialization; do not split chips across multiple URL params. Reference: `packages/comcom/app-core/src/pages/sessions-settings/`.

### Why not nuqs for the filter array?

TanStack Router's `defaultParseSearch` calls `JSON.parse` on every search-param value. The nuqs adapter then reads that parsed value back from `state.search` and feeds it into a fresh `URLSearchParams`. For primitives this works; for an array of objects the array gets spread into the params, which coerce each object to the literal string `"[object Object]"` via `String()`. The next read hands that bogus string to your parser, parsing fails, and the filter chip silently collapses to default. Native `validateSearch` skips the `URLSearchParams` round-trip entirely — the router serializes/deserializes the search object directly, so nested shapes round-trip cleanly.

### When to use nuqs

Strings (`parseAsString`), numbers (`parseAsInteger`), or repeated string params (`parseAsArrayOf(parseAsString)`) — i.e. anything `URLSearchParams` can hold without coercion. Use it for routes where you don't control `validateSearch` (third-party route tree, static generation pages without TanStack Router). Never for an array of objects or any value with nested structure.

## Pairing With Table Grammars

The filter is layout-agnostic; render whatever the page already uses below it.

| Table grammar | Wiring |
|---------------|--------|
| CSS-Grid Members-style table | Filter the array before rendering rows: pass `filteredData` from the hook into the existing `.map()` |
| Design-system `DataTable` (TanStack) | Use the TanStack adapter: `createTSTColumns` and `createTSTFilters` from the bazza package, then forward to `DataTable` |

For the design-system `DataTable` setup (column defs, cells, skeletons), see [tables.md](tables.md).

## Conventions

- Co-locate column configs in `pages/<area>/lib/filter-columns.ts`; export the typed `Row` alongside.
- Freeze configs with `as const` so the builder's literal types survive.
- Use `strategy: 'client'` when an in-memory array is the source of truth (Electric-synced collections, finite lists).
- Use `strategy: 'server'` for paginated APIs; the hook then emits the active filters and the page is responsible for sending them with the request.
- Wire filter state through TanStack Router `validateSearch` by default; reach for `nuqs` only for primitive scalars on routes you don't own (see [Why not nuqs](#why-not-nuqs-for-the-filter-array)).
- One `DataTableFilter` per view. If you find yourself adding a second, split the page or rethink the columns.

## Key Files

- `packages/ui/design-system/src/components/ui/data-table-filter/` -- bazza filter primitives + `useDataTableFilters`
- `packages/comcom/app-core/src/pages/automations/components/run-history-filter-bar.tsx` -- single-dim tabs+search precedent
- `packages/comcom/app-core/src/pages/sessions-settings/` -- canonical TanStack Router `validateSearch` + page-local hook precedent
- `packages/comcom/app-core/src/pages/automations/runs-page.tsx` -- nuqs precedent for primitive scalars (status array + search string)
