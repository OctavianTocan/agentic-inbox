'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  type KeyboardEvent,
  useCallback,
  useMemo,
  useRef,
  useState
} from 'react';
import { ChatSlot } from '@/components/inbox/chat-slot';
import { EMPTY_FILTERS } from '@/components/inbox/filters';
import { ChatPeek, SidebarPeek } from '@/components/inbox/inbox-shell';
import { InboxSidebar } from '@/components/inbox/inbox-sidebar';
import { PanelLoading } from '@/components/inbox/panel-loading';
import {
  requestRunView,
  useSharedChatOpen
} from '@/components/inbox/session-state';
import {
  ChatHeaderSlice,
  CollapsedSidebarTrigger
} from '@/components/inbox/top-bar';
import { useInbox } from '@/components/inbox/use-inbox';
import {
  ArchiveIcon,
  ChevronDownIcon,
  FilterXIcon,
  HistoryIcon,
  InboxIcon,
  RotateCcwIcon,
  SendIcon,
  XIcon
} from '@/design-system/components/icons';
import { Badge } from '@/design-system/components/ui/badge';
import { Button } from '@/design-system/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle
} from '@/design-system/components/ui/drawer';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle
} from '@/design-system/components/ui/item';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@/design-system/components/ui/resizable';
import { useScrollFade } from '@/design-system/components/ui/scroll-fade';
import { Separator } from '@/design-system/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider
} from '@/design-system/components/ui/sidebar';
import { useIsMobile } from '@/design-system/hooks/use-mobile';
import { cn } from '@/design-system/lib/utils';
import {
  ACTION_LABELS,
  CATEGORY_LABELS,
  formatTimestamp,
  senderName
} from '@/lib/inbox/labels';
import type { ActionKind, InboxItem, LedgerEntry } from '@/lib/inbox/types';

const ACTION_ICON: Readonly<Record<ActionKind, typeof SendIcon>> = {
  send_reply: SendIcon,
  archive: ArchiveIcon,
  flag_for_review: FilterXIcon,
  undo: RotateCcwIcon
};

type TraceRecord = {
  readonly entry: LedgerEntry;
  readonly item: InboxItem;
};

/** Flatten inbox actions into newest-first audit records. */
function auditRecords(items: readonly InboxItem[]): readonly TraceRecord[] {
  return items
    .flatMap((item) => item.actions.map((entry) => ({ entry, item })))
    .sort((a, b) => b.entry.createdAt.localeCompare(a.entry.createdAt));
}

/** Stringify the action payload for the detail sheet. */
function payloadText(payload: Readonly<Record<string, unknown>>): string {
  return JSON.stringify(payload, null, 2) ?? '{}';
}

type AuditListProps = {
  readonly records: readonly TraceRecord[];
  readonly onSelect: (entryId: string) => void;
};

/** Full-width audit event list; each row opens the detail sheet. */
function AuditList({ records, onSelect }: AuditListProps) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="divide-y">
        {records.map(({ entry, item }) => {
          const Icon = ACTION_ICON[entry.action];
          return (
            <Item
              className="cursor-pointer rounded-none border-0 px-5 py-3"
              key={entry.id}
              onClick={() => onSelect(entry.id)}
              onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(entry.id);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <ItemContent>
                <ItemTitle className="w-full justify-between gap-3 font-semibold">
                  <span>{ACTION_LABELS[entry.action]}</span>
                  <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                    {formatTimestamp(entry.createdAt)}
                  </span>
                </ItemTitle>
                <ItemDescription className="line-clamp-1">
                  {entry.summary}
                </ItemDescription>
                <p className="truncate text-muted-foreground text-xs">
                  {item.email.subject}
                </p>
              </ItemContent>
            </Item>
          );
        })}
      </div>
    </div>
  );
}

type AuditDetailProps = {
  readonly record: TraceRecord;
  readonly onClose?: () => void;
  readonly bordered?: boolean;
  readonly reserveHeaderRight?: boolean;
};

/**
 * Full audit detail for one action. Mirrors the inbox DetailPane: a `bg-card`
 * header over a `scroll-fade` body, used both as the desktop resizable pane and
 * inside the mobile bottom sheet.
 *
 * @param record - Ledger entry plus its inbox item to render.
 * @param onClose - Called when the pane is dismissed; the close control is omitted when absent.
 * @param bordered - Whether the header carries a bottom border; off makes the pane one seamless surface for the mobile sheet.
 * @param reserveHeaderRight - Whether to reserve space at the header's right edge for the floating chat-toggle overlay, so the close button never sits under it.
 * @returns The audit detail pane.
 */
