import { describe, expect, it } from 'vitest';
import type { FilterModel } from '../src/design-system/components/ui/data-table-filter/core/types';
import {
  addUniq,
  flatten,
  intersection,
  isAnyOf,
  removeUniq,
  take,
  uniq
} from '../src/design-system/components/ui/data-table-filter/lib/array';
import {
  dateFilterFn,
  multiOptionFilterFn,
  numberFilterFn,
  optionFilterFn,
  textFilterFn
} from '../src/design-system/components/ui/data-table-filter/lib/filter-fns';

describe('data-table-filter array helpers', () => {
  it('deduplicates deep-equal objects while preserving first-seen order', () => {
    const first = { id: 'a', tags: ['x', 'y'] };
    const duplicate = { tags: ['x', 'y'], id: 'a' };
    const second = { id: 'b', tags: ['z'] };

    expect(uniq([first, duplicate, second])).toEqual([first, second]);
    expect(addUniq([first], [duplicate, second])).toEqual([first, second]);
  });

  it('provides small collection primitives used by filter builders', () => {
    expect(intersection(['a', 'b', 'c'], ['b', 'd'])).toEqual(['b']);
    expect(take(['a', 'b', 'c'], 2)).toEqual(['a', 'b']);
    expect(flatten([['a'], ['b', 'c']])).toEqual(['a', 'b', 'c']);
    expect(removeUniq(['a', 'b', 'c'], ['b'])).toEqual(['a', 'c']);
    expect(isAnyOf('b', ['a', 'b'])).toBe(true);
  });
});

describe('data-table-filter predicates', () => {
  it('applies text and option filters case-insensitively', () => {
    const textFilter = {
      columnId: 'name',
      type: 'text',
      operator: 'contains',
      values: ['ada']
    } satisfies FilterModel<'text'>;
    const optionFilter = {
      columnId: 'status',
      type: 'option',
      operator: 'is not',
      values: ['archived']
    } satisfies FilterModel<'option'>;

    expect(textFilterFn('Ada Lovelace', textFilter)).toBe(true);
    expect(textFilterFn('Grace Hopper', textFilter)).toBe(false);
    expect(optionFilterFn('RUNNING', optionFilter)).toBe(true);
    expect(optionFilterFn('archived', optionFilter)).toBe(false);
  });

  it('supports multi-option include-all and exclude-if-any semantics', () => {
    const includeAll = {
      columnId: 'tags',
      type: 'multiOption',
      operator: 'include all of',
      values: ['urgent', 'customer']
    } satisfies FilterModel<'multiOption'>;
    const excludeAny = {
      columnId: 'tags',
      type: 'multiOption',
      operator: 'exclude if any of',
      values: ['internal']
    } satisfies FilterModel<'multiOption'>;

    expect(
      multiOptionFilterFn(['urgent', 'customer', 'email'], includeAll)
    ).toBe(true);
    expect(multiOptionFilterFn(['urgent'], includeAll)).toBe(false);
    expect(multiOptionFilterFn(['customer'], excludeAny)).toBe(true);
    expect(multiOptionFilterFn(['internal'], excludeAny)).toBe(false);
  });

  it('applies inclusive and exclusive date ranges at day boundaries', () => {
    const between = {
      columnId: 'createdAt',
      type: 'date',
      operator: 'is between',
      values: [new Date(2026, 4, 10), new Date(2026, 4, 15)]
    } satisfies FilterModel<'date'>;
    const notBetween = {
      columnId: 'createdAt',
      type: 'date',
      operator: 'is not between',
      values: between.values
    } satisfies FilterModel<'date'>;

    expect(dateFilterFn(new Date(2026, 4, 15, 23, 59), between)).toBe(true);
    expect(dateFilterFn(new Date(2026, 4, 16, 0, 0), between)).toBe(false);
    expect(dateFilterFn(new Date(2026, 4, 16, 0, 0), notBetween)).toBe(true);
  });

  it('applies number ranges without letting out-of-range values pass', () => {
    const between = {
      columnId: 'count',
      type: 'number',
      operator: 'is between',
      values: [2, 5]
    } satisfies FilterModel<'number'>;
    const notBetween = {
      columnId: 'count',
      type: 'number',
      operator: 'is not between',
      values: [2, 5]
    } satisfies FilterModel<'number'>;

    expect(numberFilterFn(3, between)).toBe(true);
    expect(numberFilterFn(1, between)).toBe(false);
    expect(numberFilterFn(1, notBetween)).toBe(true);
    expect(numberFilterFn(3, notBetween)).toBe(false);
  });
});
