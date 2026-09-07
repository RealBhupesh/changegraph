import type {
  RunBinding,
  VerificationObligation,
  ObligationResult,
  EvidenceState,
  PolicyDecision,
  Json,
} from '@changegraph/semantic-contract';

export interface SupportResult {
  supported: boolean;
  reason?: string;
}

export interface CostEstimate {
  estimatedMs: number;
  estimatedCases: number;
}

export interface VerificationInput {
  obligation: VerificationObligation;
  binding: RunBinding;
  inputs: Record<string, Json>[];
  contractObligation: {
    when?: unknown;
    assert: unknown;
    kind: string;
  };
}

export interface ResourceBudget {
  maxCases: number;
  maxDurationMs: number;
  maxMemoryMb: number;
}

export interface VerificationContext {
  budget: ResourceBudget;
  artifactStore: ArtifactStore;
  logger: Logger;
  cancelled: () => boolean;
}

export interface ArtifactStore {
  write(digest: string, content: Buffer): Promise<void>;
  read(digest: string): Promise<Buffer | null>;
}

export interface Logger {
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

export interface VerificationAttempt {
  attemptId: string;
  obligationId: string;
  results: ObligationResult[];
  terminalStatus: 'completed' | 'timed-out' | 'cancelled' | 'failed';
  consumedBudget: { cases: number; durationMs: number };
}

export interface VerifierAdapter {
  id: string;
  version: string;
  supports(input: VerificationInput): SupportResult;
  estimateCost(input: VerificationInput): CostEstimate;
  verify(input: VerificationInput, context: VerificationContext): Promise<VerificationAttempt>;
}

export interface PolicyEvaluationInput {
  obligationResults: ObligationResult[];
  approvalPresent: boolean;
  scopeApproved: boolean;
  incompleteWork: boolean;
}

export interface PolicyEvaluationResult {
  decision: PolicyDecision;
  reasons: string[];
}

export function evaluatePolicy(
  input: PolicyEvaluationInput,
  rules: {
    blockOnRequiredFalsification: boolean;
    reviewOnUnresolved: boolean;
  },
): PolicyEvaluationResult {
  const reasons: string[] = [];
  let decision: PolicyDecision = 'permit';

  const falsified = input.obligationResults.filter((r) => r.state === 'falsified');
  const unknown = input.obligationResults.filter((r) => r.state === 'unknown');
  const unsupported = input.obligationResults.filter((r) => r.state === 'unsupported');

  if (rules.blockOnRequiredFalsification && falsified.length > 0) {
    decision = 'block';
    reasons.push(`${falsified.length} obligation(s) falsified`);
  }

  if (rules.reviewOnUnresolved && (unknown.length > 0 || unsupported.length > 0)) {
    if (decision !== 'block') decision = 'needs-review';
    reasons.push(`${unknown.length + unsupported.length} obligation(s) unresolved`);
  }

  if (!input.approvalPresent && !input.scopeApproved) {
    if (decision === 'permit') decision = 'needs-review';
    reasons.push('Contract approval not present');
  }

  if (input.incompleteWork) {
    if (decision === 'permit') decision = 'needs-review';
    reasons.push('Verification incomplete');
  }

  if (reasons.length === 0) {
    reasons.push('All required obligations satisfied');
  }

  return { decision, reasons };
}

export function aggregateResults(attempts: VerificationAttempt[]): ObligationResult[] {
  const byObligation = new Map<string, ObligationResult[]>();

  for (const attempt of attempts) {
    for (const result of attempt.results) {
      const existing = byObligation.get(result.obligationId) ?? [];
      existing.push(result);
      byObligation.set(result.obligationId, existing);
    }
  }

  const aggregated: ObligationResult[] = [];
  for (const [, results] of byObligation) {
    const falsified = results.find((r) => r.state === 'falsified');
    if (falsified) {
      aggregated.push(falsified);
      continue;
    }
    const proven = results.find((r) => r.state === 'proven');
    if (proven) {
      aggregated.push(proven);
      continue;
    }
    const supported = results.find((r) => r.state === 'supported');
    if (supported) {
      aggregated.push(supported);
      continue;
    }
    aggregated.push(results[results.length - 1]);
  }

  return aggregated;
}

export function validateEvidenceState(
  state: EvidenceState,
  result: { executedInputCount: number; domainSatisfied: boolean | null; proofArtifactDigest?: string },
): boolean {
  if (state === 'proven' && !result.proofArtifactDigest) return false;
  if (state === 'supported' && result.executedInputCount === 0) return false;
  if (state === 'falsified' && result.executedInputCount === 0) return false;
  return true;
}
