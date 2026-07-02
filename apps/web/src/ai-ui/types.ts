import type {
  ReasoningUIPart as AISdkReasoningUIPart,
  UIMessage as AISdkUIMessage,
  ChatStatus,
  DataUIPart,
  DynamicToolUIPart,
  FileUIPart,
  ImagePart,
  SourceDocumentUIPart,
  SourceUrlUIPart,
  StepStartUIPart,
  TextUIPart,
  ToolUIPart,
  UIDataTypes,
  UITools,
} from "ai";

export type {
  ChatRequestOptions,
  ChatStatus,
  DataUIPart,
  DynamicToolUIPart,
  FileUIPart,
  ImagePart,
  TextUIPart,
  ToolResultPart,
  ToolUIPart,
  UIDataTypes,
  UITools,
} from "ai";

/**
 * Reasoning part extended with timing the harness records as the model
 * streams reasoning chunks. Both timestamps are wall-clock epoch ms.
 * `endedAt` is absent until the model emits `reasoning-end` (or the stream
 * is interrupted before completion).
 */
export type ReasoningUIPart = AISdkReasoningUIPart & {
  startedAt?: number;
  endedAt?: number;
};

export type UIMessagePart<
  DATA_TYPES extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
> =
  | TextUIPart
  | ReasoningUIPart
  | ToolUIPart<TOOLS>
  | DynamicToolUIPart
  | SourceUrlUIPart
  | SourceDocumentUIPart
  | FileUIPart
  | DataUIPart<DATA_TYPES>
  | StepStartUIPart;

export type UIMessage<
  METADATA = unknown,
  DATA_TYPES extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
> = Omit<AISdkUIMessage<METADATA, DATA_TYPES, TOOLS>, "parts"> & {
  parts: UIMessagePart<DATA_TYPES, TOOLS>[];
};

export type ThreadStatus =
  | { readonly type: "ready" }
  | { readonly type: "submitting" }
  | { readonly type: "streaming"; readonly messageId?: string }
  | { readonly type: "error"; readonly error: Error };

export type ComposerStatus =
  | { readonly type: "empty" }
  | { readonly type: "ready" }
  | { readonly type: "submitting" }
  | { readonly type: "streaming" }
  | {
      readonly type: "blocked";
      readonly reason:
        | "max-attachments"
        | "max-size"
        | "attachment-pending"
        | "attachment-error";
    };

export type MessageStatus =
  | { readonly type: "complete" }
  | { readonly type: "streaming" }
  | { readonly type: "error"; readonly error: Error };

export type PartStatus =
  | { readonly type: "complete" }
  | { readonly type: "streaming" }
  | { readonly type: "error"; readonly error: Error };

export type ToolStatus =
  | {
      readonly type: "disabled";
      readonly reason: "not-dynamic-tool" | "not-supported";
    }
  | { readonly type: "input-streaming" }
  | { readonly type: "awaiting-result" }
  | { readonly type: "complete" }
  | { readonly type: "error"; readonly message?: string };

export type AttachmentStatus =
  | { readonly type: "pending" }
  | { readonly type: "uploading"; readonly progress?: number }
  | { readonly type: "ready" }
  | { readonly type: "removing" }
  | { readonly type: "error"; readonly message?: string };

export interface Attachment {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly size?: number;
  readonly url?: string;
  readonly content?: string;
  readonly preview?: string;
  /**
   * Upload lifecycle. `undefined` means a legacy/inline attachment whose bytes
   * live in `content` (base64 data URL); a `status` of type `'ready'` paired
   * with `path` means the bytes were uploaded to the sandbox and the path is
   * the source of truth.
   */
  readonly status?: AttachmentStatus;
  /** Sandbox path the uploaded file resolved to. Only set once `status` is `'ready'`. */
  readonly path?: string;
}

export interface CreateMessage {
  readonly content: string;
  readonly attachments?: readonly Attachment[];
}

export interface SuggestionItem {
  readonly label: string;
  readonly icon?: React.ComponentType<{ className?: string }>;
  readonly action?: () => void;
}

