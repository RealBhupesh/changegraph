import type {
  ContractDefinition,
  RunBinding,
  PolicyDecision,
  Digest,
} from '@changegraph/semantic-contract';
import { computeDigest, bindContractToRevision } from '@changegraph/semantic-contract';
import { evaluatePolicy } from '@changegraph/verifier-core';
import {
  analyzeSemanticDelta,
  type SemanticDeltaReport,
  type FunctionFixture,
  type SandboxProvider,
} from '@changegraph/verifier-differential';
import { exportPassport } from '@changegraph/attestations';

export interface AnalysisRequest {
  tenantId: string;
  repositoryId: string;
  baseSha: string;
  headSha: string;
  contract: ContractDefinition;
  baseFn: FunctionFixture;
  headFn: FunctionFixture;
  policyDigest?: Digest;
  executionConfigDigest?: Digest;
  sandbox?: SandboxProvider;
  maxCases?: number;
  approvalPresent?: boolean;
}

export interface AnalysisResponse {
  report: SemanticDeltaReport;
  policyDecision: PolicyDecision;
  policyReasons: string[];
  binding: RunBinding;
  exitCode: number;
}

export function computeExitCode(
  policyDecision: PolicyDecision,
  hasFalsification: boolean,
  hasIncomplete: boolean,
): number {
  if (hasFalsification || policyDecision === 'block') return 1;
  if (policyDecision === 'needs-review' || hasIncomplete) return 3;
  if (policyDecision === 'permit') return 0;
  return 4;
}

export async function runAnalysis(request: AnalysisRequest): Promise<AnalysisResponse> {
  const policyDigest = request.policyDigest ?? (computeDigest({ version: 1, rules: {} }) as Digest);
  const executionConfigDigest =
    request.executionConfigDigest ??
    (computeDigest({ provider: 'local-fixture', maxCases: request.maxCases ?? 100 }) as Digest);

  const { contractDefinitionDigest, contractBindingDigest } = bindContractToRevision({
    tenantId: request.tenantId,
    repositoryId: request.repositoryId,
    baseSha: request.baseSha,
    headSha: request.headSha,
    contract: request.contract,
    policyDigest,
    executionConfigDigest,
  });

  const binding: RunBinding = {
    tenantId: request.tenantId,
    repositoryId: request.repositoryId,
    baseSha: request.baseSha,
    headSha: request.headSha,
    contractDefinitionDigest,
    contractBindingDigest,
    policyDigest,
    executionConfigDigest,
  };

  const report = await analyzeSemanticDelta({
    contract: request.contract,
    binding,
    baseFn: request.baseFn,
    headFn: request.headFn,
    sandbox: request.sandbox,
    maxCases: request.maxCases,
  });

  const hasFalsification = report.obligationResults.some((r) => r.state === 'falsified');
  const hasIncomplete = report.obligationResults.some(
    (r) => r.state === 'unknown' || r.state === 'unsupported',
  );

  const policy = evaluatePolicy(
    {
      obligationResults: report.obligationResults,
      approvalPresent: request.approvalPresent ?? false,
      scopeApproved: request.approvalPresent ?? false,
      incompleteWork: hasIncomplete,
    },
    { blockOnRequiredFalsification: true, reviewOnUnresolved: true },
  );

  const exitCode = computeExitCode(policy.decision, hasFalsification, hasIncomplete);

  return {
    report,
    policyDecision: policy.decision,
    policyReasons: policy.reasons,
    binding,
    exitCode,
  };
}

export interface MergeInteractionInput {
  baseFn: FunctionFixture;
  prAFn: FunctionFixture;
  prBFn: FunctionFixture;
  composedFn: FunctionFixture;
  invariantCheck: (result: Record<string, unknown>) => boolean;
}

export interface MergeInteractionResult {
  prAPasses: boolean;
  prBPasses: boolean;
  compositionPasses: boolean;
  compositionViolated: boolean;
  witness?: Record<string, unknown>;
}

export function analyzeMergeInteraction(input: MergeInteractionInput): MergeInteractionResult {
  const testInput = { workers: 4, batchSize: 4 };

  const prAResult = input.prAFn(testInput) as Record<string, unknown>;
  const prBResult = input.prBFn(testInput) as Record<string, unknown>;
  const composedResult = input.composedFn(testInput) as Record<string, unknown>;

  const prAPasses = input.invariantCheck(prAResult);
  const prBPasses = input.invariantCheck(prBResult);
  const compositionPasses = input.invariantCheck(composedResult);

  return {
    prAPasses,
    prBPasses,
    compositionPasses,
    compositionViolated: prAPasses && prBPasses && !compositionPasses,
    witness: !compositionPasses ? composedResult : undefined,
  };
}

export { exportPassport };
export type { SemanticDeltaReport };
