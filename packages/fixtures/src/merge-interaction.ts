import type { FunctionFixture } from '@changegraph/verifier-differential';

function computeCapacity(workers: number, batchSize: number): { capacity: number } {
  return { capacity: workers * batchSize };
}

export const baseFn: FunctionFixture = () => computeCapacity(2, 2);
export const prAFn: FunctionFixture = () => computeCapacity(4, 2);
export const prBFn: FunctionFixture = () => computeCapacity(2, 4);
export const composedFn: FunctionFixture = () => computeCapacity(4, 4);

export const mergeInteractionFixtures = {
  baseFn,
  prAFn,
  prBFn,
  composedFn,
  invariantCheck: (result: Record<string, unknown>) => {
    const capacity = result.capacity as number;
    return capacity <= 10;
  },
};
