# Forms

Schema-validated form patterns using react-hook-form + zod.

## Stack

All form primitives from a single import:

```tsx
import {
  Form, FormControl, FormDescription, FormField,
  FormItem, FormLabel, FormMessage,
  useForm, zodResolver,
} from '@/design-system/components/ui/form';
```

## Schema as Source of Truth

Define a zod schema. Derive types from it — never define form types manually:

```tsx
const schema = z.object({
  name: z.string().min(1, 'Required').max(120),
  email: z.string().email('Invalid email'),
});

type FormValues = z.infer<typeof schema>;
```

## Component Tree

```
Form (= FormProvider)
  └── <form id="..." onSubmit={form.handleSubmit(onSubmit)}>
        └── FormField (Controller wrapper)
              └── FormItem (container)
                    ├── FormLabel
                    ├── FormControl (ARIA wiring via Base UI useRender)
                    │     └── <Input /> or other control
                    ├── FormDescription (optional)
                    └── FormMessage (auto-renders zod error)
```

```tsx
const form = useForm<FormValues>({
  resolver: zodResolver(schema),
  defaultValues: { name: '', email: '' },
});

<Form {...form}>
  <form id="my-form" onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Name</FormLabel>
          <FormControl><Input {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </form>
</Form>
```

## Non-Input Controls in FormField

Different controls wire to `field` differently:

```tsx
<FormControl>
  <Select value={field.value} onValueChange={field.onChange}>
    <SelectTrigger><SelectValue placeholder="Choose..." /></SelectTrigger>
    <SelectContent>
      <SelectItem value="a">Option A</SelectItem>
    </SelectContent>
  </Select>
</FormControl>

<FormControl>
  <Switch checked={field.value} onCheckedChange={field.onChange} />
</FormControl>

<FormControl>
  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
</FormControl>
```

## Standalone Form (Page-Level)

Submit button is external, linked by `form="id"`:

```tsx
<SettingsCard>
  <SettingsCardContent>
    <MyForm /> {/* contains <form id="profile-form"> */}
  </SettingsCardContent>
  <SettingsCardFooter>
    <Button
      disabled={!form.formState.isDirty || form.formState.isSubmitting}
      form="profile-form"
      type="submit"
    >
      {form.formState.isSubmitting && <Spinner />}
      Save
    </Button>
  </SettingsCardFooter>
</SettingsCard>
```

## Submission

Mutation inside `onSubmit`:

```tsx
async function onSubmit(values: FormValues) {
  await mutation.mutateAsync(values);
  toast.success('Saved');
}
```

## Reset After Server Data

When defaults come from async data:

```tsx
useEffect(() => {
  if (serverData) {
    form.reset({ name: serverData.name, email: serverData.email });
  }
}, [serverData, form]);
```

## Unsaved Changes Guard

```tsx
useEffect(() => {
  const handler = (e: BeforeUnloadEvent) => {
    if (form.formState.isDirty) e.preventDefault();
  };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}, [form.formState.isDirty]);
```

## Async Validation (e.g. Slug Uniqueness)

```tsx
<Input
  {...field}
  onBlur={async () => {
    field.onBlur();
    const exists = await checkSlugExists(form.getValues('slug'));
    if (exists) form.setError('slug', { message: 'Already taken' });
    else form.clearErrors('slug');
  }}
/>
```

## Custom onChange (Input Normalization)

Override `onChange` to normalize input, then call `field.onChange` with the result:

```tsx
<Input
  {...field}
  onChange={(e) => {
    const normalized = normalize(e.target.value);
    field.onChange(normalized);
  }}
/>
```

## InputGroup (Prefix/Suffix)

```tsx
<FormControl>
  <InputGroup>
    <InputGroupText>https://app.example.com/</InputGroupText>
    <InputGroupInput placeholder="my-org" {...field} />
  </InputGroup>
</FormControl>
```

## Form-in-Dialog

For form wiring inside dialogs (form id, submit button in footer, reset on close), see [dialogs.md](dialogs.md).

## Key Files

- `apps/web/src/design-system/components/ui/form.tsx` — Form primitives + re-exports
- `apps/web/src/components/inbox/` — product forms and approval editing surfaces
- `apps/web/src/components/audit/` — audit route forms and panel controls
