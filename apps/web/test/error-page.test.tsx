import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import InboxError from '@/app/error';

afterEach(cleanup);

describe('route error boundary', () => {
  it('shows a plain-language title without leaking the raw error', () => {
    // The boundary must reassure the user, not surface a stack trace or the
    // thrown message, so the sensitive-action guarantee stays legible.
    const error = new Error('DB connection refused at 10.0.0.4:5432');
    render(<InboxError error={error} unstable_retry={() => undefined} />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(
      'didn'
    );
    expect(screen.queryByText(/DB connection refused/)).toBeNull();
  });

  it('invokes the recovery callback when Try again is pressed', () => {
    // Try again is the whole point of the boundary: it must re-run the segment,
    // not be a decorative button.
    const retry = vi.fn();
    render(<InboxError error={new Error('boom')} unstable_retry={retry} />);

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(retry).toHaveBeenCalledOnce();
  });
});
