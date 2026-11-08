import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useShortcut } from '@/design-system/hooks/use-shortcut';
import type { ShortcutDefinition } from '@/design-system/lib/shortcuts';

const CLEAR: ShortcutDefinition = {
  id: 'test.clear',
  keys: 'Escape',
  label: 'Clear',
  category: 'navigation'
};

const APPROVE: ShortcutDefinition = {
  id: 'test.approve',
  keys: 'e',
  label: 'Approve',
  category: 'actions'
};

const THEME: ShortcutDefinition = {
  id: 'test.theme',
  keys: 'Mod+Shift+L',
  label: 'Theme',
  category: 'general'
};

/** Registers the three probed shortcuts and renders a focusable editable field. */
function ShortcutHarness({
  onClear,
  onApprove,
  onTheme
}: {
  readonly onClear: () => void;
  readonly onApprove: () => void;
  readonly onTheme: () => void;
}) {
  useShortcut(CLEAR, onClear);
  useShortcut(APPROVE, onApprove);
  useShortcut(THEME, onTheme);
  return <textarea data-testid="composer" />;
}

describe('useShortcut editable-target filtering', () => {
  it('suppresses plain-key shortcuts while typing but still fires Cmd/Ctrl combos, and fires plain keys when focus is outside inputs', () => {
    const onClear = vi.fn();
    const onApprove = vi.fn();
    const onTheme = vi.fn();
    const { getByTestId } = render(
      <ShortcutHarness
        onApprove={onApprove}
        onClear={onClear}
        onTheme={onTheme}
      />
    );

    const composer = getByTestId('composer');
    composer.focus();

    // Escape and "e" are plain keys: they must not act on the inbox while the
    // user is typing in the composer (the reported bug: Escape cleared the
    // selection, single letters moved/approved).
    fireEvent.keyDown(composer, { key: 'Escape' });
    fireEvent.keyDown(composer, { key: 'e' });
    expect(onClear).not.toHaveBeenCalled();
    expect(onApprove).not.toHaveBeenCalled();

    // The Cmd/Ctrl theme combo must keep working even with the composer focused.
    fireEvent.keyDown(composer, { key: 'L', metaKey: true, shiftKey: true });
    fireEvent.keyDown(composer, { key: 'L', ctrlKey: true, shiftKey: true });
    expect(onTheme).toHaveBeenCalled();

    // With focus on the document body (no editable target) plain keys still act.
    composer.blur();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    fireEvent.keyDown(document.body, { key: 'e' });
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onApprove).toHaveBeenCalledTimes(1);
  });
});
