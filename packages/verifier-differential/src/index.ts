import { randomUUID } from 'node:crypto';
import {
  type ContractDefinition,
  type RunBinding,
  type ObligationResult,
  type EvidenceState,
  type Json,
  evaluatePredicate,
  evaluateWhenGuard,
  generateInputCases,
  validateInput,
} from '@changegraph/semantic-contract';
import {
  executeFunctionFixture,
  type FunctionFixture,
  type Observation,
} from '@changegraph/observables';
import type {
  VerifierAdapter,
  VerificationInput,
  VerificationContext,
  VerificationAttempt,
  SupportResult,
  CostEstimate,
} from '@changegraph/verifier-core';

export interface TwinExecutionConfig {
  caseTimeoutMs: number;
  maxCases: number;
  seed: number;
}

export interface TwinExecutionResult {
  input: Record<string, Json>;
  baseObservation: Observation;
  headObservation: Observation;
}

export interface SandboxProvider {
  id: string;
  isTrusted: boolean;
  executeTwin(
    baseFn: FunctionFixture,
    headFn: FunctionFixture,
    inputs: Record<string, Json>[],
    config: TwinExecutionConfig,
  ): Promise<TwinExecutionResult[]>;
}

export class LocalFixtureSandboxProvider implements SandboxProvider {
  id = 'local-fixture';
  isTrusted = true;

  async executeTwin(
    baseFn: FunctionFixture,
    headFn: FunctionFixture,
    inputs: Record<string, Json>[],
    config: TwinExecutionConfig,
  ): Promise<TwinExecutionResult[]> {
    const results: TwinExecutionResult[] = [];
    for (const input of inputs.slice(0, config.maxCases)) {
      const baseObservation = executeFunctionFixture(baseFn, input, config.caseTimeoutMs);
      const headObservation = executeFunctionFixture(headFn, input, config.caseTimeoutMs);
      results.push({ input, baseObservation, headObservation });
    }
    return results;
  }
}

export type DivergenceClassification = 'expected' | 'unexpected' | 'unresolved';

export interface ClassifiedDivergence {
  obligationId: string;
  input: Record<string, Json>;
  classification: DivergenceClassification;
  baseObservation: Observation;
  headObservation: Observation;
  predicateSatisfied: boolean;
}

export function classifyDivergence(
  contract: ContractDefinition,
  obligationId: string,
  input: Record<string, Json>,
  baseObs: Observation,
  headObs: Observation,
): ClassifiedDivergence {
  const def = contract.obligations.find((o) => o.id === obligationId);
  if (!def) {
    return {
      obligationId,
      input,
      classification: 'unresolved',
      baseObservation: baseObs,
      headObservation: headObs,
      predicateSatisfied: false,
    };
  }

  const basePayload = baseObs.status === 'returned' ? baseObs.payload : undefined;
  const headPayload = headObs.status === 'returned' ? headObs.payload : undefined;

  const ctx = {
    input,
    base: basePayload,
    head: headPayload,
  };

  const whenSatisfied = evaluateWhenGuard(def.when, input);
  if (!whenSatisfied) {
    return {
      obligationId,
      input,
      classification: 'unresolved',
      baseObservation: baseObs,
      headObservation: headObs,
      predicateSatisfied: false,
    };
  }

  const result = evaluatePredicate(def.assert, ctx);
  let classification: DivergenceClassification;
  if (def.kind === 'preservation') {
    classification = result.satisfied ? 'expected' : 'unexpected';
  } else if (def.kind === 'allowed-relation') {
    classification = result.satisfied ? 'expected' : 'unexpected';
  } else {
    classification = result.satisfied ? 'expected' : 'unexpected';
  }

  return {
    obligationId,
    input,
    classification,
    baseObservation: baseObs,
    headObservation: headObs,
    predicateSatisfied: result.satisfied,
  };
}

export class DifferentialVerifierAdapter implements VerifierAdapter {
  id = 'differential-twin-v1';
  version = '0.1.0';

  constructor(
    private contract: ContractDefinition,
    private baseFn: FunctionFixture,
    private headFn: FunctionFixture,
    private sandbox: SandboxProvider,
  ) {}

  supports(_input: VerificationInput): SupportResult {
    return { supported: true };
  }

  estimateCost(input: VerificationInput): CostEstimate {
    return { estimatedMs: input.inputs.length * 10, estimatedCases: input.inputs.length };
  }

