'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@/design-system/components/ui/resizable';
import { SidebarProvider } from '@/design-system/components/ui/sidebar';
import { useShortcut } from '@/design-system/hooks/use-shortcut';
import type { ShortcutDefinition } from '@/design-system/lib/shortcuts';
import { bySeverityDesc } from '@/lib/inbox/labels';
import type { InboxItem } from '@/lib/inbox/types';
import { ChatSlot } from './chat-slot';
import { DetailPane } from './detail-pane';
import { EMPTY_FILTERS, type InboxFilters, matchesFilters } from './filters';
import { InboxList } from './inbox-list';
import { InboxSidebar } from './inbox-sidebar';
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

/**
 * Four-panel inbox shell: sidebar, list, detail pane, and chat slot. Owns the
 * selection and filter state and binds j/k/enter/e/d/u keyboard shortcuts.
 *
 * @returns The inbox application shell.
 */
export function InboxShell() {
  const { inbox, isLoading, approve, deny, undo } = useInbox();
  const [filters, setFilters] = useState<InboxFilters>(EMPTY_FILTERS);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
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

  if (!isLoading && inbox && !hasRun) {
    return (
      <SidebarProvider>
        <RunView items={items} onComplete={() => setHasRun(true)} />
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <InboxSidebar
        filters={filters}
        items={items}
        ledger={ledger}
        onFiltersChange={setFilters}
      />
      <main className="flex h-svh min-w-0 flex-1">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel defaultSize={42} minSize={28}>
            <div className="flex h-full flex-col overflow-hidden">
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
          <ResizablePanel defaultSize={58} minSize={30}>
            <DetailPane
              item={selectedItem}
              onApprove={approve}
              onDeny={deny}
              onUndo={undo}
              thread={threadContext(selectedItem, items)}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
        <ChatSlot
          isOpen={isChatOpen}
          onToggle={() => setIsChatOpen((prev) => !prev)}
        />
      </main>
    </SidebarProvider>
  );
}
