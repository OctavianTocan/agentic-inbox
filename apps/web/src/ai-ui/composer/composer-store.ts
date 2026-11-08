"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Attachment } from "../types";

/**
 * How long a persisted draft survives without an edit. Drafts older than this
 * are dropped, so an abandoned session's draft does not linger indefinitely.
 */
export const COMPOSER_DRAFT_TTL_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Persisted portion of a composer instance. `updatedAt` records the last edit
 * time so stale drafts can be expired against {@link COMPOSER_DRAFT_TTL_MS}.
 */
export type ComposerDraft = {
  text: string;
  attachments: readonly Attachment[];
  updatedAt: number;
};

/** Ephemeral runtime state; memory-only, resets on page reload. */
export type ComposerRuntime = {
  isFocused: boolean;
  isSubmitting: boolean;
  autoFocusOnKeyPress: boolean;
};

const EMPTY_DRAFT: ComposerDraft = {
  text: "",
  attachments: [],
  updatedAt: 0,
};

const EMPTY_RUNTIME: ComposerRuntime = {
  isFocused: false,
  isSubmitting: false,
  autoFocusOnKeyPress: true,
};

type ComposerStoreState = {
  composers: Record<string, ComposerDraft>;
  runtime: Record<string, ComposerRuntime>;
  focusTokens: Record<string, number>;
};

type ComposerStoreActions = {
  setText(id: string, text: string): void;
  setAttachments(id: string, attachments: readonly Attachment[]): void;
  addAttachment(id: string, attachment: Attachment): void;
  updateAttachment(
    id: string,
    attachmentId: string,
    patch: Partial<Omit<Attachment, "id">>,
  ): void;
  removeAttachment(id: string, attachmentId: string): void;
  /** Removes only the listed attachments, leaving any others in the draft. */
  removeAttachments(id: string, attachmentIds: readonly string[]): void;
  clearAttachments(id: string): void;
  setFocused(id: string, focused: boolean): void;
  setSubmitting(id: string, submitting: boolean): void;
  setAutoFocusOnKeyPress(id: string, enabled: boolean): void;
  requestFocus(id: string): void;
  /** Wipes draft, runtime, and focus token for `id`. */
  clear(id: string): void;
};

export type ComposerStore = ComposerStoreState & ComposerStoreActions;

/** Merges a patch into a draft and stamps `updatedAt` with the current time. */
function bumpDraft(
  existing: ComposerDraft | undefined,
  patch: Partial<Pick<ComposerDraft, "text" | "attachments">>,
): ComposerDraft {
  const base = existing ?? EMPTY_DRAFT;
  return {
    text: patch.text ?? base.text,
    attachments: patch.attachments ?? base.attachments,
    updatedAt: Date.now(),
  };
}

/** Returns only the drafts whose `updatedAt` is within the TTL window. */
function sweepStaleDrafts(
  composers: Record<string, ComposerDraft>,
): Record<string, ComposerDraft> {
  const cutoff = Date.now() - COMPOSER_DRAFT_TTL_MS;
  const result: Record<string, ComposerDraft> = {};
  for (const [id, draft] of Object.entries(composers)) {
    if (draft.updatedAt >= cutoff) {
      result[id] = draft;
    }
  }
  return result;
}

/**
 * Keep only persist-safe attachments (inline or ready) and trim their payloads.
 * Transient states must not be resurrected on reload; path-backed attachments
 * drop `content`/`preview` since the sandbox `path` is the source of truth.
 * Shared by the draft persistence here and the outbox's persisted queue.
 */
export function sanitizeAttachmentsForPersist(
  attachments: readonly Attachment[],
): readonly Attachment[] {
  const result: Attachment[] = [];
  for (const attachment of attachments) {
    const isKeepable =
      attachment.status === undefined || attachment.status.type === "ready";
    if (!isKeepable) {
      continue;
    }
    if (attachment.path === undefined) {
      result.push(attachment);
    } else {
      const { content: _content, preview: _preview, ...rest } = attachment;
      result.push(rest);
    }
  }
  return result;
}

/** Apply {@link sanitizeAttachmentsForPersist} to every draft. */
export function sanitizeDraftsForPersist(
  composers: Record<string, ComposerDraft>,
): Record<string, ComposerDraft> {
  const result: Record<string, ComposerDraft> = {};
  for (const [id, draft] of Object.entries(composers)) {
    result[id] = {
      ...draft,
      attachments: sanitizeAttachmentsForPersist(draft.attachments),
    };
  }
  return result;
}

/** Merges a patch into a runtime slice, defaulting absent fields. */
function patchRuntime(
  existing: ComposerRuntime | undefined,
  patch: Partial<ComposerRuntime>,
): ComposerRuntime {
  return { ...(existing ?? EMPTY_RUNTIME), ...patch };
}

