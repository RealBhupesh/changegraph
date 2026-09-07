export type Digest = `sha256:${string}`;
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type EvidenceState =
  | 'proven'
  | 'supported'
  | 'falsified'
  | 'unknown'
  | 'unsupported';
export type PolicyDecision = 'permit' | 'block' | 'needs-review';
export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };

export interface RunBinding {
  tenantId: string;
  repositoryId: string;
  baseSha: string;
  headSha: string;
  contractDefinitionDigest: Digest;
  contractBindingDigest: Digest;
  policyDigest: Digest;
  executionConfigDigest: Digest;
}

export interface VerificationObligation {
  id: string;
  digest: Digest;
  kind: 'allowed-relation' | 'preservation' | 'property';
  subjectId: string;
  observableId: string;
  severity: Severity;
  required: boolean;
  inputDomainDigest: Digest;
  predicateDigest: Digest;
  assumptionDigests: Digest[];
}

export interface ObligationResult {
  runId: string;
  attemptId: string;
  binding: RunBinding;
  obligationId: string;
  obligationDigest: Digest;
  state: EvidenceState;
  method: string;
  verifierVersion: string;
  applicableInputCount: number;
  executedInputCount: number;
  domainSatisfied: boolean | null;
  evidenceDigests: Digest[];
  witnessDigest?: Digest;
  proofArtifactDigest?: Digest;
  proofModelDigest?: Digest;
  reasonCode?: string;
  durationMs: number;
}

export type Operand =
  | { literal: Json }
  | { source: 'input' | 'base' | 'head'; path: string[] }
  | { op: 'add' | 'sub' | 'mul'; args: [Operand, Operand] };

export type Predicate =
  | { op: 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte'; args: [Operand, Operand] }
  | { op: 'and' | 'or'; args: Predicate[] }
  | { op: 'not'; arg: Predicate };

export interface InputFieldSchema {
  type: 'integer' | 'enum' | 'string' | 'boolean';
  min?: number;
  max?: number;
  step?: number;
  values?: string[];
}

export interface InputDomainSchema {
  type: 'object';
  additionalProperties: boolean;
  fields: Record<string, InputFieldSchema>;
}

export interface ObservableDefinition {
  id: string;
  subjectId: string;
  kind: 'return-value' | 'http' | 'state-transition' | 'postgresql';
  normalizer: string;
  comparator: string;
}

export interface ObligationDefinition {
  id: string;
  kind: 'allowed-relation' | 'preservation' | 'property';
  subjectId: string;
  observableId: string;
  severity: Severity;
  required: boolean;
  when?: Predicate;
  assert: Predicate;
}

export interface ContractDefinition {
  version: number;
  intent: {
    summary: string;
    type: string;
  };
  inputDomain: InputDomainSchema;
  observables: ObservableDefinition[];
  obligations: ObligationDefinition[];
}

export interface PolicyDefinition {
  version: number;
  rules: {
    blockOnRequiredFalsification: boolean;
    reviewOnUnresolved: boolean;
    requireApprovalForCriticalChanges: boolean;
    independentReviewerRequired: boolean;
  };
}

export type ScopeChangeKind =
  | 'deleted-obligation'
  | 'broadened-selector'
  | 'narrowed-domain'
  | 'relaxed-bound'
  | 'changed-comparator'
  | 'changed-normalizer'
  | 'changed-subject'
  | 'duplicate-id'
  | 'missing-subject'
  | 'missing-observable'
  | 'unknown';

export interface ScopeChange {
  kind: ScopeChangeKind;
  obligationId?: string;
  description: string;
  severity: Severity;
}

export interface ScopeDiffResult {
  changes: ScopeChange[];
  requiresReview: boolean;
  weakeningDetected: boolean;
}

export interface ApprovalRequirement {
  required: boolean;
  reason: string;
  criticalChanges: ScopeChange[];
}

export interface ContractValidationResult {
  valid: boolean;
  errors: string[];
  contract?: ContractDefinition;
  definitionDigest?: Digest;
}

export interface EvaluationContext {
  input: Record<string, Json>;
  base?: Record<string, Json>;
  head?: Record<string, Json>;
}

export interface PredicateEvaluationResult {
  satisfied: boolean;
  error?: string;
}
