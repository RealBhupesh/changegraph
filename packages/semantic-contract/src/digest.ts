import { createHash } from 'node:crypto';
import type { Digest } from './types.js';

export function canonicalizeJson(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'boolean' || typeof value === 'number') {
    return JSON.stringify(value);
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    const items = value.map((item) => canonicalizeJson(item));
    return `[${items.join(',')}]`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const pairs = keys.map(
      (key) => `${JSON.stringify(key)}:${canonicalizeJson((value as Record<string, unknown>)[key])}`,
    );
    return `{${pairs.join(',')}}`;
  }
  throw new Error(`Cannot canonicalize value of type ${typeof value}`);
}

export function computeDigest(value: unknown): Digest {
  const canonical = canonicalizeJson(value);
  const hash = createHash('sha256').update(canonical, 'utf8').digest('hex');
  return `sha256:${hash}`;
}

export function computeBindingDigest(binding: {
  tenantId: string;
  repositoryId: string;
  baseSha: string;
  headSha: string;
  contractDefinitionDigest: Digest;
  policyDigest: Digest;
  executionConfigDigest: Digest;
}): Digest {
  return computeDigest(binding);
}
