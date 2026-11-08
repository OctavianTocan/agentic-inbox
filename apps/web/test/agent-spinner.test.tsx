import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AgentSpinner } from '@/design-system/components/ui/agent-spinner';

afterEach(cleanup);

describe('AgentSpinner', () => {
  it('exposes an accessible status region with the given label', () => {
    const { container } = render(<AgentSpinner label="Loading inbox" />);
    const status = container.querySelector('[role="status"]');
    expect(status).not.toBeNull();
    expect(status?.getAttribute('aria-label')).toBe('Loading inbox');
  });

  it('defaults the accessible label to "Loading"', () => {
    const { container } = render(<AgentSpinner />);
    expect(
      container.querySelector('[role="status"]')?.getAttribute('aria-label')
    ).toBe('Loading');
  });
});