/**
 * Source-of-truth store for every composer in the app, keyed by composer id.
 * `ComposerProvider` and external setters all read and write through it.
 * Drafts persist across reloads; runtime state does not.
 */
export const useComposerStore = create<ComposerStore>()(
  persist(
    (set) => ({
      composers: {},
      runtime: {},
      focusTokens: {},

      setText: (id, text) =>
        set((state) => ({
          composers: {
            ...state.composers,
            [id]: bumpDraft(state.composers[id], { text }),
          },
        })),

      setAttachments: (id, attachments) =>
        set((state) => ({
          composers: {
            ...state.composers,
            [id]: bumpDraft(state.composers[id], { attachments }),
          },
        })),

      addAttachment: (id, attachment) =>
        set((state) => {
          const current = state.composers[id]?.attachments ?? [];
          return {
            composers: {
              ...state.composers,
              [id]: bumpDraft(state.composers[id], {
                attachments: [...current, attachment],
              }),
            },
          };
        }),

      updateAttachment: (id, attachmentId, patch) =>
        set((state) => {
          const current = state.composers[id]?.attachments ?? [];
          return {
            composers: {
              ...state.composers,
              [id]: bumpDraft(state.composers[id], {
                attachments: current.map((a) =>
                  a.id === attachmentId ? { ...a, ...patch } : a,
                ),
              }),
            },
          };
        }),

      removeAttachments: (id, attachmentIds) =>
        set((state) => {
          const current = state.composers[id]?.attachments ?? [];
          const toRemove = new Set(attachmentIds);
          return {
            composers: {
              ...state.composers,
              [id]: bumpDraft(state.composers[id], {
                attachments: current.filter((a) => !toRemove.has(a.id)),
              }),
            },
          };
        }),

      removeAttachment: (id, attachmentId) =>
        set((state) => {
          const current = state.composers[id]?.attachments ?? [];
          return {
            composers: {
              ...state.composers,
              [id]: bumpDraft(state.composers[id], {
                attachments: current.filter((a) => a.id !== attachmentId),
              }),
            },
          };
        }),

      clearAttachments: (id) =>
        set((state) => ({
          composers: {
            ...state.composers,
            [id]: bumpDraft(state.composers[id], { attachments: [] }),
          },
        })),

      setFocused: (id, focused) =>
        set((state) => ({
          runtime: {
            ...state.runtime,
            [id]: patchRuntime(state.runtime[id], { isFocused: focused }),
          },
        })),

      setSubmitting: (id, submitting) =>
        set((state) => ({
          runtime: {
            ...state.runtime,
            [id]: patchRuntime(state.runtime[id], { isSubmitting: submitting }),
          },
        })),

      setAutoFocusOnKeyPress: (id, enabled) =>
        set((state) => ({
          runtime: {
            ...state.runtime,
            [id]: patchRuntime(state.runtime[id], {
              autoFocusOnKeyPress: enabled,
            }),
          },
        })),

      requestFocus: (id) =>
        set((state) => ({
          focusTokens: {
            ...state.focusTokens,
            [id]: (state.focusTokens[id] ?? 0) + 1,
          },
        })),

      clear: (id) =>
        set((state) => {
          const { [id]: _draftDropped, ...remainingComposers } =
            state.composers;
          const { [id]: _runtimeDropped, ...remainingRuntime } = state.runtime;
          const { [id]: _tokenDropped, ...remainingTokens } = state.focusTokens;
          return {
            composers: remainingComposers,
            runtime: remainingRuntime,
            focusTokens: remainingTokens,
          };
        }),
    }),
    {
      name: "composer-store:v1",
      // Sweep on every persist, not just on rehydrate: one key holds all
      // drafts, so a long-lived tab would otherwise grow it past the TTL.
      partialize: (state) => ({
        composers: sanitizeDraftsForPersist(sweepStaleDrafts(state.composers)),
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.composers = sanitizeDraftsForPersist(
            sweepStaleDrafts(state.composers),
          );
        }
      },
    },
  ),
);

/**
 * Reads the draft for `id`, returning a stable empty snapshot when nothing
 * is staged. Callers should select with this rather than `state.composers[id]`
 * directly so they don't have to handle undefined.
 *
 * @param state - Current store state to read from.
 * @param id - Composer id whose draft to return.
 * @returns The staged draft, or a shared empty draft when none exists.
 */
export function selectDraft(state: ComposerStore, id: string): ComposerDraft {
  return state.composers[id] ?? EMPTY_DRAFT;
}

/**
 * Reads the runtime slice for `id`, returning a stable empty snapshot when
 * nothing is staged.
 *
 * @param state - Current store state to read from.
 * @param id - Composer id whose runtime slice to return.
 * @returns The runtime slice, or a shared empty slice when none exists.
 */
export function selectRuntime(
  state: ComposerStore,
  id: string,
): ComposerRuntime {
  return state.runtime[id] ?? EMPTY_RUNTIME;
}
