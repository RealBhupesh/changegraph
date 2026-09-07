import type { Digest, EvidenceState } from '@changegraph/semantic-contract';
import { computeDigest } from '@changegraph/semantic-contract';

export interface CaseMemoryEntry {
  id: string;
  tenantId: string;
  repositoryId: string;
  subjectDigest: Digest;
  obligationShapeDigest: Digest;
  inputDomainDigest: Digest;
  observableDigest: Digest;
  witnessDigest: Digest;
  category: 'fixture' | 'incident' | 'regression' | 'promise';
  approved: boolean;
  createdAt: string;
}

export interface ProofSummaryEntry {
  id: string;
  tenantId: string;
  repositoryId: string;
  subjectDigest: Digest;
  obligationShapeDigest: Digest;
  inputDomainDigest: Digest;
  observableDigest: Digest;
  comparatorDigest: Digest;
  normalizerDigest: Digest;
  verifierVersion: string;
  dependencyFingerprint: Digest;
  state: EvidenceState;
  evidenceDigest: Digest;
  createdAt: string;
}

export interface ProofDependency {
  fromEntryId: string;
  toEntryId: string;
  kind: 'transitive' | 'direct';
}

export interface ReuseEligibility {
  eligible: boolean;
  reason: string;
  entry?: ProofSummaryEntry | CaseMemoryEntry;
}

export class BehavioralMemoryStore {
  private cases: Map<string, CaseMemoryEntry> = new Map();
  private proofs: Map<string, ProofSummaryEntry> = new Map();
  private dependencies: ProofDependency[] = [];

  addCase(entry: CaseMemoryEntry): void {
    this.cases.set(entry.id, entry);
  }

  addProof(entry: ProofSummaryEntry): void {
    this.proofs.set(entry.id, entry);
  }

  addDependency(dep: ProofDependency): void {
    this.dependencies.push(dep);
  }

  lookupProofReuse(params: {
    tenantId: string;
    repositoryId: string;
    subjectDigest: Digest;
    obligationShapeDigest: Digest;
    inputDomainDigest: Digest;
    observableDigest: Digest;
    comparatorDigest: Digest;
    normalizerDigest: Digest;
    verifierVersion: string;
    dependencyFingerprint: Digest;
  }): ReuseEligibility {
    for (const entry of this.proofs.values()) {
      if (entry.tenantId !== params.tenantId) continue;
      if (entry.repositoryId !== params.repositoryId) continue;

      if (
        entry.subjectDigest === params.subjectDigest &&
        entry.obligationShapeDigest === params.obligationShapeDigest &&
        entry.inputDomainDigest === params.inputDomainDigest &&
        entry.observableDigest === params.observableDigest &&
        entry.comparatorDigest === params.comparatorDigest &&
        entry.normalizerDigest === params.normalizerDigest &&
        entry.verifierVersion === params.verifierVersion &&
        entry.dependencyFingerprint === params.dependencyFingerprint &&
        entry.state === 'proven'
      ) {
        const invalidated = this.checkInvalidation(entry.id, params.dependencyFingerprint);
        if (invalidated) {
          return { eligible: false, reason: 'Dependency changed — proof invalidated' };
        }
        return { eligible: true, reason: 'Eligible for conservative reuse', entry };
      }
    }
    return { eligible: false, reason: 'No matching proof summary found' };
  }

  private checkInvalidation(entryId: string, currentFingerprint: Digest): boolean {
    const deps = this.dependencies.filter((d) => d.fromEntryId === entryId);
    const entry = this.proofs.get(entryId);
    if (!entry) return true;
    return entry.dependencyFingerprint !== currentFingerprint && deps.length > 0;
  }

  explainInvalidation(entryId: string): string[] {
    const reasons: string[] = [];
    const entry = this.proofs.get(entryId) ?? this.cases.get(entryId);
    if (!entry) return ['Entry not found'];

    const deps = this.dependencies.filter((d) => d.fromEntryId === entryId);
    if (deps.length > 0) {
      reasons.push(`${deps.length} dependency edge(s) may require recheck`);
    }

    return reasons.length > 0 ? reasons : ['No invalidation detected'];
  }

  getCases(tenantId: string, repositoryId: string): CaseMemoryEntry[] {
    return [...this.cases.values()].filter(
      (c) => c.tenantId === tenantId && c.repositoryId === repositoryId,
    );
  }

  getProofs(tenantId: string, repositoryId: string): ProofSummaryEntry[] {
    return [...this.proofs.values()].filter(
      (p) => p.tenantId === tenantId && p.repositoryId === repositoryId,
    );
  }
}

export function computeDependencyFingerprint(deps: string[]): Digest {
  return computeDigest(deps.sort());
}
