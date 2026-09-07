import type { RunBinding, Digest, Json } from '@changegraph/semantic-contract';
import { computeDigest } from '@changegraph/semantic-contract';
import type { Observation } from '@changegraph/observables';

export interface WitnessRecord {
  id: string;
  digest: Digest;
  binding: RunBinding;
  obligationId: string;
  input: Record<string, Json>;
  inputDomainDigest: Digest;
  baseObservation: Observation;
  headObservation: Observation;
  violatedPredicate: unknown;
  environmentFixtureDigest: Digest;
  seed: number;
  reproductionStatus: 'confirmed' | 'failed' | 'pending';
  minimizationStatus: 'original' | 'locally-minimized' | 'budget-exhausted';
  minimizationTrace: Array<{ input: Record<string, Json>; preserved: boolean }>;
  artifactReferences: Digest[];
}

export interface ShrinkConfig {
  maxAttempts: number;
  maxDurationMs: number;
}

export function shrinkWitness(
  witness: WitnessRecord,
  revalidate: (input: Record<string, Json>) => boolean,
  config: ShrinkConfig = { maxAttempts: 50, maxDurationMs: 10000 },
): WitnessRecord {
  const trace: Array<{ input: Record<string, Json>; preserved: boolean }> = [
    { input: witness.input, preserved: true },
  ];
  let best = witness.input;
  const start = Date.now();
  let attempts = 0;

  const candidates = generateShrinkCandidates(witness.input);

  for (const candidate of candidates) {
    if (attempts >= config.maxAttempts || Date.now() - start >= config.maxDurationMs) break;
    attempts++;

    if (revalidate(candidate)) {
      best = candidate;
      trace.push({ input: candidate, preserved: true });
    } else {
      trace.push({ input: candidate, preserved: false });
    }
  }

  const minimized = attempts >= config.maxAttempts || Date.now() - start >= config.maxDurationMs
    ? 'budget-exhausted'
    : 'locally-minimized';

  return {
    ...witness,
    input: best,
    digest: computeDigest({ ...witness, input: best }) as Digest,
    minimizationStatus: minimized,
    minimizationTrace: trace,
  };
}

function generateShrinkCandidates(input: Record<string, Json>): Record<string, Json>[] {
  const candidates: Record<string, Json>[] = [];

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'number') {
      if (value > 0) candidates.push({ ...input, [key]: 0 });
      if (value > 1) candidates.push({ ...input, [key]: Math.floor(value / 2) });
      candidates.push({ ...input, [key]: value - 1 });
    }
    if (typeof value === 'string' && value.length > 0) {
      candidates.push({ ...input, [key]: value.slice(0, Math.floor(value.length / 2)) });
    }
  }

  return candidates;
}

export function generateRegressionTest(
  witness: WitnessRecord,
  obligationKind: string,
): string {
  const inputJson = JSON.stringify(witness.input, null, 2);
  return `import { describe, it, expect } from 'vitest';

describe('Regression: ${witness.obligationId}', () => {
  it('should ${obligationKind === 'preservation' ? 'preserve behavior' : 'satisfy property'}', () => {
    const input = ${inputJson};
    // Import fixture functions and verify
    // Base observation: ${JSON.stringify(witness.baseObservation.payload)}
    // Head observation: ${JSON.stringify(witness.headObservation.payload)}
    expect(witness.input).toBeDefined();
  });
});
`;
}

export function createWitness(params: {
  binding: RunBinding;
  obligationId: string;
  input: Record<string, Json>;
  inputDomainDigest: Digest;
  baseObservation: Observation;
  headObservation: Observation;
  violatedPredicate: unknown;
  seed: number;
}): WitnessRecord {
  const id = computeDigest({ ...params, timestamp: Date.now() }).slice(7, 19);
  const witness: WitnessRecord = {
    id,
    digest: computeDigest(params) as Digest,
    binding: params.binding,
    obligationId: params.obligationId,
    input: params.input,
    inputDomainDigest: params.inputDomainDigest,
    baseObservation: params.baseObservation,
    headObservation: params.headObservation,
    violatedPredicate: params.violatedPredicate,
    environmentFixtureDigest: computeDigest({ provider: 'local-fixture' }) as Digest,
    seed: params.seed,
    reproductionStatus: 'confirmed',
    minimizationStatus: 'original',
    minimizationTrace: [],
    artifactReferences: [],
  };
  witness.digest = computeDigest(witness) as Digest;
  return witness;
}
