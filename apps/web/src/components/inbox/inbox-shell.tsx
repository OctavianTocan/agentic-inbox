'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ChatPanel from '@/components/chat/panel';
import {
  BotIcon,
  HistoryIcon,
  InboxIcon,
  ListFilterIcon
} from '@/design-system/components/icons';
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@/design-system/components/ui/sheet';
import {
  SidebarInset,
  SidebarProvider,
  useSidebar
} from '@/design-system/components/ui/sidebar';
import { useShortcut } from '@/design-system/hooks/use-shortcut';
import type { ShortcutDefinition } from '@/design-system/lib/shortcuts';
import { bySeverityDesc } from '@/lib/inbox/labels';
import type { EmailStatus, InboxItem } from '@/lib/inbox/types';
import { ChatSlot } from './chat-slot';
import { DetailPane } from './detail-pane';
import { EMPTY_FILTERS, type InboxFilters, matchesFilters } from './filters';
import { InboxList } from './inbox-list';
import { InboxFilterPanel, InboxSidebar } from './inbox-sidebar';
import { InboxSummaryBlock } from './inbox-summary';
import { RunView } from './run-view';
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
  undo: { id: 'inbox.undo', keys: 'u', label: 'Undo', category: 'actions' }
} satisfies Record<string, ShortcutDefinition>;

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

type MobileTopBarProps = {
  readonly activeFilterCount: number;
  readonly itemCount: number;
  readonly ledgerCount: number;
  readonly needsAttentionCount: number;
  readonly onOpenChat: () => void;
  readonly onOpenFilters: () => void;
};

/** Mobile toolbar with large buttons for the hidden side panels. */
function MobileTopBar({
  activeFilterCount,
  itemCount,
  ledgerCount,
  needsAttentionCount,
  onOpenChat,
  onOpenFilters
}: MobileTopBarProps) {
  const { setOpenMobile } = useSidebar();

  return (
    <div className="shrink-0 border-b bg-sidebar/95 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur md:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-sm">Agentic Inbox</p>
          <p className="truncate text-muted-foreground text-xs tabular-nums">
            {needsAttentionCount} need attention / {itemCount} emails
          </p>
        </div>
        <Button
          className="h-10 shrink-0"
          render={<Link href="/audit" />}
          size="sm"
          variant="outline"
        >
          <HistoryIcon />
          Audit
          {ledgerCount > 0 ? (
            <span className="text-muted-foreground tabular-nums">
              {ledgerCount}
            </span>
          ) : null}
        </Button>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Button
          className="h-11 justify-center"
          onClick={() => setOpenMobile(true)}
          size="lg"
          variant="outline"
        >
          <InboxIcon />
          Inbox
        </Button>
        <Button
          className="h-11 justify-center"
          onClick={onOpenFilters}
          size="lg"
          variant="outline"
        >
          <ListFilterIcon />
          Filters
          {activeFilterCount > 0 ? (
            <span className="tabular-nums">{activeFilterCount}</span>
          ) : null}
        </Button>
        <Button
          className="h-11 justify-center"
          onClick={onOpenChat}
          size="lg"
          variant="outline"
        >
          <BotIcon />
          Agent
        </Button>
      </div>
    </div>
  );
}

/** Counts active filters without depending on object key iteration order. */
function countActiveFilters(filters: InboxFilters): number {
  return [
    filters.status,
    filters.project,
    filters.category,
    filters.severity
  ].filter(Boolean).length;
}

/** Counts inbox rows with the requested status. */
function countByStatus(
  items: readonly InboxItem[],
  status: EmailStatus
): number {
  return items.filter((item) => item.status === status).length;
}

/**
 * Inbox shell: filter rail, list, detail pane, and resizable chat slot. Owns
 * the selection and filter state and binds j/k/enter/e/d/u keyboard shortcuts.
 *
 * @returns The inbox application shell.
 */
