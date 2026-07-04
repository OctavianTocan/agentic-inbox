import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CopyIcon } from '../src/design-system/components/icons';
import { Logo } from '../src/design-system/components/logo';
import { Badge } from '../src/design-system/components/ui/badge';
import { Button } from '../src/design-system/components/ui/button';

describe('button icon and text spacing', () => {
  it('keeps horizontal padding balanced when a text button starts with an icon', () => {
    render(
      <Button>
        <CopyIcon data-icon="inline-start" />
        Copy text
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Copy text' });
    expect(button.className).toContain('px-3');
    expect(button.className).not.toContain('pl-2');
    expect(button.className).toContain(
      '[&_svg[data-icon=inline-start]]:size-[1lh]!'
    );
  });

  it('keeps horizontal padding balanced when a text button ends with an icon', () => {
    render(
      <Button>
        Next
        <CopyIcon data-icon="inline-end" />
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Next' });
    expect(button.className).toContain('px-3');
    expect(button.className).not.toContain('pr-2');
    expect(button.className).toContain(
      '[&_svg[data-icon=inline-end]]:size-[1lh]!'
    );
  });

  it('keeps horizontal padding balanced when a badge starts with an icon', () => {
    const { container } = render(
      <Badge>
        <CopyIcon data-icon="inline-start" />
        Copied
      </Badge>
    );

    expect(container.firstElementChild?.className).toContain('px-2');
    expect(container.firstElementChild?.className).not.toContain('pl-1.5');
    expect(container.firstElementChild?.className).toContain(
      '[&>svg[data-icon=inline-start]]:size-[1lh]!'
    );
  });

  it('sizes the logo mark to the text line height', () => {
    const { container } = render(<Logo />);

    expect(container.querySelector('svg')?.getAttribute('class')).toContain(
      'size-[1lh]'
    );
  });
});
