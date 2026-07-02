"use client";

import * as React from "react";
import { handleClipboardPaste } from "../composer/attachment-intake";
import {
  type ComposerAttachment,
  useComposer,
} from "../composer/composer-provider";
import { createClickToFocusHandler } from "../helpers";
import { useAutosizeTextarea } from "../hooks/use-autosize-textarea";
import { useComposerDragDrop } from "../hooks/use-composer-drag-drop";
import { useContextUsage } from "../hooks/use-context-usage";
import { useGlobalKeyboard } from "../hooks/use-global-keyboard";
import {
  type UseKeyBindingConfig,
  useKeyBinding,
} from "../hooks/use-key-binding";
import { useModifierHeld } from "../hooks/use-modifier-held";
import { useSlashCommandsOptional } from "../providers/slash-command-provider";
import { blocksComposerSubmit } from "../types";

const DEFAULT_SUBMIT_SHORTCUT_DESCRIPTION =
  "Press Enter to send or Shift+Enter for a new line.";

/**
 * Form-block-scoped context published by `Composer` so descendants
 * (`ComposerSendButton`, the form's own submit handler) read the same
 * `submitWhileBusy` flag without duplicate prop plumbing. Default is `false`.
 */
const ComposerFormContext = React.createContext<{
  readonly submitWhileBusy: boolean;
  readonly instructionsId?: string;
}>({
  submitWhileBusy: false,
});

/** Read the surrounding `Composer` form-block flags; defaults to non-busy submission. */
function useComposerForm() {
  return React.use(ComposerFormContext);
}

interface ComposerProps extends Omit<React.ComponentProps<"form">, "onSubmit"> {
  autoFocusOnKeyPress?: boolean;
  autoFocusOnPaste?: boolean;
  clickToFocus?: boolean;
  /** When true, prevents all submission (button click, keyboard, and programmatic). */
  disabled?: boolean;
  focusAfterSubmit?: boolean;
  onFocusChange?: (focused: boolean) => void;
  submitShortcutDescription?: string;
  /** When true, accept submissions while the thread is busy (the consumer is expected to queue them). */
  submitWhileBusy?: boolean;
}

/**
 * Root composer form element. Handles drag-drop file uploads,
 * global keyboard focus, and form submission.
 *
 * Publishes `submitWhileBusy` to descendants so the form's submit handler and
 * `ComposerSendButton` read the same flag without duplicated prop plumbing.
 *
 * Renders `data-slot="composer"` with `data-state` reflecting
 * `'busy' | 'drag-active' | 'idle'` and an optional `data-drag-active` flag.
 */