export function InboxShell() {
  const { inbox, isLoading, refresh, runTriage, approve, deny, undo } =
    useInbox();
  const [filters, setFilters] = useState<InboxFilters>(EMPTY_FILTERS);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const items = inbox?.items ?? [];

  const visibleItems = useMemo(
    () =>
      items
        .filter((item) => matchesFilters(item, filters))
        .sort(bySeverityDesc),
    [items, filters]
  );

  const selectedItem = useMemo(
    () => items.find((item) => item.email.id === selectedEmailId) ?? null,
    [items, selectedEmailId]
  );

  const selectedIndex = visibleItems.findIndex(
    (item) => item.email.id === selectedEmailId
  );

  useEffect(() => {
    const firstVisibleEmailId = visibleItems[0]?.email.id ?? null;
    if (visibleItems.length === 0) {
      setSelectedEmailId(null);
      return;
    }
    if (selectedIndex === -1) {
      setSelectedEmailId(firstVisibleEmailId);
    }
  }, [visibleItems, selectedIndex]);

  useEffect(() => {
    if (selectedItem === null) {
      setIsMobileDetailOpen(false);
    }
  }, [selectedItem]);

  const selectEmail = useCallback((emailId: string) => {
    setSelectedEmailId(emailId);
    setIsMobileDetailOpen(true);
  }, []);

  const moveSelection = useCallback(
    (delta: number) => {
      if (visibleItems.length === 0) {
        return;
      }
      const base = selectedIndex === -1 ? (delta > 0 ? -1 : 0) : selectedIndex;
      const next = Math.min(Math.max(base + delta, 0), visibleItems.length - 1);
      setSelectedEmailId(visibleItems[next]?.email.id ?? null);
    },
    [visibleItems, selectedIndex]
  );

  useShortcut(SHORTCUTS.next, () => moveSelection(1));
  useShortcut(SHORTCUTS.prev, () => moveSelection(-1));
  useShortcut(SHORTCUTS.open, () => {
    if (selectedEmailId === null && visibleItems.length > 0) {
      setSelectedEmailId(visibleItems[0]?.email.id ?? null);
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

  if (isLoading || inbox === null || !hasRun) {
    return (
      <SidebarProvider
        defaultWidth={264}
        maxWidth={360}
        minWidth={220}
        resizable
      >
        <SidebarInset className="h-svh min-w-0 overflow-hidden">
          <RunView
            items={items}
            onComplete={async () => {
              await refresh();
              setHasRun(true);
            }}
            onRun={runTriage}
          />
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultWidth={264} maxWidth={360} minWidth={220} resizable>
      <InboxSidebar
        filters={filters}
        items={items}
        ledger={ledger}
        onFiltersChange={setFilters}
      />
      <SidebarInset className="h-svh min-w-0 overflow-hidden">
        <div className="flex h-svh flex-col overflow-hidden md:hidden">
          <MobileTopBar
            activeFilterCount={countActiveFilters(filters)}
            itemCount={items.length}
            ledgerCount={ledger.length}
            needsAttentionCount={countByStatus(items, 'needs_attention')}
            onOpenChat={() => setIsMobileChatOpen(true)}
            onOpenFilters={() => setIsMobileFiltersOpen(true)}
          />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <InboxSummaryBlock
              isLoading={isLoading}
              items={items}
              summary={inbox?.summary ?? null}
            />
            <InboxList
              filters={filters}
              items={items}
              onApprove={(id) => void approve(id)}
              onDeny={(id) => void deny(id)}
              onSelect={selectEmail}
              selectedEmailId={selectedEmailId}
            />
          </div>
          <Drawer
            onOpenChange={setIsMobileFiltersOpen}
            open={isMobileFiltersOpen}
          >
            <DrawerContent className="max-h-[88svh]">
              <DrawerHeader>
                <DrawerTitle>Filters</DrawerTitle>
              </DrawerHeader>
              <div className="min-h-0 overflow-y-auto px-4 pb-6">
                <InboxFilterPanel
                  filters={filters}
                  items={items}
                  onFiltersChange={setFilters}
                />
              </div>
            </DrawerContent>
          </Drawer>
          <Sheet onOpenChange={setIsMobileChatOpen} open={isMobileChatOpen}>
            <SheetContent className="!w-full p-0 sm:max-w-none" side="right">
              <SheetHeader className="sr-only">
                <SheetTitle>Agent</SheetTitle>
              </SheetHeader>
              <div className="flex h-full min-h-0 flex-col pt-10">
                <ChatPanel />
              </div>
            </SheetContent>
          </Sheet>
          <Sheet onOpenChange={setIsMobileDetailOpen} open={isMobileDetailOpen}>
            <SheetContent className="!w-full p-0 sm:max-w-none" side="right">
              <SheetHeader className="sr-only">
                <SheetTitle>Email detail</SheetTitle>
              </SheetHeader>
              <div className="h-full min-h-0 pt-8">
                <DetailPane
                  item={selectedItem}
                  onApprove={approve}
                  onDeny={deny}
                  onUndo={undo}
                  thread={threadContext(selectedItem, items)}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="hidden h-svh md:block">
          <ResizablePanelGroup
            defaultLayout={
              isChatOpen
                ? { 'inbox-list': 30, 'inbox-detail': 42, 'agent-chat': 28 }
                : { 'inbox-list': 38, 'inbox-detail': 58, 'agent-chat': 4 }
            }
            key={isChatOpen ? 'chat-open' : 'chat-closed'}
            orientation="horizontal"
          >
            <ResizablePanel defaultSize="30%" id="inbox-list" minSize="24%">
              <div className="flex h-svh flex-col overflow-hidden">
                <InboxSummaryBlock
                  isLoading={isLoading}
                  items={items}
                  summary={inbox?.summary ?? null}
                />
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <InboxList
                    filters={filters}
                    items={items}
                    onApprove={(id) => void approve(id)}
                    onDeny={(id) => void deny(id)}
                    onSelect={setSelectedEmailId}
                    selectedEmailId={selectedEmailId}
                  />
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize="42%" id="inbox-detail" minSize="32%">
              <DetailPane
                item={selectedItem}
                onApprove={approve}
                onDeny={deny}
                onUndo={undo}
                thread={threadContext(selectedItem, items)}
              />
            </ResizablePanel>
            <ResizableHandle withHandle={isChatOpen} />
            <ResizablePanel
              defaultSize={isChatOpen ? '28%' : '4%'}
              id="agent-chat"
              maxSize={isChatOpen ? '34%' : '4%'}
              minSize={isChatOpen ? '22%' : '4%'}
            >
              <ChatSlot
                isOpen={isChatOpen}
                onToggle={() => setIsChatOpen((prev) => !prev)}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
