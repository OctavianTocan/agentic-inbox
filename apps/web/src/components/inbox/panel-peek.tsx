'use client';

import type { ReactNode } from 'react';
import { Button } from '@/design-system/components/ui/button';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger
} from '@/design-system/components/ui/hover-card';

const HOVER_OPEN_DELAY = 260;
const HOVER_CLOSE_DELAY = 220;

type PanelPeekProps = {
  readonly icon: ReactNode;
  readonly label: string;
  readonly side: 'left' | 'right';
  readonly isPanelOpen: boolean;
  readonly onToggle: () => void;
  readonly peekWidth: number;
  readonly children: ReactNode;
};

/**
 * Top-bar toggle that, while its side panel is collapsed, reveals the panel as
 * a floating hover peek anchored to the toggle. Clicking always performs the
 * permanent open/close; hovering (pointer only, not keyboard focus) opens a
 * usable, non-full-height preview that closes on pointer-out, Escape, or
 * outside press. When the panel is already open the toggle is a plain button
 * with no peek.
 *
 * @param icon - Glyph rendered inside the toggle button.
 * @param label - Accessible label describing the toggle action.
 * @param side - Which edge the panel lives on; sets the peek anchor side.
 * @param isPanelOpen - Whether the underlying panel is expanded.
 * @param onToggle - Permanently toggles the panel open or closed.
 * @param peekWidth - Fixed width of the floating peek, in pixels.
 * @param children - The real panel content rendered inside the peek.
 * @returns The toggle, optionally wrapped in a hover peek.
 */
export function PanelPeek({
  icon,
  label,
  side,
  isPanelOpen,
  onToggle,
  peekWidth,
  children
}: PanelPeekProps) {
  const toggle = (
    <Button
      aria-label={label}
      aria-pressed={isPanelOpen}
      onClick={onToggle}
      size="icon-sm"
      variant="ghost"
    >
      {icon}
    </Button>
  );

  if (isPanelOpen) {
    return toggle;
  }

  return (
    <HoverCard
      onOpenChange={(_, details) => {
        // Keyboard focus must not open the peek: it is a pointer-only
        // affordance, and the toggle keeps its plain click behavior.
        if (details.reason === 'trigger-focus') {
          details.cancel();
        }
      }}
    >
      <HoverCardTrigger
        closeDelay={HOVER_CLOSE_DELAY}
        delay={HOVER_OPEN_DELAY}
        render={toggle}
      />
      <HoverCardContent
        align={side === 'left' ? 'start' : 'end'}
        className="flex h-[90svh] flex-col overflow-hidden p-0 shadow-card"
        side="bottom"
        style={{ width: peekWidth }}
      >
        {children}
      </HoverCardContent>
    </HoverCard>
  );
}
