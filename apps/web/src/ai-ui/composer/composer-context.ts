"use client";

import type React from "react";
import { createContext } from "react";
import type { Attachment, ComposerStatus } from "../types";

export interface ComposerContextValue {
  readonly id: string;
  readonly text: string;
  readonly attachments: readonly Attachment[];
  readonly status: ComposerStatus;
  readonly textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  readonly isFocused: boolean;
  readonly autoFocusOnKeyPress: boolean;
  /** True when the surrounding `ComposerProvider` was given an `onSteer` handler. UI can hide the steer affordance when false. */
  readonly canSteer: boolean;
  /** True when an `attachmentAdapter` was wired; UI can enable non-image intake and paste-to-attachment. */
  readonly hasAttachmentAdapter: boolean;
  /** The adapter's `accept` string (forwarded to the file input), or `undefined` when none/no adapter. */
  readonly attachmentAccept: string | undefined;

  setText(text: string): void;
  insertText(text: string, options?: { readonly replaceAll?: boolean }): void;
  submit(overrideText?: string): Promise<void>;
  /** Submit through the steer path instead of the queue. No-op when no `onSteer` was wired. */
  steer(overrideText?: string): Promise<void>;
  stop(): void;
  /** Stage an attachment; returns its generated id, or `null` when rejected by the max-size/max-count guards. */
  addAttachment(attachment: Omit<Attachment, "id">): string | null;
  /** Merge-patch a staged attachment (e.g. upload progress, resolved path, error). */
  updateAttachment(id: string, patch: Partial<Omit<Attachment, "id">>): void;
  /**
   * Intake files from any source (drag-drop, file picker, paste). Without an
   * adapter these become inline base64 attachments; with one each uploads via
   * the adapter and its chip tracks upload status.
   *
   * @returns Ids of synchronously staged chips (empty when rejected or inline).
   */
  ingestFiles(files: readonly File[]): readonly string[];
  removeAttachment(id: string): void;
  clearAttachments(): void;
  /**
   * Replace the whole attachments list in one shot, ignoring the
   * `maxAttachments` cap so draft hydration can restore items even when the
   * previous state was at the limit.
   */
  setAttachments(attachments: readonly Attachment[]): void;
  setFocus(focused: boolean): void;
  setAutoFocusOnKeyPress(enabled: boolean): void;
  focusTextarea(): void;
  clear(): void;
}

/** React context for the composer state and actions. */
export const ComposerContext = createContext<ComposerContextValue | undefined>(
  undefined,
);
