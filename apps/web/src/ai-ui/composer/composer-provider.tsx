"use client";

import {
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import type {
  Attachment,
  AttachmentAdapter,
  ComposerStatus,
  CreateMessage,
  ThreadStatus,
} from "../types";
import { ComposerContext, type ComposerContextValue } from "./composer-context";
import { selectDraft, selectRuntime, useComposerStore } from "./composer-store";
import { useComposerAttachments } from "./use-composer-attachments";

export type { ComposerContextValue } from "./composer-context";
export { ComposerContext } from "./composer-context";

/** Reads the surrounding `ComposerProvider`. Throws outside one. */
export function useComposer() {
  const context = use(ComposerContext);
  if (!context) {
    throw new Error("useComposer must be used within a ComposerProvider");
  }
  return context;
}

interface ComposerProviderProps {
  /** Stable id keying composer state; providers sharing an id share state live. */
  id: string;
  children: ReactNode;
  onSubmit?: (message: CreateMessage) => Promise<void> | void;
  /** Optional steer dispatcher. When provided, `useComposer().steer()` becomes available and `canSteer` flips to `true`. */
  onSteer?: (message: CreateMessage) => Promise<void> | void;
  onStop?: () => void;
  attachments?: AttachmentAdapter;
  maxAttachments?: number;
  maxAttachmentSize?: number;
  threadStatus?: ThreadStatus;
  autoFocusOnKeyPress?: boolean;
  focusAfterSubmit?: boolean;
  onFocusChange?: (focused: boolean) => void;
}

function computeComposerStatus(
  text: string,
  attachments: readonly Attachment[],
  isSubmitting: boolean,
  threadStatus: ThreadStatus | undefined,
  maxAttachments: number,
): ComposerStatus {
  if (isSubmitting) {
    return { type: "submitting" };
  }

  if (
    threadStatus?.type === "streaming" ||
    threadStatus?.type === "submitting"
  ) {
    return { type: "streaming" };
  }

  const hasPendingUpload = attachments.some(
    (attachment) =>
      attachment.status?.type === "uploading" ||
      attachment.status?.type === "pending" ||
      attachment.status?.type === "removing",
  );
  if (hasPendingUpload) {
    return { type: "blocked", reason: "attachment-pending" };
  }

  const hasFailedUpload = attachments.some(
    (attachment) => attachment.status?.type === "error",
  );
  if (hasFailedUpload) {
    return { type: "blocked", reason: "attachment-error" };
  }

  if (attachments.length >= maxAttachments) {
    return { type: "blocked", reason: "max-attachments" };
  }

  if (text.trim().length === 0 && attachments.length === 0) {
    return { type: "empty" };
  }

  return { type: "ready" };
}

/**
 * Provides composer state and actions for one composer instance keyed by
 * `id`. State is shared by id, so any provider mounted with the same id
 * reflects external edits (e.g. an "Edit with AI" button seeding text) live.
 * Behaviour config (callbacks, limits, adapters) varies per instance and is
 * passed as props.
 *
 * @param props - The composer's `id`, `children`, and per-instance behaviour
 * config (submit/steer/stop callbacks, attachment limits and adapter, focus
 * options).
 * @returns The provider element wrapping `children` with composer context.
 */
export function ComposerProvider({
  id,
  children,
  onSubmit,
  onSteer,
  onStop,
  attachments: attachmentAdapter,
  maxAttachments = 10,
  maxAttachmentSize = 10 * 1024 * 1024,
  threadStatus,
  autoFocusOnKeyPress = true,
  focusAfterSubmit = true,
  onFocusChange,
}: ComposerProviderProps) {
  const draft = useComposerStore((state) => selectDraft(state, id));
  const runtime = useComposerStore((state) => selectRuntime(state, id));
  const focusToken = useComposerStore((state) => state.focusTokens[id] ?? 0);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Seed `autoFocusOnKeyPress` from the prop once; after first mount the store
  // owns the value and later prop changes are ignored. Callers flip it
  // dynamically via setAutoFocusOnKeyPress on the context.
  const seededRef = useRef(false);
  if (!seededRef.current) {
    seededRef.current = true;
    if (useComposerStore.getState().runtime[id] === undefined) {
      useComposerStore
        .getState()
        .setAutoFocusOnKeyPress(id, autoFocusOnKeyPress);
    }
  }

  // Starts at 0 (not the current token) so a focus request fired before this
  // composer mounted — e.g. AI-edit clicked while the panel was closed — still
  // focuses the textarea on first mount. Token 0 means no request yet.
  const lastFocusTokenRef = useRef(0);
  useEffect(() => {
    if (focusToken === 0 || focusToken === lastFocusTokenRef.current) {
      return;
    }
    lastFocusTokenRef.current = focusToken;
    textareaRef.current?.focus();
  }, [focusToken]);

  const setText = useCallback(
    (text: string) => useComposerStore.getState().setText(id, text),
    [id],
  );

  const setAttachments = useCallback(
    (next: readonly Attachment[]) =>
      useComposerStore.getState().setAttachments(id, [...next]),
    [id],
  );

  const {
    addAttachment,
    updateAttachment,
    ingestFiles,
    removeAttachment,
    clearAttachments,
  } = useComposerAttachments({
    id,
    adapter: attachmentAdapter,
    maxAttachments,
    maxAttachmentSize,
  });

  const setFocus = useCallback(
    (focused: boolean) => {
      useComposerStore.getState().setFocused(id, focused);
      onFocusChange?.(focused);
    },
    [id, onFocusChange],
  );

  const focusTextarea = useCallback(() => {
    textareaRef.current?.focus();
  }, []);

  const insertText = useCallback(
    (newText: string, options?: { readonly replaceAll?: boolean }) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        useComposerStore.getState().setText(id, newText);
        return;
      }
      textarea.focus();
      if (options?.replaceAll) {
        textarea.select();
      }
      // Deprecated, but the only cross-browser way to keep the native undo stack.
      const inserted = document.execCommand("insertText", false, newText);
      if (inserted) {
        return;
      }
      if (options?.replaceAll) {
        useComposerStore.getState().setText(id, newText);
        return;
      }
      const start = textarea.selectionStart ?? textarea.value.length;
      const end = textarea.selectionEnd ?? textarea.value.length;
      useComposerStore
        .getState()
        .setText(
          id,
          textarea.value.slice(0, start) + newText + textarea.value.slice(end),
        );
    },
    [id],
  );

  const clear = useCallback(() => useComposerStore.getState().clear(id), [id]);

  const stop = useCallback(() => {
    onStop?.();
  }, [onStop]);

  const setAutoFocusOnKeyPress = useCallback(
    (enabled: boolean) =>
      useComposerStore.getState().setAutoFocusOnKeyPress(id, enabled),
    [id],
  );

  const dispatchMessage = useCallback(
    async (
      overrideText: string | undefined,
      handler: ((message: CreateMessage) => Promise<void> | void) | undefined,
    ) => {
      const currentDraft = selectDraft(useComposerStore.getState(), id);
      const currentRuntime = selectRuntime(useComposerStore.getState(), id);

      const content = overrideText ?? currentDraft.text;
      const hasContent =
        content.trim().length > 0 || currentDraft.attachments.length > 0;

      if (!hasContent || currentRuntime.isSubmitting || !handler) {
        return;
      }

      // Steer keybindings bypass the send button's status gate.
      const hasUnreadyAttachment = currentDraft.attachments.some(
        (attachment) =>
          attachment.status !== undefined && attachment.status.type !== "ready",
      );
      if (hasUnreadyAttachment) {
        return;
      }

      const prevText = currentDraft.text;
      const store = useComposerStore.getState();
      store.setSubmitting(id, true);
      store.setText(id, "");

      try {
        const message: CreateMessage =
          currentDraft.attachments.length > 0
            ? { content, attachments: currentDraft.attachments }
            : { content };
        await handler(message);
        // Attachments added mid-send belong to the next message.
        useComposerStore.getState().removeAttachments(
          id,
          currentDraft.attachments.map((attachment) => attachment.id),
        );
        if (focusAfterSubmit) {
          focusTextarea();
        }
      } catch {
        // Handler owns error UX; restore and swallow the rejection.
        useComposerStore.getState().setText(id, prevText);
        focusTextarea();
      } finally {
        useComposerStore.getState().setSubmitting(id, false);
      }
    },
    [id, focusAfterSubmit, focusTextarea],
  );

  const submit = useCallback(
    (overrideText?: string) => dispatchMessage(overrideText, onSubmit),
    [dispatchMessage, onSubmit],
  );

  const steer = useCallback(
    (overrideText?: string) => dispatchMessage(overrideText, onSteer),
    [dispatchMessage, onSteer],
  );

  const canSteer = onSteer !== undefined;

  const status = useMemo(
    () =>
      computeComposerStatus(
        draft.text,
        draft.attachments,
        runtime.isSubmitting,
        threadStatus,
        maxAttachments,
      ),
    [
      draft.text,
      draft.attachments,
      runtime.isSubmitting,
      threadStatus,
      maxAttachments,
    ],
  );

  const hasAttachmentAdapter = attachmentAdapter !== undefined;
  const attachmentAccept = attachmentAdapter?.accept;

  const contextValue: ComposerContextValue = useMemo(
    () => ({
      id,
      text: draft.text,
      attachments: draft.attachments,
      status,
      textareaRef,
      isFocused: runtime.isFocused,
      autoFocusOnKeyPress: runtime.autoFocusOnKeyPress,
      canSteer,
      hasAttachmentAdapter,
      attachmentAccept,
      setText,
      insertText,
      submit,
      steer,
      stop,
      addAttachment,
      updateAttachment,
      ingestFiles,
      removeAttachment,
      clearAttachments,
      setAttachments,
      setFocus,
      setAutoFocusOnKeyPress,
      focusTextarea,
      clear,
    }),
    [
      id,
      draft.text,
      draft.attachments,
      runtime.isFocused,
      runtime.autoFocusOnKeyPress,
      status,
      canSteer,
      hasAttachmentAdapter,
      attachmentAccept,
      setText,
      insertText,
      submit,
      steer,
      stop,
      addAttachment,
      updateAttachment,
      ingestFiles,
      removeAttachment,
      clearAttachments,
      setAttachments,
      setFocus,
      setAutoFocusOnKeyPress,
      focusTextarea,
      clear,
    ],
  );

  return (
    <ComposerContext.Provider value={contextValue}>
      {children}
    </ComposerContext.Provider>
  );
}

export type { Attachment as ComposerAttachment } from "../types";