  async verify(input: VerificationInput, context: VerificationContext): Promise<VerificationAttempt> {
    const attemptId = randomUUID();
    const start = Date.now();
    const results: ObligationResult[] = [];
    const def = this.contract.obligations.find((o) => o.id === input.obligation.id);
    if (!def) {
      return {
        attemptId,
        obligationId: input.obligation.id,
        results: [],
        terminalStatus: 'failed',
        consumedBudget: { cases: 0, durationMs: Date.now() - start },
      };
    }

    const twinResults = await this.sandbox.executeTwin(
      this.baseFn,
      this.headFn,
      input.inputs,
      { caseTimeoutMs: 5000, maxCases: context.budget.maxCases, seed: 42 },
    );

    let applicableCount = 0;
    let executedCount = 0;
    let falsified = false;
    let supportedCount = 0;

    for (const twin of twinResults) {
      if (context.cancelled()) break;

      const validation = validateInput(twin.input, this.contract.inputDomain);
      if (!validation.valid) continue;

      const whenSatisfied = evaluateWhenGuard(def.when, twin.input);
      if (!whenSatisfied) continue;

      applicableCount++;
      executedCount++;

      const divergence = classifyDivergence(
        this.contract,
        input.obligation.id,
        twin.input,
        twin.baseObservation,
        twin.headObservation,
      );

      if (divergence.classification === 'unexpected' && !divergence.predicateSatisfied) {
        falsified = true;
      } else if (divergence.predicateSatisfied) {
        supportedCount++;
      }
    }

    let state: EvidenceState;
    if (falsified) {
      state = 'falsified';
    } else if (executedCount > 0 && supportedCount === executedCount) {
      state = 'supported';
    } else if (executedCount === 0) {
      state = applicableCount === 0 ? 'unknown' : 'unsupported';
    } else {
      state = 'unknown';
    }

    results.push({
      runId: input.binding.repositoryId,
      attemptId,
      binding: input.binding,
      obligationId: input.obligation.id,
      obligationDigest: input.obligation.digest,
      state,
      method: this.id,
      verifierVersion: this.version,
      applicableInputCount: applicableCount,
      executedInputCount: executedCount,
      domainSatisfied: applicableCount > 0,
      evidenceDigests: [],
      durationMs: Date.now() - start,
    });

    return {
      attemptId,
      obligationId: input.obligation.id,
      results,
      terminalStatus: 'completed',
      consumedBudget: { cases: executedCount, durationMs: Date.now() - start },
    };
  }
}

export interface SemanticDeltaAnalysisInput {
  contract: ContractDefinition;
  binding: RunBinding;
  baseFn: FunctionFixture;
  headFn: FunctionFixture;
  sandbox?: SandboxProvider;
  maxCases?: number;
}

export interface SemanticDeltaReport {
  binding: RunBinding;
  obligationResults: ObligationResult[];
  divergences: ClassifiedDivergence[];
  policyInput: {
    approvalPresent: boolean;
    scopeApproved: boolean;
    incompleteWork: boolean;
  };
  summary: {
    allowedRelations: { passed: number; failed: number; unknown: number };
    preserved: { passed: number; failed: number; unknown: number };
    properties: { passed: number; failed: number; unknown: number };
    unexpectedDivergences: number;
  };
}

export async function analyzeSemanticDelta(
  input: SemanticDeltaAnalysisInput,
): Promise<SemanticDeltaReport> {
  const sandbox = input.sandbox ?? new LocalFixtureSandboxProvider();
  const inputs = generateInputCases(input.contract.inputDomain, {
    maxCases: input.maxCases ?? 100,
  });

  const adapter = new DifferentialVerifierAdapter(
    input.contract,
    input.baseFn,
    input.headFn,
    sandbox,
  );

  const { generateObligations } = await import('@changegraph/obligations');
  const obligations = generateObligations(input.contract);

  const context: VerificationContext = {
    budget: { maxCases: input.maxCases ?? 100, maxDurationMs: 300000, maxMemoryMb: 512 },
    artifactStore: {
      async write() {},
      async read() { return null; },
    },
    logger: { info() {}, warn() {}, error() {} },
    cancelled: () => false,
  };

  const allResults: ObligationResult[] = [];
  const allDivergences: ClassifiedDivergence[] = [];

  const twinResults = await sandbox.executeTwin(
    input.baseFn,
    input.headFn,
    inputs,
    { caseTimeoutMs: 5000, maxCases: input.maxCases ?? 100, seed: 42 },
  );

  for (const obligation of obligations) {
    const def = input.contract.obligations.find((o) => o.id === obligation.id);
    if (!def) continue;

    const verifyInput: VerificationInput = {
      obligation,
      binding: input.binding,
      inputs,
      contractObligation: { when: def.when, assert: def.assert, kind: def.kind },
    };

    const attempt = await adapter.verify(verifyInput, context);
    allResults.push(...attempt.results);

    for (const twin of twinResults) {
      const whenSatisfied = evaluateWhenGuard(def.when, twin.input);
      if (!whenSatisfied) continue;
      const divergence = classifyDivergence(
        input.contract,
        obligation.id,
        twin.input,
        twin.baseObservation,
        twin.headObservation,
      );
      if (divergence.classification === 'unexpected') {
        allDivergences.push(divergence);
      }
    }
  }

  const summary = {
    allowedRelations: countByKind(allResults, input.contract, 'allowed-relation'),
    preserved: countByKind(allResults, input.contract, 'preservation'),
    properties: countByKind(allResults, input.contract, 'property'),
    unexpectedDivergences: allDivergences.length,
  };

  return {
    binding: input.binding,
    obligationResults: allResults,
    divergences: allDivergences,
    policyInput: { approvalPresent: false, scopeApproved: false, incompleteWork: false },
    summary,
  };
}

function countByKind(
  results: ObligationResult[],
  contract: ContractDefinition,
  kind: string,
): { passed: number; failed: number; unknown: number } {
  const counts = { passed: 0, failed: 0, unknown: 0 };
  for (const result of results) {
    const def = contract.obligations.find((o) => o.id === result.obligationId);
    if (!def || def.kind !== kind) continue;
    if (result.state === 'falsified') counts.failed++;
    else if (result.state === 'supported' || result.state === 'proven') counts.passed++;
    else counts.unknown++;
  }
  return counts;
}

export type { FunctionFixture } from '@changegraph/observables';
