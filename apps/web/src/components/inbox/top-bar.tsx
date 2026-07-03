'use client';

import type { ReactNode } from 'react';
import {
  PanelLeftCloseIcon,
  PanelLeftIcon,
  PanelRightCloseIcon,
  PanelRightIcon,
  SquarePenIcon
} from '@/design-system/components/icons';
import { Button } from '@/design-system/components/ui/button';
import { useSidebar } from '@/design-system/components/ui/sidebar';
import { cn } from '@/design-system/lib/utils';
import { PanelPeek } from './panel-peek';

const SIDEBAR_PEEK_WIDTH = 300;
const CHAT_PEEK_WIDTH = 400;

type SidebarHeaderSliceProps = {
  readonly title: string;
  readonly peek: ReactNode;
};

/**
 * Top-of-sidebar header band: the app icon, the collapsing page title, and the
 * sidebar toggle pinned to the sidebar's right edge so it tracks resizing. The
 * band shares the sidebar's surface and border, so both continue unbroken up
 * through the chrome. It slides off-screen with the sidebar on collapse; the
 * collapsed rail is served by CollapsedSidebarTrigger.
 *
 * @param title - Page title shown next to the app icon; hidden when collapsed.
 * @param peek - Sidebar content shown when peeking the collapsed rail.
 * @returns The sidebar header slice.
 */
export function SidebarHeaderSlice({ title, peek }: SidebarHeaderSliceProps) {
  const { open, toggleSidebar } = useSidebar();

  return (
    <div className="flex h-(--top-bar-height) shrink-0 items-center gap-2 px-3">
      <span
        aria-hidden="true"
        className="size-5 shrink-0 rounded-sm bg-[url('/app-icon.svg')] bg-cover bg-center"
      />
      <span
        className={cn(
          'min-w-0 flex-1 truncate font-display font-medium text-sm tracking-tight transition-opacity duration-200 ease-panel',
          open ? 'opacity-100' : 'opacity-0'
        )}
      >
        {title}
      </span>
      <PanelPeek
        icon={<PanelLeftCloseIcon className="size-4" />}
        isPanelOpen={open}
        label="Hide sidebar"
        onToggle={toggleSidebar}
        peekWidth={SIDEBAR_PEEK_WIDTH}
        side="left"
      >
        {peek}
      </PanelPeek>
    </div>
  );
}

type CollapsedSidebarTriggerProps = {
  readonly peek: ReactNode;
};

/**
 * Far-left chrome trigger shown only while the sidebar is collapsed: the app
 * icon doubles as the peek/expand affordance the collapsed rail otherwise
 * lacks. Hovering reveals the sidebar peek; clicking reopens the sidebar.
 *
 * @param peek - Sidebar content shown when peeking the collapsed rail.
 * @returns The collapsed-state trigger, or nothing while the sidebar is open.
 */
export function CollapsedSidebarTrigger({
  peek
}: CollapsedSidebarTriggerProps) {
  const { open, toggleSidebar } = useSidebar();

  if (open) {
    return null;
  }

  return (
    <div className="absolute top-0 left-0 z-40 flex h-(--top-bar-height) items-center pl-3">
      <PanelPeek
        icon={<PanelLeftIcon className="size-4" />}
        isPanelOpen={false}
        label="Show sidebar"
        onToggle={toggleSidebar}
        peekWidth={SIDEBAR_PEEK_WIDTH}
        side="left"
      >
        {peek}
      </PanelPeek>
    </div>
  );
}

type ChatHeaderSliceProps = {
  readonly isChatOpen: boolean;
  readonly onToggleChat: () => void;
  readonly onNewChat: () => void;
  readonly isChatEmpty: boolean;
  readonly chatPeek: ReactNode;
};

/**
 * Chat header controls: chat title, new-chat, and the chat toggle, anchored to
 * the top-right of the chrome. Rendered as a transparent overlay so the chat
 * surface and its left border (from the chat column beneath) continue up
 * through the band; the controls hold their right-edge place whether the chat
 * panel is open or collapsed, and regardless of the sidebar state.
 *
 * @param isChatOpen - Whether the right chat panel is expanded.
 * @param onToggleChat - Toggles the chat panel open or closed.
 * @param onNewChat - Resets the chat thread to an empty conversation.
 * @param isChatEmpty - Whether the chat thread is empty, hiding new-chat.
 * @param chatPeek - Chat content shown when peeking the collapsed chat panel.
 * @returns The chat header controls overlay.
 */
export function ChatHeaderSlice({
  isChatOpen,
  onToggleChat,
  onNewChat,
  isChatEmpty,
  chatPeek
}: ChatHeaderSliceProps) {
  const ChatIcon = isChatOpen ? PanelRightCloseIcon : PanelRightIcon;

  return (
    <div className="pointer-events-none absolute top-0 right-0 z-40 flex h-(--top-bar-height) items-center justify-end gap-1 pr-3 pl-4">
      <span
        aria-hidden={!isChatOpen}
        className="pointer-events-auto font-medium text-muted-foreground text-sm data-[hidden]:invisible"
        data-hidden={isChatOpen ? undefined : ''}
      >
        Ask about your inbox
      </span>
      <Button
        aria-hidden={isChatEmpty}
        aria-label="New chat"
        className="pointer-events-auto data-[hidden]:pointer-events-none data-[hidden]:invisible"
        data-hidden={isChatEmpty ? '' : undefined}
        onClick={onNewChat}
        size="icon-sm"
        tabIndex={isChatEmpty ? -1 : undefined}
        variant="ghost"
      >
        <SquarePenIcon className="size-4" />
      </Button>
      <div className="pointer-events-auto">
        <PanelPeek
          icon={<ChatIcon className="size-4" />}
          isPanelOpen={isChatOpen}
          label={isChatOpen ? 'Hide chat' : 'Show chat'}
          onToggle={onToggleChat}
          peekWidth={CHAT_PEEK_WIDTH}
          side="right"
        >
          {chatPeek}
        </PanelPeek>
      </div>
    </div>
  );
}
