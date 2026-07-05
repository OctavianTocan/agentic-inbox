'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ChatPanel from '@/components/chat/panel';
import {
  HistoryIcon,
  InboxIcon,
  MenuIcon,
  RefreshCwIcon,
  SearchIcon,
  SquarePenIcon
} from '@/design-system/components/icons';
import { AgentSpinner } from '@/design-system/components/ui/agent-spinner';
import { Button } from '@/design-system/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle
} from '@/design-system/components/ui/drawer';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@/design-system/components/ui/resizable';
import {
  SidebarInset,
  SidebarProvider,
  useSidebar
} from '@/design-system/components/ui/sidebar';
import { useIsMobile } from '@/design-system/hooks/use-mobile';
import { useShortcut } from '@/design-system/hooks/use-shortcut';
import type { ShortcutDefinition } from '@/design-system/lib/shortcuts';
import { cn } from '@/design-system/lib/utils';
import type { SortKey } from '@/lib/inbox/sort';
import type { InboxItem } from '@/lib/inbox/types';
import { ChatSlot } from './chat-slot';
import { DetailPane } from './detail-pane';
import { EMPTY_FILTERS, type InboxFilters } from './filters';
import { InboxList } from './inbox-list';
import { InboxFilterMenu, InboxSidebar } from './inbox-sidebar';
import { InboxSummaryBlock } from './inbox-summary';
import { orderedItems } from './ordering';
import { PanelLoading } from './panel-loading';
import { RunView } from './run-view';
import {
  clearRunViewRequest,
  hasSeenInbox,
  isRunViewRequested,
  markInboxSeen,
  useSharedChatOpen
} from './session-state';
import { ChatHeaderSlice, CollapsedSidebarTrigger } from './top-bar';
import { useInbox } from './use-inbox';

const SHORTCUTS = {
  next: {
    id: 'inbox.next',
    keys: 'j',
    label: 'Next email',
    category: 'navigation'
  },
  prev: {
    id: 'inbox.prev',
    keys: 'k',
    label: 'Previous email',
    category: 'navigation'
  },
  open: {
    id: 'inbox.open',
    keys: 'Enter',
    label: 'Open email',
    category: 'navigation'
  },
  approve: {
    id: 'inbox.approve',
    keys: 'e',
    label: 'Approve',
    category: 'actions'
  },
  deny: { id: 'inbox.deny', keys: 'd', label: 'Deny', category: 'actions' },
  undo: { id: 'inbox.undo', keys: 'u', label: 'Undo', category: 'actions' },
  clear: {
    id: 'inbox.clear',
    keys: 'Escape',
    label: 'Clear selection',
    category: 'navigation'
  }
} satisfies Record<string, ShortcutDefinition>;

const DETAIL_CLOSE_ANIMATION_MS = 220;

/** Prior emails in the same thread as `item`, oldest first. */
function threadContext(
  item: InboxItem | null,
  items: readonly InboxItem[]
): readonly InboxItem[] {
  if (item === null || item.email.inReplyTo === null) {
    return [];
  }
  const parent = items.find((row) => row.email.id === item.email.inReplyTo);
  return parent ? [parent] : [];
}

/** Chat panel body for the right-side hover peek, matching the docked slot. */
export function ChatPeek() {
  return (
    <>
      <div className="flex h-11 shrink-0 items-center border-b px-4">
        <span className="font-medium text-sm">Ask about your inbox</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ChatPanel />
      </div>
    </>
  );
}

type SidebarPeekProps = {
  readonly items: readonly InboxItem[];
  readonly filters: InboxFilters;
  readonly onFiltersChange: (filters: InboxFilters) => void;
  readonly ledgerCount: number;
  readonly showFilters?: boolean;
  readonly onRunAgent?: () => void;
};

/**
 * Left-side hover peek that mirrors the docked desktop rail: Inbox/Audit
 * navigation, the re-run action, and, when enabled, the same compact desktop
 * filter menu.
 *
 * @param items - Triaged items, used for counts and filter facets.
 * @param filters - Active filter facets.
 * @param onFiltersChange - Called with the next filter set on any toggle.
 * @param ledgerCount - Audit event count shown against the Audit link.
 * @param showFilters - Whether to render the filter menu below the nav.
 * @param onRunAgent - Called to open the run screen; omit to hide the action.
 * @returns The sidebar peek body.
 */
