import { describe, expect, it } from 'vitest';
import { prepareMarkdownMathSource } from '../src/design-system/components/ui/markdown/markdown-math';

describe('prepareMarkdownMathSource', () => {
  it('preserves single-dollar inline math', () => {
    const markdown = String.raw`Inline: $E = mc^2$ and $\int_0^\infty e^{-x^2},dx = \tfrac{\sqrt{\pi}}{2}$.`;

    expect(prepareMarkdownMathSource(markdown)).toBe(markdown);
  });

  it('escapes currency dollars before the math parser runs', () => {
    const markdown =
      'Closed a $100M round at a $2B valuation, then rendered $E = mc^2$.';

    expect(prepareMarkdownMathSource(markdown)).toBe(
      'Closed a \\$100M round at a \\$2B valuation, then rendered $E = mc^2$.'
    );
  });

  it('escapes currency ranges before later inline math', () => {
    const markdown =
      'Revenue moved from $100-$200, then rendered $E = mc^2$ correctly.';

    expect(prepareMarkdownMathSource(markdown)).toBe(
      'Revenue moved from \\$100-\\$200, then rendered $E = mc^2$ correctly.'
    );
  });

  it('escapes currency with operators before later inline math', () => {
    const markdown = 'Costs $100 + tax before math $E = mc^2$.';

    expect(prepareMarkdownMathSource(markdown)).toBe(
      'Costs \\$100 + tax before math $E = mc^2$.'
    );
  });

  it('escapes unpaired currency dollars', () => {
    expect(prepareMarkdownMathSource('The plan costs $100 per month.')).toBe(
      'The plan costs \\$100 per month.'
    );
  });

  it('escapes numeric currency before whitespace-separated math', () => {
    const markdown = 'The equation costs $1000 $E = mc^2$ to render.';

    expect(prepareMarkdownMathSource(markdown)).toBe(
      'The equation costs \\$1000 $E = mc^2$ to render.'
    );
  });

  it('does not touch numeric-leading math spans', () => {
    const markdown = [
      'The affine form is $2x + 1$ in one dimension.',
      'A spaced variable is $2 x$.',
      'A numeric sequence is $1, 2, 3$.',
      'A probability is $0.5 p$.'
    ].join('\n');

    expect(prepareMarkdownMathSource(markdown)).toBe(markdown);
  });

  it('does not rewrite dollars inside code', () => {
    const markdown = [
      'Inline code `$100` stays literal.',
      '',
      '```ts',
      'const price = "$100";',
      '```'
    ].join('\n');

    expect(prepareMarkdownMathSource(markdown)).toBe(markdown);
  });

  it('does not rewrite dollars inside fenced code nested in containers', () => {
    const markdown = [
      '> ```ts',
      '> const quotedPrice = "$100";',
      '> ```',
      '',
      '- ```ts',
      '  const listedPrice = "$200";',
      '  ```',
      '',
      'The plan costs $300 per month.'
    ].join('\n');

    expect(prepareMarkdownMathSource(markdown)).toBe(
      [
        '> ```ts',
        '> const quotedPrice = "$100";',
        '> ```',
        '',
        '- ```ts',
        '  const listedPrice = "$200";',
        '  ```',
        '',
        'The plan costs \\$300 per month.'
      ].join('\n')
    );
  });

  it('does not rewrite dollars inside indented code blocks', () => {
    const markdown = [
      '    const price = "$100";',
      '    const fee = "$200";'
    ].join('\n');

    expect(prepareMarkdownMathSource(markdown)).toBe(markdown);
  });

  it('does not rewrite dollars inside container-prefixed indented code blocks', () => {
    const markdown = [
      '>     const quotedPrice = "$100";',
      '>     const quotedFee = "$200";',
      '',
      '-     const listedPrice = "$300";',
      '',
      'The plan costs $400 per month.'
    ].join('\n');

    expect(prepareMarkdownMathSource(markdown)).toBe(
      [
        '>     const quotedPrice = "$100";',
        '>     const quotedFee = "$200";',
        '',
        '-     const listedPrice = "$300";',
        '',
        'The plan costs \\$400 per month.'
      ].join('\n')
    );
  });

  it('escapes dollars on indented paragraph continuation lines', () => {
    const markdown = [
      'This paragraph continues on the next line',
      '    with a $100 price.',
      '',
      '    const price = "$200";'
    ].join('\n');

    expect(prepareMarkdownMathSource(markdown)).toBe(
      [
        'This paragraph continues on the next line',
        '    with a \\$100 price.',
        '',
        '    const price = "$200";'
      ].join('\n')
    );
  });

  it('does not rewrite dollars inside inline HTML', () => {
    const markdown = 'Price $100 <span>$200</span> before math $E = mc^2$.';

    expect(prepareMarkdownMathSource(markdown)).toBe(
      'Price \\$100 <span>$200</span> before math $E = mc^2$.'
    );
  });

  it('does not rewrite dollars inside raw HTML blocks', () => {
    const markdown = [
      '<div>',
      '$100',
      '</div>',
      '',
      'Math still renders as $E = mc^2$ afterward.'
    ].join('\n');

    expect(prepareMarkdownMathSource(markdown)).toBe(markdown);
  });

  it('does not end raw text HTML blocks on blank lines', () => {
    const markdown = [
      '<script>',
      'const price = "$100";',
      '',
      'const discounted = "$200";',
      '</script>',
      '',
      'The plan costs $300 per month.'
    ].join('\n');

    expect(prepareMarkdownMathSource(markdown)).toBe(
      [
        '<script>',
        'const price = "$100";',
        '',
        'const discounted = "$200";',
        '</script>',
        '',
        'The plan costs \\$300 per month.'
      ].join('\n')
    );
  });

  it('does not rewrite dollars inside container-prefixed raw HTML blocks', () => {
    const markdown = [
      '> <script>',
      '> const quotedPrice = "$100";',
      '> </script>',
      '',
      '- <style>',
      '  .price::before { content: "$200"; }',
      '  </style>',
      '',
      'The plan costs $300 per month.'
    ].join('\n');

    expect(prepareMarkdownMathSource(markdown)).toBe(
      [
        '> <script>',
        '> const quotedPrice = "$100";',
        '> </script>',
        '',
        '- <style>',
        '  .price::before { content: "$200"; }',
        '  </style>',
        '',
        'The plan costs \\$300 per month.'
      ].join('\n')
    );
  });

  it('does not rewrite dollars inside non-tag raw HTML blocks', () => {
    const markdown = [
      '<!--',
      '$100',
      '-->',
      '',
      '<?process',
      '$200',
      '?>',
      '',
      '<![CDATA[',
      '$300',
      ']]>',
      '',
      'The plan costs $400 per month.'
    ].join('\n');

    expect(prepareMarkdownMathSource(markdown)).toBe(
      [
        '<!--',
        '$100',
        '-->',
        '',
        '<?process',
        '$200',
        '?>',
        '',
        '<![CDATA[',
        '$300',
        ']]>',
        '',
        'The plan costs \\$400 per month.'
      ].join('\n')
    );
  });

  it('resumes dollar escaping after a blank line ends a raw HTML block', () => {
    const markdown = [
      '<div>',
      '$100',
      '',
      'The plan costs $200 per month.',
      '</div>'
    ].join('\n');

    expect(prepareMarkdownMathSource(markdown)).toBe(
      ['<div>', '$100', '', 'The plan costs \\$200 per month.', '</div>'].join(
        '\n'
      )
    );
  });

  it('keeps type-6 HTML blocks open until a blank line', () => {
    const markdown = [
      '<div>',
      '$100',
      '</div>',
      'The raw HTML block still contains $200.',
      '',
      'The plan costs $300 per month.'
    ].join('\n');

    expect(prepareMarkdownMathSource(markdown)).toBe(
      [
        '<div>',
        '$100',
        '</div>',
        'The raw HTML block still contains $200.',
        '',
        'The plan costs \\$300 per month.'
      ].join('\n')
    );
  });

  it('does not treat non-block HTML tags with text as raw HTML block openers', () => {
    const markdown = [
      '<span>label',
      'The plan costs $100 before math $E = mc^2$.'
    ].join('\n');

    expect(prepareMarkdownMathSource(markdown)).toBe(
      ['<span>label', 'The plan costs \\$100 before math $E = mc^2$.'].join(
        '\n'
      )
    );
  });

  it('treats tag-only HTML lines as raw HTML blocks until a blank line', () => {
    const markdown = [
      '<span>',
      '$100',
      '',
      'The plan costs $200 per month.'
    ].join('\n');

    expect(prepareMarkdownMathSource(markdown)).toBe(
      ['<span>', '$100', '', 'The plan costs \\$200 per month.'].join('\n')
    );
  });

  it('does not treat void HTML tags as raw HTML block openers', () => {
    const markdown = [
      'Intro text.',
      '<br>',
      '<img src="price.png" alt="price">',
      'The plan costs $100 per month.'
    ].join('\n');

    expect(prepareMarkdownMathSource(markdown)).toBe(
      [
        'Intro text.',
        '<br>',
        '<img src="price.png" alt="price">',
        'The plan costs \\$100 per month.'
      ].join('\n')
    );
  });

  it('preserves currency dollars inside multiline inline code spans', () => {
    const markdown = ['Code starts `price', '$100', '` after the break.'].join(
      '\n'
    );

    expect(prepareMarkdownMathSource(markdown)).toBe(markdown);
  });

  it('does not rewrite dollars inside CommonMark autolinks', () => {
    const markdown =
      'Docs live at <https://example.com/prices/$100> before math $E = mc^2$.';

    expect(prepareMarkdownMathSource(markdown)).toBe(markdown);
  });

  it('detects a second multiline inline code span after closing one mid-line', () => {
    const markdown = [
      'First `price',
      '$100',
      '` then second `fee',
      '$200',
      '` before the plan costs $300 per month.'
    ].join('\n');

    expect(prepareMarkdownMathSource(markdown)).toBe(
      [
        'First `price',
        '$100',
        '` then second `fee',
        '$200',
        '` before the plan costs \\$300 per month.'
      ].join('\n')
    );
  });

  it('resumes dollar escaping after multiline inline code spans', () => {
    const markdown = [
      'Code starts `price',
      '$100',
      '` then the plan costs $200 per month.'
    ].join('\n');

    expect(prepareMarkdownMathSource(markdown)).toBe(
      [
        'Code starts `price',
        '$100',
        '` then the plan costs \\$200 per month.'
      ].join('\n')
    );
  });

  it('does not keep multiline inline code spans open across blank lines', () => {
    const markdown = [
      'An unmatched `code marker starts here',
      '',
      'The plan costs $100 per month.',
      '` later text.'
    ].join('\n');

    expect(prepareMarkdownMathSource(markdown)).toBe(
      [
        'An unmatched `code marker starts here',
        '',
        'The plan costs \\$100 per month.',
        '` later text.'
      ].join('\n')
    );
  });
});
