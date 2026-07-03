'use client';

import { useEffect, useMemo } from 'react';
import { ChatRuntime } from '@/ai-ui/providers/chat-runtime';
import { useThread } from '@/ai-ui/providers/thread-provider';
import { createToolRegistry } from '@/ai-ui/providers/tool-registry-utils';
import type { SuggestionItem } from '@/ai-ui/types';
import {
  MessageSquareIcon,
  TriangleAlertIcon
} from '@/design-system/components/icons';
import { AgentSpinner } from '@/design-system/components/ui/agent-spinner';
import {
  Composer,
  ComposerContent,
  ComposerFooter,
  ComposerSendButton,
  ComposerStopButton,
  ComposerTextField
} from '@/design-system/components/ui/ai/composer';
import {
  MessageList,
  MessageListBottomSpacer,
  MessageListContent
} from '@/design-system/components/ui/ai/message-list';
import {
  Suggestion,
  Suggestions
} from '@/design-system/components/ui/ai/suggestions';
import { Thread } from '@/design-system/components/ui/ai/thread';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/design-system/components/ui/empty';
import { TextShimmer } from '@/design-system/components/ui/text-shimmer';
import { cn } from '@/design-system/lib/utils';
import { useChatAdapter } from '@/lib/chat/adapter';
import { createHttpTransport } from '@/lib/chat/http-transport';
import type { ChatTransport } from '@/lib/chat/transport';
import {
  type DraftBridgeHandler,
  DraftBridgeProvider
} from './draft-bridge-context';
import { LabeledToolBlock } from './labeled-tool-block';
import { ThreadMessages } from './thread-messages';
import { TOOL_LABELS } from './tool-labels';

const COMPOSER_ID = 'inbox-chat';

const SUGGESTED_PROMPTS: readonly SuggestionItem[] = [
  { label: 'What needs my attention?' },
  { label: 'Undo the reply to the vendor quote' },
  { label: 'Draft an approval for the PCO #14 change order' }
];

const toolRegistry = createToolRegistry(
  Object.fromEntries(
    Object.keys(TOOL_LABELS).map((name) => [name, LabeledToolBlock])
  )
);

/** Empty conversation state with three starter prompts wired to the composer. */
function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
      <Empty className="border-0 p-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MessageSquareIcon />
          </EmptyMedia>
          <EmptyTitle>Ask about your inbox</EmptyTitle>
          <EmptyDescription>
            The agent can search, explain what it did, draft replies, and undo
            actions.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
      <Suggestions>
        {SUGGESTED_PROMPTS.map((prompt) => (
          <Suggestion key={prompt.label} label={prompt.label} />
        ))}
      </Suggestions>
    </div>
  );
}

/** Thinking affordance shown after submit, before the first assistant chunk. */
function ThinkingRow() {
  const { status } = useThread();
  if (status.type !== 'submitting') {
    return null;
  }
  return (
    <div className="flex items-center gap-2 px-1 text-sm">
      <AgentSpinner variant="dotsCircle" />
      <TextShimmer as="span" baseColor="var(--muted-foreground)">
        Thinking…
      </TextShimmer>
    </div>
  );
}

/** Quiet inline row surfacing a failed turn so the user sees the request errored. */
function ErrorRow() {
  const { status } = useThread();
  if (status.type !== 'error') {
    return null;
  }
  return (
    <div className="flex items-start gap-2 px-1 text-destructive text-sm">
      <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
      <span>{status.error.message || 'Something went wrong. Try again.'}</span>
    </div>
  );
}

type ChatSurfaceProps = {
  readonly composerClassName?: string;
};

/** Message stream over a bottom-pinned composer; empty state replaces the stream when idle. */
function ChatSurface({ composerClassName }: ChatSurfaceProps) {
  const { messages, status } = useThread();
  const hasMessages = messages.length > 0;
  const isBusy = status.type === 'submitting' || status.type === 'streaming';

  return (
    <Thread className="min-h-0 flex-1">
      {hasMessages ? (
        <MessageList className="flex-1">
          <MessageListContent className="gap-6 px-4 pt-6">
            <ThreadMessages />
            <ThinkingRow />
            <ErrorRow />
            <MessageListBottomSpacer className="min-h-8" />
          </MessageListContent>
        </MessageList>
      ) : (
        <EmptyState />
      )}
      <div className={cn('shrink-0 px-3 pb-3', composerClassName)}>
        <Composer>
          <ComposerContent>
            <ComposerTextField placeholder="Ask agent" />
          </ComposerContent>
          <ComposerFooter>
            <span />
            <div className="flex items-center gap-1">
              <ComposerSendButton />
              {isBusy ? <ComposerStopButton /> : null}
            </div>
          </ComposerFooter>
        </Composer>
      </div>
    </Thread>
  );
}

type ThreadEmptyReporterProps = {
  readonly onEmptyChange: (isEmpty: boolean) => void;
};

/** Reports thread emptiness upward so the host can gate a "new chat" affordance. */
function ThreadEmptyReporter({ onEmptyChange }: ThreadEmptyReporterProps) {
  const { messages } = useThread();
  const isEmpty = messages.length === 0;
  useEffect(() => {
    onEmptyChange(isEmpty);
  }, [isEmpty, onEmptyChange]);
  return null;
}

export type ChatPanelProps = {
  /** Streaming backend for a turn; defaults to the API chat transport. */
  readonly transport?: ChatTransport;
  /** Extra classes for the composer container, e.g. keyboard-safe padding. */
  readonly composerClassName?: string;
  /** Receives a draft when a chat tool part hands off to the inbox detail pane. */
  readonly onOpenDraft?: DraftBridgeHandler;
  /** Notified when the thread becomes empty or non-empty, for a host reset control. */
  readonly onEmptyChange?: (isEmpty: boolean) => void;
};

const noopDraft: DraftBridgeHandler = () => {};

/**
 * Chat sidepanel content: an ai-ui `ChatRuntime` over the backend chat
 * transport, rendering the design-system thread, tool badges, and composer.
 * The right-edge collapse behavior is owned by the inbox shell.
 */
export default function ChatPanel({
  transport,
  composerClassName,
  onOpenDraft = noopDraft,
  onEmptyChange
}: ChatPanelProps) {
  const resolvedTransport = useMemo(
    () => transport ?? createHttpTransport(),
    [transport]
  );
  const adapter = useChatAdapter(resolvedTransport);

  return (
    <DraftBridgeProvider value={onOpenDraft}>
      <ChatRuntime
        adapter={adapter}
        composerId={COMPOSER_ID}
        suggestions={SUGGESTED_PROMPTS}
        toolRegistry={toolRegistry}
      >
        {onEmptyChange ? (
          <ThreadEmptyReporter onEmptyChange={onEmptyChange} />
        ) : null}
        <div className="flex h-full min-h-0 flex-col">
          <ChatSurface
            {...(composerClassName !== undefined && { composerClassName })}
          />
        </div>
      </ChatRuntime>
    </DraftBridgeProvider>
  );
}
