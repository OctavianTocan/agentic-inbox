"use client";

import { createContext, type ReactNode, use, useMemo } from "react";
import type {
  DynamicToolUIPart,
  NarrowedUIMessagePart,
  PartStatus,
  ToolContextValue,
  ToolStatus,
  ToolUIPart,
  UIDataTypes,
  UIMessagePart,
  UITools,
} from "../types";
import { useMessage } from "./message-provider";
import { useThread } from "./thread-provider";

export interface PartContextValue<
  DATA_TYPES extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
> {
  readonly part: UIMessagePart<DATA_TYPES, TOOLS>;
  readonly isLast: boolean;
  readonly index: number;
  readonly status: PartStatus;
  readonly tool: ToolContextValue | null;
}

const PartContext = createContext<PartContextValue | undefined>(undefined);

export interface PartProviderProps<
  DATA_TYPES extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
> {
  children: ReactNode;
  part: UIMessagePart<DATA_TYPES, TOOLS>;
  index: number;
  isLast: boolean;
}

/** True when the part is a static (`tool-*`) or dynamic tool invocation. */
function isToolUIPart(
  part: UIMessagePart<UIDataTypes, UITools>,
): part is ToolUIPart<UITools> | DynamicToolUIPart {
  return part.type === "dynamic-tool" || part.type.startsWith("tool-");
}

/** Tool name of a tool part: the `toolName` field for dynamic tools, else the `tool-` suffix. */
function getToolName(part: ToolUIPart<UITools> | DynamicToolUIPart): string {
  return part.type === "dynamic-tool" ? part.toolName : part.type.slice(5);
}

/** Maps a tool-part state string to the UI's {@link ToolStatus}. */
function toToolStatus(state: string, errorText?: string): ToolStatus {
  switch (state) {
    case "input-streaming":
      return { type: "input-streaming" };
    case "input-available":
      return { type: "awaiting-result" };
    case "output-available":
      return { type: "complete" };
    case "output-error":
      return errorText === undefined
        ? { type: "error" }
        : { type: "error", message: errorText };
    default:
      return { type: "awaiting-result" };
  }
}

/** Provides per-part state (status and, for tool parts, tool context) to descendants. */
export function PartProvider<
  DATA_TYPES extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
>({ part, index, isLast, children }: PartProviderProps<DATA_TYPES, TOOLS>) {
  const { status: messageStatus } = useMessage();
  const thread = useThread();

  const value = useMemo(() => {
    const status: PartStatus = (() => {
      if (isLast && messageStatus.type === "streaming") {
        return { type: "streaming" };
      }
      if (messageStatus.type === "error") {
        return { type: "error", error: messageStatus.error };
      }
      return { type: "complete" };
    })();

    const tool: ToolContextValue | null = isToolUIPart(part)
      ? {
          name: getToolName(part),
          toolCallId: part.toolCallId,
          input: part.input,
          output: part.output,
          ...(part.errorText !== undefined && { errorText: part.errorText }),
          status: toToolStatus(part.state, part.errorText),
          submitResult: async (output: unknown) => {
            await thread.addToolOutput({
              tool: getToolName(part),
              toolCallId: part.toolCallId,
              state: "output-available",
              output,
            });
          },
        }
      : null;

    return { part, index, isLast, status, tool };
  }, [part, index, isLast, messageStatus, thread]);

  return <PartContext.Provider value={value}>{children}</PartContext.Provider>;
}

type UsePartOptions<
  // biome-ignore lint/suspicious/noExplicitAny: generic constraint requires any to accept all UIMessagePart type parameters
  T extends UIMessagePart<any, any>["type"] | undefined = undefined,
> = T extends undefined ? undefined : { type: T };

type PartContextValueWithNarrowedPart<
  // biome-ignore lint/suspicious/noExplicitAny: generic constraint requires any to accept all UIMessagePart type parameters
  T extends UIMessagePart<any, any>["type"] | undefined,
  DATA_TYPES extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
> = Omit<PartContextValue<DATA_TYPES, TOOLS>, "part"> & {
  part: T extends undefined
    ? UIMessagePart<DATA_TYPES, TOOLS>
    : NarrowedUIMessagePart<T, DATA_TYPES, TOOLS>;
};

export function usePart<
  DATA_TYPES extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
>(): PartContextValue<DATA_TYPES, TOOLS>;
export function usePart<
  // biome-ignore lint/suspicious/noExplicitAny: generic constraint requires any to accept all UIMessagePart type parameters
  T extends UIMessagePart<any, any>["type"],
  DATA_TYPES extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
>(options: { type: T }): PartContextValueWithNarrowedPart<T, DATA_TYPES, TOOLS>;
/**
 * Reads the surrounding `PartProvider` context, optionally narrowing the part
 * to a given type.
 *
 * @typeParam T - Part `type` to narrow to, or `undefined` for the unnarrowed part.
 * @param options - Optional `type` to assert and narrow the part to.
 * @returns The part context value, narrowed when `options.type` is supplied.
 * @throws When called outside a `PartProvider`, or when `options.type` is given
 *   and does not match the part's type.
 */
export function usePart<
  // biome-ignore lint/suspicious/noExplicitAny: generic constraint requires any to accept all UIMessagePart type parameters
  T extends UIMessagePart<any, any>["type"] | undefined = undefined,
  DATA_TYPES extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
>(
  options?: UsePartOptions<T>,
):
  | PartContextValueWithNarrowedPart<T, DATA_TYPES, TOOLS>
  | PartContextValue<DATA_TYPES, TOOLS> {
  const context = use(
    PartContext as React.Context<
      PartContextValue<DATA_TYPES, TOOLS> | undefined
    >,
  );
  if (context === undefined) {
    throw new Error("usePart must be used within a PartProvider");
  }

  if (!options) {
    return context;
  }

  const { part, ...rest } = context;

  if (options.type && part.type !== options.type) {
    throw new Error(
      `Part type mismatch: expected ${options.type}, got ${part.type}`,
    );
  }

  return {
    ...rest,
    part,
  };
}
