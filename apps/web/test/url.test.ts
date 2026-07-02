import { describe, expect, it } from 'vitest';
import { getFaviconUrl, getHostname } from '../src/design-system/lib/url';

describe('getHostname', () => {
  it('strips www from valid hostnames', () => {
    expect(getHostname('https://www.example.com/docs')).toBe('example.com');
  });

  it('returns the original input when parsing fails', () => {
    expect(getHostname('not a url')).toBe('not a url');
  });
});

describe('getFaviconUrl', () => {
  it('builds an encoded DuckDuckGo favicon URL from the normalized hostname', () => {
    expect(getFaviconUrl('https://www.example.com/docs')).toBe(
      'https://icons.duckduckgo.com/ip3/example.com.ico'
    );
  });
});
