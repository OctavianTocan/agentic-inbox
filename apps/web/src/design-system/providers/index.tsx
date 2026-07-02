import type { ThemeProviderProps } from "next-themes";
import { Toaster } from "../components/ui/sonner";
import { TooltipProvider } from "../components/ui/tooltip";
import { MotionProvider } from "./motion";
import { HotkeysProvider, ModifierHeldProvider } from "./shortcuts";
import { ThemeProvider } from "./theme";
import { ThemeToggleShortcut } from "./theme-toggle-shortcut";

type DesignSystemProviderProperties = ThemeProviderProps;

/** Wraps an app in the design-system theme, motion, shortcut, and tooltip providers. */
export const DesignSystemProvider = ({
  children,
  ...properties
}: DesignSystemProviderProperties) => (
  <ThemeProvider {...properties}>
    <MotionProvider>
      <HotkeysProvider>
        <ThemeToggleShortcut />
        <ModifierHeldProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ModifierHeldProvider>
      </HotkeysProvider>
      <Toaster />
    </MotionProvider>
  </ThemeProvider>
);
