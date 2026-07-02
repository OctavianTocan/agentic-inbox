import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class values into a deduplicated, Tailwind-aware className string. */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));

/** Uppercase the first character of a string. */
export const capitalize = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1);
