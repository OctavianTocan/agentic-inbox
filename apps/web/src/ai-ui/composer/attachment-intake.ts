import type { Attachment } from "../types";

/** Pastes longer than this (strictly) convert to a `.txt` attachment. */
export const PASTE_TO_ATTACHMENT_THRESHOLD = 5000;

/** Matches the auto-generated names produced by {@link createPastedTextFile}. */
const PASTED_TEXT_NAME = /^pasted-text-\d+\.txt$/;

/** True when a pasted block should convert to a file: adapter present and over threshold. */
export function shouldConvertPasteToAttachment(
  text: string,
  hasAdapter: boolean,
): boolean {
  return hasAdapter && text.length > PASTE_TO_ATTACHMENT_THRESHOLD;
}

/** Wrap pasted text in a uniquely-named `pasted-text-N.txt` `text/plain` File. */
export function createPastedTextFile(
  text: string,
  existingAttachments: readonly Attachment[],
): File {
  const existingCount = existingAttachments.filter((attachment) =>
    PASTED_TEXT_NAME.test(attachment.name),
  ).length;
  return new File([text], `pasted-text-${existingCount + 1}.txt`, {
    type: "text/plain",
  });
}

/** Extract the bare base64 payload from a `data:` URL (`Attachment.content` contract). */
export function dataUrlToBase64(dataUrl: string): string {
  const separator = dataUrl.indexOf(",");
  return separator === -1 ? dataUrl : dataUrl.slice(separator + 1);
}

/** Ready-state merge patch from an adapter result; omits absent fields so the merge can't clobber staged ones. */
export function attachmentReadyPatch(
  result: Attachment,
): Partial<Omit<Attachment, "id">> {
  return {
    name: result.name,
    type: result.type,
    ...(result.size !== undefined && { size: result.size }),
    ...(result.path !== undefined && { path: result.path }),
    ...(result.url !== undefined && { url: result.url }),
    ...(result.content !== undefined && { content: result.content }),
    ...(result.preview !== undefined && { preview: result.preview }),
    status: { type: "ready" },
  };
}

/** Structural view of clipboard data, decoupled from `DataTransfer`/`ClipboardEvent`. */
export interface ClipboardIntake {
  readonly files: readonly File[];
  readonly text: string;
}

/** Surrounding state and the file sink the intake logic needs. */
export interface ClipboardIntakeContext {
  readonly hasAdapter: boolean;
  readonly existingAttachments: readonly Attachment[];
  ingestFiles(files: readonly File[]): readonly string[];
}

/**
 * Route a clipboard paste: pasted files win, else long text converts to a file.
 *
 * @returns True when handled (suppress default insert), false to fall through.
 */
export function handleClipboardPaste(
  clipboard: ClipboardIntake,
  ctx: ClipboardIntakeContext,
): boolean {
  if (clipboard.files.length > 0) {
    // File pastes have no meaningful default insert, so always suppress it.
    ctx.ingestFiles(clipboard.files);
    return true;
  }
  if (shouldConvertPasteToAttachment(clipboard.text, ctx.hasAdapter)) {
    const staged = ctx.ingestFiles([
      createPastedTextFile(clipboard.text, ctx.existingAttachments),
    ]);
    // Rejected staging (max count/size) falls through to the default insert
    // so the pasted text is never silently swallowed.
    return staged.length > 0;
  }
  return false;
}
