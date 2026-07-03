import { render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
  SidebarResizeHandle
} from '../src/design-system/components/ui/sidebar';

function tree(persistedWidth?: number) {
  return (
    <SidebarProvider
      defaultWidth={264}
      maxWidth={360}
      minWidth={220}
      persistedWidth={persistedWidth}
      resizable
    >
      <Sidebar>
        <SidebarContent />
        <SidebarResizeHandle />
      </Sidebar>
    </SidebarProvider>
  );
}

function readWrapperWidth(container: HTMLElement): string {
  const wrapper = container.querySelector<HTMLElement>(
    '[data-slot="sidebar-wrapper"]'
  );
  if (!wrapper) {
    throw new Error('sidebar wrapper not found');
  }
  return wrapper.style.getPropertyValue('--sidebar-width');
}

/**
 * The resizable SidebarProvider persists its width to the `sidebar_width`
 * cookie. The server reads that cookie and threads the value down as
 * `persistedWidth`, so SSR markup and the client's first render both use the
 * persisted width — no hydration mismatch and no one-frame width jump. When no
 * width was persisted, the server threads nothing and both sides use
 * `defaultWidth`. These tests pin that server-fed value drives the rendered
 * `--sidebar-width` on both the server and the first client paint.
 */
describe('SidebarProvider persisted width hydration', () => {
  it('renders the server-fed persisted width in SSR markup', () => {
    const html = renderToString(tree(220));

    expect(html).toContain('--sidebar-width:220px');
    expect(html).not.toContain('--sidebar-width:264px');
  });

  it("matches SSR on the client's first render for the persisted width", () => {
    const { container } = render(tree(220));

    expect(readWrapperWidth(container)).toBe('220px');
  });

  it('falls back to defaultWidth when the server threads no persisted width', () => {
    const html = renderToString(tree());
    const { container } = render(tree());

    expect(html).toContain('--sidebar-width:264px');
    expect(readWrapperWidth(container)).toBe('264px');
  });
});
