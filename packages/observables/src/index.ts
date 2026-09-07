import type { Json } from '@changegraph/semantic-contract';

export type ObservationStatus =
  | 'returned'
  | 'threw'
  | 'timed-out'
  | 'crashed'
  | 'protocol-error'
  | 'nondeterministic';

export interface Observation {
  status: ObservationStatus;
  payload?: Record<string, Json>;
  error?: string;
}

export interface Normalizer {
  id: string;
  normalize(value: unknown): Record<string, Json>;
}

export interface Comparator {
  id: string;
  compare(base: Record<string, Json>, head: Record<string, Json>): boolean;
}

export const identityJsonNormalizer: Normalizer = {
  id: 'identity-json-v1',
  normalize(value: unknown): Record<string, Json> {
    if (value === null || value === undefined) {
      return {};
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
      return sortKeys(value as Record<string, Json>);
    }
    throw new Error('identity-json-v1 requires a plain object');
  },
};

export const exactJsonComparator: Comparator = {
  id: 'exact-json-v1',
  compare(base: Record<string, Json>, head: Record<string, Json>): boolean {
    return JSON.stringify(sortKeys(base)) === JSON.stringify(sortKeys(head));
  },
};

function sortKeys(obj: Record<string, Json>): Record<string, Json> {
  const sorted: Record<string, Json> = {};
  for (const key of Object.keys(obj).sort()) {
    const val = obj[key];
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      sorted[key] = sortKeys(val as Record<string, Json>);
    } else {
      sorted[key] = val;
    }
  }
  return sorted;
}

export const normalizerRegistry = new Map<string, Normalizer>([
  ['identity-json-v1', identityJsonNormalizer],
]);

export const comparatorRegistry = new Map<string, Comparator>([
  ['exact-json-v1', exactJsonComparator],
]);

export function getNormalizer(id: string): Normalizer {
  const n = normalizerRegistry.get(id);
  if (!n) throw new Error(`Unknown normalizer: ${id}`);
  return n;
}

export function getComparator(id: string): Comparator {
  const c = comparatorRegistry.get(id);
  if (!c) throw new Error(`Unknown comparator: ${id}`);
  return c;
}

export type FunctionFixture = (input: Record<string, Json>) => unknown;

export function executeFunctionFixture(
  fn: FunctionFixture,
  input: Record<string, Json>,
  _timeoutMs = 5000,
): Observation {
  try {
    const result = fn(input);
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      return { status: 'protocol-error', error: 'Async functions not supported in sync fixture' };
    }
    const normalizer = identityJsonNormalizer;
    const payload = normalizer.normalize(result);
    return { status: 'returned', payload };
  } catch (err) {
    return { status: 'threw', error: (err as Error).message };
  }
}

export function compareObservations(
  baseObs: Observation,
  headObs: Observation,
  comparatorId: string,
): { equal: boolean; divergence?: string } {
  if (baseObs.status !== headObs.status) {
    return { equal: false, divergence: `Status mismatch: ${baseObs.status} vs ${headObs.status}` };
  }
  if (baseObs.status !== 'returned' || headObs.status !== 'returned') {
    return { equal: baseObs.status === headObs.status };
  }
  const comparator = getComparator(comparatorId);
  const equal = comparator.compare(baseObs.payload ?? {}, headObs.payload ?? {});
  return equal ? { equal: true } : { equal: false, divergence: 'Payload mismatch' };
}
