import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
  SidebarResizeHandle
} from '../src/design-system/components/ui/sidebar';

const UPDATE_DURING_RENDER_PATTERN =
  /Cannot update a component .* while rendering/i;

/**
 * SidebarResizeHandle mirrors its drag state into the SidebarProvider context.
 * Doing that during render queues a setState on the provider while a different
 * component (the handle) is rendering, tripping React's "Cannot update a
 * component while rendering a different component" warning. The mirror must run
 * from an effect instead. A drag flips the handle's local dragging state, which
 * is the render pass that surfaced the bug.
 */
describe('SidebarResizeHandle', () => {
  const consoleErrorSpy = vi
    .spyOn(console, 'error')
    .mockImplementation(() => undefined);

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  it('does not update SidebarProvider during render when a drag starts', () => {
    render(
      <SidebarProvider resizable>
        <Sidebar>
          <SidebarContent />
          <SidebarResizeHandle />
        </Sidebar>
      </SidebarProvider>
    );

    const handle = screen.getByRole('button', { name: 'Resize sidebar' });

    act(() => {
      fireEvent.mouseDown(handle, { clientX: 100 });
    });

    const updateDuringRenderCalls = consoleErrorSpy.mock.calls.filter((args) =>
      args.some(
        (arg) =>
          typeof arg === 'string' && UPDATE_DURING_RENDER_PATTERN.test(arg)
      )
    );

    expect(updateDuringRenderCalls).toEqual([]);
  });
});