const Composer = ({
  children,
  className,
  autoFocusOnKeyPress = true,
  autoFocusOnPaste = true,
  clickToFocus = true,
  disabled,
  focusAfterSubmit = true,
  onFocusChange,
  submitShortcutDescription = DEFAULT_SUBMIT_SHORTCUT_DESCRIPTION,
  submitWhileBusy = false,
  ...props
}: ComposerProps) => {
  const {
    text,
    submit,
    status,
    focusTextarea,
    setText,
    ingestFiles,
    hasAttachmentAdapter,
    attachments,
    textareaRef,
    autoFocusOnKeyPress: contextAutoFocus,
  } = useComposer();

  const { dragActive, handleDragOver, handleDragLeave, handleDrop } =
    useComposerDragDrop(ingestFiles);

  useGlobalKeyboard({
    enabled: autoFocusOnKeyPress && contextAutoFocus,
    activityRef: textareaRef,
    onKeyPress: focusTextarea,
    onPaste: (clipboard) => {
      // Without auto-focus, a plain-text paste belongs to the browser default.
      if (clipboard.files.length === 0 && !autoFocusOnPaste) {
        return false;
      }

      const handled = handleClipboardPaste(clipboard, {
        hasAdapter: hasAttachmentAdapter,
        existingAttachments: attachments,
        ingestFiles,
      });
      if (!handled) {
        setText(clipboard.text);
      }
      focusTextarea();
      return true;
    },
  });

  const slashCommands = useSlashCommandsOptional();

  const isBusy = status.type === "submitting" || status.type === "streaming";
  const blocksSubmit = isBusy && !submitWhileBusy;

  let composerState: "busy" | "drag-active" | "idle" = "idle";
  if (isBusy) {
    composerState = "busy";
  } else if (dragActive) {
    composerState = "drag-active";
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (
      disabled ||
      blocksSubmit ||
      (!text.trim() && attachments.length === 0)
    ) {
      return;
    }

    if (slashCommands?.tryExecuteCommand(text)) {
      return;
    }

    await submit();
  };

  const instructionsId = React.useId();
  const formContextValue = React.useMemo(
    () => ({ submitWhileBusy, instructionsId }),
    [submitWhileBusy, instructionsId],
  );

  const clickToFocusHandler = createClickToFocusHandler({
    enabled: clickToFocus,
    onFocus: focusTextarea,
  });

  return (
    <ComposerFormContext.Provider value={formContextValue}>
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: form uses onDrag* for file uploads — drag events don't warrant an interactive role */}
      <form
        aria-label="Message composer"
        className={className}
        data-drag-active={dragActive || undefined}
        data-slot="composer"
        data-state={composerState}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onSubmit={handleSubmit}
        {...props}
      >
        {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: mousedown delegates focus to the textarea; keyboard users reach it directly */}
        <div
          data-slot="composer-focus-trap"
          onMouseDown={clickToFocusHandler}
          role="toolbar"
          tabIndex={-1}
        >
          <span
            className="sr-only"
            data-slot="composer-instructions"
            id={instructionsId}
          >
            Type your message here. {submitShortcutDescription} Start typing
            anywhere to focus this input.
          </span>
          {children}
        </div>
      </form>
    </ComposerFormContext.Provider>
  );
};

interface ComposerEyebrowProps extends React.ComponentProps<"div"> {}

/**
 * Optional eyebrow element rendered above the composer form,
 * typically used for contextual labels or status indicators.
 */
const ComposerEyebrow = ({ className, ...props }: ComposerEyebrowProps) => {
  return <div className={className} data-slot="composer-eyebrow" {...props} />;
};

interface ComposerHeaderProps extends React.ComponentProps<"div"> {}

/**
 * Header area inside the composer, often used for mode toggles
 * or model selectors.
 */
const ComposerHeader = ({ className, ...props }: ComposerHeaderProps) => {
  return <div className={className} data-slot="composer-header" {...props} />;
};

interface ComposerContentProps extends React.ComponentProps<"div"> {}

/**
 * Main content area wrapping the textarea and any inline UI.
 */
const ComposerContent = ({ className, ...props }: ComposerContentProps) => {
  return <div className={className} data-slot="composer-content" {...props} />;
};

interface ComposerTextAreaProps extends React.ComponentProps<"textarea"> {
  autoResize?: boolean;
  maxHeight?: number;
  minHeight?: number;
}

/**
 * Auto-resizing textarea that integrates with the composer provider
 * for text state, focus tracking, and keyboard submission.
 *
 * When a `SlashCommandProvider` is present, automatically intercepts
 * keyboard events to navigate the slash command menu.
 *
 * Renders `data-slot="composer-textarea"` with `data-state` reflecting
 * the current composer status type.
 */
