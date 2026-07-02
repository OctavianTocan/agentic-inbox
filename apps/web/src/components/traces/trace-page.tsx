'use client';

import Link from 'next/link';
import { type KeyboardEvent, useMemo, useState } from 'react';
import { EMPTY_FILTERS } from '@/components/inbox/filters';
import { InboxSidebar } from '@/components/inbox/inbox-sidebar';
import { useInbox } from '@/components/inbox/use-inbox';
import {
  ArchiveIcon,
  FilterXIcon,
  HistoryIcon,
  InboxIcon,
  RotateCcwIcon,
  SendIcon
} from '@/design-system/components/icons';
import { AgentSpinner } from '@/design-system/components/ui/agent-spinner';
import { Badge } from '@/design-system/components/ui/badge';
import { Button } from '@/design-system/components/ui/button';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle
} from '@/design-system/components/ui/item';
import { Separator } from '@/design-system/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider
} from '@/design-system/components/ui/sidebar';
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

/** Stringify the action payload for the detail pane. */
function payloadText(payload: Readonly<Record<string, unknown>>): string {
  return JSON.stringify(payload, null, 2) ?? '{}';
}

type TraceListProps = {
  readonly records: readonly TraceRecord[];
  readonly selectedId: string | null;
  readonly onSelect: (entryId: string) => void;
};

/** Selectable audit event list. */
function AuditList({ records, selectedId, onSelect }: TraceListProps) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="divide-y">
        {records.map(({ entry, item }) => {
          const Icon = ACTION_ICON[entry.action];
          const isSelected = selectedId === entry.id;
          return (
            <Item
              aria-current={isSelected}
              className={cn(
                'cursor-pointer rounded-none border-0 px-5 py-3',
                isSelected && 'bg-muted'
              )}
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
                <ItemTitle className="w-full justify-between gap-3">
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

type TraceDetailProps = {
  readonly record: TraceRecord | null;
};

/** Full audit detail for the selected action. */
function AuditDetail({ record }: TraceDetailProps) {
  if (record === null) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        No agent actions have been recorded yet.
      </div>
    );
  }

  const { entry, item } = record;
  const Icon = ACTION_ICON[entry.action];

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b px-6 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{ACTION_LABELS[entry.action]}</Badge>
          <Badge variant="outline">{entry.actor.replace('_', ' ')}</Badge>
          {entry.undoneBy ? <Badge variant="outline">Undone</Badge> : null}
        </div>
        <div className="mt-4 flex items-start gap-3">
          <Icon className="mt-1 size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <h1 className="text-balance font-sans font-medium text-sm leading-5 sm:font-semibold sm:text-xl sm:leading-7">
              {entry.summary}
            </h1>
            <p className="mt-1 text-muted-foreground text-sm tabular-nums">
              {formatTimestamp(entry.createdAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 px-6 py-5">
        <section className="flex flex-col gap-2">
          <h2 className="font-medium text-muted-foreground text-xs uppercase">
            Email
          </h2>
          <div>
            <p className="font-medium text-sm">{item.email.subject}</p>
            <p className="text-muted-foreground text-sm">
              {senderName(item.email.from)}
            </p>
          </div>
        </section>

        {item.decision ? (
          <section className="flex flex-col gap-2">
            <h2 className="font-medium text-muted-foreground text-xs uppercase">
              Agent decision
            </h2>
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
          <h2 className="font-medium text-muted-foreground text-xs uppercase">
            Payload
          </h2>
          <pre className="max-h-72 overflow-auto rounded-md bg-muted p-4 text-xs">
            {payloadText(entry.payload)}
          </pre>
        </section>
      </div>
    </div>
  );
}

/**
 * Full-page agent audit log backed by the same static inbox snapshot.
 *
 * @returns The audit log page.
 */
export function AuditPage() {
  const { inbox, isLoading } = useInbox();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const records = useMemo(
    () => auditRecords(inbox?.items ?? []),
    [inbox?.items]
  );
  const selected = records.find(({ entry }) => entry.id === selectedId);
  const selectedRecord = selected ?? records[0] ?? null;
  const ledger = useMemo(
    () => records.map((record) => record.entry),
    [records]
  );

  if (isLoading || inbox === null) {
    return (
      <main className="flex h-dvh items-center justify-center gap-3 text-muted-foreground">
        <AgentSpinner variant="dotsCircle" label="Loading audit" />
        <span>Loading audit…</span>
      </main>
    );
  }

  return (
    <SidebarProvider defaultWidth={264} maxWidth={360} minWidth={220} resizable>
      <InboxSidebar
        activeSection="audit"
        filters={EMPTY_FILTERS}
        items={inbox.items}
        ledger={ledger}
        onFiltersChange={() => undefined}
        showFilters={false}
      />
      <SidebarInset className="h-dvh min-w-0 overflow-hidden bg-background">
        <main className="flex h-dvh flex-col overflow-hidden">
          <header className="flex h-14 shrink-0 items-center justify-between border-b bg-sidebar px-5">
            <div className="flex items-center gap-2">
              <HistoryIcon className="size-4 text-muted-foreground" />
              <span className="font-semibold text-sm">Audit</span>
            </div>
            <Button render={<Link href="/" />} size="sm" variant="outline">
              <InboxIcon />
              Inbox
            </Button>
          </header>

          <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,42%)_minmax(0,58%)] md:grid-cols-[minmax(320px,420px)_1fr] md:grid-rows-1">
            <section className="flex min-w-0 flex-col border-r">
              <div className="border-b px-5 py-4">
                <p className="font-medium text-sm tabular-nums">
                  {records.length} audit events
                </p>
                <p className="text-muted-foreground text-xs">
                  Newest actions first
                </p>
              </div>
              <AuditList
                onSelect={setSelectedId}
                records={records}
                selectedId={selectedRecord?.entry.id ?? null}
              />
            </section>
            <section className="min-h-0 border-t md:border-t-0">
              <AuditDetail record={selectedRecord} />
            </section>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
