# Dialogs

HybridDialog and HybridAlertDialog patterns for create, edit, delete, and confirmation flows.

## When to Use Which

| Component | Use for | Example |
|-----------|---------|---------|
| `HybridDialog` | Multi-field content, forms, multi-step flows | Create API key, edit profile |
| `HybridAlertDialog` | Simple destructive yes/no confirmation | Delete API key, remove member |

Both are responsive — Dialog on desktop, Drawer on mobile.

## HybridDialog Anatomy

```tsx
<HybridDialog open={open} onOpenChange={handleOpenChange}>
  <HybridDialogContent>
    <HybridDialogHeader>
      <HybridDialogTitle>Create API Key</HybridDialogTitle>
      <HybridDialogDescription>Generate a new key for API access.</HybridDialogDescription>
    </HybridDialogHeader>
    <HybridDialogBody>
      {/* scrollable region */}
    </HybridDialogBody>
    <HybridDialogFooter>
      <HybridDialogClose render={<Button variant="outline" />}>Cancel</HybridDialogClose>
      <Button disabled={isPending} form="create-form" type="submit">
        {isPending && <Spinner />}
        Create
      </Button>
    </HybridDialogFooter>
  </HybridDialogContent>
</HybridDialog>
```

### Why Body is required

`HybridDialogContent` is a `flex flex-col overflow-hidden` container with a bounded height (`max-h-[min(85dvh,640px)]` on desktop, `80vh` on mobile drawer). `HybridDialogBody` is `flex-1 min-h-0 overflow-y-auto` — it claims the remaining space and provides the scroll region.

If you put plain `<div>`s directly between Header and Footer instead of using Body, those divs grow to their natural size and can push the footer past the clip boundary (no scroll, clipped buttons). Always wrap mid-content in `HybridDialogBody`.

Header (`shrink-0`) and Footer (`shrink-0 border-t bg-muted/50 + safe-area bottom`) stay pinned. Footer buttons render primary-on-top on mobile and right-aligned on desktop — don't re-order with custom flex classes unless you have a reason.

## HybridAlertDialog Anatomy

Simpler — no Body, just Header + Footer:

```tsx
<HybridAlertDialog open={open} onOpenChange={onOpenChange}>
  <HybridAlertDialogContent>
    <HybridAlertDialogHeader>
      <HybridAlertDialogTitle>Delete API Key?</HybridAlertDialogTitle>
      <HybridAlertDialogDescription>
        This action cannot be undone. The key will be permanently deleted.
      </HybridAlertDialogDescription>
    </HybridAlertDialogHeader>
    <HybridAlertDialogFooter>
      <HybridAlertDialogCancel>Cancel</HybridAlertDialogCancel>
      <HybridAlertDialogAction onClick={handleDelete} variant="destructive">
        {isPending && <Spinner />}
        Delete
      </HybridAlertDialogAction>
    </HybridAlertDialogFooter>
  </HybridAlertDialogContent>
</HybridAlertDialog>
```

## Trigger Patterns

### Child trigger (dialog owns the trigger)

```tsx
<ApiKeyCreateDialog>
  <Button><PlusIcon /> Create API Key</Button>
</ApiKeyCreateDialog>

function ApiKeyCreateDialog({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <HybridDialog open={open} onOpenChange={setOpen}>
      {children && <HybridDialogTrigger render={children} />}
      <HybridDialogContent>...</HybridDialogContent>
    </HybridDialog>
  );
}
```

### Controlled externally (parent owns state)

```tsx
const [deleteOpen, setDeleteOpen] = useState(false);

<DropdownMenuItem onClick={() => setDeleteOpen(true)}>Delete</DropdownMenuItem>
<DeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} itemId={item.id} />
```

## Programmatic Close

Use a hidden `HybridDialogClose` with a ref:

```tsx
// Example: multi-step create flow
const closeRef = useRef<HTMLButtonElement>(null);

<HybridDialogClose className="hidden" ref={closeRef} />

closeRef.current?.click();
```

## Reset on Close

Reset form and mutation state when the dialog closes. Use `setTimeout` to let the close animation finish:

```tsx
function handleOpenChange(open: boolean) {
  if (!open) {
    setTimeout(() => {
      form.reset();
      mutation.reset();
      setStep('create');
    }, 300);
  }
  props.onOpenChange?.(open);
}
```

## Form-in-Dialog

The form `<form>` element goes inside `HybridDialogBody`. The submit button goes in `HybridDialogFooter`, linked by `form="id"`:

```tsx
<HybridDialogBody>
  <Form {...form}>
    <form id="api-key-create-form" className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <FormField ... />
    </form>
  </Form>
</HybridDialogBody>
<HybridDialogFooter>
  <HybridDialogClose render={<Button variant="outline" />}>Cancel</HybridDialogClose>
  <Button disabled={isPending} form="api-key-create-form" type="submit">
    {isPending && <Spinner />}
    Create
  </Button>
</HybridDialogFooter>
```

For field composition details, see [forms.md](forms.md).

## Create Dialog Pattern

Keep the dialog open until success. Show spinner during mutation:

```tsx
const mutation = useApiKeyCreate();

async function onSubmit(values: FormValues) {
  const result = await mutation.mutateAsync(values);
  setCreatedKey(result);
  // OR: closeRef.current?.click();
}
```

## Delete / Destructive Dialog Pattern

Use optimistic collection mutation. Close immediately:

```tsx
function handleDelete() {
  archive(itemId);
  onOpenChange(false);
}
```

Or with a backend-backed mutation helper:

```tsx
const mutation = useRemoveMember();

function handleDelete() {
  mutation.mutate({ memberId }, {
    onSuccess: () => onOpenChange(false),
  });
}
```

## Multi-Step Dialog

Conditional rendering within `HybridDialogContent`:

```tsx
// Example: multi-step create flow
<HybridDialogContent>
  {step === 'create' ? (
    <>
      <HybridDialogHeader>
        <HybridDialogTitle>Create API Key</HybridDialogTitle>
      </HybridDialogHeader>
      <HybridDialogBody>{/* create form */}</HybridDialogBody>
      <HybridDialogFooter>{/* create + cancel buttons */}</HybridDialogFooter>
    </>
  ) : (
    <>
      <HybridDialogHeader>
        <HybridDialogTitle>API Key Created</HybridDialogTitle>
      </HybridDialogHeader>
      <HybridDialogBody>{/* reveal key */}</HybridDialogBody>
      <HybridDialogFooter>{/* done button */}</HybridDialogFooter>
    </>
  )}
</HybridDialogContent>
```

## Dialog-from-Dropdown

State lives in the row component. Dialog renders as a sibling to the dropdown:

```tsx
// Example: row component with dialog-from-dropdown pattern
function ApiKeyRow({ apiKey }: { apiKey: ApiKey }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <TableRow>
      <TableCell>...</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
            <MoreHorizontalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <PencilIcon /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setDeleteOpen(true)} variant="destructive">
              <Trash2Icon /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* dialogs as siblings, NOT inside the dropdown */}
        <ApiKeyEditDialog open={editOpen} onOpenChange={setEditOpen} apiKey={apiKey} />
        <ApiKeyDeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} apiKeyId={apiKey.id} />
      </TableCell>
    </TableRow>
  );
}
```

## Key Files

- `apps/web/src/design-system/components/ui/hybrid-dialog.tsx` — HybridDialog component
- `apps/web/src/design-system/components/ui/hybrid-alert-dialog.tsx` — HybridAlertDialog
- `apps/web/src/components/inbox/` — approval and action confirmation surfaces
