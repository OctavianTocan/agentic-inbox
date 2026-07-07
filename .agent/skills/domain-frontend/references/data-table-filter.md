# Data Table Filter

Patterns for filtering finite tables and dense lists in the current Next.js inbox app.

## When to Use

| Approach | Use for |
| --- | --- |
| Tabs + search input | One-dimensional status/category filter plus free-text search |
| `DataTableFilter` | Multi-dimensional faceted filters over a table/list |
| Local component state | Review workflow state that does not need a shareable URL |
| Next search params | State a reviewer should be able to bookmark or send |

## Imports

Deep-import app-local design-system filter primitives:

```tsx
import { DataTableFilter } from '@/design-system/components/ui/data-table-filter/components/data-table-filter';
import { useDataTableFilters } from '@/design-system/components/ui/data-table-filter/hooks/use-data-table-filters';
import { createColumnConfigHelper } from '@/design-system/components/ui/data-table-filter/core/filters';
import { CircleDotIcon, UserIcon } from '@/design-system/components/icons';
```

## Builder API

Define columns once with `createColumnConfigHelper<TRow>()`, then consume via `useDataTableFilters`. Co-locate configs under the owning product folder, for example `apps/web/src/components/inbox/filter-columns.ts`.

```tsx
export type EmailRow = {
  id: string;
  subject: string;
  status: 'needs_attention' | 'auto_handled' | 'pending_approval';
  owner: string;
};

const dtf = createColumnConfigHelper<EmailRow>();

export const emailFilterColumns = [
  dtf.text().id('search').accessor((row) => row.subject).displayName('Search').build(),
  dtf
    .option()
    .id('status')
    .accessor((row) => row.status)
    .displayName('Status')
    .icon(CircleDotIcon)
    .options([
      { value: 'needs_attention', label: 'Needs attention' },
      { value: 'auto_handled', label: 'Auto-handled' },
      { value: 'pending_approval', label: 'Pending approval' },
    ])
    .build(),
] as const;
```

## URL Persistence

Default to local state for inbox triage/review panel state. Use Next route/search params only when the state is intentionally shareable.

```tsx
import { useRouter, useSearchParams } from 'next/navigation';

const router = useRouter();
const searchParams = useSearchParams();
const query = searchParams.get('q') ?? '';
```

Avoid serializing nested filter arrays into query strings unless the route has a tested parser/serializer. Primitive `q`, `tab`, `status`, `page`, and `emailId` params are safe.

## Conventions

- One filter bar per view.
- Keep filter config next to the product list/table it filters.
- Use `strategy: 'client'` for the fixed 80-email dataset and other finite arrays.
- Use `strategy: 'server'` only when the backend owns pagination/filtering.

## Key Files

- `apps/web/src/design-system/components/ui/data-table-filter/` — faceted filter primitives
- `apps/web/src/design-system/components/ui/data-table/` — DataTable primitives
- `apps/web/src/components/inbox/inbox-list.tsx` — current finite inbox list/filter surface