const ComposerTextArea = ({
  className,
  autoResize = true,
  maxHeight = 200,
  minHeight,
  minLength = 1,
  required = true,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  onPaste,
  ref,
  style,
  ...props
}: ComposerTextAreaProps) => {
  const {
    textareaRef,
    text,
    setText,
    setFocus,
    status,
    ingestFiles,
    hasAttachmentAdapter,
    attachments,
  } = useComposer();
  const { instructionsId } = useComposerForm();
  const slashCommands = useSlashCommandsOptional();
  const setTextareaRef = React.useCallback(
    (node: HTMLTextAreaElement | null) => {
      textareaRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref, textareaRef],
  );

  useAutosizeTextarea({
    ref: textareaRef,
    value: text,
    minHeight,
    maxHeight,
    enabled: autoResize,
  });

  const sizingStyle: React.CSSProperties | undefined = autoResize
    ? { fieldSizing: "content" }
    : undefined;

  const syncTextAndSlashQuery = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(e);
    if (e.defaultPrevented) {
      return;
    }

    const newText = e.target.value;
    setText(newText);
    slashCommands?.updateQuery(newText, e.target.selectionStart);
  };

  const trackFocusGained = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setFocus(true);
    onFocus?.(e);
  };

  const trackFocusLost = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setFocus(false);
    onBlur?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Let slash command provider intercept first when menu is open
    slashCommands?.onTextareaKeyDown(e);
    if (e.defaultPrevented) {
      return;
    }

    onKeyDown?.(e);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    onPaste?.(e);
    if (e.defaultPrevented) {
      return;
    }

    const handled = handleClipboardPaste(
      {
        files: Array.from(e.clipboardData.files),
        text: e.clipboardData.getData("text/plain"),
      },
      {
        hasAdapter: hasAttachmentAdapter,
        existingAttachments: attachments,
        ingestFiles,
      },
    );
    if (handled) {
      e.preventDefault();
    }
  };

  return (
    <textarea
      aria-autocomplete="none"
      aria-describedby={instructionsId}
      aria-label="Message input"
      aria-multiline="true"
      className={className}
      data-slot="composer-textarea"
      data-state={status.type}
      minLength={minLength}
      name="text"
      onBlur={trackFocusLost}
      onChange={syncTextAndSlashQuery}
      onFocus={trackFocusGained}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      ref={setTextareaRef}
      required={required}
      style={{ ...sizingStyle, ...style }}
      value={text}
      {...props}
    />
  );
};

interface ComposerFooterProps extends React.ComponentProps<"div"> {}

/**
 * Footer area of the composer, typically containing action buttons
 * (attach, send, stop) and context usage indicators.
 */
const ComposerFooter = ({ className, ...props }: ComposerFooterProps) => {
  return <div className={className} data-slot="composer-footer" {...props} />;
};

/**
 * Formats a byte count into a human-readable file size string.
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ComposerAttachmentsProps {
  attachments: readonly ComposerAttachment[];
  onRemove?: (id: string) => void;
}

/**
 * Screen-reader announcement for one attachment's status transition, or `null`
 * when the transition does not warrant one.
 */
function attachmentTransitionAnnouncement(
  prev: ComposerAttachment,
  next: ComposerAttachment,
): string | null {
  const prevStatus = prev.status?.type;
  const nextStatus = next.status?.type;
  if (prevStatus === "uploading" && nextStatus === "ready") {
    return `${next.name} attached`;
  }
  if (prevStatus !== "error" && nextStatus === "error") {
    const message =
      next.status?.type === "error" ? next.status.message : undefined;
    return message ? `${next.name} failed: ${message}` : `${next.name} failed`;
  }
  return null;
}

/** Remove button to focus after deleting the chip named `name`, or `null` to fall back. */
function adjacentRemoveButton(
  list: HTMLUListElement | null,
  name: string,
): HTMLButtonElement | null {
  if (!list) {
    return null;
  }
  const buttons = Array.from(
    list.querySelectorAll<HTMLButtonElement>(
      '[data-slot="composer-attachment-remove"]',
    ),
  );
  const currentIndex = buttons.findIndex(
    (button) =>
      button
        .closest('[data-slot="composer-attachment"]')
        ?.querySelector('[data-slot="composer-attachment-name"]')
        ?.textContent === name,
  );
  return buttons[currentIndex + 1] ?? buttons[currentIndex - 1] ?? null;
}

