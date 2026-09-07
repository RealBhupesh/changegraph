import {
  type ContractDefinition,
  type VerificationObligation,
  type Digest,
  computeDigest,
  evaluateWhenGuard,
  hasNonemptyApplicableDomain,
} from '@changegraph/semantic-contract';

export interface SubjectResolution {
  subjectId: string;
  resolved: boolean;
  filePath?: string;
  exportName?: string;
}

export function resolveSubjects(
  contract: ContractDefinition,
  adapterMappings?: Record<string, { filePath: string; exportName: string }>,
): SubjectResolution[] {
  const subjectIds = new Set<string>();
  for (const obs of contract.observables) {
    subjectIds.add(obs.subjectId);
  }

  return [...subjectIds].sort().map((subjectId) => {
    const mapping = adapterMappings?.[subjectId];
    return {
      subjectId,
      resolved: !!mapping,
      filePath: mapping?.filePath,
      exportName: mapping?.exportName,
    };
  });
}

export function generateObligations(contract: ContractDefinition): VerificationObligation[] {
  const obligations: VerificationObligation[] = [];

  for (const def of contract.obligations) {
    const content = {
      id: def.id,
      kind: def.kind,
      subjectId: def.subjectId,
      observableId: def.observableId,
      severity: def.severity,
      required: def.required,
      when: def.when,
      assert: def.assert,
      inputDomain: contract.inputDomain,
    };

    const digest = computeDigest(content) as Digest;
    const predicateDigest = computeDigest(def.assert) as Digest;
    const inputDomainDigest = computeDigest(contract.inputDomain) as Digest;

    obligations.push({
      id: def.id,
      digest,
      kind: def.kind,
      subjectId: def.subjectId,
      observableId: def.observableId,
      severity: def.severity,
      required: def.required,
      inputDomainDigest,
      predicateDigest,
      assumptionDigests: [],
    });
  }

  return obligations.sort((a, b) => a.id.localeCompare(b.id));
}

export function checkObligationApplicability(
  contract: ContractDefinition,
  obligationId: string,
): { applicable: boolean; reason?: string } {
  const def = contract.obligations.find((o) => o.id === obligationId);
  if (!def) return { applicable: false, reason: 'Obligation not found' };

  const whenGuard = def.when
    ? (input: Record<string, unknown>) =>
        evaluateWhenGuard(def.when, input as Record<string, import('@changegraph/semantic-contract').Json>)
    : undefined;

  const hasDomain = hasNonemptyApplicableDomain(contract.inputDomain, whenGuard);
  if (!hasDomain) {
    return { applicable: false, reason: 'Empty applicable domain' };
  }
  return { applicable: true };
}
