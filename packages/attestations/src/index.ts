import type {
  RunBinding,
  ObligationResult,
  Digest,
  PolicyDecision,
} from '@changegraph/semantic-contract';
import { computeDigest, canonicalizeJson } from '@changegraph/semantic-contract';

export interface EvidencePassportManifest {
  version: number;
  binding: RunBinding;
  contractDefinitionDigest: Digest;
  policyDigest: Digest;
  executionConfigDigest: Digest;
  obligations: Array<{
    id: string;
    digest: Digest;
    result: ObligationResult;
  }>;
  policyDecision: PolicyDecision;
  completionStatus: 'complete' | 'partial' | 'failed';
  evidenceTreeRoot: Digest;
  createdAt: string;
  signature?: {
    algorithm: string;
    keyId: string;
    value: string;
  };
}

export interface EvidenceLeaf {
  id: string;
  digest: Digest;
  type: 'witness' | 'proof-receipt' | 'solver-evidence' | 'corpus-case';
}

export function buildEvidenceTree(leaves: EvidenceLeaf[]): Digest {
  if (leaves.length === 0) {
    return computeDigest({ empty: true });
  }

  const sorted = [...leaves].sort((a, b) => a.id.localeCompare(b.id));
  let nodes: Digest[] = sorted.map((l) =>
    computeDigest({ prefix: 'leaf-v1', id: l.id, digest: l.digest, type: l.type }),
  );

  while (nodes.length > 1) {
    const next: Digest[] = [];
    for (let i = 0; i < nodes.length; i += 2) {
      if (i + 1 < nodes.length) {
        next.push(
          computeDigest({ prefix: 'node-v1', left: nodes[i], right: nodes[i + 1] }),
        );
      } else {
        next.push(computeDigest({ prefix: 'node-v1-odd', left: nodes[i], right: nodes[i] }));
      }
    }
    nodes = next;
  }

  return nodes[0];
}

export function exportPassport(params: {
  binding: RunBinding;
  contractDefinitionDigest: Digest;
  policyDigest: Digest;
  executionConfigDigest: Digest;
  obligationResults: ObligationResult[];
  policyDecision: PolicyDecision;
  evidenceLeaves: EvidenceLeaf[];
  completionStatus: 'complete' | 'partial' | 'failed';
}): EvidencePassportManifest {
  const evidenceTreeRoot = buildEvidenceTree(params.evidenceLeaves);

  const manifest: EvidencePassportManifest = {
    version: 1,
    binding: params.binding,
    contractDefinitionDigest: params.contractDefinitionDigest,
    policyDigest: params.policyDigest,
    executionConfigDigest: params.executionConfigDigest,
    obligations: params.obligationResults.map((r) => ({
      id: r.obligationId,
      digest: r.obligationDigest,
      result: r,
    })),
    policyDecision: params.policyDecision,
    completionStatus: params.completionStatus,
    evidenceTreeRoot,
    createdAt: new Date().toISOString(),
  };

  return manifest;
}

export type VerificationMode = 'integrity' | 'replay' | 'proof';

export interface PassportVerificationResult {
  valid: boolean;
  mode: VerificationMode;
  errors: string[];
  warnings: string[];
}

export function verifyPassport(
  manifest: EvidencePassportManifest,
  mode: VerificationMode,
): PassportVerificationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (manifest.version !== 1) {
    errors.push(`Unsupported manifest version: ${manifest.version}`);
  }

  if (!manifest.binding.tenantId || !manifest.binding.repositoryId) {
    errors.push('Missing tenant or repository binding');
  }

  if (!manifest.binding.baseSha || !manifest.binding.headSha) {
    errors.push('Missing revision SHAs in binding');
  }

  const recomputedBinding = computeDigest({
    tenantId: manifest.binding.tenantId,
    repositoryId: manifest.binding.repositoryId,
    baseSha: manifest.binding.baseSha,
    headSha: manifest.binding.headSha,
    contractDefinitionDigest: manifest.contractDefinitionDigest,
    policyDigest: manifest.policyDigest,
    executionConfigDigest: manifest.executionConfigDigest,
  });

  if (recomputedBinding !== manifest.binding.contractBindingDigest) {
    errors.push('Binding digest mismatch — possible tampering');
  }

  for (const obligation of manifest.obligations) {
    if (obligation.result.state === 'proven' && !obligation.result.proofArtifactDigest) {
      errors.push(`Obligation ${obligation.id} claims proven without proof artifact`);
    }
    if (obligation.result.state === 'supported' && obligation.result.executedInputCount === 0) {
      errors.push(`Obligation ${obligation.id} claims supported with zero executions`);
    }
  }

  if (mode === 'replay') {
    warnings.push('Replay mode requires authorized isolated execution — not performed in integrity check');
  }

  if (mode === 'proof') {
    const hasProof = manifest.obligations.some((o) => o.result.proofArtifactDigest);
    if (!hasProof) {
      warnings.push('No proof artifacts present for proof verification');
    }
  }

  if (!manifest.signature) {
    warnings.push('Passport is unsigned');
  } else if (mode === 'integrity') {
    warnings.push('Signature present but independent verification requires configured trust roots');
  }

  return {
    valid: errors.length === 0,
    mode,
    errors,
    warnings,
  };
}

export function serializePassport(manifest: EvidencePassportManifest): string {
  return canonicalizeJson(manifest);
}

export function parsePassport(content: string): EvidencePassportManifest {
  const parsed = JSON.parse(content) as EvidencePassportManifest;
  return parsed;
}
