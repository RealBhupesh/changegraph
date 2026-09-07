import type {
  ContractDefinition,
  ScopeChange,
  ScopeDiffResult,
  ScopeChangeKind,
  ApprovalRequirement,
  Digest,
} from './types.js';
import { computeDigest } from './digest.js';

function obligationFingerprint(o: {
  id: string;
  kind: string;
  subjectId: string;
  observableId: string;
  severity: string;
  required: boolean;
  when?: unknown;
  assert: unknown;
}): string {
  return JSON.stringify({
    id: o.id,
    kind: o.kind,
    subjectId: o.subjectId,
    observableId: o.observableId,
    severity: o.severity,
    required: o.required,
    when: o.when,
    assert: o.assert,
  });
}

export function diffContractScope(
  base: ContractDefinition,
  head: ContractDefinition,
): ScopeDiffResult {
  const changes: ScopeChange[] = [];

  const baseObligations = new Map(base.obligations.map((o) => [o.id, o]));
  const headObligations = new Map(head.obligations.map((o) => [o.id, o]));

  for (const [id, baseObl] of baseObligations) {
    const headObl = headObligations.get(id);
    if (!headObl) {
      if (baseObl.kind === 'preservation' || baseObl.kind === 'property') {
        changes.push({
          kind: 'deleted-obligation',
          obligationId: id,
          description: `Deleted ${baseObl.kind} obligation: ${id}`,
          severity: baseObl.severity,
        });
      }
      continue;
    }

    if (obligationFingerprint(baseObl) !== obligationFingerprint(headObl)) {
      if (baseObl.kind === 'preservation' && headObl.kind === 'allowed-relation') {
        changes.push({
          kind: 'broadened-selector',
          obligationId: id,
          description: `Obligation ${id} changed from preservation to allowed-relation`,
          severity: 'critical',
        });
      } else if (JSON.stringify(baseObl.assert) !== JSON.stringify(headObl.assert)) {
        changes.push({
          kind: 'relaxed-bound',
          obligationId: id,
          description: `Predicate changed for obligation ${id}`,
          severity: headObl.severity,
        });
      }
    }
  }

  const baseObservableMap = new Map(base.observables.map((o) => [o.id, o]));
  for (const headObs of head.observables) {
    const baseObs = baseObservableMap.get(headObs.id);
    if (baseObs) {
      if (baseObs.comparator !== headObs.comparator) {
        changes.push({
          kind: 'changed-comparator',
          obligationId: headObs.id,
          description: `Comparator changed for observable ${headObs.id}`,
          severity: 'high',
        });
      }
      if (baseObs.normalizer !== headObs.normalizer) {
        changes.push({
          kind: 'changed-normalizer',
          obligationId: headObs.id,
          description: `Normalizer changed for observable ${headObs.id}`,
          severity: 'high',
        });
      }
      if (baseObs.subjectId !== headObs.subjectId) {
        changes.push({
          kind: 'changed-subject',
          obligationId: headObs.id,
          description: `Subject mapping changed for observable ${headObs.id}`,
          severity: 'critical',
        });
      }
    }
  }

  const baseFields = base.inputDomain.fields;
  const headFields = head.inputDomain.fields;
  for (const [field, baseDef] of Object.entries(baseFields)) {
    const headDef = headFields[field];
    if (!headDef) continue;
    if (baseDef.type === 'integer' && headDef.type === 'integer') {
      if (
        (headDef.min !== undefined && baseDef.min !== undefined && headDef.min > baseDef.min) ||
        (headDef.max !== undefined && baseDef.max !== undefined && headDef.max < baseDef.max)
      ) {
        changes.push({
          kind: 'narrowed-domain',
          description: `Input domain narrowed for field ${field}`,
          severity: 'medium',
        });
      }
    }
  }

  const weakeningKinds: ScopeChangeKind[] = [
    'deleted-obligation',
    'broadened-selector',
    'relaxed-bound',
    'changed-comparator',
    'changed-normalizer',
    'changed-subject',
  ];

  const weakeningDetected = changes.some((c) => weakeningKinds.includes(c.kind));
  const requiresReview = weakeningDetected || changes.some((c) => c.severity === 'critical');

  return { changes, requiresReview, weakeningDetected };
}

export function evaluateApprovalRequirements(
  scopeDiff: ScopeDiffResult,
  policy: { requireApprovalForCriticalChanges: boolean },
): ApprovalRequirement {
  const criticalChanges = scopeDiff.changes.filter((c) => c.severity === 'critical');
  const required =
    scopeDiff.weakeningDetected ||
    (policy.requireApprovalForCriticalChanges && criticalChanges.length > 0);

  return {
    required,
    reason: required
      ? 'Contract scope changes require approval before merge'
      : 'No approval required',
    criticalChanges,
  };
}

export function bindContractToRevision(params: {
  tenantId: string;
  repositoryId: string;
  baseSha: string;
  headSha: string;
  contract: ContractDefinition;
  policyDigest: Digest;
  executionConfigDigest: Digest;
}): {
  contractDefinitionDigest: Digest;
  contractBindingDigest: Digest;
} {
  const contractDefinitionDigest = computeDigest(params.contract) as Digest;
  const contractBindingDigest = computeDigest({
    tenantId: params.tenantId,
    repositoryId: params.repositoryId,
    baseSha: params.baseSha,
    headSha: params.headSha,
    contractDefinitionDigest,
    policyDigest: params.policyDigest,
    executionConfigDigest: params.executionConfigDigest,
  }) as Digest;

  return { contractDefinitionDigest, contractBindingDigest };
}
