"use client";

import type { ReactNode } from "react";
import { ComposerProvider } from "../composer/composer-provider";
import type {
  ChatAdapter,
  SuggestionItem,
  UIDataTypes,
  UITools,
} from "../types";
import {
  type SlashCommand,
  SlashCommandProvider,
} from "./slash-command-provider";
import { ThreadProvider } from "./thread-provider";
import { type ToolRegistry, ToolRegistryProvider } from "./tool-registry";

export interface ChatRuntimeProps<
  METADATA = unknown,
  DATA_TYPES extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
> {
  /**
   * Stable identifier for the underlying composer. Forwarded to
   * `ComposerProvider` so drafts persist under this key and external setters
   * (e.g. "Edit with AI") can target this composer by id.
   */
  composerId: string;
  adapter: ChatAdapter<METADATA, DATA_TYPES, TOOLS>;
  suggestions?: readonly SuggestionItem[];
  toolRegistry?: ToolRegistry;
  slashCommands?: readonly SlashCommand[];
  maxAttachments?: number;
  maxAttachmentSize?: number;
  autoFocusOnKeyPress?: boolean;
  /**
   * Refocuses the textarea after adapter submission resolves.
   * Defaults off because streaming chat adapters resolve when the turn ends.
   */
  focusAfterSubmit?: boolean;
  children: ReactNode;
}

/** Composes the thread, composer, tool-registry, and slash-command providers for a chat surface. */
export function ChatRuntime<
  METADATA = unknown,
  DATA_TYPES extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
>({
  composerId,
  adapter,
  suggestions,
  toolRegistry,
  slashCommands,
  focusAfterSubmit = false,
  children,
  ...composerConfig
}: ChatRuntimeProps<METADATA, DATA_TYPES, TOOLS>) {
  let content = children;

  if (toolRegistry) {
    content = (
      <ToolRegistryProvider registry={toolRegistry}>
        {content}
      </ToolRegistryProvider>
    );
  }

  if (slashCommands && slashCommands.length > 0) {
    content = (
      <SlashCommandProvider commands={slashCommands}>
        {content}
      </SlashCommandProvider>
    );
  }

  return (
    <ThreadProvider adapter={adapter} suggestions={suggestions}>
      <ComposerProvider
        attachments={adapter.attachments}
        focusAfterSubmit={focusAfterSubmit}
        id={composerId}
        onSteer={adapter.steerMessage}
        onStop={() => adapter.stop()}
        onSubmit={adapter.sendMessage}
        threadStatus={adapter.status}
        {...composerConfig}
      >
        {content}
      </ComposerProvider>
    </ThreadProvider>
  );
}
