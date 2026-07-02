# Mobile / Expo Patterns

Patterns for `apps/mobile` — Expo 55 + React Native with Expo Router.

## Stack

- **Expo 55** with dev client
- **Expo Router** for file-based navigation
- **Uniwind** for Tailwind-like styling on React Native
- **React Native Primitives** (`@rn-primitives/*`) for accessible components
- **Electric SQL** via `@comcom/sync` for real-time data
- **PostHog React Native** for analytics
- **Better Auth Expo** for authentication

## Root Layout

```tsx
export function RootLayout() {
  const { data: session, isPending } = useSession();
  const colorScheme = useColorScheme() ?? 'dark';

  useEffect(() => {
    Uniwind.setTheme(colorScheme);
  }, [colorScheme]);

  return (
    <QueryClientProvider client={queryClient}>
      <PostHogProvider>
        <ThemeProvider value={NAV_THEME[colorScheme]}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={!!session}>
              <Stack.Screen name="(authenticated)" />
            </Stack.Protected>
            <Stack.Protected guard={!session}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
          </Stack>
          <PortalHost />
        </ThemeProvider>
      </PostHogProvider>
    </QueryClientProvider>
  );
}
```

Key patterns:
- **Auth guards** via `Stack.Protected` — separate route groups for authenticated vs unauthenticated
- **Theme sync** via `Uniwind.setTheme()` — reactive to system color scheme
- **PortalHost** from rn-primitives for modals/sheets

## Provider Order

```
QueryClientProvider → PostHogProvider → ThemeProvider → Stack (Expo Router)
```

## Navigation

File-based via Expo Router:

```
app/
  _layout.tsx          Root layout (providers, auth guard)
  (auth)/
    _layout.tsx        Auth flow layout
    sign-in.tsx
  (authenticated)/
    _layout.tsx        Tab navigator
    (tabs)/
      index.tsx        Home tab
      settings.tsx     Settings tab
```

Route files are thin — delegate to `screens/` for actual UI:

```tsx
// app/(authenticated)/(tabs)/index.tsx
export default function HomeScreen() {
  return <HomeScreenContent />;
}
```

## Styling

Uniwind (Tailwind for React Native):

```tsx
<View className="flex-1 items-center justify-center bg-background">
  <Text className="text-foreground text-lg font-semibold">Hello</Text>
</View>
```

Theme tokens (`bg-background`, `text-foreground`) match the web design system.

## Auth Integration

Uses Better Auth's Expo plugin with SecureStore for token persistence:

```tsx
import { authClient } from '@platform/auth/client';
// Expo client configured with expoClient plugin
```

## Real-Time Data

Uses `@comcom/sync` collections (same as web):

```tsx
const { data } = useLiveQuery(
  collection.query.where('organizationId', '=', orgId)
);
```

## Platform-Specific Code

Use Expo's platform detection:

```tsx
import { Platform } from 'react-native';

if (Platform.OS === 'ios') { ... }
if (Platform.OS === 'android') { ... }
```

## Differences from Web App

| Aspect | Web (`apps/app`) | Mobile (`apps/mobile`) |
|--------|------------------|----------------------|
| Router | TanStack Router | Expo Router |
| Styling | Tailwind CSS | Uniwind |
| Components | shadcn/ui | @rn-primitives |
| Auth guard | Router middleware | Stack.Protected |
| Portals | Radix Portal | rn-primitives PortalHost |
