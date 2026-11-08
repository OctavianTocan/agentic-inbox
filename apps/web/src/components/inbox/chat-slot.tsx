'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ChatPanel from '@/components/chat/panel';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/design-system/components/ui/tooltip';
import { cn } from '@/design-system/lib/utils';

const MIN_WIDTH = 320;
const MAX_WIDTH = 560;
const DEFAULT_WIDTH = 400;

type ChatSlotProps = {
  readonly isOpen: boolean;
  readonly chatKey: number;
  readonly onEmptyChange: (isEmpty: boolean) => void;
};

/**
 * Right-edge agent panel that animates its width open and closed, mirroring
 * the left sidebar. Collapses to zero width when closed; the open/close and
 * new-chat controls are owned by the top bar.
 *
 * @param isOpen - Whether the chat panel is expanded.
 * @param chatKey - Remount key; bumping it resets the thread to empty.
 * @param onEmptyChange - Reports whether the thread is currently empty.
 * @returns The animated chat aside.
 */
export function ChatSlot({ isOpen, chatKey, onEmptyChange }: ChatSlotProps) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(DEFAULT_WIDTH);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      setIsDragging(true);
      startXRef.current = event.clientX;
      startWidthRef.current = width;
    },
    [width]
  );

  const handleDoubleClick = useCallback(() => {
    setWidth(DEFAULT_WIDTH);
  }, []);

  useEffect(() => {
    if (!isDragging) {
      return;
    }
    const onMouseMove = (event: MouseEvent) => {
      const delta = startXRef.current - event.clientX;
      const next = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, startWidthRef.current + delta)
      );
      setWidth(next);
    };
    const onMouseUp = () => setIsDragging(false);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  return (
    <aside
      className={cn(
        'relative h-full shrink-0 overflow-hidden rounded-xl border bg-card',
        isOpen && 'ml-2',
        !isDragging && 'transition-[width,margin] duration-200 ease-panel'
      )}
      data-slot="chat-slot"
      data-state={isOpen ? 'expanded' : 'collapsed'}
      style={{ width: isOpen ? width : 0 }}
    >
      {isOpen && (
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                aria-label="Resize chat"
                className={cn(
                  'absolute inset-y-0 left-0 z-20 w-1 cursor-col-resize border-none bg-transparent p-0 transition-colors',
                  isDragging ? 'bg-border' : 'hover:bg-border/50'
                )}
                onDoubleClick={handleDoubleClick}
                onMouseDown={handleMouseDown}
                type="button"
              />
            }
          />
          <TooltipContent side="left">Drag to resize</TooltipContent>
        </Tooltip>
      )}
      <div className="flex h-full flex-col" style={{ width }}>
        <div className="flex h-11 shrink-0 items-center border-b px-4">
          <span className="font-medium text-sm">Ask about your inbox</span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ChatPanel key={chatKey} onEmptyChange={onEmptyChange} />
        </div>
      </div>
    </aside>
  );
}
