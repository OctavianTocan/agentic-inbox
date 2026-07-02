"use client";

import { useCallback } from "react";
import { readAsDataURL } from "../helpers";
import type { Attachment, AttachmentAdapter } from "../types";
import { attachmentReadyPatch, dataUrlToBase64 } from "./attachment-intake";
import { useComposerStore } from "./composer-store";

interface UseComposerAttachmentsInput {
  /** Composer id keying the shared store. */
  readonly id: string;
  /** Upload adapter; absent means inline base64 staging. */
  readonly adapter: AttachmentAdapter | undefined;
  readonly maxAttachments: number;
  readonly maxAttachmentSize: number;
}

export interface ComposerAttachmentActions {
  /** Stage an attachment; returns its id, or `null` when rejected by the guards. */
  addAttachment(attachment: Omit<Attachment, "id">): string | null;
  /** Merge-patch a staged attachment. */
  updateAttachment(
    attachmentId: string,
    patch: Partial<Omit<Attachment, "id">>,
  ): void;
  /** Stage files from any source; returns synchronously staged chip ids. */
  ingestFiles(files: readonly File[]): readonly string[];
  removeAttachment(attachmentId: string): void;
  clearAttachments(): void;
}

/** Generate a stable unique id for a staged attachment chip. */
function makeAttachmentId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Attachments occupying a real slot — error chips are rejection notices, not attachments, so they never count toward the cap. */
function realAttachmentCount(composerId: string): number {
  return (
    useComposerStore
      .getState()
      .composers[composerId]?.attachments.filter(
        (attachment) => attachment.status?.type !== "error",
      ).length ?? 0
  );
}

/**
 * Write an error-status chip directly into the store for `composerId`, bypassing add-guards.
 *
 * @param composerId - Composer instance id.
 * @param name - Filename shown on the chip.
 * @param message - Human-readable rejection reason shown on the chip.
 * @returns The chip id so the caller can track or remove it.
 */
function stageErrorChip(
  composerId: string,
  name: string,
  message: string,
): string {
  const attachmentId = makeAttachmentId();
  useComposerStore.getState().addAttachment(composerId, {
    id: attachmentId,
    name,
    type: "",
    status: { type: "error", message },
  });
  return attachmentId;
}

/** Rejection message when a file fails the size/count guards, or `null` when it may be staged. */
function attachmentRejectionMessage(
  file: File,
  currentCount: number,
  maxAttachments: number,
  maxAttachmentSize: number,
): string | null {
  if (file.size > maxAttachmentSize) {
    return `File is too large (max ${Math.round(maxAttachmentSize / (1024 * 1024))} MB).`;
  }
  if (currentCount >= maxAttachments) {
    return `You can attach a maximum of ${maxAttachments} files.`;
  }
  return null;
}

/** Attachment staging, upload orchestration, and removal for one composer id. */
export function useComposerAttachments({
  id,
  adapter,
  maxAttachments,
  maxAttachmentSize,
}: UseComposerAttachmentsInput): ComposerAttachmentActions {
  const addAttachment = useCallback(
    (attachment: Omit<Attachment, "id">): string | null => {
      if (attachment.size && attachment.size > maxAttachmentSize) {
        return null;
      }
      if (realAttachmentCount(id) >= maxAttachments) {
        return null;
      }
      const attachmentId = makeAttachmentId();
      useComposerStore
        .getState()
        .addAttachment(id, { ...attachment, id: attachmentId });
      return attachmentId;
    },
    [id, maxAttachments, maxAttachmentSize],
  );

  const updateAttachment = useCallback(
    (attachmentId: string, patch: Partial<Omit<Attachment, "id">>) =>
      useComposerStore.getState().updateAttachment(id, attachmentId, patch),
    [id],
  );

  /** Intake for every file source: drag-drop, file picker, and paste. */
  const ingestFiles = useCallback(
    (files: readonly File[]): readonly string[] => {
      const staged: string[] = [];
      for (const file of files) {
        const isImage = file.type.startsWith("image/");
        const currentCount = realAttachmentCount(id);
        const rejection = attachmentRejectionMessage(
          file,
          currentCount,
          maxAttachments,
          maxAttachmentSize,
        );
        if (rejection) {
          stageErrorChip(id, file.name, rejection);
          continue;
        }

        if (!adapter) {
          readAsDataURL(file)
            .then((dataUrl) =>
              addAttachment({
                name: file.name,
                type: file.type,
                size: file.size,
                content: dataUrlToBase64(dataUrl),
                preview: isImage ? dataUrl : undefined,
              }),
            )
            .catch(() => undefined);
          continue;
        }

        const attachmentId = addAttachment({
          name: file.name,
          type: file.type,
          size: file.size,
          status: { type: "uploading" },
        });
        if (attachmentId === null) {
          continue;
        }
        staged.push(attachmentId);

        if (isImage) {
          readAsDataURL(file)
            .then((preview) => updateAttachment(attachmentId, { preview }))
            .catch(() => undefined);
        }

        adapter
          .add(file)
          .then((result) =>
            updateAttachment(attachmentId, attachmentReadyPatch(result)),
          )
          .catch((error) =>
            updateAttachment(attachmentId, {
              status: {
                type: "error",
                message: error instanceof Error ? error.message : String(error),
              },
            }),
          );
      }
      return staged;
    },
    [
      addAttachment,
      updateAttachment,
      adapter,
      id,
      maxAttachments,
      maxAttachmentSize,
    ],
  );

  const removeAttachment = useCallback(
    (attachmentId: string) => {
      const current = useComposerStore.getState().composers[id]?.attachments;
      const attachment = current?.find((a) => a.id === attachmentId);
      if (attachment && adapter) {
        adapter.remove(attachment).catch(() => undefined);
      }
      useComposerStore.getState().removeAttachment(id, attachmentId);
    },
    [id, adapter],
  );

  const clearAttachments = useCallback(
    () => useComposerStore.getState().clearAttachments(id),
    [id],
  );

  return {
    addAttachment,
    updateAttachment,
    ingestFiles,
    removeAttachment,
    clearAttachments,
  };
}
