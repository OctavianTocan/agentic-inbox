'use client';

import type { ReactNode } from 'react';
import {
  ArrowRightIcon,
  ChevronsLeftIcon,
  PanelRightCloseIcon,
  PanelRightIcon,
  SquarePenIcon
} from '@/design-system/components/icons';
import { Button } from '@/design-system/components/ui/button';
import { useSidebar } from '@/design-system/components/ui/sidebar';
import { PanelPeek } from './panel-peek';

const SIDEBAR_PEEK_WIDTH = 300;
const CHAT_PEEK_WIDTH = 400;

type SidebarHeaderSliceProps = {
  readonly peek: ReactNode;
};

/**
 * Top-of-sidebar header band: the app icon and the sidebar toggle pinned to the
 * sidebar's right edge so it tracks resizing. The
 * band shares the sidebar's surface and border, so both continue unbroken up
 * through the chrome. In icon-collapse mode the close control hides, leaving
 * the app icon aligned with the collapsed rail actions.
 *
 * @param peek - Sidebar content shown when hovering the expanded close control.
 * @returns The sidebar header slice.
 */
export function SidebarHeaderSlice({ peek }: SidebarHeaderSliceProps) {
  const { open, toggleSidebar } = useSidebar();

  return (
    <div className="flex h-(--top-bar-height) shrink-0 items-center gap-2 px-2 group-data-[collapsible=icon]:justify-center">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md">
        <span
          aria-hidden="true"
          className="size-5 shrink-0 rounded-sm bg-[url('/app-icon.svg')] bg-cover bg-center"
        />
      </span>
      <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden" />
      <span className="shrink-0 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover/sidebar:opacity-100 group-data-[collapsible=icon]:hidden">
        <PanelPeek
          icon={<ChevronsLeftIcon className="size-4" />}
          isPanelOpen={open}
          label="Hide sidebar"
          onToggle={toggleSidebar}
          peekWidth={SIDEBAR_PEEK_WIDTH}
          side="left"
        >
          {peek}
        </PanelPeek>
      </span>
    </div>
  );
}

/**
 * Bottom rail trigger shown only while the sidebar is collapsed. The sidebar's
 * own icon buttons remain clickable above it; this control only reopens the
 * full sidebar.
 *
 * @returns The collapsed-state trigger, or nothing while the sidebar is open.
 */
export function CollapsedSidebarTrigger() {
  const { open, toggleSidebar } = useSidebar();

  if (open) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute bottom-16 left-0 z-40 hidden w-(--sidebar-width-icon) justify-center md:flex">
      <Button
        aria-label="Show sidebar"
        aria-pressed={false}
        className="pointer-events-auto duration-150 ease-panel"
        onClick={toggleSidebar}
        size="icon-sm"
        variant="ghost"
      >
        <ArrowRightIcon className="size-4" />
      </Button>
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
    <div className="pointer-events-none absolute top-2 right-4 z-40 flex h-11 items-center justify-end gap-1">
      <Button
        aria-hidden={isChatEmpty}
        aria-label="New chat"
        className="pointer-events-auto duration-150 ease-panel data-[hidden]:pointer-events-none data-[hidden]:invisible"
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
