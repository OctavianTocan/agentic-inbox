'use client';

import ChatPanel from '@/components/chat/panel';
import { BotIcon, PanelRightIcon } from '@/design-system/components/icons';
import { Button } from '@/design-system/components/ui/button';

type ChatSlotProps = {
  readonly isOpen: boolean;
  readonly onToggle: () => void;
};

/**
 * Right-edge agent panel with the collapse control inside the panel chrome.
 *
 * @param isOpen - Whether the chat panel is expanded.
 * @param onToggle - Called to flip the open state.
 * @returns The chat slot with its edge toggle.
 */
export function ChatSlot({ isOpen, onToggle }: ChatSlotProps) {
  if (!isOpen) {
    return (
      <aside
        className="flex h-full items-start justify-center border-l bg-card p-2"
        data-slot="chat-slot"
      >
        <Button
          aria-label="Show chat"
          aria-pressed={false}
          onClick={onToggle}
          size="icon-sm"
          variant="ghost"
        >
          <PanelRightIcon className="size-4" />
        </Button>
      </aside>
    );
  }

  return (
    <aside
      className="flex h-full min-w-0 border-l bg-card"
      data-slot="chat-slot"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-3">
          <div className="flex min-w-0 items-center gap-2">
            <BotIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="font-medium text-sm">Agent</span>
          </div>
          <Button
            aria-label="Hide chat"
            aria-pressed
            onClick={onToggle}
            size="icon-sm"
            variant="ghost"
          >
            <PanelRightIcon className="size-4" />
          </Button>
        </div>
        <ChatPanel />
      </div>
    </aside>
  );
}
