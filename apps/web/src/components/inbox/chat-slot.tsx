'use client';

import ChatPanel from '@/components/chat/panel';
import { BotIcon, PanelRightIcon } from '@/design-system/components/icons';
import { Button } from '@/design-system/components/ui/button';
import { cn } from '@/design-system/lib/utils';

type ChatSlotProps = {
  readonly isOpen: boolean;
  readonly onToggle: () => void;
};

/**
 * Right-edge agent panel with a narrow collapse rail and resizable host panel.
 *
 * @param isOpen - Whether the chat panel is expanded.
 * @param onToggle - Called to flip the open state.
 * @returns The chat slot with its edge toggle.
 */
export function ChatSlot({ isOpen, onToggle }: ChatSlotProps) {
  return (
    <aside className="flex h-full min-w-0 bg-card" data-slot="chat-slot">
      <div className="flex w-11 shrink-0 flex-col items-center border-l bg-sidebar/60 py-2">
        <Button
          aria-label={isOpen ? 'Hide chat' : 'Show chat'}
          aria-pressed={isOpen}
          className="size-7"
          onClick={onToggle}
          size="icon-sm"
          variant="ghost"
        >
          <PanelRightIcon className="size-4" />
        </Button>
      </div>
      <div className={cn('min-w-0 flex-1', isOpen ? 'flex' : 'hidden')}>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
            <BotIcon className="size-4 text-muted-foreground" />
            <span className="font-medium text-sm">Agent</span>
          </div>
          <ChatPanel />
        </div>
      </div>
    </aside>
  );
}
