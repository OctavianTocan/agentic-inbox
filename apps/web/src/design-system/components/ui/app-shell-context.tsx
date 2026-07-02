"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { createContext, use } from "react";

/** Max-width cva for the shell page container. */
export const maxWidthVariants = cva("mx-auto w-full", {
  variants: {
    maxWidth: {
      default: "max-w-7xl",
      narrow: "max-w-3xl",
      "2xl": "max-w-2xl",
      full: "",
    },
  },
  defaultVariants: {
    maxWidth: "default",
  },
});

/** Content area cva combining max-width and layout presets. */
export const appShellContentVariants = cva("mx-auto w-full px-4 py-3", {
  variants: {
    maxWidth: {
      default: "max-w-7xl",
      narrow: "max-w-3xl",
      "2xl": "max-w-2xl",
      full: "",
    },
    layout: {
      default: "",
      settings: "space-y-12 py-10 pl-4",
      detail: "space-y-12 py-8",
    },
  },
  defaultVariants: {
    maxWidth: "default",
    layout: "default",
  },
});

type MaxWidthValue = NonNullable<
  VariantProps<typeof maxWidthVariants>["maxWidth"]
>;

/** Context propagating the page-level maxWidth from AppShell to children. */
export const AppShellMaxWidthContext = createContext<MaxWidthValue | null>(
  null,
);

/**
 * Reads the page-level maxWidth from the nearest AppShell.
 *
 * @returns The inherited maxWidth, or null when no AppShell ancestor set one.
 */
export function useAppShellMaxWidth(): MaxWidthValue | null {
  return use(AppShellMaxWidthContext);
}
