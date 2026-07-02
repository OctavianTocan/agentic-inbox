import { act, render } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { Icon } from '../src/design-system/components/icons';
import { FilterValueMultiOptionController } from '../src/design-system/components/ui/data-table-filter/components/filter-value';
import type {
  Column,
  ColumnOption,
  DataTableFilterActions,
  FilterModel
} from '../src/design-system/components/ui/data-table-filter/core/types';

/**
 * cmdk reads ResizeObserver and calls element.scrollIntoView during layout;
 * jsdom ships neither. Stub both so the command tree can mount without
 * throwing.
 */
beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class ResizeObserverStub {
      observe = () => undefined;
      unobserve = () => undefined;
      disconnect = () => undefined;
    } as unknown as typeof ResizeObserver;
  }
  if (typeof Element.prototype.scrollIntoView !== 'function') {
    Element.prototype.scrollIntoView = function scrollIntoViewStub() {
      // jsdom stub: scroll behaviour is irrelevant to this test.
    };
  }
});

/** Placeholder icon component for the Column stub; renders nothing. */
const NoIcon: Icon = () => null;

/**
 * Minimal Column stub for the multi-option controller. Only `getOptions` and
 * `getFacetedUniqueValues` are exercised; the remaining fields exist to
 * satisfy the Column type without casts.
 */
function makeColumn(
  options: readonly ColumnOption[]
): Column<unknown, 'multiOption'> {
  return {
    id: 'tags',
    accessor: () => undefined,
    displayName: 'Tags',
    icon: NoIcon,
    type: 'multiOption',
    getOptions: () => [...options],
    getValues: () => [],
    getFacetedUniqueValues: () => undefined,
    getFacetedMinMaxValues: () => undefined,
    prefetchOptions: () => Promise.resolve(),
    prefetchValues: () => Promise.resolve(),
    prefetchFacetedUniqueValues: () => Promise.resolve(),
    prefetchFacetedMinMaxValues: () => Promise.resolve(),
    _prefetchedOptionsCache: null,
    _prefetchedValuesCache: null,
    _prefetchedFacetedUniqueValuesCache: null,
    _prefetchedFacetedMinMaxValuesCache: null
  };
}

/**
 * No-op actions stub. The controller calls these on user interaction but the
 * regression test drives the toggle by re-rendering with a new filter rather
 * than firing DOM events, so vi.fn() with no side effects is sufficient.
 */
function makeActions(): DataTableFilterActions {
  return {
    addFilterValue: vi.fn(),
    removeFilterValue: vi.fn(),
    setFilterValue: vi.fn(),
    setFilterOperator: vi.fn(),
    removeFilter: vi.fn(),
    removeAllFilters: vi.fn()
  };
}

/**
 * Collect option labels per command-group, in render order. The selected group
 * renders first, so index 0 is "initially selected" and index 1 "initially
 * unselected".
 */
function readGroupLabels(container: HTMLElement): readonly string[][] {
  const groups = container.querySelectorAll('[data-slot="command-group"]');
  return Array.from(groups).map((group) =>
    Array.from(group.querySelectorAll('[data-slot="command-item"]')).map(
      (item) => {
        const labelSpan = Array.from(item.querySelectorAll('span')).find(
          (span) => span.querySelector('sup') !== null
        );
        const firstTextNode = labelSpan?.firstChild;
        return (firstTextNode?.textContent ?? '').trim();
      }
    )
  );
}

describe('FilterValueMultiOptionController', () => {
  it('keeps initially-selected options in the selected group after the parent toggles them off', () => {
    const options: ColumnOption[] = [
      { label: 'Alpha', value: 'a' },
      { label: 'Bravo', value: 'b' },
      { label: 'Charlie', value: 'c' }
    ];
    const column = makeColumn(options);
    const actions = makeActions();

    const initialFilter: FilterModel<'multiOption'> = {
      columnId: 'tags',
      type: 'multiOption',
      operator: 'include',
      values: ['b']
    };

    const { container, rerender } = render(
      <FilterValueMultiOptionController
        actions={actions}
        column={column}
        filter={initialFilter}
        strategy="client"
      />
    );

    const [initiallySelected, initiallyUnselected] = readGroupLabels(container);
    expect(initiallySelected).toEqual(['Bravo']);
    expect(initiallyUnselected).toEqual(['Alpha', 'Charlie']);

    const toggledFilter: FilterModel<'multiOption'> = {
      ...initialFilter,
      values: []
    };

    act(() => {
      rerender(
        <FilterValueMultiOptionController
          actions={actions}
          column={column}
          filter={toggledFilter}
          strategy="client"
        />
      );
    });

    // A re-render that toggles the filter off must not reshuffle options
    // between groups: initially-selected options stay in the selected group.
    const [afterSelected, afterUnselected] = readGroupLabels(container);
    expect(afterSelected).toEqual(['Bravo']);
    expect(afterUnselected).toEqual(['Alpha', 'Charlie']);
  });
});
