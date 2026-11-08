import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_FILTERS } from '@/components/inbox/filters';
import { InboxSidebar } from '@/components/inbox/inbox-sidebar';
import {
  SidebarProvider,
  useSidebar
} from '@/design-system/components/ui/sidebar';
import { DesignSystemProvider } from '@/design-system/providers';

afterEach(cleanup);

beforeEach(() => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: /max-width/.test(query),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false
  }));
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 400
  });
});

/** Opens the mobile sheet on mount and exposes its open state for assertions. */
function MobileHarness() {
  const { openMobile, setOpenMobile } = useSidebar();

  return (
    <>
      <button onClick={() => setOpenMobile(true)} type="button">
        open
      </button>
      <span data-testid="sheet-open">{String(openMobile)}</span>
      <InboxSidebar
        filters={EMPTY_FILTERS}
        items={[]}
        ledger={[]}
        onFiltersChange={() => {}}
      />
    </>
  );
}

describe('InboxSidebar audit navigation on mobile', () => {
  it('renders the audit entry as a real link and closes the mobile sheet when tapped', async () => {
    render(
      <DesignSystemProvider>
        <SidebarProvider>
          <MobileHarness />
        </SidebarProvider>
      </DesignSystemProvider>
    );

    fireEvent.click(screen.getByText('open'));
    expect(screen.getByTestId('sheet-open').textContent).toBe('true');

    const auditLabel = await screen.findByText('Audit');
    const auditLink = auditLabel.closest('a');
    expect(auditLink).not.toBeNull();
    expect(auditLink?.getAttribute('href')).toBe('/audit');

    if (auditLink) {
      fireEvent.click(auditLink);
    }

    // Tapping a nav entry must dismiss the modal sheet so the client-side
    // navigation is not masked by the lingering overlay and focus trap.
    expect(screen.getByTestId('sheet-open').textContent).toBe('false');
  });
});
