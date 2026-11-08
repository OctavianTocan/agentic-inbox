const WWW_PREFIX = /^www\./;

/**
 * Hostname for `url`, with a leading `www.` stripped. Falls back to the
 * raw input when not parseable so callers can still render something.
 *
 * @param url - URL to extract the hostname from.
 * @returns Hostname without `www.`, or the raw input on parse failure.
 */
export function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(WWW_PREFIX, "");
  } catch {
    return url;
  }
}

/**
 * Favicon URL for `url`. The provider must serve
 * `Access-Control-Allow-Origin: *` so DOM-scanning browser extensions
 * (e.g. QR scanners) can re-fetch the image without tripping CORS errors.
 *
 * @param url - Page URL to derive a favicon for.
 * @returns A `.ico` favicon URL from the DuckDuckGo icon service.
 */
export function getFaviconUrl(url: string): string {
  const hostname = encodeURIComponent(getHostname(url));
  return `https://icons.duckduckgo.com/ip3/${hostname}.ico`;
}
