import { describe, expect, test, vi } from 'vitest';
import { type MergedSkill, mergeFragments } from '../src/merge';
import type { ParsedSkillFragment } from '../src/parse';

/**
 * Builds a parsed fragment for merge contract tests.
 * @param fragment Fragment fields to merge.
 * @returns A parsed skill fragment.
 */
function parsedFragment(fragment: ParsedSkillFragment): ParsedSkillFragment {
  return fragment;
}

/**
 * Reads one merged skill from a map.
 * @param skills Merged skill map.
 * @param name Skill name to read.
 * @returns The merged skill for the requested name.
 */
function getSkill(skills: Map<string, MergedSkill>, name: string): MergedSkill {
  const skill = skills.get(name);
  if (!skill) {
    throw new Error(`Expected merged skill ${name}.`);
  }

  return skill;
}

describe('mergeFragments', () => {
  test('concatenates bodies with one blank line', () => {
    const skills = mergeFragments([
      parsedFragment({
        name: 'testing',
        description: 'Testing skill.',
        body: 'First body.\n',
        relativePath: 'a.ts',
      }),
      parsedFragment({
        name: 'testing',
        description: 'Testing skill.',
        body: '\nSecond body.',
        relativePath: 'b.ts',
      }),
    ]);

    expect(getSkill(skills, 'testing').body).toBe(
      'First body.\n\nSecond body.'
    );
  });

  test('keeps non-empty content when one body is empty', () => {
    const skills = mergeFragments([
      parsedFragment({
        name: 'testing',
        description: 'Testing skill.',
        body: '',
        relativePath: 'a.ts',
      }),
      parsedFragment({
        name: 'testing',
        description: 'Testing skill.',
        body: 'Second body.',
        relativePath: 'b.ts',
      }),
      parsedFragment({
        name: 'testing',
        description: 'Testing skill.',
        body: '',
        relativePath: 'c.ts',
      }),
    ]);

    expect(getSkill(skills, 'testing').body).toBe('Second body.');
  });

  test('uses the last description and preserves source order', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    try {
      const skills = mergeFragments([
        parsedFragment({
          name: 'testing',
          description: 'Old description.',
          body: 'First body.',
          relativePath: 'a.ts',
        }),
        parsedFragment({
          name: 'testing',
          description: 'New description.',
          body: 'Second body.',
          relativePath: 'b.ts',
        }),
      ]);

      expect(getSkill(skills, 'testing')).toEqual({
        name: 'testing',
        description: 'New description.',
        body: 'First body.\n\nSecond body.',
        sources: ['a.ts', 'b.ts'],
      });
      expect(warn).toHaveBeenCalledWith(
        "merge: conflicting description for skill 'testing' from b.ts, using later value"
      );
    } finally {
      warn.mockRestore();
    }
  });
});