export function SidebarPeek({
  items,
  filters,
  onFiltersChange,
  ledgerCount,
  showFilters = true,
  onRunAgent
}: SidebarPeekProps) {
  return (
    <div className="flex min-h-0 flex-col gap-3 overflow-y-auto p-3">
      <nav className="flex flex-col gap-0.5">
        <Button
          className="h-9 w-full justify-start gap-2 px-2.5"
          render={<Link href="/" />}
          size="sm"
          variant="ghost"
        >
          <InboxIcon className="size-4" />
          <span className="flex-1 text-left">Inbox</span>
          <span className="text-muted-foreground text-xs tabular-nums">
            {items.length}
          </span>
        </Button>
        <Button
          className="h-9 w-full justify-start gap-2 px-2.5"
          render={<Link href="/audit" />}
          size="sm"
          variant="ghost"
        >
          <HistoryIcon className="size-4" />
          <span className="flex-1 text-left">Audit</span>
          <span className="text-muted-foreground text-xs tabular-nums">
            {ledgerCount}
          </span>
        </Button>
        {onRunAgent ? (
          <Button
            className="h-9 w-full justify-start gap-2 px-2.5"
            onClick={onRunAgent}
            size="sm"
            variant="ghost"
          >
            <RefreshCwIcon className="size-4" />
            <span className="flex-1 text-left">Re-run triage</span>
          </Button>
        ) : null}
      </nav>
      {showFilters ? (
        <InboxFilterMenu
          filters={filters}
          items={items}
          onFiltersChange={onFiltersChange}
        />
      ) : null}
    </div>
  );
}

type MobileTopBarProps = {
  readonly ledgerCount: number;
  readonly onOpenChat: () => void;
};

/** Mobile toolbar with large buttons for the hidden side panels. */
function MobileTopBar({ ledgerCount, onOpenChat }: MobileTopBarProps) {
  const { setOpenMobile } = useSidebar();

  return (
    <div className="shrink-0 border-b bg-sidebar/95 px-3 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur md:hidden">
      <div className="flex items-center gap-2">
        <Button
          aria-label="Open inbox menu"
          className="size-10 shrink-0"
          onClick={() => setOpenMobile(true)}
          size="icon-lg"
          variant="outline"
        >
          <MenuIcon />
        </Button>
        <Button
          className="h-10 min-w-0 flex-1 justify-start gap-2 px-3 text-left"
          onClick={onOpenChat}
          size="lg"
          variant="outline"
        >
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-muted-foreground">
            Ask agent
          </span>
        </Button>
        <Button
          aria-label={`Open audit with ${ledgerCount} events`}
          className="size-10 shrink-0"
          render={<Link href="/audit" />}
          size="icon-lg"
          variant="outline"
        >
          <HistoryIcon />
        </Button>
      </div>
    </div>
  );
}

/**
 * Inbox shell: filter rail, list, detail pane, and resizable chat slot. Owns
 * the selection and filter state and binds j/k/enter/e/d/u/escape shortcuts.
 *
 * @param persistedWidth - Server-read sidebar width (px) that seeds the initial render, avoiding a first-frame jump.
 * @returns The inbox application shell.
 */
