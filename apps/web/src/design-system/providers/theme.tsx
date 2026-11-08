import type { ThemeProviderProps } from "next-themes";
import { ThemeProvider as NextThemeProvider } from "next-themes";

export { useTheme } from "next-themes";

/** Configures next-themes with the design-system defaults (class attribute, system default). */
export const ThemeProvider = ({
  children,
  ...properties
}: ThemeProviderProps) => (
  <NextThemeProvider
    attribute="class"
    defaultTheme="system"
    disableTransitionOnChange
    enableSystem
    {...properties}
  >
    {children}
  </NextThemeProvider>
);
