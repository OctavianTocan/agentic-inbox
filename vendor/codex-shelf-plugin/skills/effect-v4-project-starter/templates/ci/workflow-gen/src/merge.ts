import type { ParsedFragment } from './parse';

export interface MergedWorkflow {
  /** Workflow name and generated filename stem. */
  name: string;
  /** Merged GitHub Actions workflow object. */
  data: Record<string, unknown>;
  /** Whether job names should be included in required-workflows.json. */
  required: boolean;
  /** Relative source paths that contributed to the workflow. */
  sources: string[];
}

/** Narrow a value to a plain non-array object. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Narrow a value to an array of unknown elements. */
function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Deep-merge parsed fragments by workflow name.
 *
 * @param fragments - Parsed fragments to combine, in discovery order.
 * @param verbose - When true, log conflicting scalar keys to stderr.
 * @returns Map keyed by workflow name to its merged definition.
 */
export function mergeFragments(
  fragments: ParsedFragment[],
  verbose = false
): Map<string, MergedWorkflow> {
  const workflows = new Map<string, MergedWorkflow>();

  for (const fragment of fragments) {
    const existing = workflows.get(fragment.name);

    if (!existing) {
      workflows.set(fragment.name, {
        name: fragment.name,
        data: structuredClone(fragment.data),
        required: fragment.required,
        sources: [fragment.relativePath],
      });
      continue;
    }

    if (fragment.required) {
      existing.required = true;
    }
    existing.sources.push(fragment.relativePath);
    mergeInto(existing.data, fragment.data, fragment.relativePath, verbose);
  }

  return workflows;
}

/** Merge an incoming `on` value into the target's triggers. */
function mergeOnKey(target: Record<string, unknown>, value: unknown): void {
  const existing = isRecord(target.on) ? target.on : undefined;
  const incoming = isRecord(value) ? value : {};
  target.on = mergeOn(existing, incoming);
}

/** Shallow-merge an incoming object value into the target under `key`. */
function mergeShallowKey(
  target: Record<string, unknown>,
  key: string,
  value: unknown
): void {
  const existing = isRecord(target[key]) ? target[key] : {};
  const incoming = isRecord(value) ? value : {};
  target[key] = { ...existing, ...incoming };
}

/** Merge an incoming `jobs` value into the target's jobs. */
function mergeJobsKey(target: Record<string, unknown>, value: unknown): void {
  const existing = isRecord(target.jobs) ? target.jobs : undefined;
  const incoming = isRecord(value) ? value : {};
  target.jobs = mergeJobs(existing, incoming);
}

/** Assign a scalar key with last-writer-wins, warning on conflict when verbose. */
function mergeDefaultKey(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
  sourcePath: string,
  verbose: boolean
): void {
  if (key in target && target[key] !== value && verbose) {
    console.warn(
      `merge: conflicting value for '${key}' in workflow '${String(target.name)}' from ${sourcePath}, using later value`
    );
  }
  target[key] = value;
}

/** Merge every key of one fragment's data into an existing workflow's data. */
function mergeInto(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  sourcePath: string,
  verbose: boolean
): void {
  for (const [key, value] of Object.entries(source)) {
    if (key === 'name') {
      continue;
    }

    switch (key) {
      case 'on':
        mergeOnKey(target, value);
        break;
      case 'env':
      case 'permissions':
        mergeShallowKey(target, key, value);
        break;
      case 'concurrency':
        target.concurrency = value;
        break;
      case 'jobs':
        mergeJobsKey(target, value);
        break;
      default:
        mergeDefaultKey(target, key, value, sourcePath, verbose);
        break;
    }
  }
}

/** Union-merge `on` triggers by trigger name. */
function mergeOn(
  existing: Record<string, unknown> | undefined,
  incoming: Record<string, unknown>
): Record<string, unknown> {
  if (!existing) {
    return structuredClone(incoming);
  }

  const result = structuredClone(existing);

  for (const [trigger, config] of Object.entries(incoming)) {
    if (!(trigger in result)) {
      result[trigger] = structuredClone(config);
    }
  }

  return result;
}

/** Merge one incoming job into an existing job, concatenating `steps`. */
function mergeSingleJob(
  existingJob: Record<string, unknown>,
  incomingJob: Record<string, unknown>
): void {
  for (const [key, value] of Object.entries(incomingJob)) {
    if (key === 'steps') {
      const existingSteps = isUnknownArray(existingJob.steps)
        ? existingJob.steps
        : [];
      const incomingSteps = isUnknownArray(value) ? value : [];
      existingJob.steps = [...existingSteps, ...incomingSteps];
    } else {
      existingJob[key] = value;
    }
  }
}

/** Merge jobs by job id, concatenating step arrays for repeated jobs. */
function mergeJobs(
  existing: Record<string, unknown> | undefined,
  incoming: Record<string, unknown>
): Record<string, unknown> {
  if (!existing) {
    return structuredClone(incoming);
  }

  const result = structuredClone(existing);

  for (const [jobId, jobConfig] of Object.entries(incoming)) {
    if (!(jobId in result)) {
      result[jobId] = structuredClone(jobConfig);
      continue;
    }

    const existingJob = result[jobId];
    if (!(isRecord(existingJob) && isRecord(jobConfig))) {
      result[jobId] = structuredClone(jobConfig);
      continue;
    }

    mergeSingleJob(existingJob, jobConfig);
  }

  return result;
}
