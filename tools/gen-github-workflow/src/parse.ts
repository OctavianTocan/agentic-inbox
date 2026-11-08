import { dirname } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { RawFragment } from './scan';

export interface ParsedFragment {
  /** Parsed YAML document (must have a `name` key) */
  data: Record<string, unknown>;
  /** Workflow name from the `name` key */
  name: string;
  /** Whether this workflow is required (for required-workflows.json) */
  required: boolean;
  /** Source file relative path */
  relativePath: string;
}

/** Narrow an unknown value to a plain (non-array) object. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const COMMENT_SLASH_RE = /^(\s*)\/\/\s?/;
const COMMENT_HASH_RE = /^(\s*)#\s?/;

/**
 * Strip leading comment characters (`//` or `#`) and an optional single space
 * from each line of a raw fragment block.
 */
function stripComments(lines: string[]): string[] {
  return lines.map((line) => {
    if (line.trimStart().startsWith('//')) {
      return line.replace(COMMENT_SLASH_RE, '$1');
    }
    if (line.trimStart().startsWith('#')) {
      return line.replace(COMMENT_HASH_RE, '$1');
    }
    return line;
  });
}

/**
 * Expand template variables in raw YAML text.
 * - `$$file` -> relative path to the source file
 * - `$$directory` -> relative path to the source file's directory
 */
function expandTemplateVars(text: string, relativePath: string): string {
  const relativeDir = dirname(relativePath);
  const dirValue = relativeDir === '.' ? '.' : relativeDir;

  return text
    .replaceAll('$$directory', dirValue)
    .replaceAll('$$file', relativePath);
}

/**
 * Resolve a raw workflow fragment into its parsed YAML document and metadata.
 *
 * @param fragment - Raw fragment block extracted from a source file.
 * @returns The parsed document (with `required` lifted out), workflow name, required flag, and source path.
 * @throws Error if the fragment is not valid YAML, is not a mapping, or lacks a non-empty top-level `name`.
 */
export function parseFragment(fragment: RawFragment): ParsedFragment {
  const stripped = stripComments(fragment.lines);
  const rawYaml = stripped.join('\n');
  const expanded = expandTemplateVars(rawYaml, fragment.relativePath);

  let data: unknown;
  try {
    data = parseYaml(expanded);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to parse YAML fragment in ${fragment.relativePath}: ${msg}`
    );
  }

  if (!isRecord(data)) {
    throw new Error(
      `Fragment in ${fragment.relativePath} must be a YAML mapping, got ${typeof data}`
    );
  }

  if (typeof data.name !== 'string' || data.name.length === 0) {
    throw new Error(
      `Fragment in ${fragment.relativePath} is missing a top-level 'name' key`
    );
  }

  const required = data.required === true;

  const { required: _required, ...cleanData } = data;

  return {
    data: cleanData,
    name: data.name,
    required,
    relativePath: fragment.relativePath
  };
}
