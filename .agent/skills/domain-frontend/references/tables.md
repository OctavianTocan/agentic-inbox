# Tables

Table and data-list patterns — manual Table composition and DataTable (TanStack Table).

## When to Use Which

| Approach | Use for |
|----------|---------|
| Manual `Table` | Simple lists with known columns, no sorting/filtering |
| `DataTable` | Dynamic data needing sorting, filtering, pagination, selection |

## Manual Table

```tsx
<div className={/* rounded border container */}>
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Name</TableHead>
        <TableHead>Created</TableHead>
        <TableHead />
      </TableRow>
    </TableHeader>
    <TableBody>
      {items.map((item) => <ItemRow key={item.id} item={item} />)}
    </TableBody>
  </Table>
</div>
```

## DataTable

```tsx
import { DataTable } from '@/design-system/components/ui/data-table/data-table';

<DataTable
  columns={columns}
  data={data}
  toolbarComponent={DataTableToolbar}
  paginationComponent={DataTablePagination}
/>
```

## Column Definitions

```tsx
import type { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<Item>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <Badge>{row.original.status}</Badge>,
    meta: { filterVariant: 'select' },
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => <DataTableDateCell date={row.original.createdAt} />,
  },
];
```

## Cell Components

Pre-built cells in `@/design-system/components/ui/data-table/cells/`:

| Component | Use for |
|-----------|---------|
| `DataTableDateCell` | Dates (relative + hover for absolute) |
| `DataTableBooleanCell` | Boolean as icon or text |
| `DataTableCurrencyCell` | Formatted currency |
| `DataTableNumberCell` | Formatted numbers |
| `DataTableDurationCell` | Millisecond durations |
| `DataTableLinkCell` | Links with hover card |
| `DataTableTagsCell` | Badge list with overflow |

## Row Actions

Dropdown menu in the last column. For the dialog-from-dropdown pattern (state in parent row, dialog as sibling), see [dialogs.md](dialogs.md#dialog-from-dropdown).

```tsx
function ItemRow({ item }: { item: Item }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <TableRow>
      <TableCell>{item.name}</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Actions" />}>
            <MoreHorizontalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setDeleteOpen(true)} variant="destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <EditDialog open={editOpen} onOpenChange={setEditOpen} item={item} />
        <DeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} itemId={item.id} />
      </TableCell>
    </TableRow>
  );
}
```

## Skeleton Loading

Two approaches:

```tsx
import { DataTableSkeleton } from '@/design-system/components/ui/data-table/data-table-skeleton';
<DataTableSkeleton columnCount={4} rowCount={10} />

<div style={{ maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)' }}>
  <Table>{/* same structure, Skeleton in each cell */}</Table>
</div>
```

## Empty States

Use the `Empty` compound component — see [page-anatomy.md](page-anatomy.md#empty-states).

## Content State Branching

```tsx
function ItemsListContent() {
  const { items, isLoading } = useItems();
  if (isLoading) return <ItemsTableSkeleton />;
  if (items.length === 0) return <ItemsEmptyState />;
  return <ItemsTable items={items} />;
}
```

## Pagination

```tsx
<DataTable paginationComponent={DataTablePagination} ... />

<DataTable paginationComponent={DataTablePaginationSimple} ... />
```

## Key Files

- `apps/web/src/design-system/components/ui/data-table/data-table.tsx` — DataTable
- `apps/web/src/design-system/components/ui/data-table/data-table-skeleton.tsx` — skeleton
- `apps/web/src/design-system/components/ui/data-table/cells/` — pre-built cells
- `apps/web/src/design-system/components/ui/table.tsx` — manual Table primitives