export function InboxShell({ persistedWidth }: { persistedWidth?: number }) {
  const {
    inbox,
    isLoading,
    refresh,
    runTriage,
    approve,
    deny,
    undo,
    retriage
  } = useInbox();
  const [filters, setFilters] = useState<InboxFilters>(EMPTY_FILTERS);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [viewedEmailIds, setViewedEmailIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const [isChatOpen, setIsChatOpen] = useSharedChatOpen();
  const [chatKey, setChatKey] = useState(0);
  const [isChatEmpty, setIsChatEmpty] = useState(true);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailClosing, setIsDetailClosing] = useState(false);
  const [activePane, setActivePane] = useState<'list' | 'detail'>('list');
  const [sortKey, setSortKey] = useState<SortKey>('severity');
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [mobileChatKey, setMobileChatKey] = useState(0);
  const [isMobileChatEmpty, setIsMobileChatEmpty] = useState(true);
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  // Seeded from a pending cross-page request so a click on the audit sidebar's
  // "Re-run triage" lands on the run screen after navigating back to the inbox.
  const [runViewRequested, setRunViewRequested] = useState(isRunViewRequested);
  const mobileChatRef = useRef<HTMLDivElement>(null);
  const detailCloseTimerRef = useRef<number | null>(null);
  const isMobile = useIsMobile();

  const clearDetailCloseTimer = useCallback(() => {
    if (detailCloseTimerRef.current === null) {
      return;
    }
    window.clearTimeout(detailCloseTimerRef.current);
    detailCloseTimerRef.current = null;
  }, []);

  // The cross-page request is captured into local state on mount; clear the
  // module flag so a later reload or re-navigation does not re-trigger it.
  useEffect(() => {
    clearRunViewRequest();
  }, []);

  useEffect(() => clearDetailCloseTimer, [clearDetailCloseTimer]);

  const toggleChat = useCallback(() => {
    setIsChatOpen(!isChatOpen);
  }, [isChatOpen, setIsChatOpen]);

  const handleNewChat = useCallback(() => {
    setChatKey((key) => key + 1);
    setIsChatEmpty(true);
  }, []);

  const handleMobileNewChat = useCallback(() => {
    setMobileChatKey((key) => key + 1);
    setIsMobileChatEmpty(true);
  }, []);

  // vaul's onAnimationEnd only fires for open changes that originate inside the
  // drawer, never when a parent flips the controlled `open` prop, so focus is
  // driven off the open transition here instead.
  useEffect(() => {
    if (!isMobileChatOpen) {
      return;
    }
    const focusComposer = () => {
      const textarea = mobileChatRef.current?.querySelector(
        '[data-slot="composer-textarea"]'
      );
      if (textarea instanceof HTMLTextAreaElement) {
        textarea.focus();
      }
    };
    const settleTimer = window.setTimeout(focusComposer, 550);
    // Re-focus once more after a tick in case base-ui's initial focus lands
    // first and steals the caret back.
    const guardTimer = window.setTimeout(focusComposer, 600);
    return () => {
      window.clearTimeout(settleTimer);
      window.clearTimeout(guardTimer);
    };
  }, [isMobileChatOpen]);

  const items = inbox?.items ?? [];

  const visibleItems = useMemo(
    () => orderedItems(items, filters, sortKey),
    [items, filters, sortKey]
  );

  const selectedItem = useMemo(
    () => items.find((item) => item.email.id === selectedEmailId) ?? null,
    [items, selectedEmailId]
  );

  const selectedIndex = visibleItems.findIndex(
    (item) => item.email.id === selectedEmailId
  );

  useEffect(() => {
    if (visibleItems.length === 0) {
      setSelectedEmailId(null);
      return;
    }
    if (selectedEmailId !== null && selectedIndex === -1) {
      setSelectedEmailId(null);
    }
  }, [visibleItems, selectedIndex, selectedEmailId]);

  useEffect(() => {
    if (selectedItem === null) {
      setIsMobileDetailOpen(false);
    }
  }, [selectedItem]);

  const openDetail = useCallback(() => {
    if (isMobile) {
      setIsMobileDetailOpen(true);
    } else {
      clearDetailCloseTimer();
      setIsDetailClosing(false);
      setIsDetailOpen(true);
    }
  }, [clearDetailCloseTimer, isMobile]);

  const closeDetail = useCallback(() => {
    if (!isDetailOpen || isDetailClosing) {
      return;
    }
    clearDetailCloseTimer();
    setIsDetailClosing(true);
    detailCloseTimerRef.current = window.setTimeout(() => {
      setIsDetailOpen(false);
      setIsDetailClosing(false);
      detailCloseTimerRef.current = null;
    }, DETAIL_CLOSE_ANIMATION_MS);
  }, [clearDetailCloseTimer, isDetailOpen, isDetailClosing]);

  const selectEmail = useCallback(
    (emailId: string) => {
      setActivePane('list');
      setSelectedEmailId(emailId);
      setViewedEmailIds((current) => new Set(current).add(emailId));
      openDetail();
    },
    [openDetail]
  );

  const clearSelection = useCallback(() => {
    setSelectedEmailId(null);
  }, []);

  const listScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = listScrollRef.current;
    if (el === null) {
      return;
    }
    const onClick = (event: globalThis.MouseEvent) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest('[data-email-id]') === null
      ) {
        setSelectedEmailId(null);
      }
    };
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, []);

  const moveSelection = useCallback(
    (delta: number) => {
      if (visibleItems.length === 0) {
        return;
      }
      setActivePane('list');
      const base = selectedIndex === -1 ? (delta > 0 ? -1 : 0) : selectedIndex;
      const next = Math.min(Math.max(base + delta, 0), visibleItems.length - 1);
      const nextId = visibleItems[next]?.email.id ?? null;
      setSelectedEmailId(nextId);
      if (nextId !== null) {
        setViewedEmailIds((current) => new Set(current).add(nextId));
        openDetail();
      }
    },
    [visibleItems, selectedIndex, openDetail]
  );

  useShortcut(SHORTCUTS.next, () => moveSelection(1));
  useShortcut(SHORTCUTS.prev, () => moveSelection(-1));
  useShortcut(SHORTCUTS.clear, clearSelection, { enabled: !isMobile });
  useShortcut(SHORTCUTS.open, () => {
    setActivePane('list');
    const targetId =
      selectedEmailId ??
      (visibleItems.length > 0 ? (visibleItems[0]?.email.id ?? null) : null);
    if (targetId !== null) {
      setSelectedEmailId(targetId);
      setViewedEmailIds((current) => new Set(current).add(targetId));
      openDetail();
    }
  });
  useShortcut(SHORTCUTS.approve, () => {
    const approval = selectedItem?.pendingApproval;
    if (approval) {
      void approve(approval.id);
    }
  });
  useShortcut(SHORTCUTS.deny, () => {
    const approval = selectedItem?.pendingApproval;
    if (approval) {
      void deny(approval.id);
    }
  });
  useShortcut(SHORTCUTS.undo, () => {
    const entry = selectedItem?.actions.find(
      (action) => action.action !== 'undo' && action.undoneBy === null
    );
    if (entry && selectedItem) {
      void undo(entry.id, selectedItem.email.id);
    }
  });

  const ledger = useMemo(
    () =>
      [...items.flatMap((item) => item.actions)].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt)
      ),
    [items]
  );

  const isUntriaged = inbox !== null && inbox.summary.processed === 0;
  // The run screen appears either on a fresh page load of an untriaged inbox
  // (never while a refetch is in flight, and never once the user has already
  // passed it this JS session) or when the user deliberately asks to re-run
  // triage from the sidebar, which forces it regardless of triage state.
  const showRunView =
    !isLoading &&
    (runViewRequested || (isUntriaged && !hasRun && !hasSeenInbox()));
  // On a hard reload the shell would otherwise render (and flash the sidebar)
  // during the first load before data can reveal an untriaged inbox and swap to
  // the run screen. A fresh, still-loading session shows a neutral spinner
  // instead, so the run screen is the first inbox chrome the user ever sees.
  // Once seen this session, keep the shell + list spinner (Audit -> Inbox).
  const showNeutralLoading = isLoading && !hasRun && !hasSeenInbox();
  const shouldRenderDetail = isDetailOpen || isDetailClosing;

  useEffect(() => {
    if (!isLoading && inbox !== null && !showRunView) {
      markInboxSeen();
    }
  }, [isLoading, inbox, showRunView]);

  if (showNeutralLoading) {
    return (
      <div className="flex h-svh items-center justify-center">
        <AgentSpinner label="Loading inbox" size={1.25} />
      </div>
    );
  }

  if (showRunView) {
    return (
      <SidebarProvider
        className="!h-svh flex-col overflow-hidden"
        defaultWidth={264}
        maxWidth={360}
        minWidth={220}
        persistedWidth={persistedWidth}
        resizable
      >
        <div className="hidden h-(--top-bar-height) shrink-0 items-center gap-2 px-3 md:flex">
          <span
            aria-hidden="true"
            className="size-5 shrink-0 rounded-sm bg-[url('/app-icon.svg')] bg-cover bg-center"
          />
          <span className="font-display font-medium text-sm">
            Agentic Inbox
          </span>
        </div>
        <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1">
            <RunView
              items={items}
              onComplete={async () => {
                await refresh();
                markInboxSeen();
                setHasRun(true);
                setRunViewRequested(false);
              }}
              onRun={runTriage}
            />
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider
      className="!h-svh flex-col overflow-hidden"
      defaultWidth={264}
      maxWidth={360}
      minWidth={220}
      persistedWidth={persistedWidth}
      resizable
    >
      <div className="relative flex min-h-0 min-w-0 flex-1">
        <CollapsedSidebarTrigger
          peek={
            <SidebarPeek
              filters={filters}
              items={items}
              ledgerCount={ledger.length}
              onFiltersChange={setFilters}
              onRunAgent={() => setRunViewRequested(true)}
            />
          }
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-40 hidden md:block">
          <ChatHeaderSlice
            chatPeek={<ChatPeek />}
            isChatEmpty={isChatEmpty}
            isChatOpen={isChatOpen}
            onNewChat={handleNewChat}
            onToggleChat={() => toggleChat()}
          />
        </div>
        <InboxSidebar
          filters={filters}
          headerPeek={
            <SidebarPeek
              filters={filters}
              items={items}
              ledgerCount={ledger.length}
              onFiltersChange={setFilters}
              onRunAgent={() => setRunViewRequested(true)}
            />
          }
          items={items}
          ledger={ledger}
          onFiltersChange={setFilters}
          onRunAgent={() => setRunViewRequested(true)}
          title="Agentic Inbox"
        />
        <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
          <div className="h-full min-w-0">
            <div className="fixed inset-0 z-0 flex flex-col overflow-hidden overscroll-none md:hidden">
              <MobileTopBar
                ledgerCount={ledger.length}
                onOpenChat={() => setIsMobileChatOpen(true)}
              />
              <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain">
                <InboxSummaryBlock
                  isLoading={isLoading}
                  items={items}
                  summary={inbox?.summary ?? null}
                />
                <InboxList
                  filters={filters}
                  hasSelection={selectedEmailId !== null}
                  items={items}
                  onApprove={(id) => void approve(id)}
                  onClearSelection={clearSelection}
                  onDeny={(id) => void deny(id)}
                  onFiltersChange={setFilters}
                  onRetriage={(emailId) => void retriage(emailId)}
                  onSelect={selectEmail}
                  onToggleChat={() => setIsMobileChatOpen(true)}
                  onUndo={(entryId, emailId) => void undo(entryId, emailId)}
                  selectedEmailId={selectedEmailId}
                  sortKey={sortKey}
                  viewedEmailIds={viewedEmailIds}
                />
              </div>
              <Drawer
                autoFocus={false}
                onOpenChange={setIsMobileChatOpen}
                open={isMobileChatOpen}
              >
                <DrawerContent className="!mt-0 !max-h-none h-[94dvh] gap-0 overflow-hidden">
                  <DrawerHeader className="sr-only">
                    <DrawerTitle>Agent</DrawerTitle>
                  </DrawerHeader>
                  <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
                    <span className="font-medium text-sm">
                      Ask about your inbox
                    </span>
                    <Button
                      className="gap-1.5"
                      disabled={isMobileChatEmpty}
                      onClick={handleMobileNewChat}
                      size="sm"
                      variant="ghost"
                    >
                      <SquarePenIcon className="size-4" />
                      New chat
                    </Button>
                  </div>
                  <div
                    className="flex min-h-0 flex-1 flex-col overflow-hidden"
                    ref={mobileChatRef}
                  >
                    <ChatPanel
                      composerClassName="pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
                      key={mobileChatKey}
                      onEmptyChange={setIsMobileChatEmpty}
                    />
                  </div>
                </DrawerContent>
              </Drawer>
              <Drawer
                onOpenChange={setIsMobileDetailOpen}
                open={isMobileDetailOpen}
              >
                <DrawerContent className="!mt-0 !max-h-none h-[94dvh] gap-0 overflow-hidden bg-card">
                  <DrawerHeader className="sr-only">
                    <DrawerTitle>Email detail</DrawerTitle>
                  </DrawerHeader>
                  <div className="min-h-0 flex-1 overflow-hidden">
                    <DetailPane
                      bordered={false}
                      item={selectedItem}
                      onApprove={approve}
                      onClose={() => setIsMobileDetailOpen(false)}
                      onDeny={deny}
                      onUndo={undo}
                      thread={threadContext(selectedItem, items)}
                    />
                  </div>
                </DrawerContent>
              </Drawer>
            </div>

            <div className="hidden h-full flex-col overflow-hidden bg-sidebar md:flex">
              <div
                className="h-(--top-bar-height) shrink-0"
                data-slot="inbox-top-bar"
              />
              <div className="flex min-h-0 flex-1 p-2">
                <ResizablePanelGroup
                  className="min-w-0 flex-1"
                  defaultLayout={{ 'inbox-list': 42, 'inbox-detail': 58 }}
                  orientation="horizontal"
                >
                  <ResizablePanel
                    defaultSize="42%"
                    id="inbox-list"
                    minSize="30%"
                  >
                    <div
                      className={cn(
                        'flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-opacity duration-200 ease-[var(--ease-panel)]',
                        isDetailOpen &&
                          activePane === 'detail' &&
                          'opacity-[0.93]'
                      )}
                      onPointerDownCapture={() => setActivePane('list')}
                    >
                      {isLoading ? (
                        <PanelLoading label="Loading inbox" />
                      ) : (
                        <>
                          <InboxSummaryBlock
                            isLoading={isLoading}
                            items={items}
                            summary={inbox?.summary ?? null}
                          />
                          <div
                            className="min-h-0 flex-1 overflow-y-auto"
                            ref={listScrollRef}
                          >
                            <InboxList
                              filters={filters}
                              hasSelection={selectedEmailId !== null}
                              items={items}
                              onApprove={(id) => void approve(id)}
                              onClearSelection={clearSelection}
                              onDeny={(id) => void deny(id)}
                              onFiltersChange={setFilters}
                              onRetriage={(emailId) => void retriage(emailId)}
                              onSelect={selectEmail}
                              onSortChange={setSortKey}
                              onToggleChat={() => toggleChat()}
                              onUndo={(entryId, emailId) =>
                                void undo(entryId, emailId)
                              }
                              selectedEmailId={selectedEmailId}
                              sortKey={sortKey}
                              viewedEmailIds={viewedEmailIds}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </ResizablePanel>
                  {shouldRenderDetail ? (
                    <>
                      <ResizableHandle
                        className={cn(
                          'w-2 bg-transparent transition-opacity duration-150 ease-panel',
                          isDetailClosing && 'opacity-0'
                        )}
                        withHandle
                      />
                      <ResizablePanel
                        data-closing={isDetailClosing ? '' : undefined}
                        defaultSize="58%"
                        id="inbox-detail"
                        minSize="40%"
                      >
                        <div
                          className={cn(
                            'flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-opacity duration-150 ease-panel',
                            activePane === 'list' && !isDetailClosing
                              ? 'opacity-[0.93]'
                              : 'opacity-100',
                            isDetailClosing && 'pointer-events-none opacity-0'
                          )}
                          data-slot="inbox-detail-panel"
                          data-state={isDetailClosing ? 'closing' : 'open'}
                          onPointerDownCapture={() => setActivePane('detail')}
                        >
                          <div className="min-h-0 flex-1">
                            <DetailPane
                              item={selectedItem}
                              onApprove={approve}
                              onClose={closeDetail}
                              onDeny={deny}
                              onUndo={undo}
                              reserveHeaderRight={false}
                              thread={threadContext(selectedItem, items)}
                            />
                          </div>
                        </div>
                      </ResizablePanel>
                    </>
                  ) : null}
                </ResizablePanelGroup>
                <ChatSlot
                  chatKey={chatKey}
                  isOpen={isChatOpen}
                  onEmptyChange={setIsChatEmpty}
                />
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
