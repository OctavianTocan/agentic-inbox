import type { ParsedSkillFragment } from './parse';

const LEADING_NEWLINES = /^\n+/;

export interface MergedSkill {
  /** Skill name (merge key) */
  name: string;
  /** Skill description (last writer wins) */
  description: string;
  /** Concatenated markdown body from all contributing fragments */
  body: string;
  /** Source files that contributed to this skill (sorted) */
  sources: string[];
}

/**
 * Merge parsed skill fragments that share a name into one skill each.
 *
 * Merge rules:
 * - `name`: must match (merge key)
 * - `description`: last writer wins (warns on the console if values differ)
 * - body: concatenated in caller-provided fragment order
 *
 * @param fragments - Parsed fragments, already ordered so concatenation is deterministic.
 * @returns A map from skill name to its merged definition.
 */
export function mergeFragments(
  fragments: ParsedSkillFragment[]
): Map<string, MergedSkill> {
  const skills = new Map<string, MergedSkill>();

  for (const fragment of fragments) {
    const existing = skills.get(fragment.name);

    if (!existing) {
      skills.set(fragment.name, {
        name: fragment.name,
        description: fragment.description,
        body: fragment.body,
        sources: [fragment.relativePath],
      });
      continue;
    }

    if (existing.description !== fragment.description) {
      console.warn(
        `merge: conflicting description for skill '${fragment.name}' from ${fragment.relativePath}, using later value`
      );
    }

    existing.description = fragment.description;
    existing.sources.push(fragment.relativePath);
    existing.body = concatBodies(existing.body, fragment.body);
  }

  return skills;
}

/**
 * Concatenate two markdown bodies with a blank line separator.
 */
function concatBodies(existing: string, incoming: string): string {
  const a = existing.trimEnd();
  const b = incoming.replace(LEADING_NEWLINES, '');
  if (a === '') {
    return b;
  }
  if (b === '') {
    return a;
  }
  return `${a}\n\n${b}`;
}
