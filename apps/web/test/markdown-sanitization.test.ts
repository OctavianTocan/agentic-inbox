import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Markdown } from '../src/design-system/components/ui/markdown/markdown';

describe('Markdown HTML sanitization', () => {
  it('removes executable URLs, event handlers, styles, and host utility classes from raw HTML', () => {
    const unsafeMarkdown =
      '<a href="javascript:alert(1)" onclick="alert(1)">bad</a><img src="x" onerror="alert(1)" /><div class="fixed inset-0 z-50" style="position:fixed">spoof</div>';
    const html = renderToStaticMarkup(
      React.createElement(Markdown, undefined, unsafeMarkdown)
    );

    expect(html).toContain('>bad</a>');
    expect(html).toContain('src="x"');
    expect(html).toContain('<div>spoof</div>');
    expect(html).not.toContain('href=');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('position:fixed');
    expect(html).not.toContain('fixed inset-0');
  });
});
