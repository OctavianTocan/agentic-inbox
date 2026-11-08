import { act, render } from '@testing-library/react';
import * as React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem
} from '../src/design-system/components/ui/carousel';

/**
 * embla-carousel calls `window.matchMedia` and `ResizeObserver` during init;
 * jsdom ships neither. Stub them with no-op shims so the carousel can mount
 * far enough to expose its api to `setApi`.
 */
beforeAll(() => {
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false
      })
    });
  }
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class ResizeObserverStub {
      observe = () => undefined;
      unobserve = () => undefined;
      disconnect = () => undefined;
    } as unknown as typeof ResizeObserver;
  }
  if (typeof globalThis.MutationObserver === 'undefined') {
    globalThis.MutationObserver = class MutationObserverStub {
      observe = () => undefined;
      disconnect = () => undefined;
      takeRecords = () => [];
    } as unknown as typeof MutationObserver;
  }
  if (typeof globalThis.IntersectionObserver === 'undefined') {
    globalThis.IntersectionObserver = class IntersectionObserverStub {
      readonly root = null;
      readonly rootMargin = '';
      readonly thresholds = [];
      observe = () => undefined;
      unobserve = () => undefined;
      disconnect = () => undefined;
      takeRecords = () => [];
    } as unknown as typeof IntersectionObserver;
  }
});

/**
 * Parent component whose state setter is wired through Carousel's `setApi`
 * prop. Calling that setter while Carousel is rendering would queue an update
 * on this parent and trip React's "Cannot update a component while rendering
 * a different component" warning.
 */
function CarouselParent({
  onApi
}: {
  readonly onApi: (api: CarouselApi) => void;
}) {
  const [api, setApi] = React.useState<CarouselApi | undefined>(undefined);

  React.useEffect(() => {
    if (api) {
      onApi(api);
    }
  }, [api, onApi]);

  return (
    <Carousel setApi={setApi}>
      <CarouselContent>
        <CarouselItem>slide</CarouselItem>
      </CarouselContent>
    </Carousel>
  );
}

const UPDATE_DURING_RENDER_PATTERN =
  /Cannot update a component .* while rendering/i;

describe('Carousel', () => {
  const consoleErrorSpy = vi
    .spyOn(console, 'error')
    .mockImplementation(() => undefined);

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  it('invokes setApi from an effect, not during render', () => {
    const onApi = vi.fn();
    act(() => {
      render(<CarouselParent onApi={onApi} />);
    });

    const renderDuringRenderCalls = consoleErrorSpy.mock.calls.filter((args) =>
      args.some(
        (arg) =>
          typeof arg === 'string' && UPDATE_DURING_RENDER_PATTERN.test(arg)
      )
    );

    expect(renderDuringRenderCalls).toEqual([]);
    expect(onApi).toHaveBeenCalled();
  });
});