function AuditDetail({
  record,
  onClose,
  bordered = true,
  reserveHeaderRight = false
}: AuditDetailProps) {
  const { entry, item } = record;
  const { email } = item;
  const Icon = ACTION_ICON[entry.action];
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollFade(scrollRef);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const bodyId = `audit-email-body-${entry.id}`;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div
        className={cn(
          'shrink-0 bg-card px-6 py-5',
          bordered && 'border-b',
          reserveHeaderRight && 'pr-20'
        )}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{ACTION_LABELS[entry.action]}</Badge>
              <Badge variant="outline">{entry.actor.replace('_', ' ')}</Badge>
              {entry.undoneBy ? <Badge variant="outline">Undone</Badge> : null}
            </div>
            <div className="mt-4 flex items-start gap-3">
              <Icon className="mt-1 size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <h2 className="text-balance font-semibold text-lg leading-snug">
                  {entry.summary}
                </h2>
                <p className="mt-1 text-muted-foreground text-sm tabular-nums">
                  {formatTimestamp(entry.createdAt)}
                </p>
              </div>
            </div>
          </div>
          {onClose ? (
            <Button
              aria-label="Close audit event"
              className="shrink-0"
              onClick={onClose}
              size="icon-sm"
              variant="ghost"
            >
              <XIcon className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <div
        className="scroll-fade min-h-0 flex-1 px-6 pt-7 pb-5"
        ref={scrollRef}
      >
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-2">
            <h3 className="font-semibold text-muted-foreground text-xs uppercase">
              Email
            </h3>
            <button
              aria-controls={bodyId}
              aria-expanded={isEmailOpen}
              className="-mx-2 flex items-start gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/60"
              onClick={() => setIsEmailOpen((open) => !open)}
              type="button"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm">{email.subject}</p>
                <p className="text-muted-foreground text-sm">
                  {senderName(email.from)}
                </p>
              </div>
              <ChevronDownIcon
                className={cn(
                  'mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform',
                  isEmailOpen && 'rotate-180'
                )}
              />
            </button>
            {isEmailOpen ? (
              <div
                className="mt-1 flex flex-col gap-3 border-l-2 pl-4"
                id={bodyId}
              >
                <p className="text-muted-foreground text-xs">
                  To {email.to.join(', ')}
                  {email.cc.length > 0 ? ` · Cc ${email.cc.join(', ')}` : ''}
                  {' · '}
                  <span className="tabular-nums">
                    {formatTimestamp(email.timestamp)}
                  </span>
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {email.body}
                </p>
              </div>
            ) : null}
          </section>

          {item.decision ? (
            <section className="flex flex-col gap-2">
              <h3 className="font-semibold text-muted-foreground text-xs uppercase">
                Agent decision
              </h3>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {CATEGORY_LABELS[item.decision.category]}
                </Badge>
                <Badge variant="outline">{item.decision.severity}</Badge>
              </div>
              <p className="text-pretty text-sm leading-relaxed">
                {item.decision.rationale}
              </p>
            </section>
          ) : null}

          <Separator />

          <section className="flex flex-col gap-2">
            <h3 className="font-semibold text-muted-foreground text-xs uppercase">
              Payload
            </h3>
            <pre className="max-h-72 overflow-auto rounded-md bg-muted p-4 text-xs">
              {payloadText(entry.payload)}
            </pre>
          </section>
        </div>
      </div>
    </div>
  );
}

/**
 * Full-page agent audit log backed by the same static inbox snapshot.
 *
 * @param persistedWidth - Server-read sidebar width (px) that seeds the initial render, avoiding a first-frame jump.
 * @returns The audit log page.
 */
export function AuditPage({ persistedWidth }: { persistedWidth?: number }) {
  const { inbox, isLoading } = useInbox();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const [activePane, setActivePane] = useState<'list' | 'detail'>('list');
  const [isChatOpen, setIsChatOpen] = useSharedChatOpen();
  const [chatKey, setChatKey] = useState(0);
  const [isChatEmpty, setIsChatEmpty] = useState(true);
  const isMobile = useIsMobile();
  const router = useRouter();

  const requestRerun = useCallback(() => {
    requestRunView();
    router.push('/');
  }, [router]);

  const items = inbox?.items ?? [];

  const records = useMemo(() => auditRecords(items), [items]);
  const selectedRecord =
    records.find(({ entry }) => entry.id === selectedId) ?? null;
  const ledger = useMemo(
    () => records.map((record) => record.entry),
    [records]
  );

  const selectRecord = useCallback(
    (entryId: string) => {
      setActivePane('detail');
      setSelectedId(entryId);
      if (isMobile) {
        setIsMobileDetailOpen(true);
      } else {
        setIsDetailOpen(true);
      }
    },
    [isMobile]
  );

  const toggleChat = useCallback(() => {
    setIsChatOpen(!isChatOpen);
  }, [isChatOpen, setIsChatOpen]);

  const handleNewChat = useCallback(() => {
    setChatKey((key) => key + 1);
    setIsChatEmpty(true);
  }, []);

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
              filters={EMPTY_FILTERS}
              items={items}
              ledgerCount={ledger.length}
              onFiltersChange={() => undefined}
              onRunAgent={requestRerun}
              showFilters={false}
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
          activeSection="audit"
          filters={EMPTY_FILTERS}
          headerPeek={
            <SidebarPeek
              filters={EMPTY_FILTERS}
              items={items}
              ledgerCount={ledger.length}
              onFiltersChange={() => undefined}
              onRunAgent={requestRerun}
              showFilters={false}
            />
          }
          items={items}
          ledger={ledger}
          onFiltersChange={() => undefined}
          onRunAgent={requestRerun}
          showFilters={false}
          title="Audit"
        />
        <SidebarInset className="min-h-0 min-w-0 overflow-hidden bg-background">
          <div className="flex h-full min-w-0">
            <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-sidebar px-3 md:hidden">
                <div className="flex min-w-0 items-center gap-2">
                  <HistoryIcon className="size-4 text-muted-foreground" />
                  <span className="font-semibold text-sm">Audit</span>
                </div>
                <Button render={<Link href="/" />} size="sm" variant="outline">
                  <InboxIcon />
                  Inbox
                </Button>
              </header>

              {isLoading ? (
                <PanelLoading label="Loading audit" />
              ) : (
                <ResizablePanelGroup
                  className="min-h-0 min-w-0 flex-1"
                  defaultLayout={{ 'audit-list': 42, 'audit-detail': 58 }}
                  orientation="horizontal"
                >
                  <ResizablePanel
                    defaultSize="42%"
                    id="audit-list"
                    minSize="30%"
                  >
                    <div
                      className={cn(
                        'flex h-full min-h-0 flex-col overflow-hidden transition-opacity duration-200 ease-[var(--ease-panel)]',
                        isDetailOpen &&
                          activePane === 'detail' &&
                          'opacity-[0.93]'
                      )}
                      onPointerDownCapture={() => setActivePane('list')}
                    >
                      <div className="border-b px-5 py-4">
                        <p className="font-medium text-sm tabular-nums">
                          {records.length} audit events
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Newest actions first
                        </p>
                      </div>
                      <AuditList onSelect={selectRecord} records={records} />
                    </div>
                  </ResizablePanel>
                  {isDetailOpen && selectedRecord ? (
                    <>
                      <ResizableHandle withHandle />
                      <ResizablePanel
                        defaultSize="58%"
                        id="audit-detail"
                        minSize="40%"
                      >
                        <div
                          className={cn(
                            'flex h-full flex-col bg-card transition-opacity duration-200 ease-[var(--ease-panel)]',
                            activePane === 'list' && 'opacity-[0.93]'
                          )}
                          onPointerDownCapture={() => setActivePane('detail')}
                        >
                          <AuditDetail
                            onClose={() => setIsDetailOpen(false)}
                            record={selectedRecord}
                            reserveHeaderRight={!isChatOpen}
                          />
                        </div>
                      </ResizablePanel>
                    </>
                  ) : null}
                </ResizablePanelGroup>
              )}
            </main>
            <div className="hidden md:block">
              <ChatSlot
                chatKey={chatKey}
                isOpen={isChatOpen}
                onEmptyChange={setIsChatEmpty}
              />
            </div>
          </div>
        </SidebarInset>
      </div>

      {isMobile ? (
        <Drawer
          onOpenChange={setIsMobileDetailOpen}
          open={isMobileDetailOpen && selectedRecord !== null}
        >
          <DrawerContent className="!mt-0 !max-h-none h-[94dvh] gap-0 overflow-hidden bg-card">
            <DrawerHeader className="sr-only">
              <DrawerTitle>Audit event detail</DrawerTitle>
            </DrawerHeader>
            {selectedRecord ? (
              <AuditDetail
                bordered={false}
                onClose={() => setIsMobileDetailOpen(false)}
                record={selectedRecord}
              />
            ) : null}
          </DrawerContent>
        </Drawer>
      ) : null}
    </SidebarProvider>
  );
}