export interface ToolContextValue {
  readonly name: string;
  readonly toolCallId: string;
  readonly input: unknown;
  readonly output: unknown;
  readonly errorText?: string;
  readonly status: ToolStatus;
  submitResult(output: unknown): Promise<void>;
}

export interface ChatAdapter<
  METADATA = unknown,
  DATA_TYPES extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
> {
  readonly messages: readonly UIMessage<METADATA, DATA_TYPES, TOOLS>[];
  readonly status: ThreadStatus;
  readonly error?: Error;
  sendMessage(message: CreateMessage): Promise<void>;
  /**
   * Send a message that interrupts the running turn (cancels the queue and
   * any in-flight model call, then runs this message immediately). Optional —
   * adapters whose backend has no steer concept can omit this; the composer
   * UI then disables the steer affordance.
   */
  steerMessage?(message: CreateMessage): Promise<void>;
  /** Attachment intake for the composer. Omit when the backend has no file support. */
  readonly attachments?: AttachmentAdapter;
  stop(): void;
  regenerate(options?: { messageId?: string }): Promise<void>;
  edit(
    messageId: string,
    content: string,
    attachments?: readonly Attachment[],
  ): Promise<void>;
  setMessages(
    messagesOrUpdater:
      | UIMessage<METADATA, DATA_TYPES, TOOLS>[]
      | ((
          prev: UIMessage<METADATA, DATA_TYPES, TOOLS>[],
        ) => UIMessage<METADATA, DATA_TYPES, TOOLS>[]),
  ): void;
  addToolOutput(
    params:
      | {
          tool: string;
          toolCallId: string;
          output: unknown;
          state: "output-available";
        }
      | {
          tool: string;
          toolCallId: string;
          state: "output-error";
          errorText: string;
        },
  ): Promise<void>;
  clearError(): void;
}

export interface AttachmentAdapter {
  accept?: string;
  add: (file: File) => Promise<Attachment>;
  remove: (attachment: Attachment) => Promise<void>;
}

/** True when the composer must not submit: unready attachments always (even while streaming); busy unless allowed; intake caps (max-attachments) only gate adding. */
export function blocksComposerSubmit(
  status: ComposerStatus,
  submitWhileBusy: boolean,
  attachments: readonly Attachment[],
): boolean {
  const hasUnreadyAttachment = attachments.some(
    (attachment) =>
      attachment.status !== undefined && attachment.status.type !== "ready",
  );
  if (hasUnreadyAttachment) {
    return true;
  }
  const isBusy = status.type === "submitting" || status.type === "streaming";
  return isBusy && !submitWhileBusy;
}

/**
 * Map an AI SDK chat status into the thread status consumed by the UI.
 *
 * @param sdkStatus - Status reported by the AI SDK chat.
 * @param error - Failure to surface when `sdkStatus` is `'error'`; a generic error is used when omitted.
 * @returns The thread status discriminated union for the given SDK status.
 */
export function toThreadStatus(
  sdkStatus: ChatStatus,
  error?: Error,
): ThreadStatus {
  switch (sdkStatus) {
    case "submitted":
      return { type: "submitting" };
    case "streaming":
      return { type: "streaming" };
    case "error":
      return { type: "error", error: error ?? new Error("Unknown error") };
    default:
      return { type: "ready" };
  }
}

export type NarrowedUIMessagePart<
  // biome-ignore lint/suspicious/noExplicitAny: generic constraint requires any to accept all UIMessagePart type parameters
  T extends UIMessagePart<any, any>["type"] | undefined,
  DATA_TYPES extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
> = T extends "text"
  ? TextUIPart
  : T extends "dynamic-tool"
    ? DynamicToolUIPart
    : T extends "image"
      ? ImagePart
      : T extends "reasoning"
        ? ReasoningUIPart
        : T extends "file"
          ? FileUIPart
          : T extends `tool-${infer ToolName}`
            ? ToolName extends keyof TOOLS & string
              ? ToolUIPart<Pick<TOOLS, ToolName>>
              : ToolUIPart<TOOLS>
            : T extends `data-${string}`
              ? DataUIPart<DATA_TYPES>
              : T extends undefined
                ? UIMessagePart<DATA_TYPES, TOOLS>
                : never;