/**
 * Renders the list of file attachments with preview thumbnails,
 * file names, sizes, and optional remove buttons.
 *
 * Manages focus after chip removal (moves to adjacent chip or falls back to
 * the textarea) and announces upload lifecycle events to screen readers via
 * an `aria-live` region that remains mounted even when the chip list empties,
 * so the removal announcement is not cut off before the AT reads it.
 */
const ComposerAttachments = ({
  attachments,
  onRemove,
}: ComposerAttachmentsProps) => {
  const { focusTextarea } = useComposer();
  const listRef = React.useRef<HTMLUListElement>(null);
  const [announcement, setAnnouncement] = React.useState("");

  // Derive upload-lifecycle announcements during render (React's "adjust state
  // when a prop changes" pattern) so the aria-live region speaks status
  // transitions without an effect.
  const prevAttachmentsRef = React.useRef<readonly ComposerAttachment[]>([]);
  if (prevAttachmentsRef.current !== attachments) {
    const prevById = new Map(prevAttachmentsRef.current.map((a) => [a.id, a]));
    prevAttachmentsRef.current = attachments;
    for (const attachment of attachments) {
      const prev = prevById.get(attachment.id);
      const nextAnnouncement = prev
        ? attachmentTransitionAnnouncement(prev, attachment)
        : null;
      if (nextAnnouncement) {
        setAnnouncement(nextAnnouncement);
      }
    }
  }

  const handleRemove = (id: string, name: string) => {
    if (!onRemove) {
      return;
    }

    const nextChip = adjacentRemoveButton(listRef.current, name);
    onRemove(id);
    setAnnouncement(`${name} removed`);
    if (nextChip) {
      nextChip.focus();
    } else {
      focusTextarea();
    }
  };

  // The announcer must always be in the DOM so the removal announcement
  // survives the re-render that empties the chip list.
  return (
    <>
      <div
        aria-atomic="true"
        aria-live="polite"
        className="sr-only"
        data-slot="composer-attachments-announcer"
      >
        {announcement}
      </div>
      {attachments.length > 0 && (
        <ul
          aria-label="Attachments"
          data-slot="composer-attachments"
          ref={listRef}
        >
          {attachments.map((attachment) => {
            const statusType = attachment.status?.type;
            const errorMessage =
              attachment.status?.type === "error"
                ? attachment.status.message
                : undefined;
            return (
              <li
                data-slot="composer-attachment"
                data-status={statusType}
                key={attachment.id}
                title={errorMessage}
              >
                {attachment.preview ? (
                  // biome-ignore lint/performance/noImgElement: this is a shared UI library, not a Next.js page component
                  <img
                    alt={attachment.name}
                    data-slot="composer-attachment-preview"
                    src={attachment.preview}
                  />
                ) : (
                  <span data-slot="composer-attachment-icon" />
                )}
                <div data-slot="composer-attachment-info">
                  <span data-slot="composer-attachment-name">
                    {attachment.name}
                  </span>
                  {errorMessage ? (
                    <span data-slot="composer-attachment-error">
                      {errorMessage}
                    </span>
                  ) : (
                    attachment.size !== undefined && (
                      <span data-slot="composer-attachment-size">
                        {formatFileSize(attachment.size)}
                      </span>
                    )
                  )}
                </div>
                {statusType === "uploading" && (
                  <svg
                    aria-label="Uploading"
                    data-slot="composer-attachment-spinner"
                    fill="none"
                    height="14"
                    role="status"
                    viewBox="0 0 16 16"
                    width="14"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <title>Uploading</title>
                    <circle
                      cx="8"
                      cy="8"
                      opacity="0.25"
                      r="6"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M14 8a6 6 0 0 0-6-6"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="2"
                    />
                  </svg>
                )}
                {onRemove && (
                  <button
                    aria-label={`Remove ${attachment.name}`}
                    data-slot="composer-attachment-remove"
                    onClick={() => handleRemove(attachment.id, attachment.name)}
                    type="button"
                  >
                    <svg
                      fill="none"
                      height="10"
                      viewBox="0 0 12 12"
                      width="10"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <title>Remove</title>
                      <path
                        d="M9 3L3 9M3 3L9 9"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
};

interface ComposerAttachButtonProps
  extends Omit<React.ComponentProps<"button">, "onClick"> {
  accept?: string;
  onFilesSelected?: () => void;
}

/**
 * Button that triggers a hidden file input for attaching files.
 * Renders children as the button content (no default icon).
 */
const ComposerAttachButton = ({
  className,
  accept,
  children,
  onFilesSelected,
  ...props
}: ComposerAttachButtonProps) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { ingestFiles, attachmentAccept } = useComposer();
  const resolvedAccept = accept ?? attachmentAccept ?? "image/*";
  // `accept="*/*"` greys out files with no OS-registered MIME type (e.g. `.md`)
  // in Chrome/macOS; omit the attribute so "all files" selects all files.
  const acceptAttr = resolvedAccept === "*/*" ? undefined : resolvedAccept;

  const handleFileChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) {
        return;
      }

      if (files.length > 0) {
        onFilesSelected?.();
        ingestFiles(Array.from(files));
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [ingestFiles, onFilesSelected],
  );

  return (
    <>
      <input
        accept={acceptAttr}
        aria-label="Choose files to attach"
        data-slot="composer-attach-input"
        multiple
        onChange={handleFileChange}
        ref={fileInputRef}
        style={{ display: "none" }}
        type="file"
      />
      <button
        aria-label="Attach file"
        className={className}
        data-slot="composer-attach"
        onClick={() => fileInputRef.current?.click()}
        type="button"
        {...props}
      >
        {children}
      </button>
    </>
  );
};

/**
 * Render mode for the two-phase composer Send button. `'send'` is the queue
 * path (Enter); `'steer'` is the interrupt-now path (⌘Enter), surfaced only
 * while the thread is busy and an `onSteer` is wired upstream.
 */
type ComposerSendMode = "send" | "steer";

interface ComposerSendButtonProps
  extends Omit<React.ComponentProps<"button">, "children"> {
  convertCtrlToCmd?: UseKeyBindingConfig["convertCtrlToCmd"];
  keys?: UseKeyBindingConfig["keys"];
  /** Modifier+Enter combo that triggers the steer phase. Defaults to `'cmd+enter'` (becomes `Ctrl+Enter` on non-Mac via `convertCtrlToCmd`). */
  steerKeys?: UseKeyBindingConfig["keys"];
  /** Render-prop receives the active `mode`; static nodes still render unchanged. */
  children?:
    | React.ReactNode
    | ((args: { mode: ComposerSendMode }) => React.ReactNode);
}

/** Resolve the title attribute for the send button by current mode. */
const computeSendButtonTitle = (
  mode: ComposerSendMode,
  hint: string | undefined,
  steerHint: string | undefined,
): string => {
  if (mode === "steer") {
    return steerHint ? `Steer (${steerHint})` : "Steer";
  }
  return hint ? `Send (${hint})` : "Send";
};

/** Resolve the aria-label for the send button by current mode. */
const computeSendButtonAriaLabel = (
  mode: ComposerSendMode,
  hint: string | undefined,
  steerHint: string | undefined,
): string => {
  if (mode === "steer") {
    return `Steer (interrupt running turn)${steerHint ? ` (${steerHint})` : ""}`;
  }
  return `Send message${hint ? ` (${hint})` : ""}`;
};

/** Resolve the data-state attribute for the send button by current mode. */
const computeSendButtonState = (
  mode: ComposerSendMode,
  hasContent: boolean,
  blocksSubmit: boolean,
): "steer" | "ready" | "disabled" => {
  if (mode === "steer") {
    return "steer";
  }
  return hasContent && !blocksSubmit ? "ready" : "disabled";
};

/**
 * Two-phase submit button. Enter dispatches the queue path; ⌘Enter dispatches
 * the steer path when steer is wired and a turn is in flight. `data-state`
 * reflects `'ready' | 'disabled' | 'steer'` so styling layers can swap
 * icons/tints by phase.
 */
const ComposerSendButton = ({
  className,
  children,
  convertCtrlToCmd = true,
  disabled,
  keys = "enter",
  steerKeys = "cmd+enter",
  onClick,
  ...props
}: ComposerSendButtonProps) => {
  const { status, text, attachments, isFocused, steer, canSteer } =
    useComposer();
  const { submitWhileBusy } = useComposerForm();
  const slashCommandCtx = useSlashCommandsOptional();
  const hasContent = !!text.trim() || attachments.length > 0;
  const isBusy = status.type === "submitting" || status.type === "streaming";
  const blocksSubmit = blocksComposerSubmit(
    status,
    submitWhileBusy,
    attachments,
  );
  const steerAvailable = canSteer && isBusy && hasContent && !disabled;
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const isCmdHeld = useModifierHeld("meta");
  const isCtrlHeld = useModifierHeld("control");
  const isSteerModifierHeld = convertCtrlToCmd ? isCmdHeld : isCtrlHeld;
  const mode: ComposerSendMode =
    steerAvailable && isSteerModifierHeld ? "steer" : "send";

  const handleSend = React.useCallback(
    (_e?: React.MouseEvent | KeyboardEvent) => {
      const form = buttonRef.current?.closest<HTMLFormElement>(
        'form[aria-label="Message composer"]',
      );
      if (form && hasContent && !blocksSubmit) {
        const submitEvent = new Event("submit", {
          bubbles: true,
          cancelable: true,
        });
        form.dispatchEvent(submitEvent);
      }
    },
    [hasContent, blocksSubmit],
  );

  const handleSteer = React.useCallback(() => {
    if (!steerAvailable) {
      handleSend();
      return;
    }
    steer().catch(() => undefined);
  }, [steerAvailable, steer, handleSend]);

  // Disable Enter keybinding only when slash menu is open with matching commands
  const isSlashMenuActive =
    (slashCommandCtx?.isOpen && slashCommandCtx.filteredCommands.length > 0) ??
    false;

  const { hint } = useKeyBinding({
    keys,
    handler: handleSend,
    enabled:
      isFocused &&
      !disabled &&
      hasContent &&
      !blocksSubmit &&
      !isSlashMenuActive,
    convertCtrlToCmd,
    preventDefault: true,
  });

  const { hint: steerHint } = useKeyBinding({
    keys: steerKeys,
    handler: handleSteer,
    enabled: isFocused && hasContent && !isSlashMenuActive && steerAvailable,
    convertCtrlToCmd,
    preventDefault: true,
  });

  const dispatchSendOrSteer = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) {
      return;
    }
    if (steerAvailable && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      steer().catch(() => undefined);
    }
  };

  const ariaLabel = computeSendButtonAriaLabel(mode, hint, steerHint);
  const titleLabel = computeSendButtonTitle(mode, hint, steerHint);
  const dataState = computeSendButtonState(mode, hasContent, blocksSubmit);
  const renderedChildren =
    typeof children === "function" ? children({ mode }) : children;

  return (
    <button
      aria-label={ariaLabel}
      className={className}
      data-slot="composer-send"
      data-state={dataState}
      disabled={disabled || blocksSubmit || !hasContent}
      onClick={dispatchSendOrSteer}
      ref={buttonRef}
      title={titleLabel}
      type="submit"
      {...props}
    >
      {renderedChildren}
    </button>
  );
};

interface ComposerStopButtonProps extends React.ComponentProps<"button"> {
  keys?: UseKeyBindingConfig["keys"];
}

/**
 * Button to abort an in-progress generation. Integrates with keyboard
 * bindings (default: Escape) and reflects activity via
 * `data-state="active" | "disabled"`.
 */
const ComposerStopButton = ({
  className,
  children,
  disabled,
  keys = "escape",
  ...props
}: ComposerStopButtonProps) => {
  const { status, isFocused, stop } = useComposer();
  const isBusy = status.type === "submitting" || status.type === "streaming";

  const handleStop = React.useCallback(
    (e?: React.MouseEvent | KeyboardEvent) => {
      e?.preventDefault();
      stop();
    },
    [stop],
  );

  const { hint } = useKeyBinding({
    keys,
    handler: handleStop,
    enabled: isFocused && !disabled && isBusy,
    preventDefault: true,
  });

  return (
    <button
      aria-label={`Stop generation${hint ? ` (${hint})` : ""}`}
      className={className}
      data-slot="composer-stop"
      data-state={isBusy ? "active" : "disabled"}
      disabled={disabled || !isBusy}
      onClick={handleStop}
      title={hint ? `Stop (${hint})` : "Stop"}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
};

const RING_SIZE = 20;
const STROKE_WIDTH = 2.5;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const DEFAULT_MIN_VISIBLE_RATIO = 0.6;
const WARN_RATIO = 0.8;
const DANGER_RATIO = 0.9;

type ContextUsageLevel = "ok" | "warn" | "danger";

/** Maps a usage ratio to a discrete severity level. */
function contextUsageLevel(ratio: number): ContextUsageLevel {
  if (ratio >= DANGER_RATIO) {
    return "danger";
  }
  if (ratio >= WARN_RATIO) {
    return "warn";
  }
  return "ok";
}

interface ContextUsageRingProps {
  /** Below this ratio (0–1) the ring renders nothing. Defaults to 0.6. */
  readonly minVisibleRatio?: number;
}

/**
 * SVG ring indicator showing context window token usage as a
 * percentage arc. Renders nothing when usage data is unavailable or
 * the ratio is below `minVisibleRatio`.
 *
 * Exposes `data-slot="context-usage"`, `data-percentage`, and
 * `data-level` (`ok` | `warn` | `danger`) for styling.
 */
function ContextUsageRing({
  minVisibleRatio = DEFAULT_MIN_VISIBLE_RATIO,
}: ContextUsageRingProps = {}) {
  const usage = useContextUsage();

  if (!usage || usage.ratio < minVisibleRatio) {
    return null;
  }

  const dashLength = CIRCUMFERENCE * Math.min(usage.ratio, 1);
  const gapLength = CIRCUMFERENCE - dashLength;
  const percentage = Math.round(usage.ratio * 100);
  const level = contextUsageLevel(usage.ratio);

  return (
    <span
      data-level={level}
      data-percentage={percentage}
      data-slot="context-usage"
    >
      <svg
        aria-label={`Context usage: ${percentage}%`}
        height={RING_SIZE}
        role="img"
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        width={RING_SIZE}
      >
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          data-slot="context-usage-track"
          fill="none"
          r={RADIUS}
          strokeWidth={STROKE_WIDTH}
        />
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          data-slot="context-usage-fill"
          fill="none"
          r={RADIUS}
          strokeDasharray={`${dashLength} ${gapLength}`}
          strokeDashoffset={CIRCUMFERENCE / 4}
          strokeLinecap="round"
          strokeWidth={STROKE_WIDTH}
          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
        />
      </svg>
    </span>
  );
}

export {
  Composer,
  ComposerAttachButton,
  type ComposerAttachButtonProps,
  ComposerAttachments,
  type ComposerAttachmentsProps,
  ComposerContent,
  type ComposerContentProps,
  ComposerEyebrow,
  type ComposerEyebrowProps,
  ComposerFooter,
  type ComposerFooterProps,
  ComposerHeader,
  type ComposerHeaderProps,
  type ComposerProps,
  ComposerSendButton,
  type ComposerSendButtonProps,
  ComposerStopButton,
  type ComposerStopButtonProps,
  ComposerTextArea as ComposerTextField,
  type ComposerTextAreaProps as ComposerTextFieldProps,
  ContextUsageRing,
  type ContextUsageRingProps,
};
