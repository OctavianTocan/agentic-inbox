import type { Dirent } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const OPEN_TAG = /^\s*(?:\/\/|#)\s*<gen-github-workflow>\s*$/;
const CLOSE_TAG = /^\s*(?:\/\/|#)\s*<\/gen-github-workflow>\s*$/;

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.agents',
  '.claude',
  '.codegraph',
  '.context',
  '.turbo',
  '.vscode',
  'dist',
  '.next',
  '.e2e-output',
  'e2e-test',
  'e2e-test-expected'
]);

const SCANNABLE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.nix',
  '.py',
  '.rb',
  '.go',
  '.rs',
  '.yaml',
  '.yml',
  '.toml',
  '.sh',
  '.bash'
]);

export interface RawFragment {
  /** Lines between the open/close tags (comment prefixes still intact) */
  lines: string[];
  /** Absolute path to the source file */
  filePath: string;
  /** Path relative to the base folder */
  relativePath: string;
}

/**
 * Collect every gen-github-workflow fragment found beneath a directory tree.
 *
 * @param baseDir - Root directory to search; relative paths are reported from here.
 * @param outputDir - Directory to exclude from the search (the generated output).
 * @param verbose - When true, logs per-file fragment counts to the console.
 * @returns Fragment blocks sorted by relative path for a deterministic merge order.
 */
export async function scan(
  baseDir: string,
  outputDir: string,
  verbose = false
): Promise<RawFragment[]> {
  const outputDirResolved = join(outputDir);
  const filePaths = await collectFiles(baseDir, outputDirResolved);
  const results = await Promise.all(
    filePaths.map((fp) => processFile(fp, baseDir, verbose))
  );
  const fragments = results.flat();

  fragments.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return fragments;
}

/** Whether a file's extension marks it as a candidate to scan for markers. */
function isScannable(fileName: string): boolean {
  return SCANNABLE_EXTENSIONS.has(extname(fileName));
}

/** Whether a directory entry should be excluded from traversal. */
function shouldSkipDir(
  entry: Dirent,
  fullPath: string,
  outputDir: string
): boolean {
  return SKIP_DIRS.has(entry.name) || fullPath === outputDir;
}

/** Collect every scannable file path under `dir`, excluding skipped and output directories. */
async function collectFiles(dir: string, outputDir: string): Promise<string[]> {
  const files: string[] = [];
  const queue = [dir];

  while (queue.length > 0) {
    const current = queue.shift() ?? dir;
    let entries: Dirent[];
    try {
      // biome-ignore lint/performance/noAwaitInLoops: BFS traversal is inherently sequential
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = join(current, entry.name);

      if (entry.isDirectory() && !shouldSkipDir(entry, fullPath, outputDir)) {
        queue.push(fullPath);
      }

      if (entry.isFile() && isScannable(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/** Read one file and extract its fragment blocks, or none if it has no markers. */
async function processFile(
  fullPath: string,
  baseDir: string,
  verbose: boolean
): Promise<RawFragment[]> {
  let content: string;
  try {
    content = await readFile(fullPath, 'utf-8');
  } catch {
    return [];
  }

  if (!content.includes('<gen-github-workflow>')) {
    return [];
  }

  const fileFragments = extractFragments(content, fullPath, baseDir);
  if (verbose && fileFragments.length > 0) {
    // biome-ignore lint/suspicious/noConsole: CLI diagnostic output
    console.log(
      `scan: found ${fileFragments.length} fragment(s) in ${relative(baseDir, fullPath)}`
    );
  }
  return fileFragments;
}

/** Begin a new fragment block, rejecting a marker nested inside another. */
function handleOpenTag(
  currentBlock: string[] | null,
  filePath: string,
  lineNum: number
): string[] {
  if (currentBlock !== null) {
    throw new Error(
      `Nested <gen-github-workflow> marker at ${filePath}:${lineNum}. Nested markers are not supported.`
    );
  }
  return [];
}

/** Close the current fragment block and record it, rejecting an unmatched close marker. */
function handleCloseTag(
  currentBlock: string[] | null,
  filePath: string,
  baseDir: string,
  lineNum: number,
  fragments: RawFragment[]
): void {
  if (currentBlock === null) {
    throw new Error(
      `Unexpected </gen-github-workflow> without opening tag at ${filePath}:${lineNum}`
    );
  }
  if (currentBlock.length > 0) {
    fragments.push({
      lines: currentBlock,
      filePath,
      relativePath: relative(baseDir, filePath)
    });
  }
}

/** Extract every fragment block delimited by open/close markers in a file's content. */
function extractFragments(
  content: string,
  filePath: string,
  baseDir: string
): RawFragment[] {
  const lines = content.split('\n');
  const fragments: RawFragment[] = [];
  let currentBlock: string[] | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line === undefined) {
      continue;
    }

    if (OPEN_TAG.test(line)) {
      currentBlock = handleOpenTag(currentBlock, filePath, i + 1);
      continue;
    }

    if (CLOSE_TAG.test(line)) {
      handleCloseTag(currentBlock, filePath, baseDir, i + 1, fragments);
      currentBlock = null;
      continue;
    }

    if (currentBlock !== null) {
      currentBlock.push(line);
    }
  }

  if (currentBlock !== null) {
    throw new Error(`Unclosed <gen-github-workflow> block in ${filePath}`);
  }

  return fragments;
}
