"use client";

import { toast } from "sonner";

/**
 * Derives a human-readable message from an unknown thrown value.
 *
 * @param error - Any caught value: string, Error-like object, or arbitrary value.
 * @returns The string itself, its `message`, a JSON dump, or a generic fallback.
 */
export function toErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  const hasMessage =
    error && typeof (error as { message?: unknown }).message === "string";
  if (hasMessage) {
    return (error as { message: string }).message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "Something went wrong";
  }
}

/**
 * Surfaces an unknown error to the user as an error toast.
 *
 * @param error - Any caught value to display.
 */
export function handleError(error: unknown) {
  toast.error(toErrorMessage(error));
}
