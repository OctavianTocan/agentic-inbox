import type { ComponentType } from "react";
import type { UIDataTypes, UIMessage, UIMessagePart, UITools } from "./types";

// biome-ignore lint/suspicious/noExplicitAny: ComponentType<any> is required for generic component map constraints
type AnyComponentType = ComponentType<any>;

export interface ComponentMap<
  MessageComponents extends Record<string, AnyComponentType> = Record<
    string,
    AnyComponentType
  >,
  PartComponents extends Record<string, AnyComponentType> = Record<
    string,
    AnyComponentType
  >,
> {
  messages: MessageComponents;
  parts: PartComponents;
}

export interface ResolvedMessage<
  METADATA = unknown,
  DATA_PARTS extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
> {
  Component: AnyComponentType;
  message: UIMessage<METADATA, DATA_PARTS, TOOLS>;
  messageKey: string;
}

export interface ResolvedPart<
  DATA_PARTS extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
> {
  Component: AnyComponentType;
  part: UIMessagePart<DATA_PARTS, TOOLS>;
  partKey: string;
  index: number;
}

export interface ComponentResolver<
  MessageComponents extends Record<string, AnyComponentType> = Record<
    string,
    AnyComponentType
  >,
  PartComponents extends Record<string, AnyComponentType> = Record<
    string,
    AnyComponentType
  >,
  METADATA = unknown,
  DATA_PARTS extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
> {
  components: ComponentMap<MessageComponents, PartComponents>;
  resolveMessages: (
    messages: readonly UIMessage<METADATA, DATA_PARTS, TOOLS>[],
  ) => ResolvedMessage<METADATA, DATA_PARTS, TOOLS>[];
  resolveParts: (
    message: UIMessage<METADATA, DATA_PARTS, TOOLS>,
  ) => ResolvedPart<DATA_PARTS, TOOLS>[];
}

/**
 * Build a resolver that maps messages and parts to their registered components.
 *
 * @param components - Registry of message-role and part-type components to resolve against.
 * @returns A resolver exposing the component map plus `resolveMessages`/`resolveParts`.
 */
export function createComponentResolver<
  MessageComponents extends Record<string, AnyComponentType> = Record<
    string,
    AnyComponentType
  >,
  PartComponents extends Record<string, AnyComponentType> = Record<
    string,
    AnyComponentType
  >,
  METADATA = unknown,
  DATA_PARTS extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
>(
  components: ComponentMap<MessageComponents, PartComponents>,
): ComponentResolver<
  MessageComponents,
  PartComponents,
  METADATA,
  DATA_PARTS,
  TOOLS
> {
  /** Resolves messages to their component representations. */
  const resolveMessages = (
    messages: readonly UIMessage<METADATA, DATA_PARTS, TOOLS>[],
  ): ResolvedMessage<METADATA, DATA_PARTS, TOOLS>[] => {
    const resolved: ResolvedMessage<METADATA, DATA_PARTS, TOOLS>[] = [];
    for (const message of messages) {
      const messageType = message.role;
      if (messageType && components.messages[messageType]) {
        resolved.push({
          Component: components.messages[messageType],
          message,
          messageKey: `msg-${message.id}`,
        });
      }
    }
    return resolved;
  };

  /** Resolves a message's parts to their component representations. */
  const resolveParts = (
    message: UIMessage<METADATA, DATA_PARTS, TOOLS>,
  ): ResolvedPart<DATA_PARTS, TOOLS>[] => {
    if (!(message.parts && Array.isArray(message.parts))) {
      return [];
    }

    return message.parts.flatMap((part, index) => {
      if (!(typeof part === "object" && part !== null && "type" in part)) {
        return [];
      }
      const Component = components.parts[part.type];
      if (!Component) {
        return [];
      }

      return [
        {
          Component,
          index,
          part,
          partKey: `part-${message.id}-${index}`,
        },
      ];
    });
  };

  return {
    components,
    resolveMessages,
    resolveParts,
  };
}

/**
 * Merge extension components onto a base component map, overriding by key.
 *
 * @param base - Component map to start from.
 * @param extensions - Message and part components to add, taking precedence on key collisions.
 * @returns A component map combining the base and extension message and part components.
 */
export function extendComponents<
  BaseMessageComponents extends Record<string, AnyComponentType>,
  BasePartComponents extends Record<string, AnyComponentType>,
  ExtMessageComponents extends Record<string, AnyComponentType>,
  ExtPartComponents extends Record<string, AnyComponentType>,
>(
  base: ComponentMap<BaseMessageComponents, BasePartComponents>,
  extensions: Partial<ComponentMap<ExtMessageComponents, ExtPartComponents>>,
): ComponentMap<
  BaseMessageComponents & ExtMessageComponents,
  BasePartComponents & ExtPartComponents
> {
  return {
    messages: {
      ...base.messages,
      ...extensions.messages,
    },
    parts: { ...base.parts, ...extensions.parts },
  } as ComponentMap<
    BaseMessageComponents & ExtMessageComponents,
    BasePartComponents & ExtPartComponents
  >;
}
