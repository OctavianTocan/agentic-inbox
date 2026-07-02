import { dirname } from 'node:path';
import { parse } from 'yaml';
import type { RawFragment } from './scan';

export interface ParsedFragment {
  /** Workflow name; also the output filename stem. */
  name: string;
  /** GitHub Actions workflow object with `required` removed. */
  data: Record<string, unknown>;
  /** Whether this workflow's job names should be written to required-workflows.json. */
  required: boolean;
  /** Relative source path used in generated headers. */
  relativePath: string;
}

/** Narrow a value to a plain non-array object. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Remove the source-language comment prefix from one fragment line. */
function stripCommentPrefix(line: string): string {
  return line.replace(/^\s*(?:\/\/|#)\s?/, '');
}

/** Expand workflow-gen path variables before YAML parsing. */
function expandTemplateVariables(text: string, fragment: RawFragment): string {
  return text
    .replaceAll('$$directory', dirname(fragment.relativePath))
    .replaceAll('$$file', fragment.relativePath);
}

/** Parse the comment-stripped YAML text into a workflow object. */
function parseWorkflowYaml(text: string, relativePath: string): unknown {
  try {
    return parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid workflow YAML in ${relativePath}: ${message}`);
  }
}

/**
 * Parse one raw workflow-gen fragment into structured workflow data.
 *
 * @param fragment - Raw marker block found by `scan`.
 * @returns Parsed fragment, or `null` when the block is empty.
 * @throws Error when the block is not a YAML object or lacks a string `name`.
 */
export function parseFragment(fragment: RawFragment): ParsedFragment | null {
  const yamlText = expandTemplateVariables(
    fragment.lines.map(stripCommentPrefix).join('\n').trim(),
    fragment
  );

  if (yamlText.length === 0) {
    return null;
  }

  const parsed = parseWorkflowYaml(yamlText, fragment.relativePath);
  if (!isRecord(parsed)) {
    throw new Error(
      `Invalid workflow fragment in ${fragment.relativePath}: top-level YAML must be an object`
    );
  }

  if (typeof parsed.name !== 'string' || parsed.name.trim().length === 0) {
    throw new Error(
      `Invalid workflow fragment in ${fragment.relativePath}: missing string 'name'`
    );
  }

  const { required: requiredValue, ...data } = parsed;

  return {
    name: parsed.name,
    data,
    required: requiredValue === true,
    relativePath: fragment.relativePath,
  };
}
