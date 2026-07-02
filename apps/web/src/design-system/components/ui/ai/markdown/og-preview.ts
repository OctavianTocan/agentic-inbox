"use client";

import { useEffect, useState } from "react";

const MICROLINK_ENDPOINT = "https://api.microlink.io/";

export type OgPreview = {
  image?: string;
  logo?: string;
  title?: string;
  description?: string;
};

type MicrolinkResponse = {
  status?: string;
  data?: {
    image?: { url?: string };
    logo?: { url?: string };
    title?: string;
    description?: string;
  };
};

const cache = new Map<string, Promise<OgPreview | null>>();

/**
 * Fetch OpenGraph metadata for `url`. Concurrent callers share one request
 * and a stable result for the lifetime of the page; a failed fetch is
 * retried on a later call.
 *
 * @param url - Absolute URL to fetch preview metadata for.
 * @returns The OpenGraph fields, or null when the fetch failed or returned none.
 */
export function fetchOgPreview(url: string): Promise<OgPreview | null> {
  const cached = cache.get(url);
  if (cached) {
    return cached;
  }
  const promise = (async () => {
    try {
      const response = await fetch(
        `${MICROLINK_ENDPOINT}?url=${encodeURIComponent(url)}`,
      );
      if (!response.ok) {
        cache.delete(url);
        return null;
      }
      const json: MicrolinkResponse = await response.json();
      if (json.status !== "success") {
        cache.delete(url);
        return null;
      }
      const image = json.data?.image?.url;
      const logo = json.data?.logo?.url;
      const title = json.data?.title;
      const description = json.data?.description;
      return {
        image: typeof image === "string" ? image : undefined,
        logo: typeof logo === "string" ? logo : undefined,
        title: typeof title === "string" ? title : undefined,
        description: typeof description === "string" ? description : undefined,
      };
    } catch {
      cache.delete(url);
      return null;
    }
  })();
  cache.set(url, promise);
  return promise;
}

/**
 * Subscribe to `fetchOgPreview(url)`. Returns:
 *   - `undefined` while loading
 *   - `null` when the fetch failed or the URL had no metadata
 *   - the `OgPreview` object on success
 */
export function useOgPreview(url: string): OgPreview | null | undefined {
  const [data, setData] = useState<OgPreview | null | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    setData(undefined);
    fetchOgPreview(url).then((result) => {
      if (!cancelled) {
        setData(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [url]);
  return data;
}
