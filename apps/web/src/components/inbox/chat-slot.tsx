'use client';

import ChatPanel from '@/components/chat/panel';
import { PanelRightIcon } from '@/design-system/components/icons';
import { Button } from '@/design-system/components/ui/button';
import { cn } from '@/design-system/lib/utils';

type ChatSlotProps = {
  readonly isOpen: boolean;
  readonly onToggle: () => void;
};

/**
 * Right-edge collapsible chat slot. Stays mounted and hidden with CSS when
 * closed so the chat agent's conversation state survives toggles.
 *
 * @param isOpen - Whether the chat panel is expanded.
 * @param onToggle - Called to flip the open state.
 * @returns The chat slot with its edge toggle.
 */
export function ChatSlot({ isOpen, onToggle }: ChatSlotProps) {
  return (
    <div className="flex h-full">
      <div className="flex flex-col border-l bg-card">
        <Button
          aria-label={isOpen ? 'Hide chat' : 'Show chat'}
          aria-pressed={isOpen}
          className="m-1"
          onClick={onToggle}
          size="icon"
          variant="ghost"
        >
          <PanelRightIcon />
        </Button>
      </div>
      <div
        className={cn(
          'h-full w-96 overflow-hidden border-l bg-card transition-all',
          isOpen ? 'w-96' : 'w-0 border-l-0'
        )}
      >
        <div className={cn('h-full', isOpen ? 'block' : 'hidden')}>
          <ChatPanel />
        </div>
      </div>
    </div>
  );
}
